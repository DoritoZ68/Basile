// Modèle physique du cycliste : puissance -> vitesse (gravité, roulement,
// aérodynamique avec densité de l'air selon l'altitude, vent, aspiration),
// réserve anaérobie W' (modèle de Skiba), fréquence cardiaque et braquets.

export const G = 9.81;
const CRR = 0.0045;
const ETA = 0.975;
const WHEEL = 2.105; // circonférence (m), pneu 25 mm
const RINGS = [50, 34];
const COGS = [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30, 32];

export function makeRider(opts) {
  return {
    name: opts.name,
    isPlayer: !!opts.isPlayer,
    mass: opts.mass, // cycliste
    bikeMass: opts.bikeMass ?? 7.8,
    cp: opts.ftp, // puissance critique ~ FTP
    wPrime: opts.wPrime ?? 20000,
    wbal: opts.wPrime ?? 20000,
    hrRest: 58,
    hrMax: opts.hrMax ?? 188,
    hr: 85,
    s: opts.s ?? 0,
    o: opts.o ?? 1.4, // décalage latéral (m, + = droite)
    oTarget: opts.o ?? 1.4,
    v: 0,
    power: 0,
    target: 0, // puissance demandée
    sprint: false,
    brake: 0,
    tuck: false,
    posture: 0,
    cadence: 0,
    ring: 0,
    cog: 6,
    draft: 0,
    latG: 0,
    crashed: 0,
    finished: false,
    finishTime: 0,
    time: 0,
    energy: 0, // kJ
    sumP: 0,
    maxV: 0,
    offRoad: false,
    // IA
    ai: opts.ai || null,
  };
}

export function airDensity(alt) {
  return 1.225 * Math.exp(-alt / 8500);
}

export function maxPower(r) {
  // au-dessus de CP, limité par la réserve W'
  const reserve = Math.max(0, r.wbal / r.wPrime);
  return r.cp * (0.95 + 1.6 * Math.min(1, reserve * 1.4));
}

const sm = {};

// avance le coureur de dt secondes
export function step(r, route, env, dt, assist) {
  const p = route.sample(r.s, sm);
  const theta = Math.atan(p.grade);
  const m = r.mass + r.bikeMass;

  if (r.crashed > 0) {
    r.crashed -= dt;
    r.v = 0;
    r.power = 0;
    r.cadence = 0;
    r.time += dt;
    return p;
  }

  // puissance : la consigne est atteinte progressivement
  let want = r.target;
  if (r.sprint) want = Math.max(want, r.cp * 2.2);
  if (r.tuck) want = Math.min(want, 60);
  if (r.brake > 0.05) want = 0;
  want = Math.min(want, maxPower(r));
  if (r.offRoad) want = Math.min(want, r.cp * 0.8);
  r.power += (want - r.power) * Math.min(1, dt * 2.5);
  if (r.power < 1) r.power = 0;

  // W' (Skiba 2)
  if (r.power > r.cp) r.wbal -= (r.power - r.cp) * dt;
  else r.wbal += ((r.cp - r.power) * (r.wPrime - r.wbal) / r.wPrime) * dt * 1.2;
  r.wbal = Math.min(r.wPrime, Math.max(0, r.wbal));

  // fréquence cardiaque (réponse retardée)
  const hrT = r.hrRest + (r.hrMax - r.hrRest) * Math.min(1, 0.32 + 0.62 * (r.power / r.cp) + (1 - r.wbal / r.wPrime) * 0.12);
  const tau = hrT > r.hr ? 18 : 35;
  r.hr += (hrT - r.hr) * Math.min(1, dt / tau);

  // aérodynamique : position + aspiration
  let cda = r.tuck ? 0.22 : r.posture > 0 ? 0.36 : 0.32;
  cda *= 1 - r.draft;
  const rho = airDensity(p.y);
  const head = env.windX * p.dx + env.windZ * p.dz; // composante du vent dans le sens de marche
  const vAir = r.v - head;
  const fAero = 0.5 * rho * cda * vAir * Math.abs(vAir);
  const fGrav = m * G * Math.sin(theta);
  const fRoll = (r.offRoad ? 0.02 : CRR) * m * G * Math.cos(theta);
  const fPedal = (r.power * ETA) / Math.max(r.v, 1.5);
  let fBrake = r.brake * m * 6.5;

  // virages : accélération latérale
  const kappa = p.curv;
  r.latG = (r.v * r.v * Math.abs(kappa)) / G;
  if (assist && !r.isPlayer) {
    /* l'IA gère son freinage elle-même */
  }
  if (assist && r.isPlayer) {
    const safe = route.safeSpeedAhead(r.s, 60, 0.6);
    if (r.v > safe.v) fBrake = Math.max(fBrake, Math.min(1, (r.v - safe.v) * 0.8) * m * 6.5);
  }

  const acc = (fPedal - fAero - fGrav - fRoll - (r.v > 0.05 ? fBrake : 0)) / (m + 1.5);
  r.v = Math.max(0, r.v + acc * dt);

  // progression : on coupe les virages à la corde
  const denom = Math.max(0.4, 1 - kappa * r.o);
  const ds = (r.v * dt) / denom;
  r.s += ds;
  r.time += dt;
  r.energy += (r.power * dt) / 1000;
  r.sumP += r.power * dt;
  r.maxV = Math.max(r.maxV, r.v);

  // braquet automatique et cadence
  if (r.power > 5 && r.v > 0.5) {
    const ideal = p.grade > 0.04 ? 82 : 92;
    let best = null;
    for (let ri = 0; ri < RINGS.length; ri++) {
      for (let ci = 0; ci < COGS.length; ci++) {
        const cad = (r.v / (WHEEL * (RINGS[ri] / COGS[ci]))) * 60;
        const score = Math.abs(cad - ideal) + (ri !== r.ring ? 6 : 0) + Math.abs(ci - r.cog) * 1.5;
        if (!best || score < best.score) best = { ri, ci, score, cad };
      }
    }
    const cur = (r.v / (WHEEL * (RINGS[r.ring] / COGS[r.cog]))) * 60;
    if (Math.abs(cur - ideal) > 12) { r.ring = best.ri; r.cog = best.ci; }
    const cadNow = (r.v / (WHEEL * (RINGS[r.ring] / COGS[r.cog]))) * 60;
    r.cadence += (Math.max(40, Math.min(125, cadNow)) - r.cadence) * Math.min(1, dt * 4);
  } else {
    r.cadence += (0 - r.cadence) * Math.min(1, dt * 6);
  }
  r.posture = r.tuck ? -1 : (r.sprint && r.power > r.cp * 1.2) || (p.grade > 0.085 && r.power > r.cp * 0.9 && r.v < 4.2) ? 1 : 0;
  return p;
}

