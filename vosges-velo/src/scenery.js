// Routes, arbres (d'après la BD TOPO végétation), bâtiments BD TOPO,
// lieux remarquables et panneaux.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ------------------------------------------------------------ index spatial
export class RoadIndex {
  constructor(routes, cell = 12) {
    this.cell = cell;
    this.map = new Map();
    for (let r = 0; r < routes.length; r++) {
      const rt = routes[r];
      for (let i = 0; i < rt.x.length; i++) this.add(rt.x[i], rt.z[i], rt.y[i]);
    }
  }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  add(x, z, y) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let a = this.map.get(k);
    if (!a) this.map.set(k, (a = []));
    a.push(x, z, y);
  }
  nearest(x, z, maxD = 30) {
    const ci = Math.floor(x / this.cell), cj = Math.floor(z / this.cell);
    const r = Math.ceil(maxD / this.cell);
    let best = maxD * maxD, by = null;
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        const a = this.map.get(this.key(i, j));
        if (!a) continue;
        for (let k = 0; k < a.length; k += 3) {
          const d = (a[k] - x) ** 2 + (a[k + 1] - z) ** 2;
          if (d < best) { best = d; by = a[k + 2]; }
        }
      }
    }
    return { d: Math.sqrt(best), y: by };
  }
}

// ------------------------------------------------------------ aléatoire déterministe
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------ routes
function roadTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#5d5d5f";
  g.fillRect(0, 0, 128, 512);
  const r = rng(7);
  for (let i = 0; i < 5000; i++) {
    const v = 70 + r() * 50;
    g.fillStyle = `rgba(${v},${v},${v + 3},${0.25 + r() * 0.3})`;
    g.fillRect(r() * 128, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  // usure des bandes de roulement
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, "rgba(40,40,40,0.25)");
  grd.addColorStop(0.25, "rgba(40,40,40,0)");
  grd.addColorStop(0.32, "rgba(30,30,30,0.18)");
  grd.addColorStop(0.42, "rgba(40,40,40,0)");
  grd.addColorStop(0.58, "rgba(40,40,40,0)");
  grd.addColorStop(0.68, "rgba(30,30,30,0.18)");
  grd.addColorStop(0.75, "rgba(40,40,40,0)");
  grd.addColorStop(1, "rgba(40,40,40,0.25)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 512);
  // ligne axiale discontinue (3 m de trait / 10 m de vide, ramené à 13 m)
  g.fillStyle = "#e9e9e2";
  g.fillRect(62, 0, 4, 118);
  // lignes de rive
  g.fillStyle = "rgba(235,235,225,0.85)";
  g.fillRect(5, 0, 3, 512);
  g.fillRect(120, 0, 3, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildRoads(routes, renderer) {
  const tex = roadTexture();
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const vergeMat = new THREE.MeshLambertMaterial({ color: 0x6b6a58, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const group = new THREE.Group();
  const done = new RoadIndex([], 6);
  routes.forEach((r, ri) => {
    const n = r.x.length;
    const covered = new Uint8Array(n);
    for (let i = 0; i < n; i++) covered[i] = done.nearest(r.x[i], r.z[i], 4).y !== null ? 1 : 0;
    let i = 0;
    while (i < n) {
      while (i < n && covered[i]) i++;
      if (i >= n) break;
      let j = i;
      while (j < n && !covered[j]) j++;
      const a = Math.max(0, i - 1), b = Math.min(n - 1, j);
      if (b - a >= 1) {
        group.add(ribbon(r, a, b, 3.0, 0.1 + ri * 0.004, mat, true));
        group.add(ribbon(r, a, b, 4.3, -0.12, vergeMat, false));
      }
      i = j;
    }
    for (let k = 0; k < n; k++) done.add(r.x[k], r.z[k], r.y[k]);
  });
  return group;
}

function ribbon(r, a, b, half, dy, mat, uvs) {
  const cnt = b - a + 1;
  const pos = new Float32Array(cnt * 2 * 3);
  const uv = new Float32Array(cnt * 2 * 2);
  let s = 0;
  for (let k = 0; k < cnt; k++) {
    const i = a + k;
    const i0 = Math.max(0, i - 1), i1 = Math.min(r.x.length - 1, i + 1);
    let dx = r.x[i1] - r.x[i0], dz = r.z[i1] - r.z[i0];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const rx = -dz, rz = dx;
    if (k) s += Math.hypot(r.x[i] - r.x[i - 1], r.z[i] - r.z[i - 1]);
    pos.set([r.x[i] - rx * half, r.y[i] + dy, r.z[i] - rz * half, r.x[i] + rx * half, r.y[i] + dy, r.z[i] + rz * half], k * 6);
    uv.set([0, s / 13, 1, s / 13], k * 4);
  }
  const idx = [];
  for (let k = 0; k < cnt - 1; k++) {
    const p = k * 2;
    idx.push(p, p + 1, p + 2, p + 2, p + 1, p + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (uvs) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.matrixAutoUpdate = false;
  return m;
}

// ------------------------------------------------------------ arbres
function conifer() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.008, 0.014, 0.3, 5);
  trunk.translate(0, 0.15, 0);
  paint(trunk, 0x4a3426);
  parts.push(trunk);
  const tiers = [[0.15, 0.42, 0.14], [0.115, 0.36, 0.38], [0.075, 0.3, 0.64]];
  for (const [rad, h, y] of tiers) {
    const c = new THREE.ConeGeometry(rad, h, 7);
    c.translate(0, y + h / 2, 0);
    paint(c, 0x2c4a2a);
    parts.push(c);
  }
  return mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p));
}

function broadleaf() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.014, 0.024, 0.5, 5);
  trunk.translate(0, 0.25, 0);
  paint(trunk, 0x5a4636);
  parts.push(trunk);
  const crowns = [[0, 0.6, 0, 0.21], [0.1, 0.74, 0.04, 0.15], [-0.08, 0.78, -0.05, 0.14]];
  for (const [x, y, z, r] of crowns) {
    const s = new THREE.IcosahedronGeometry(r, 0);
    s.scale(1, 1.1, 1);
    s.translate(x, y, z);
    paint(s, 0x4d6b32);
    parts.push(s);
  }
  return mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p));
}

