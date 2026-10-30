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
    bike: opts.bike || "route",
    // vélo de route 7,4 kg, vélo de contre-la-montre 8,6 kg
    bikeMass: opts.bikeMass ?? (opts.bike === "clm" ? 8.6 : 7.4),
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
  // au-dessus de CP, limité par la réserve W' ; fringale et déshydratation
  const reserve = Math.max(0, r.wbal / r.wPrime);
  return r.cp * (0.95 + 1.6 * Math.min(1, reserve * 1.4)) * (r.fuel ? fuelFactor(r) : 1);
}

// ------------------------------------------------------------ ravitaillement
// Glycogène (g), glucides en cours d'absorption (g), déficit hydrique (L),
// bidons (mL) et poches. Un coureur brûle surtout des glucides au-dessus de
// ~75 % de son seuil ; l'intestin n'en absorbe qu'environ 75 g/h ; on perd
// 0,4 à 1,4 L de sueur par heure selon l'effort et la chaleur.
export function makeFuel(mass, heat = 1) {
  return {
    gly: 380, glyMax: 500, gut: 0,
    deficit: 0, // litres perdus et non compensés
    heat,
    bottles: [500, 500], // mL dans chaque bidon (500 mL pleins)
    bars: 2, gels: 2,
    mass,
  };
}

export function fuelFactor(r) {
  const f = r.fuel;
  const g = f.gly / f.glyMax;
  let k = 1;
  if (g < 0.12) k *= 0.55 + 0.45 * (g / 0.12); // fringale
  const pct = (f.deficit / f.mass) * 100; // % du poids du corps
  if (pct > 2) k *= Math.max(0.72, 1 - 0.045 * (pct - 2));
  return k;
}

function fuelStep(r, dt) {
  const f = r.fuel;
  const met = r.power / 0.23 + 90; // puissance métabolique (W), rendement brut 23 %
  const carbShare = Math.min(1, Math.max(0.3, 0.25 + 0.75 * (r.power / r.cp)));
  f.gly = Math.max(0, f.gly - ((met * carbShare) / 17000) * dt); // 17 kJ/g
  const absorb = Math.min(f.gut, (75 / 3600) * dt);
  f.gut -= absorb;
  f.gly = Math.min(f.glyMax, f.gly + absorb);
  f.deficit += ((0.35 + 0.9 * Math.min(1.4, r.power / r.cp)) * f.heat / 3600) * dt;
}

// actions : "bar" (40 g), "gel" (25 g), "drink" (150 mL)
export function eat(r, what) {
  const f = r.fuel;
  if (what === "bar" && f.bars > 0) { f.bars--; f.gut += 40; return "Barre énergétique : +40 g de glucides"; }
  if (what === "gel" && f.gels > 0) { f.gels--; f.gut += 25; f.gly = Math.min(f.glyMax, f.gly + 6); return "Gel : +25 g de glucides, rapide"; }
  if (what === "drink") {
    const i = f.bottles.findIndex((b) => b > 0);
    if (i < 0) return null;
    const ml = Math.min(150, f.bottles[i]);
    f.bottles[i] -= ml;
    f.deficit = Math.max(-0.3, f.deficit - ml / 1000);
    f.gut += ml * 0.04; // boisson isotonique : 40 g/L
    return `Une gorgée : ${ml} mL`;
  }
  return null;
}

// puissance nécessaire pour rouler à v (m/s) sur la pente g, avec aspiration
export function requiredPower(r, v, g, alt, draft, head = 0) {
  const m = r.mass + r.bikeMass;
  const th = Math.atan(g);
  const cda = (r.bike === "clm" ? 0.245 : 0.32) * (1 - draft);
  const va = v - head;
  const f = m * G * Math.sin(th) + CRR * m * G * Math.cos(th) + 0.5 * airDensity(alt) * cda * va * Math.abs(va);
  return Math.max(0, (f * v) / ETA);
}

const sm = {};

