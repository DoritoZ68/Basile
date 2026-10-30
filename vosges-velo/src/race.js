// Course en peloton : équipes et coureurs (fictifs), caravane (voiture de
// direction, motos, voitures d'équipe, voiture-balai), rendu du peloton en
// deux niveaux de détail, groupes et écarts.
import * as THREE from "three";
import { RiderModel } from "./rider.js";
import { makeRider } from "./physics.js";
import { Fleet, teamCar, officialCar, motoGeometry, roofSign, slate } from "./vehicles.js";

export const TEAMS = [
  { name: "Hopla Racing", jersey: "#e5332a", jersey2: "#ffffff", helmet: "#ffffff", frame: "#1c1c1c" },
  { name: "Crêtes Cycling", jersey: "#1f5fbf", jersey2: "#f4c20d", helmet: "#1f5fbf", frame: "#e8e8e8" },
  { name: "Vélo Club Thur", jersey: "#2c9a4a", jersey2: "#111111", helmet: "#111111", frame: "#2c9a4a" },
  { name: "Kougelhopf CT", jersey: "#f2c230", jersey2: "#1d1d1d", helmet: "#f2c230", frame: "#1d1d1d" },
  { name: "Sundgau Pro", jersey: "#6d2b8f", jersey2: "#f08bc0", helmet: "#ffffff", frame: "#6d2b8f" },
  { name: "Rhin Vélo", jersey: "#16a3c4", jersey2: "#0b3a63", helmet: "#0b3a63", frame: "#ffffff" },
  { name: "Munster Équipe", jersey: "#f07a1a", jersey2: "#2a2a2a", helmet: "#2a2a2a", frame: "#f07a1a" },
  { name: "Grand Ballon CC", jersey: "#f4f4f4", jersey2: "#c8102e", helmet: "#c8102e", frame: "#c8102e" },
  { name: "Forêt-Noire Team", jersey: "#1d3b2a", jersey2: "#a6d34e", helmet: "#a6d34e", frame: "#1d1d1d" },
  { name: "Kirsch Cycling", jersey: "#9c1b34", jersey2: "#f5d7a1", helmet: "#ffffff", frame: "#9c1b34" },
];

const FIRST = ["Léon", "Camille", "Julien", "Hugo", "Lucas", "Mathis", "Théo", "Nathan", "Louis", "Arthur", "Thomas", "Maxime", "Romain", "Pierre", "Antoine", "Quentin", "Florian", "Kevin", "Bastien", "Adrien", "Jonas", "Elias", "Noah", "Paul", "Victor", "Simon", "Valentin", "Clément", "Loïc", "Yann"];
const LAST = ["Schmitt", "Muller", "Meyer", "Weber", "Fischer", "Wagner", "Becker", "Schneider", "Hoffmann", "Klein", "Wolff", "Kieffer", "Zimmermann", "Hartmann", "Keller", "Roth", "Frey", "Baumann", "Huber", "Koch", "Wurtz", "Ehrhart", "Schaller", "Sutter", "Ott", "Haas", "Lang", "Kuhn", "Burger", "Stoll", "Riehl", "Ziegler", "Graff", "Jaeger", "Hirtz", "Walter"];