function vine() {
  const g = new THREE.BoxGeometry(0.5, 1.2, 9.6);
  g.translate(0, 0.6, 0);
  paint(g, 0x5f7a2e);
  return g;
}

function paint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
}

export class Forest {
  constructor(data, hf, roadIndex) {
    this.hf = hf;
    this.veg = data.veg;
    this.meta = data.meta;
    this.roadIndex = roadIndex;
    this.geos = { conifer: conifer(), broadleaf: broadleaf(), vine: vine() };
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.group = new THREE.Group();
    this.chunks = [];
  }

  vegAt(x, z) {
    const m = this.meta, v = this.veg;
    const u = (x - m.x_min) / (m.x_max - m.x_min), w = (z - m.z_min) / (m.z_max - m.z_min);
    const px = Math.floor(u * v.w), py = Math.floor(w * v.h);
    if (px < 0 || py < 0 || px >= v.w || py >= v.h) return [0, 0, 0];
    const k = (py * v.w + px) * 4;
    return [v.px[k], v.px[k + 1], v.px[k + 2]];
  }

  clear() {
    for (const c of this.chunks) for (const m of c.meshes) { m.dispose(); this.group.remove(m); }
    this.chunks = [];
  }

  // plante les arbres dans un couloir autour du parcours
  build(route, band, density) {
    this.clear();
    const R = rng(1234 + route.n);
    const occupied = new Set();
    const SEG = 250;
    const nSeg = Math.ceil(route.length / SEG);
    const tmp = new THREE.Object3D();
    const col = new THREE.Color();
    for (let sg = 0; sg < nSeg; sg++) {
      const lists = { conifer: [], broadleaf: [], vine: [] };
      let cx = 0, cz = 0, cnt = 0;
      for (let s = sg * SEG; s < Math.min(route.length, (sg + 1) * SEG); s += 10) {
        const p = route.sample(s);
        cx += p.x; cz += p.z; cnt++;
        const rx = -p.dz, rz = p.dx;
        const tries = Math.round(band * 2 * 10 / 45 * density);
        for (let t = 0; t < tries; t++) {
          // densité plus forte près de la route
          const u = R() * 2 - 1;
          const off = Math.sign(u) * (6 + Math.pow(Math.abs(u), 1.6) * band);
          const along = (R() - 0.5) * 10;
          const x = p.x + rx * off + p.dx * along, z = p.z + rz * off + p.dz * along;
          const [cR, cG, cB] = this.vegAt(x, z);
          if (!cR && !cG && !cB) continue;
          const k = `${Math.round(x / 3.5)},${Math.round(z / 3.5)}`;
          if (occupied.has(k)) continue;
          if (this.roadIndex.nearest(x, z, 6.5).y !== null) continue;
          occupied.add(k);
          let type;
          if (cB > 100) type = "vine";
          else {
            const pc = cR / (cR + cG + 1);
            if (cR + cG < 120 && R() > 0.5) continue; // forêt ouverte, haies
            type = R() < pc ? "conifer" : "broadleaf";
          }
          const y = this.hf.height(x, z);
          let sc;
          if (type === "vine") {
            // rangs de vigne orientés dans la pente
            const gx = this.hf.height(x + 3, z) - this.hf.height(x - 3, z);
            const gz = this.hf.height(x, z + 3) - this.hf.height(x, z - 3);
            tmp.position.set(x, y, z);
            tmp.rotation.set(0, Math.atan2(gx, gz) + (R() - 0.5) * 0.1, 0);
            tmp.scale.set(1, 0.8 + R() * 0.3, 1);
            // rangs parallèles serrés
            for (let rr = -2; rr <= 2; rr++) {
              const o = new THREE.Object3D();
              o.rotation.copy(tmp.rotation);
              o.scale.copy(tmp.scale);
              const ax = Math.cos(tmp.rotation.y), az = -Math.sin(tmp.rotation.y);
              const xx = x + ax * rr * 1.8, zz = z + az * rr * 1.8;
              if (this.roadIndex.nearest(xx, zz, 6).y !== null) continue;
              o.position.set(xx, this.hf.height(xx, zz) - 0.1, zz);
              o.updateMatrix();
              lists.vine.push([o.matrix.clone(), 0.9 + R() * 0.2]);
            }
            continue;
          }
          sc = type === "conifer" ? 18 + R() * 16 : 13 + R() * 11;
          tmp.position.set(x, y - 0.4, z);
          tmp.rotation.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06);
          tmp.scale.set(sc * (0.85 + R() * 0.3), sc, sc * (0.85 + R() * 0.3));
          tmp.updateMatrix();
          lists[type].push([tmp.matrix.clone(), 0.75 + R() * 0.45]);
        }
      }
      const chunk = { x: cx / Math.max(1, cnt), z: cz / Math.max(1, cnt), meshes: [] };
      for (const type of Object.keys(lists)) {
        const L = lists[type];
        if (!L.length) continue;
        const im = new THREE.InstancedMesh(this.geos[type], this.mat, L.length);
        L.forEach(([m, shade], i) => {
          im.setMatrixAt(i, m);
          col.setRGB(shade, shade * (0.95 + R() * 0.1), shade * (0.9 + R() * 0.15));
          im.setColorAt(i, col);
        });
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.matrixAutoUpdate = false;
        this.group.add(im);
        chunk.meshes.push(im);
      }
      this.chunks.push(chunk);
    }
  }

  update(camPos, dist) {
    for (const c of this.chunks) {
      const vis = Math.hypot(c.x - camPos.x, c.z - camPos.z) < dist + 200;
      for (const m of c.meshes) m.visible = vis;
    }
  }
}