// avance le coureur de dt secondes
// r.free (joueur en mouvement libre) fournit sa propre géométrie :
// { y, grade, dx, dz, curv, crr } ; sa position est alors intégrée par l'appelant.
export function step(r, route, env, dt) {
  const p = r.free || route.sample(r.s, sm);
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

  if (r.fuel) fuelStep(r, dt);
  // W' (Skiba 2)
  if (r.power > r.cp) r.wbal -= (r.power - r.cp) * dt;
  else r.wbal += ((r.cp - r.power) * (r.wPrime - r.wbal) / r.wPrime) * dt * 1.2;
  r.wbal = Math.min(r.wPrime, Math.max(0, r.wbal));

  // fréquence cardiaque (réponse retardée)
  const hrT = r.hrRest + (r.hrMax - r.hrRest) * Math.min(1, 0.32 + 0.62 * (r.power / r.cp) + (1 - r.wbal / r.wPrime) * 0.12);
  const tau = hrT > r.hr ? 18 : 35;
  r.hr += (hrT - r.hr) * Math.min(1, dt / tau);

  // aérodynamique : position + aspiration
  // traînée : sur les cocottes 0,32 m², en danseuse 0,36, recroquevillé en
  // descente 0,22 ; en contre-la-montre allongé sur les prolongateurs 0,245
  let cda = r.tuck ? 0.22 : r.posture > 0 ? 0.36 : 0.32;
  if (r.bike === "clm" && !r.tuck) cda = r.posture > 0 ? 0.35 : 0.245;
  cda *= 1 - r.draft;
  const rho = airDensity(p.y);
  const head = env.windX * p.dx + env.windZ * p.dz; // composante du vent dans le sens de marche
  const vAir = r.v - head;
  const fAero = 0.5 * rho * cda * vAir * Math.abs(vAir);
  const fGrav = m * G * Math.sin(theta);
  const fRoll = (r.free ? r.free.crr : r.offRoad ? 0.02 : CRR) * m * G * Math.cos(theta);
  const fPedal = (r.power * ETA) / Math.max(r.v, 1.5);
  let fBrake = r.brake * m * 6.5;

  // virages : accélération latérale
  const kappa = p.curv;
  r.latG = (r.v * r.v * Math.abs(kappa)) / G;
  const acc = (fPedal - fAero - fGrav - fRoll - (r.v > 0.05 ? fBrake : 0)) / (m + 1.5);
  r.v = Math.max(0, r.v + acc * dt);

  // progression : on coupe les virages à la corde
  if (!r.free) {
    const denom = Math.max(0.4, 1 - kappa * r.o);
    r.s += (r.v * dt) / denom;
  }
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

// Groupes : coureurs qui se suivent à moins de 15 m. Chaque groupe roule au
// train médian de ses membres (relais), la tête l'impose, les autres
// s'alignent sur la vitesse de la tête : pas d'effet accordéon.
export function assignChains(sorted, route) {
  let start = 0;
  for (let i = 0; i <= sorted.length; i++) {
    if (i === sorted.length || (i > 0 && sorted[i - 1].s - sorted[i].s > 15)) {
      const members = sorted.slice(start, i);
      const head = members[0];
      const g = route.sample(head.s + 25).grade;
      const pace = members.filter((m) => m.ai).map((m) => m.cp * paceFactor(m.ai, g) * m.ai.mood).sort((a, b) => a - b);
      const med = pace.length ? pace[Math.floor(pace.length / 2)] : 0;
      for (const m of members) { m._head = head; m._groupPace = med; m._groupSize = members.length; }
      start = i;
    }
  }
}

function paceFactor(ai, g) {
  if (g > 0.02) return ai.climb;
  if (g > -0.02) return ai.flat;
  if (g > -0.05) return 0.45;
  return 0.1;
}

// Comportement des coureurs du peloton. sorted : coureurs triés du premier
// au dernier, idx : place de r dans ce tableau. Un coureur suit la roue de
// celui qui le précède tant que l'effort demandé reste dans ses moyens ;
// sinon il lâche prise et roule à son train. Attaques, relais et sprint
// final naissent de ces règles.
export function aiThink(r, route, sorted, idx, dt, env) {
  const ai = r.ai;
  const here = route.sample(r.s);
  const p = route.sample(r.s + 25);
  const g = p.grade;
  ai.t -= dt;
  if (ai.t <= 0) {
    ai.t = 4 + Math.random() * 8;
    ai.mood = 0.94 + Math.random() * 0.1;
    // attaque : plutôt en montée, par les coureurs offensifs et frais
    const chance = (g > 0.04 ? 0.22 : 0.05) * ai.aggr;
    if (Math.random() < chance && r.wbal > r.wPrime * 0.75 && !ai.dropped) ai.attack = 8 + Math.random() * 18;
  }
  const own = r.cp * paceFactor(ai, g) * ai.mood;
  let target = own;
  const head = r._head;
  const isHead = !head || head === r;
  // roue à suivre : le coureur le plus proche devant
  let lead = null, gap = 1e9;
  // on chasse jusqu'à 120 m si l'on a encore de la réserve
  const reach = r.wbal > r.wPrime * 0.4 ? 120 : 45;
  for (let j = idx - 1; j >= 0; j--) {
    const o = sorted[j];
    const d = o.s - r.s;
    if (d > reach) break;
    if (d > 0.2 && d < gap && !o.crashed) { gap = d; lead = o; }
  }
  if (ai.dropped > 0) ai.dropped -= dt;
  if (isHead && r._groupSize > 1) {
    // en tête du groupe : il impose le train du groupe s'il en a les moyens
    target = Math.min(r._groupPace || own, r.wbal > r.wPrime * 0.2 ? r.cp * 1.2 : r.cp * 0.97);
  }
  if (lead && ai.dropped <= 0) {
    // vitesse de référence : la tête du groupe (ou la roue devant si l'on chasse)
    const ref = !isHead && gap < 15 ? head.v : lead.v;
    const vWant = ref + Math.max(-1.0, Math.min(2.5, (gap - 1.8) * 0.3));
    const wind = env.windX * here.dx + env.windZ * here.dz;
    const need = requiredPower(r, vWant, here.grade, here.y, gap < 3 ? 0.3 : gap < 8 ? 0.12 : 0, wind);
    // au-dessus du seuil, on puise dans la réserve W' ; quand elle est vide,
    // on lâche prise et on roule à son train
    target = Math.min(need, r.wbal > r.wPrime * 0.08 ? r.cp * 1.5 : r.cp * 0.97);
    if (r.wbal < r.wPrime * 0.05 && need > r.cp) ai.dropped = 20 + Math.random() * 25;
  }
  if (ai.attack > 0) { ai.attack -= dt; target = r.cp * 1.35; }
  // gestion de la réserve quand il roule seul
  if (!lead && r.wbal < r.wPrime * 0.3) target = Math.min(target, r.cp * 0.92);
  // sprint final
  r.sprint = false;
  const left = (env.finish ?? route.length) - r.s;
  if (left < 320 && left > 0 && r.wbal > 0) { target = r.cp * 2.2; r.sprint = true; }
  r.target = target;
  r.tuck = g < -0.04 && r.v > 11;
  // freinage avant les virages
  const safe = route.safeSpeedAhead(r.s, 70, 0.6);
  r.brake = r.v > safe.v ? Math.min(1, (r.v - safe.v) * 0.6) : 0;
  // placement latéral : on se décale si la roue devant bouche le passage
  let want = ai.lane;
  for (let j = idx - 1; j >= 0; j--) {
    const o = sorted[j];
    const d = o.s - r.s;
    if (d > 4) break;
    if (d > 0 && Math.abs(o.o - r.o) < 0.65 && (r.v > o.v + 0.2 || ai.attack > 0)) {
      want = o.o + (o.o > 0 ? -0.9 : 0.9);
      break;
    }
  }
  r.oTarget = Math.max(-2.5, Math.min(2.5, want));
  r.o += (r.oTarget - r.o) * Math.min(1, dt * 0.7);
}