// peloton fictif : n coureurs répartis en équipes ; le joueur roule pour
// la première équipe (couleurs de son maillot)
export function makeField(n, level, playerJersey, startS) {
  const field = [];
  let seed = 4242;
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const teams = TEAMS.map((t, i) => (i === 0 ? { ...t, name: "Vosges Vélo", jersey: playerJersey, helmet: "#ffffff", jersey2: "#ffffff" } : t));
  const perTeam = Math.max(1, Math.ceil((n + 1) / teams.length));
  for (let i = 0; i < n; i++) {
    const team = teams[(i + 1) % teams.length];
    const mass = 58 + R() * 22;
    // niveau : W/kg au seuil autour de la moyenne choisie, avec des
    // grimpeurs légers et des rouleurs plus lourds
    const wkg = level * (0.86 + R() * 0.26) * (mass < 64 ? 1.04 : mass > 74 ? 0.97 : 1);
    const name = `${FIRST[Math.floor(R() * FIRST.length)]} ${LAST[Math.floor(R() * LAST.length)]}`;
    const slot = i + 1; // le joueur occupe la place 0 de la grille
    const row = Math.floor(slot / 6), lane = -2.2 + (slot % 6) * 0.88;
    const r = makeRider({
      name, mass, ftp: Math.round(mass * wkg), s: startS - row * 1.9, o: lane,
      ai: { climb: 0.9 + R() * 0.1, flat: 0.72 + R() * 0.14, aggr: R() * R(), grit: R(), mood: 1, t: R() * 5, attack: 0, lane: -2.1 + R() * 4.2, mu: 0.5 + R() * 0.1, dropped: 0, strain: 0 },
    });
    r.team = team;
    r.color = team.jersey;
    r.palette = { jersey: team.jersey, jersey2: team.jersey2, helmet: team.helmet, helmet2: team.jersey, frame: team.frame };
    field.push(r);
  }
  return { field, teams, perTeam };
}