// ------------------------------------------------------------ bâtiments
const WALLS = ["#efe6d2", "#e8d9b5", "#f0d2b4", "#e9c9a0", "#ddd6c6", "#f2e8c9", "#e6cbc4", "#d3dccf", "#f4efe6", "#e8dcc0", "#d9c3a4"];
const ROOFS = ["#8a4a36", "#7b3f2f", "#9a5a40", "#6e4a3c", "#80463a", "#5f4b45"];

export function buildBuildings(list, hf) {
  const R = rng(99);
  const cell = 600;
  const buckets = new Map();
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  for (const [h, kind, flat] of list) {
    let pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    // orientation anti-horaire vue de dessus
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
      area += x0 * z1 - x1 * z0;
    }
    if (area > 0) pts = pts.reverse();
    let ymin = 1e9, ymax = -1e9, cx = 0, cz = 0;
    for (const [x, z] of pts) {
      const y = hf.height(x, z);
      ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
      cx += x; cz += z;
    }
    cx /= pts.length; cz /= pts.length;
    const height = Math.max(3, Math.min(60, h));
    const kindWall = kind === 2 ? "#b9b8b0" : kind === 1 ? "#ddd3c2" : kind === 3 ? "#a9a49a" : WALLS[Math.floor(R() * WALLS.length)];
    const kindRoof = kind === 2 ? "#7d8288" : kind === 1 ? "#4f4740" : ROOFS[Math.floor(R() * ROOFS.length)];
    c1.set(kindWall); c2.set(kindRoof);
    const shade = 0.9 + R() * 0.15;
    c1.multiplyScalar(shade);
    const pos = [], col = [];
    const pushV = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };
    const base = ymin - 1;
    const gable = pts.length === 4 && kind !== 2 && height < 25;
    const top = ymax + (gable ? height * 0.62 : height);
    // murs
    for (let i = 0; i < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
      pushV(x0, base, z0, c1); pushV(x1, base, z1, c1); pushV(x1, top, z1, c1);
      pushV(x0, base, z0, c1); pushV(x1, top, z1, c1); pushV(x0, top, z0, c1);
    }
    if (gable) {
      // toit à deux pans le long du grand côté
      const e0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const e1 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const q = e0 >= e1 ? pts : [pts[1], pts[2], pts[3], pts[0]];
      const short = Math.min(e0, e1);
      const ridgeH = top + Math.min(9, short * 0.55);
      const m0 = [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2];
      const m1 = [(q[3][0] + q[0][0]) / 2, (q[3][1] + q[0][1]) / 2];
      // pignons
      pushV(q[1][0], top, q[1][1], c1); pushV(q[2][0], top, q[2][1], c1); pushV(m0[0], ridgeH, m0[1], c1);
      pushV(q[3][0], top, q[3][1], c1); pushV(q[0][0], top, q[0][1], c1); pushV(m1[0], ridgeH, m1[1], c1);
      // pans
      pushV(q[0][0], top, q[0][1], c2); pushV(q[1][0], top, q[1][1], c2); pushV(m0[0], ridgeH, m0[1], c2);
      pushV(q[0][0], top, q[0][1], c2); pushV(m0[0], ridgeH, m0[1], c2); pushV(m1[0], ridgeH, m1[1], c2);
      pushV(q[2][0], top, q[2][1], c2); pushV(q[3][0], top, q[3][1], c2); pushV(m1[0], ridgeH, m1[1], c2);
      pushV(q[2][0], top, q[2][1], c2); pushV(m1[0], ridgeH, m1[1], c2); pushV(m0[0], ridgeH, m0[1], c2);
    } else {
      const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
      for (const [a, b, c] of tri) {
        pushV(pts[a][0], top, pts[a][1], c2); pushV(pts[c][0], top, pts[c][1], c2); pushV(pts[b][0], top, pts[b][1], c2);
      }
    }
    if (kind === 1 && Math.abs(area) > 300) {
      // clocher
      const s = 2.8, th = top + height * 0.9 + 8;
      const sq = [[cx - s, cz - s], [cx + s, cz - s], [cx + s, cz + s], [cx - s, cz + s]].reverse();
      for (let i = 0; i < 4; i++) {
        const [x0, z0] = sq[i], [x1, z1] = sq[(i + 1) % 4];
        pushV(x0, top - 2, z0, c1); pushV(x1, top - 2, z1, c1); pushV(x1, th, z1, c1);
        pushV(x0, top - 2, z0, c1); pushV(x1, th, z1, c1); pushV(x0, th, z0, c1);
        pushV(x0, th, z0, c2); pushV(x1, th, z1, c2); pushV(cx, th + 11, cz, c2);
      }
    }
    const key = `${Math.floor(cx / cell)},${Math.floor(cz / cell)}`;
    let bk = buckets.get(key);
    if (!bk) buckets.set(key, (bk = { pos: [], col: [], x: (Math.floor(cx / cell) + 0.5) * cell, z: (Math.floor(cz / cell) + 0.5) * cell }));
    for (let i = 0; i < pos.length; i++) bk.pos.push(pos[i]);
    for (let i = 0; i < col.length; i++) bk.col.push(col[i]);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const chunks = [];
  for (const bk of buckets.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(bk.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(bk.col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.matrixAutoUpdate = false;
    group.add(m);
    chunks.push({ x: bk.x, z: bk.z, mesh: m });
  }
  return {
    group,
    update(camPos, dist) {
      for (const c of chunks) c.mesh.visible = Math.hypot(c.x - camPos.x, c.z - camPos.z) < dist + 450;
    },
  };
}

// ------------------------------------------------------------ panneaux
export function textSign(lines, opts = {}) {
  const w = opts.w || 256, h = opts.h || 160;
  const c = document.createElement("canvas");
  c.width = w * 2; c.height = h * 2;
  const g = c.getContext("2d");
  g.scale(2, 2);
  const bg = opts.bg || "#ffffff", fg = opts.fg || "#111", border = opts.border || null;
  g.fillStyle = bg;
  roundRect(g, 0, 0, w, h, opts.radius ?? 10);
  g.fill();
  if (border) {
    g.lineWidth = opts.borderWidth || 10;
    g.strokeStyle = border;
    roundRect(g, 6, 6, w - 12, h - 12, (opts.radius ?? 10) - 3);
    g.stroke();
  }
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
  let y = h / 2 - total / 2;
  for (const l of lines) {
    g.font = `${l.weight || 700} ${l.size}px "Arial Narrow", Arial, sans-serif`;
    g.fillStyle = l.color || fg;
    const yy = y + (l.size * 1.15) / 2;
    g.fillText(l.text, w / 2, yy, w - 24);
    y += l.size * 1.15;
  }
  if (opts.strike) {
    g.strokeStyle = "#c8102e";
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(16, h - 16);
    g.lineTo(w - 16, 16);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const postMat = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });

// panneau sur poteau, à droite de la route, face aux cyclistes
export function signPost(tex, w, h, p, side = 1, off = 4.6, poleH = 1.4) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  panel.position.y = poleH + h / 2;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
  back.position.y = poleH + h / 2;
  back.rotation.y = Math.PI;
  back.position.z = -0.01;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, poleH + h, 6), postMat);
  pole.position.y = (poleH + h) / 2;
  pole.position.z = -0.03;
  g.add(panel, back, pole);
  const rx = -p.dz, rz = p.dx;
  g.position.set(p.x + rx * off * side, p.y - 0.2, p.z + rz * off * side);
  // face au cycliste qui arrive
  g.rotation.y = Math.atan2(-p.dx, -p.dz);
  return g;
}