export function gearLabel(r) {
  return `${RINGS[r.ring]}×${COGS[r.cog]}`;
}

// aspiration : jusqu'à ~35 % de traînée en moins dans la roue d'un coureur
export function computeDrafts(riders) {
  for (const a of riders) {
    a.draft = 0;
    if (a.crashed > 0) continue;
    for (const b of riders) {
      if (a === b || b.crashed > 0) continue;
      const gap = b.s - a.s;
      if (gap > 0.4 && gap < 4 && Math.abs(b.o - a.o) < 0.75) {
        const d = 0.35 * (1 - (gap - 0.4) / 3.6) * (1 - Math.abs(b.o - a.o) / 0.75 * 0.5);
        a.draft = Math.max(a.draft, d);
      }
    }
  }
}

// comportement des concurrents
export function aiThink(r, route, riders, dt) {
  const ai = r.ai;
  const p = route.sample(r.s + 25);
  const g = p.grade;
  ai.t -= dt;
  if (ai.t <= 0) {
    ai.t = 4 + Math.random() * 8;
    ai.mood = 0.94 + Math.random() * 0.1;
    // attaque occasionnelle dans les pentes
    if (g > 0.05 && Math.random() < ai.aggr * 0.25 && r.wbal > r.wPrime * 0.7) ai.attack = 6 + Math.random() * 6;
  }
  let f;
  if (g > 0.02) f = ai.climb;
  else if (g > -0.02) f = ai.flat;
  else if (g > -0.05) f = 0.45;
  else f = 0.1;
  let target = r.cp * f * ai.mood;
  if (ai.attack > 0) { ai.attack -= dt; target = r.cp * 1.35; }
  // gestion de la réserve
  if (r.wbal < r.wPrime * 0.3) target = Math.min(target, r.cp * 0.92);
  r.target = target;
  r.sprint = false;
  r.tuck = g < -0.04 && r.v > 11;
  // freinage avant les virages
  const safe = route.safeSpeedAhead(r.s, 70, ai.mu);
  r.brake = r.v > safe.v ? Math.min(1, (r.v - safe.v) * 0.6) : 0;
  // trajectoire : reste à droite, déborde pour doubler
  let want = ai.lane;
  for (const o of riders) {
    if (o === r) continue;
    const gap = o.s - r.s;
    if (gap > 0 && gap < 3 && Math.abs(o.o - r.o) < 0.7 && o.v < r.v + 0.3) want = o.o - 1.0;
  }
  r.oTarget = Math.max(-2.4, Math.min(2.4, want));
  r.o += (r.oTarget - r.o) * Math.min(1, dt * 0.8);
}
