// Circulation en mode libre et en balade : quelques voitures roulent à
// droite sur les routes et rues autour du cycliste, passent d'un tronçon à
// l'autre aux carrefours, ralentissent derrière lui et le doublent quand la
// voie d'en face est libre.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Fleet, carBody } from "./vehicles.js";

const COLORS = ["#d9d9d6", "#2b2d31", "#8d939a", "#f4f4f2", "#1f3f73", "#8c1d1d", "#38503a", "#5b4636", "#b7b9bb", "#2a5f8f"];

export class Traffic {
  // lines : lignes de Ground ; allowed(li) : tronçons où circuler
  constructor(scene, ground, count, allowed) {
    this.ground = ground;
    this.allowed = allowed;
    this.fleet = new Fleet(scene, count + 1);
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const v = this.fleet.add(mergeGeometries(carBody({ body: COLORS[i % COLORS.length] })), "car");
      v.mesh.visible = false;
      this.cars.push({ v, alive: false, wait: i * 1.5 });
    }
    this.seed = 7;
  }

  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  dispose() { this.fleet.dispose(); }

  ok(li) {
    const L = this.ground.lines[li];
    return L && (L.route || L.cls <= 1) && !(L.flags & 4) && this.allowed(li);
  }

  // un point de départ sur une route à 200-460 m du cycliste
  spawn(c, p) {
    const g = this.ground;
    for (let tries = 0; tries < 12; tries++) {
      const a = this.rand() * Math.PI * 2, d = 200 + this.rand() * 260;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const list = g.map.get(g.key(Math.floor(x / g.cell), Math.floor(z / g.cell)));
      if (!list) continue;
      const m = Math.floor(this.rand() * (list.length / 2)) * 2;
      const li = list[m], k = list[m + 1];
      if (!this.ok(li)) continue;
      Object.assign(c, { alive: true, li, k, t: this.rand(), dir: this.rand() < 0.5 ? 1 : -1, sp: 12, lat: null, follow: 0, pass: false });
      return true;
    }
    return false;
  }

  // tronçon suivant au bout de la ligne : une autre ligne qui commence ou
  // finit au même point
  next(c, x, z) {
    const g = this.ground;
    const ci = Math.floor(x / g.cell), cj = Math.floor(z / g.cell);
    const cand = [];
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      const list = g.map.get(g.key(i, j));
      if (!list) continue;
      for (let m = 0; m < list.length; m += 2) {
        const li = list[m];
        if (li === c.li || !this.ok(li)) continue;
        const L = g.lines[li], n = L.x.length;
        if (Math.hypot(L.x[0] - x, L.z[0] - z) < 2) cand.push([li, 0, 1]);
        else if (Math.hypot(L.x[n - 1] - x, L.z[n - 1] - z) < 2) cand.push([li, n - 2, -1]);
      }
    }
    if (!cand.length) return false;
    const [li, k, dir] = cand[Math.floor(this.rand() * cand.length)];
    Object.assign(c, { li, k, dir, t: dir > 0 ? 0 : 1 });
    return true;
  }

  update(p, dt) {
    const g = this.ground;
    for (const c of this.cars) {
      if (!c.alive) {
        c.wait -= dt;
        if (c.wait <= 0 && !this.spawn(c, p)) c.wait = 1;
        if (!c.alive) { this.fleet.place(c.v, 0, -1e4, 0, 0, 0, 0, false); c.v.yaw = null; continue; }
      }
      const L = g.lines[c.li];
      // vitesse : 50 km/h en agglomération, 80 ailleurs, moins en virage
      const cruise = L.urban || L.cls === 1 ? 13 : 20;
      let want = cruise;
      const x0 = L.x[c.k], z0 = L.z[c.k], x1 = L.x[c.k + 1], z1 = L.z[c.k + 1];
      const segL = Math.hypot(x1 - x0, z1 - z0) || 1;
      const dx = ((x1 - x0) / segL) * c.dir, dz = ((z1 - z0) / segL) * c.dir;
      const lane = Math.max(1.0, L.half * 0.5);
      const cx = x0 + (x1 - x0) * c.t, cz = z0 + (z1 - z0) * c.t;
      if (c.lat === null) c.lat = lane;
      // le cycliste devant : on suit, puis on double par la gauche
      const rx = p.x - cx, rz = p.z - cz;
      const f = rx * dx + rz * dz, l = rx * -dz + rz * dx - c.lat;
      let latWant = lane;
      if (f > -8 && f < 30 && Math.abs(l) < 2.2) {
        c.follow += dt;
        if (c.follow > 2.5 && L.half >= 2.2) c.pass = true;
        // cycliste à contresens dans la voie : la voiture s'arrête
        const facing = p.free ? p.free.dx * dx + p.free.dz * dz : 1;
        if (facing < 0) { c.pass = false; want = f > 4 ? 0 : want; }
        else if (!c.pass) want = Math.min(want, Math.max(0, p.v - (f < 10 ? 1.5 : 0)));
      } else if (f < -8 || f > 40) { c.follow = 0; c.pass = false; }
      if (c.pass) {
        latWant = Math.min(lane, rx * -dz + rz * dx - 2.2);
        want = Math.min(want, p.v + 6);
      }
      c.lat += (latWant - c.lat) * Math.min(1, dt * 1.2);
      c.sp += Math.max(-6 * dt, Math.min(2.5 * dt, want - c.sp));
      // avance le long de la ligne, d'un tronçon à l'autre
      let move = c.sp * dt;
      let guard = 0;
      while (move > 0 && guard++ < 20) {
        const ax = L.x[c.k], az = L.z[c.k];
        const sl = Math.hypot(L.x[c.k + 1] - ax, L.z[c.k + 1] - az) || 1;
        const dtT = move / sl;
        if (c.dir > 0 ? c.t + dtT <= 1 : c.t - dtT >= 0) { c.t += dtT * c.dir; move = 0; break; }
        move -= (c.dir > 0 ? 1 - c.t : c.t) * sl;
        const n = g.lines[c.li].x.length;
        if (c.dir > 0 && c.k < n - 2) { c.k++; c.t = 0; }
        else if (c.dir < 0 && c.k > 0) { c.k--; c.t = 1; }
        else {
          const ex = c.dir > 0 ? L.x[n - 1] : L.x[0], ez = c.dir > 0 ? L.z[n - 1] : L.z[0];
          if (!this.next(c, ex, ez)) { c.alive = false; c.wait = 2; break; }
          break;
        }
      }
      if (!c.alive) continue;
      const M = g.lines[c.li];
      const X0 = M.x[c.k], Z0 = M.z[c.k], X1 = M.x[c.k + 1], Z1 = M.z[c.k + 1];
      const sl = Math.hypot(X1 - X0, Z1 - Z0) || 1;
      const ux = ((X1 - X0) / sl) * c.dir, uz = ((Z1 - Z0) / sl) * c.dir;
      const px = X0 + (X1 - X0) * c.t - uz * c.lat, pz = Z0 + (Z1 - Z0) * c.t + ux * c.lat;
      const py = M.y[c.k] + (M.y[c.k + 1] - M.y[c.k]) * c.t;
      const grade = ((M.y[c.k + 1] - M.y[c.k]) / sl) * c.dir;
      if (Math.hypot(px - p.x, pz - p.z) > 600) { c.alive = false; c.wait = 1; continue; }
      this.fleet.place(c.v, px, py + 0.03, pz, Math.atan2(ux, uz), -Math.atan(grade), dt, true);
    }
    this.fleet.update(dt);
  }
}