// arche de départ / arrivée
export function gantry(text, p, color = "#c8102e") {
  const g = new THREE.Group();
  const tex = textSign([{ text, size: 54, color: "#fff" }], { w: 512, h: 90, bg: color, radius: 0 });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  banner.position.y = 5.2;
  const legMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.1, 0.5), legMat);
    leg.position.set(s * 5, 3.05, 0);
    g.add(leg);
  }
  g.add(banner);
  g.position.set(p.x, p.y, p.z);
  g.rotation.y = Math.atan2(-p.dx, -p.dz);
  return g;
}

// ------------------------------------------------------------ lieux remarquables
export function buildLandmarks(landmarks, hf, roadIndex) {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f4f0 });
  const stone = new THREE.MeshLambertMaterial({ color: 0xb8ad9a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3d3a36 });
  for (const l of landmarks) {
    const y = hf.height(l.x, l.z);
    if (l.kind === "radar") {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.5, 9, 16), new THREE.MeshLambertMaterial({ color: 0xd7d3c8 }));
      base.position.set(l.x, y + 4.5, l.z);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), white);
      dome.position.set(l.x, y + 15, l.z);
      g.add(base, dome);
    } else if (l.kind === "memorial") {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4, 3.5), stone);
      ped.position.set(l.x, y + 2, l.z);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3, 8), dark);
      st.position.set(l.x, y + 5.5, l.z);
      g.add(ped, st);
    } else if (l.kind === "summit" && l.name.startsWith("Hartmann")) {
      // grande croix sommitale du Vieil Armand
      const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 22, 1.4), white);
      v.position.set(l.x, y + 11, l.z);
      const h = new THREE.Mesh(new THREE.BoxGeometry(9, 1.4, 1.4), white);
      h.position.set(l.x, y + 16, l.z);
      g.add(v, h);
    } else if (l.kind === "hwk") {
      // esplanade et autel du monument national
      const p = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, 18), stone);
      p.position.set(l.x, y + 0.6, l.z);
      const altar = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 4), stone);
      altar.position.set(l.x, y + 4, l.z);
      g.add(p, altar);
    } else if (l.kind === "cemetery") {
      // croix blanches de la nécropole du Silberloch
      const cross = mergeGeometries([new THREE.BoxGeometry(0.1, 0.9, 0.08), new THREE.BoxGeometry(0.5, 0.1, 0.08).translate(0, 0.25, 0)]);
      cross.translate(0, 0.45, 0);
      const N = 25 * 16;
      const im = new THREE.InstancedMesh(cross, white, N);
      const o = new THREE.Object3D();
      let k = 0;
      for (let a = 0; a < 25; a++) {
        for (let b = 0; b < 16; b++) {
          const x = l.x - 30 + a * 2.4, z = l.z - 20 + b * 2.6;
          o.position.set(x, hf.height(x, z), z);
          o.updateMatrix();
          im.setMatrixAt(k++, o.matrix);
        }
      }
      g.add(im);
    }
  }
  return g;
}

// ------------------------------------------------------------ ciel
export function buildSky() {
  const geo = new THREE.SphereGeometry(40000, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x3a76c4) },
      horizon: { value: new THREE.Color(0xcfe0ef) },
      sunColor: { value: new THREE.Color(0xfff2d0) },
      sunDir: { value: new THREE.Vector3(0.3, 0.6, 0.2).normalize() },
      haze: { value: 0.0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float haze; varying vec3 vDir;
      void main(){
        float h = max(vDir.y, 0.0);
        vec3 c = mix(horizon, top, pow(h, 0.55));
        c = mix(c, horizon, haze);
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        c += sunColor * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.25) * (1.0 - haze * 0.7);
        if (vDir.y < 0.0) c = horizon;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}