// ---------------------------------------------------------------- rendu
// Les coureurs proches ont un modèle complet animé (réserve de modèles
// réhabillés à la volée) ; les autres sont dessinés en une fois, figés.
export class PelotonView {
  constructor(scene, nearCount, capacity) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < nearCount; i++) {
      const m = new RiderModel({ type: "route" });
      m.root.visible = false;
      m.owner = null;
      scene.add(m.root);
      this.pool.push(m);
    }
    const proto = new RiderModel({ type: "route", lite: true });
    const { team, rest } = proto.bakeStatic();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.team = new THREE.InstancedMesh(team, mat, capacity);
    this.rest = new THREE.InstancedMesh(rest, mat, capacity);
    for (const m of [this.team, this.rest]) {
      m.castShadow = true;
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
    }
    this.col = new THREE.Color();
    this.o = new THREE.Object3D();
  }

  dispose() {
    for (const m of this.pool) this.scene.remove(m.root);
    this.scene.remove(this.team, this.rest);
    this.team.dispose();
    this.rest.dispose();
  }

  // place les coureurs ; pose(r) -> { x, y, z, yaw, lean, pitch, v, cadence, posture }
  update(riders, camPos, dt, pose, shadowsOn) {
    const list = riders.map((r) => {
      const q = pose(r);
      return { r, q, d: (q.x - camPos.x) ** 2 + (q.z - camPos.z) ** 2 };
    }).sort((a, b) => a.d - b.d);
    const near = new Set(list.slice(0, this.pool.length).filter((e) => e.d < 160 * 160).map((e) => e.r));
    // modèles détaillés : on garde le même modèle pour le même coureur
    const free = this.pool.filter((m) => !m.owner || !near.has(m.owner));
    for (const m of this.pool) if (m.owner && !near.has(m.owner)) { m.owner = null; m.root.visible = false; }
    let n = 0;
    for (const e of list) {
      const { r, q } = e;
      if (near.has(r)) {
        let m = this.pool.find((x) => x.owner === r);
        if (!m) { m = free.pop(); m.owner = r; m.setPalette(r.palette); }
        m.root.visible = true;
        m.root.position.set(q.x, q.y, q.z);
        m.root.rotation.y = q.yaw;
        m.animate(dt, q.v, q.cadence, q.posture, q.lean, q.pitch);
        if (m.shadow) m.shadow.visible = !shadowsOn;
        continue;
      }
      if (e.d > 1400 * 1400) continue;
      const o = this.o;
      o.position.set(q.x, q.y, q.z);
      o.rotation.set(-q.pitch, q.yaw, 0, "YXZ");
      o.rotateZ(q.lean);
      o.updateMatrix();
      this.team.setMatrixAt(n, o.matrix);
      this.rest.setMatrixAt(n, o.matrix);
      this.team.setColorAt(n, this.col.set(r.team.jersey));
      n++;
    }
    for (const m of [this.team, this.rest]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }
    if (this.team.instanceColor) this.team.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- caravane
// course : 2 motos de gendarmerie, voiture de direction, motos commissaire,
// photo, télévision et ardoisier, voitures d'équipe, voiture-balai ;
// contre-la-montre (tt) : une moto devant le coureur, sa voiture suiveuse.
export class Convoy {
  constructor(scene, teams, { tt = false } = {}) {
    this.fleet = new Fleet(scene, 24);
    this.tt = tt;
    this.items = [];
    const add = (geo, kind, role, extra = {}, beacons = []) => {
      const v = this.fleet.add(geo, kind, beacons);
      const it = { v, role, s: 0, o: 0, ...extra };
      this.items.push(it);
      return it;
    };
    const blue = (ph) => [[-0.18, 2.06, -1.0, "#2a6cff", ph], [0.12, 1.24, 0.86, "#2a6cff", ph + 0.15]];
    add(motoGeometry("gendarme"), "moto", "gendarme", { lead: tt ? 40 : 150, off: tt ? -0.6 : -1.1 }, blue(0));
    if (!tt) {
      add(motoGeometry("gendarme"), "moto", "gendarme", { lead: 138, off: 1.1 }, blue(0.3));
      const dir = add(officialCar("#c8102e"), "car", "direction", {}, [[-0.45, 1.56, -0.2, "#ff8a00", 0], [0.45, 1.56, -0.2, "#ff8a00", 0.14]]);
      dir.v.mesh.add(roofSign([{ text: "DIRECTION DE COURSE", size: 30, color: "#fff" }], "#c8102e"));
      add(motoGeometry("com"), "moto", "moto", { lead: 34, off: 1.5 });
      add(motoGeometry("photo"), "moto", "moto", { lead: 24, off: -1.9 });
      add(motoGeometry("tv"), "moto", "moto", { lead: 11, off: -2.1 });
      const ard = add(motoGeometry("ardoise"), "moto", "ardoise");
      this.slate = slate();
      ard.v.mesh.add(this.slate);
      this.slateT = 0;
    }
    teams.forEach((t, i) => add(teamCar(t), "car", "team", { k: i, team: t }));
    if (!tt) {
      const balai = add(officialCar("#2a2a2a"), "car", "balai", {}, [[0, 1.56, -0.2, "#ff8a00", 0.07]]);
      balai.v.mesh.add(roofSign([{ text: "FIN DE COURSE", size: 32, color: "#111" }], "#f2c230"));
    }
    this.teamCall = null;
  }

  dispose() {
    for (const it of this.items) it.v.mesh.traverse((o) => { if (o !== it.v.mesh && o.material) { o.material.map?.dispose(); o.material.dispose(); o.geometry.dispose(); } });
    this.fleet.dispose();
  }

  // appelle la voiture de l'équipe du joueur à sa hauteur
  call(onArrive) { this.teamCall = { t: 0, onArrive, done: false }; }

  // leaderS : tête de course ; mainTail : dernier du gros groupe ; lastS : dernier coureur
  // riders : tous les coureurs ; les voitures ne roulent jamais dans un groupe
  // grp : groupes (écarts affichés par l'ardoisier)
  update(route, leaderS, mainTail, lastS, player, dt, riders = [], grp = []) {
    const q = {};
    const pos = (it, s, o) => {
      it.s = it.s ? it.s + Math.max(-30 * dt, Math.min(30 * dt, s - it.s)) : s;
      it.o += (o - it.o) * Math.min(1, dt * 0.8);
      route.sample(Math.max(0, Math.min(route.length, it.s)), q);
      // pas d'affichage au-delà de la fin du tracé
      this.fleet.place(it.v, q.x - q.dz * it.o, q.y + 0.03, q.z + q.dx * it.o, Math.atan2(q.dx, q.dz), -Math.atan(q.grade || 0), dt, it.s < route.length - 5 && it.s > 0);
    };
    const main = grp.length ? grp.reduce((a, g) => (g.riders.length > a.riders.length ? g : a)) : null;
    for (const it of this.items) {
      if (this.tt) {
        if (it.role === "gendarme") pos(it, player.s + it.lead, it.off);
        else if (it.role === "team") {
          let s = player.s - 14;
          if (it.s && it.s > player.s - 8) s = player.s - 10;
          pos(it, s, Math.max(-1.6, Math.min(1.6, player.o)) - 0.2);
        }
        continue;
      }
      if (it.role === "gendarme" || it.role === "moto") pos(it, leaderS + it.lead, it.off);
      else if (it.role === "direction") pos(it, leaderS + 70, -0.4);
      else if (it.role === "balai") pos(it, lastS - 45, -0.4);
      else if (it.role === "ardoise") {
        // devant le peloton quand une échappée a de l'avance, sinon en tête
        // devant le peloton, au milieu du trou avec le coureur suivant ; sinon
        // en tête de course
        let away = main && grp[0] !== main && main.gapTime > 8;
        let target = leaderS + 46;
        if (away) {
          let ahead = 1e9;
          for (const r of riders) if (r.s > main.headS + 1 && r.s < ahead) ahead = r.s;
          if (ahead - main.headS > 30) target = Math.min(main.headS + 28, (main.headS + ahead) / 2);
          else away = false;
        }
        // en changeant de place, la moto se range au bord de la route
        pos(it, target, Math.abs(target - it.s) > 12 ? 3.4 : 1.7);
        this.slateT -= dt;
        if (this.slateT <= 0) {
          this.slateT = 1;
          const t = Math.round(away ? main.gapTime : 0);
          this.slate.userData.draw(away ? `ÉCHAPPÉE (${grp[0].riders.length})` : "PELOTON", away ? `+${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` : "groupé");
        }
      } else if (it.role === "team") {
        let s = mainTail - 22 - it.k * 13, o = -1.2;
        // le joueur lâché : les voitures restent derrière lui
        if (player.s < mainTail - 8 && player.s > s - 30) s = Math.min(s, player.s - 14 - it.k * 13);
        // jamais dans un groupe : la voiture reste derrière le coureur le plus
        // proche devant elle (marge de 8 m)
        for (const r of riders) if (r.s > it.s - 2 && r.s < s + 8) s = Math.min(s, r.s - 8);
        const c = this.teamCall;
        if (it.k === 0 && c && !c.done) {
          // la voiture remonte à la gauche du coureur, donne bidons et
          // ravitaillement, puis redescend
          c.t += dt;
          s = player.s - 2.5;
          o = player.o - 2.3;
          if (Math.abs(it.s - (player.s - 2.5)) < 3 && c.t > 1) { c.done = true; c.onArrive(); }
          if (c.t > 40) c.done = true;
        }
        pos(it, s, o);
      }
    }
    this.fleet.update(dt);
  }
}

// groupes de course : un trou de plus de 2 s sépare deux groupes
export function groups(riders) {
  const sorted = [...riders].sort((a, b) => b.s - a.s);
  const out = [];
  let cur = null;
  for (const r of sorted) {
    if (!cur || (cur.tailS - r.s) / Math.max(4, r.v) > 2) {
      cur = { riders: [], headS: r.s, tailS: r.s, gapTime: 0 };
      out.push(cur);
    }
    cur.riders.push(r);
    cur.tailS = r.s;
  }
  const v = Math.max(4, sorted[0]?.v || 8);
  for (const g of out) g.gapTime = (out[0].headS - g.headS) / v;
  return out;
}
