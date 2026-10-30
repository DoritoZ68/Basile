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
  // 6 m de large x 13 m de long : enrobé, réparations, fissures, marquages
  const W = 256, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#58585a";
  g.fillRect(0, 0, W, H);
  const r = rng(7);
  for (let i = 0; i < 26000; i++) {
    const v = 60 + r() * 60;
    g.fillStyle = `rgba(${v},${v},${v + 2},${0.18 + r() * 0.35})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2.2, 1 + r() * 2.2);
  }
  // reprises d'enrobé plus sombres
  for (let i = 0; i < 3; i++) {
    g.fillStyle = `rgba(35,35,38,${0.05 + r() * 0.05})`;
    g.beginPath();
    g.ellipse(r() * W, r() * H, 20 + r() * 40, 40 + r() * 90, 0, 0, Math.PI * 2);
    g.fill();
  }
  // fissures
  g.strokeStyle = "rgba(25,25,25,0.5)";
  g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    let x = r() * W, y = r() * H;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 18; y += r() * 14; g.lineTo(x, y); }
    g.stroke();
  }
  // usure des bandes de roulement
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, "rgba(90,88,80,0.35)");
  grd.addColorStop(0.08, "rgba(40,40,40,0)");
  grd.addColorStop(0.3, "rgba(28,28,28,0.2)");
  grd.addColorStop(0.42, "rgba(40,40,40,0)");
  grd.addColorStop(0.58, "rgba(40,40,40,0)");
  grd.addColorStop(0.7, "rgba(28,28,28,0.2)");
  grd.addColorStop(0.92, "rgba(40,40,40,0)");
  grd.addColorStop(1, "rgba(90,88,80,0.35)");
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // ligne axiale discontinue (3 m de trait, 10 m de vide), un peu usée
  g.fillStyle = "rgba(236,236,228,0.92)";
  g.fillRect(W / 2 - 4, 0, 8, Math.round(H * 3 / 13));
  for (let i = 0; i < 300; i++) {
    g.fillStyle = "rgba(80,80,80,0.5)";
    g.fillRect(W / 2 - 4 + r() * 8, r() * H * 3 / 13, 1.5, 1.5);
  }
  // lignes de rive
  g.fillStyle = "rgba(232,232,222,0.8)";
  g.fillRect(9, 0, 5, H);
  g.fillRect(W - 14, 0, 5, H);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// accotement : gravillons et herbe rase
function vergeTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#6d6b58";
  g.fillRect(0, 0, 64, 256);
  const r = rng(11);
  for (let i = 0; i < 5000; i++) {
    const grass = r() < 0.55;
    const v = r();
    g.fillStyle = grass ? `rgba(${70 + v * 40},${95 + v * 45},${45 + v * 20},0.7)` : `rgba(${110 + v * 50},${108 + v * 50},${100 + v * 45},0.6)`;
    g.fillRect(r() * 64, r() * 256, 1 + r() * 2, 1 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildRoads(routes, renderer) {
  const tex = roadTexture();
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const vergeMat = new THREE.MeshLambertMaterial({ map: vergeTexture(), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const group = new THREE.Group();
  const done = new RoadIndex([], 6);
  routes.forEach((r, ri) => {
    const n = r.x.length;
    // un point est déjà couvert s'il se trouve sur la chaussée d'une route
    // déjà construite, au même niveau (sinon c'est un croisement ou un lacet)
    const covered = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const q = done.nearest(r.x[i], r.z[i], 1.6);
      covered[i] = q.y !== null && Math.abs(q.y - r.y[i]) < 0.8 ? 1 : 0;
    }
    // un court passage commun (croisement) ne doit pas couper la chaussée
    for (let i = 0; i < n; i++) {
      if (!covered[i]) continue;
      let j = i;
      while (j < n && covered[j]) j++;
      if (j - i < 10) for (let k = i; k < j; k++) covered[k] = 0;
      i = j;
    }
    let i = 0;
    while (i < n) {
      while (i < n && covered[i]) i++;
      if (i >= n) break;
      let j = i;
      while (j < n && !covered[j]) j++;
      // chevauchement de 3 points avec la route existante : pas de jour
      const a = Math.max(0, i - 3), b = Math.min(n - 1, j + 2);
      if (b - a >= 1) {
        // chaussée au ras du sol, accotements qui rejoignent le terrain
        group.add(ribbon(r, a, b, [[-3.0, 0.06], [3.0, 0.06]], mat, true));
        group.add(ribbon(r, a, b, [[-4.6, -0.04], [-2.9, 0.04]], vergeMat, true));
        group.add(ribbon(r, a, b, [[2.9, 0.04], [4.6, -0.04]], vergeMat, true));
      }
      i = j;
    }
    for (let k = 0; k < n; k++) done.add(r.x[k], r.z[k], r.y[k]);
  });
  return group;
}

// bande le long du parcours ; edge = [[décalage gauche, dy], [décalage droit, dy]]
function ribbon(r, a, b, edge, mat, uvs) {
  const [[o0, y0], [o1, y1]] = edge;
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
    pos.set([r.x[i] + rx * o0, r.y[i] + y0, r.z[i] + rz * o0, r.x[i] + rx * o1, r.y[i] + y1, r.z[i] + rz * o1], k * 6);
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
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------ arbres
// sapin : étages de branches irréguliers, plus sombres vers le bas et l'intérieur
function conifer(near) {
  const parts = [];
  if (near) {
    const trunk = new THREE.CylinderGeometry(0.008, 0.014, 0.3, 5, 1, true);
    trunk.translate(0, 0.15, 0);
    paint(trunk, 0x4a3426);
    parts.push(trunk);
  }
  const R = rng(3);
  const tiers = near ? [[0.155, 0.36, 0.12], [0.12, 0.33, 0.37], [0.08, 0.32, 0.6]] : [[0.14, 0.86, 0.14]];
  for (const [rad, h, y] of tiers) {
    const c = new THREE.ConeGeometry(rad, h, near ? 7 : 5, 1, false);
    // bords de branches irréguliers
    const pa = c.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      if (pa.getY(i) < 0 && near) {
        const k = 0.85 + R() * 0.3;
        pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); pa.setY(i, pa.getY(i) - R() * 0.03);
      }
    }
    c.rotateY(R() * 3);
    c.translate(0, y + h / 2, 0);
    paintGrad(c, 0x24432a, 0x4a7244);
    parts.push(c);
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}

// feuillu (hêtre, chêne) : houppier en deux masses, éclairé par le haut
function broadleaf(near) {
  const parts = [];
  if (near) {
    const trunk = new THREE.CylinderGeometry(0.014, 0.024, 0.5, 5, 1, true);
    trunk.translate(0, 0.25, 0);
    paint(trunk, 0x5a4636);
    parts.push(trunk);
  }
  const crowns = near ? [[0, 0.6, 0, 0.23], [0.06, 0.8, -0.03, 0.16]] : [[0, 0.66, 0, 0.26]];
  for (const [x, y, z, r] of crowns) {
    const sp = near ? new THREE.IcosahedronGeometry(r, 0) : new THREE.OctahedronGeometry(r, 0);
    sp.scale(1, near ? 0.95 : 1.15, 1);
    sp.translate(x, y, z);
    paintGrad(sp, 0x34502a, 0x6f8f45);
    parts.push(sp);
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}

function vine() {
  // rang de vigne : feuillage étroit sur piquets (0,35 m de large, 1,4 m de haut)
  const g = new THREE.BoxGeometry(0.35, 1.1, 9.6);
  g.translate(0, 0.75, 0);
  paint(g, 0x5f7a2e);
  return g;
}

// dégradé vertical (ombre interne simulée, sans calcul à l'exécution)
function paintGrad(g, low, high) {
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const c0 = new THREE.Color(low), c1 = new THREE.Color(high), c = new THREE.Color();
  const pa = g.attributes.position;
  const a = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) {
    const t = (pa.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1);
    c.copy(c0).lerp(c1, t * t * 0.6 + t * 0.4);
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
}

function paint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
}

// Végétation par cases de la grille, construite à la demande autour du
// cycliste (carte de végétation BD TOPO : sapins, feuillus, vignes).
export class Forest {
  constructor(data, ground) {
    this.ground = ground;
    this.veg = data.veg;
    this.meta = data.meta;
    // deux niveaux de détail : près (~50 triangles) et loin (8 à 10 triangles)
    this.geos = { conifer: conifer(true), broadleaf: broadleaf(true), vine: vine() };
    this.far = { conifer: conifer(false), broadleaf: broadleaf(false) };
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.built = new Set();
  }

  vegAt(x, z) {
    const m = this.meta, v = this.veg;
    const u = (x - m.x_min) / (m.x_max - m.x_min), w = (z - m.z_min) / (m.z_max - m.z_min);
    const px = Math.floor(u * v.w), py = Math.floor(w * v.h);
    if (px < 0 || py < 0 || px >= v.w || py >= v.h) return [0, 0, 0];
    const k = (py * v.w + px) * 4;
    return [v.px[k], v.px[k + 1], v.px[k + 2]];
  }

  // plante une case carrée [ci*size, (ci+1)*size] ; density 0..1
  buildCell(ci, cj, size, density) {
    const R = rng((ci * 92821) ^ (cj * 68917) ^ 0x5bd1e995);
    const g = this.ground;
    const lists = { conifer: [], broadleaf: [], vine: [] };
    const tmp = new THREE.Object3D();
    const step = 6.5 / Math.sqrt(Math.max(0.2, density));
    const x0 = ci * size, z0 = cj * size;
    // vignes : rangs parallèles orientés dans la pente de la case
    const cx = x0 + size / 2, cz = z0 + size / 2;
    const gx = g.hf.height(cx + 20, cz) - g.hf.height(cx - 20, cz), gz = g.hf.height(cx, cz + 20) - g.hf.height(cx, cz - 20);
    const vineRot = Math.atan2(gx, gz);
    const ax = Math.cos(vineRot), az = -Math.sin(vineRot), lx = Math.sin(vineRot), lz = Math.cos(vineRot);
    for (let a = 0; a < size; a += step) {
      for (let b = 0; b < size; b += step) {
        const x = x0 + a + R() * step, z = z0 + b + R() * step;
        const [cR, cG, cB] = this.vegAt(x, z);
        if (!cR && !cG && !cB) { R(); R(); R(); R(); continue; }
        if (cB > 100) {
          // une portion de rang de vigne sur deux
          if (R() < 0.5) continue;
          const rr = Math.round(((x - cx) * ax + (z - cz) * az) / 1.9), ll = Math.round(((x - cx) * lx + (z - cz) * lz) / 9.8);
          const xx = cx + rr * 1.9 * ax + ll * 9.8 * lx, zz = cz + rr * 1.9 * az + ll * 9.8 * lz;
          if (g.road(xx, zz, 4) !== null) continue;
          tmp.position.set(xx, g.height(xx, zz) - 0.1, zz);
          tmp.rotation.set(0, vineRot, 0);
          tmp.scale.set(1, 0.85 + R() * 0.25, 1);
          tmp.updateMatrix();
          lists.vine.push([tmp.matrix.clone(), 0.9 + R() * 0.2]);
          continue;
        }
        const pc = cR / (cR + cG + 1);
        if (cR + cG < 120 && R() > 0.5) continue; // forêt ouverte, haies
        const type = R() < pc ? "conifer" : "broadleaf";
        const y = g.height(x, z);
        let sc = type === "conifer" ? 18 + R() * 16 : 10 + R() * 9;
        // hêtres rabougris et sapins plus bas sur les crêtes
        const alt = Math.min(1, Math.max(0, (y - 1050) / 300));
        sc *= 1 - 0.55 * alt * alt * (3 - 2 * alt);
        // la couronne ne doit pas surplomber une chaussée
        if (g.road(x, z, 1.5 + sc * (type === "conifer" ? 0.16 : 0.27)) !== null) continue;
        tmp.position.set(x, y - 0.4, z);
        tmp.rotation.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06);
        tmp.scale.set(sc * (0.85 + R() * 0.3), sc, sc * (0.85 + R() * 0.3));
        tmp.updateMatrix();
        lists[type].push([tmp.matrix.clone(), 0.75 + R() * 0.45]);
      }
    }
    const group = new THREE.Group();
    const cell = { x: cx, z: cz, near: [], far: [], vines: [], group };
    const col = new THREE.Color();
    for (const type of Object.keys(lists)) {
      const L = lists[type];
      if (!L.length) continue;
      const im = new THREE.InstancedMesh(this.geos[type], this.mat, L.length);
      im.castShadow = type !== "vine";
      L.forEach(([m, shade], i) => {
        im.setMatrixAt(i, m);
        col.setRGB(shade, shade * (0.95 + R() * 0.1), shade * (0.9 + R() * 0.15));
        im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.matrixAutoUpdate = false;
      group.add(im);
      if (type === "vine") { cell.vines.push(im); continue; }
      cell.near.push(im);
      // version simplifiée qui partage positions et couleurs
      const fm = new THREE.InstancedMesh(this.far[type], this.mat, L.length);
      fm.instanceMatrix = im.instanceMatrix;
      fm.instanceColor = im.instanceColor;
      fm.boundingSphere = im.boundingSphere;
      fm.matrixAutoUpdate = false;
      fm.visible = false;
      group.add(fm);
      cell.far.push(fm);
    }
    this.built.add(cell);
    return {
      group,
      dispose: () => {
        this.built.delete(cell);
        for (const m of [...cell.near, ...cell.vines]) m.dispose();
      },
    };
  }

  // niveau de détail : arbres détaillés à moins de nearDist
  update(camPos, nearDist = 150) {
    for (const c of this.built) {
      const d = Math.hypot(c.x - camPos.x, c.z - camPos.z) - 125;
      const near = d < nearDist;
      for (const m of c.near) m.visible = near;
      for (const m of c.far) m.visible = !near;
      for (const m of c.vines) m.visible = d < nearDist * 1.6;
    }
  }
}

// Chargement progressif par cases autour d'un point : construit au plus ce
// que permet le budget de temps à chaque image, libère ce qui s'éloigne.
export class Streamer {
  constructor(size, build) {
    this.size = size;
    this.build = build;
    this.cells = new Map();
    this.group = new THREE.Group();
  }

  update(fx, fz, radius, budgetMs) {
    const S = this.size;
    const t0 = performance.now();
    for (const [k, c] of this.cells) {
      if (Math.hypot(c.cx - fx, c.cz - fz) > radius + S) {
        if (c.obj) { this.group.remove(c.obj.group); c.obj.dispose(); }
        this.cells.delete(k);
      }
    }
    const want = [];
    const r = Math.ceil(radius / S);
    const fi = Math.floor(fx / S), fj = Math.floor(fz / S);
    for (let j = fj - r; j <= fj + r; j++) {
      for (let i = fi - r; i <= fi + r; i++) {
        const cx = (i + 0.5) * S, cz = (j + 0.5) * S;
        const d = Math.hypot(cx - fx, cz - fz) - S * 0.71;
        if (d > radius) continue;
        const k = `${i},${j}`;
        if (!this.cells.has(k)) want.push([d, i, j, k, cx, cz]);
      }
    }
    want.sort((a, b) => a[0] - b[0]);
    let built = 0;
    for (const [, i, j, k, cx, cz] of want) {
      if (built && performance.now() - t0 > budgetMs) break;
      const obj = this.build(i, j);
      if (obj) this.group.add(obj.group);
      this.cells.set(k, { cx, cz, obj });
      built++;
    }
    return want.length - built; // cases encore à construire
  }

  clear() {
    for (const c of this.cells.values()) if (c.obj) { this.group.remove(c.obj.group); c.obj.dispose(); }
    this.cells.clear();
  }
}

// ------------------------------------------------------------ bâtiments
const WALLS = ["#efe6d2", "#e8d9b5", "#f0d2b4", "#e9c9a0", "#ddd6c6", "#f2e8c9", "#e6cbc4", "#d3dccf", "#f4efe6", "#e8dcc0", "#d9c3a4"];
const ROOFS = ["#8a4a36", "#7b3f2f", "#9a5a40", "#6e4a3c", "#80463a", "#5f4b45"];

export function buildBuildings(list, hf, keep = () => true) {
  const R = rng(list.length ? Math.floor(list[0][2][0] * 31 + list[0][2][1] * 17) : 99);
  const cell = 600;
  const buckets = new Map();
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  for (const [h, kind, flat] of list) {
    if (!keep(flat[0], flat[1])) continue;
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
  // fenêtres dessinées dans le shader : étages de 3 m, travées de 2,7 m
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (abs(vWNor.y) < 0.3) {
          vec2 t = normalize(vec2(-vWNor.z, vWNor.x));
          float u = dot(vWPos.xz, t) / 2.7;
          float v = vWPos.y / 3.0;
          float wx = step(0.32, fract(u)) * step(fract(u), 0.7);
          float wy = step(0.38, fract(v)) * step(fract(v), 0.8);
          float d = length(vWPos - cameraPosition);
          float k = wx * wy * (1.0 - smoothstep(150.0, 600.0, d));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.19, 0.22), k * 0.85);
          // volets en bois de part et d'autre
          float sh = (step(0.22, fract(u)) * step(fract(u), 0.31) + step(0.71, fract(u)) * step(fract(u), 0.8)) * wy;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.42, 0.3), sh * 0.6 * (1.0 - smoothstep(150.0, 400.0, d)));
        }`,
      );
  };
  const group = new THREE.Group();
  const chunks = [];
  for (const bk of buckets.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(bk.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(bk.col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.matrixAutoUpdate = false;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    chunks.push({ x: bk.x, z: bk.z, mesh: m });
  }
  return {
    group,
    update(camPos, dist) {
      for (const c of chunks) c.mesh.visible = Math.hypot(c.x - camPos.x, c.z - camPos.z) < dist + 450;
    },
    dispose() {
      for (const c of chunks) c.mesh.geometry.dispose();
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
      time: { value: 0 },
      cover: { value: 0.35 },
      cloudLit: { value: new THREE.Color(0xffffff) },
      cloudDark: { value: new THREE.Color(0x9aa3ae) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`,
    // nuages : bruit de valeur sur un plafond plat projeté sur la voûte
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float haze;
      uniform float time; uniform float cover; uniform vec3 cloudLit; uniform vec3 cloudDark; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 c = mix(horizon, top, pow(h, 0.55));
        float s = max(dot(d, sunDir), 0.0);
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.08) * 1.6 + vec2(time * 0.004, time * 0.0015);
          float n = fbm(uv);
          float k = smoothstep(1.0 - cover, 1.0 - cover + 0.28, n) * smoothstep(0.0, 0.12, d.y);
          float lit = clamp(0.55 + (fbm(uv + sunDir.xz * 0.08) - n) * 3.0 + pow(s, 6.0) * 0.4, 0.0, 1.0);
          vec3 cc = mix(cloudDark, cloudLit, lit);
          c = mix(c, cc, k * 0.92);
          c += sunColor * pow(s, 600.0) * 1.5 * (1.0 - k);
        }
        c += sunColor * pow(s, 12.0) * 0.25 * (1.0 - haze * 0.7);
        c = mix(c, horizon, haze * (1.0 - h * 0.4));
        if (d.y < 0.0) c = horizon;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

// ------------------------------------------------------------ pluie
// gouttes en traits autour de la caméra : positions fixes repliées dans une
// boîte qui suit la caméra (tout est calculé dans le shader)
export function buildRain(n = 4000) {
  const pos = new Float32Array(n * 6), end = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random(), y = Math.random(), z = Math.random();
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("end", new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { cam: { value: new THREE.Vector3() }, time: { value: 0 }, wind: { value: new THREE.Vector2() } },
    vertexShader: `attribute float end; uniform vec3 cam; uniform float time; uniform vec2 wind; varying float vA;
      void main(){
        vec3 B = vec3(44.0, 26.0, 44.0);
        vec3 p = position * B;
        p.y -= time * 9.0;
        p.xz += wind * time;
        vec3 w = cam + mod(p - cam, B) - B * 0.5;
        w += end * vec3(-wind.x * 0.06, -0.55, -wind.y * 0.06);
        vA = 1.0 - end * 0.7;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.78, 0.82, 0.88, 0.32 * vA); }`,
  });
  const m = new THREE.LineSegments(g, mat);
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

// ------------------------------------------------------------ public et inscriptions
const SHIRTS = [0xd8323c, 0xf2c230, 0x1f6fd1, 0xffffff, 0x2f9e57, 0xff7a1a, 0xe85d9a, 0x222222, 0x7fd3ff, 0x9b59b6];

function personGeos() {
  const shirt = mergeGeometries([
    new THREE.CylinderGeometry(0.2, 0.17, 0.62, 7).translate(0, 1.18, 0),
    new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5).rotateZ(2.6).translate(0.32, 1.55, 0),
    new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5).rotateZ(-2.6).translate(-0.32, 1.55, 0),
  ]);
  const legs = new THREE.CylinderGeometry(0.17, 0.13, 0.86, 7).translate(0, 0.43, 0);
  paint(legs, 0x2d3540);
  const head = new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.64, 0);
  paint(head, 0xe0b293);
  return { shirt, rest: mergeGeometries([legs.toNonIndexed(), head.toNonIndexed()]) };
}

export class Crowd {
  constructor() {
    this.geos = personGeos();
    this.group = new THREE.Group();
    this.list = [];
  }

  build(route, spots) {
    for (const m of this.group.children) m.dispose?.();
    this.group.clear();
    const R = rng(77);
    const people = [];
    for (const { s0, s1, density } of spots) {
      for (let s = Math.max(0, s0); s < Math.min(route.length, s1); s += 2.2) {
        if (R() > density) continue;
        const p = route.sample(s);
        const side = R() < 0.5 ? -1 : 1;
        const off = side * (4.4 + R() * 2.6);
        const x = p.x - p.dz * off, z = p.z + p.dx * off;
        people.push({ x, z, y: p.y + (Math.abs(off) - 4) * 0.05, rot: Math.atan2(p.dz * side, -p.dx * side) + (R() - 0.5), s, phase: R() * 6.28, h: 0.92 + R() * 0.16, col: SHIRTS[Math.floor(R() * SHIRTS.length)] });
      }
    }
    this.people = people;
    if (!people.length) return;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const matShirt = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.shirts = new THREE.InstancedMesh(this.geos.shirt, matShirt, people.length);
    this.rest = new THREE.InstancedMesh(this.geos.rest, mat, people.length);
    const c = new THREE.Color();
    people.forEach((q, i) => this.shirts.setColorAt(i, c.setHex(q.col)));
    this.shirts.castShadow = this.rest.castShadow = true;
    this.group.add(this.shirts, this.rest);
    this.wasActive = true;
    this.update(-1e9, 0);
  }

  // le public saute au passage du coureur
  update(sPlayer, t) {
    if (!this.people || !this.people.length) return;
    // rien à animer si personne n'est près du coureur (économie de calcul)
    const active = this.people.some((q) => Math.abs(q.s - sPlayer) < 35);
    if (!active && !this.wasActive) return;
    this.wasActive = active;
    const o = new THREE.Object3D();
    this.people.forEach((q, i) => {
      const near = Math.abs(q.s - sPlayer) < 35;
      const bob = near ? Math.abs(Math.sin(t * 7 + q.phase)) * 0.22 : 0;
      o.position.set(q.x, q.y + bob, q.z);
      o.rotation.set(0, q.rot, 0);
      o.scale.setScalar(q.h);
      o.updateMatrix();
      this.shirts.setMatrixAt(i, o.matrix);
      this.rest.setMatrixAt(i, o.matrix);
    });
    this.shirts.instanceMatrix.needsUpdate = true;
    this.rest.instanceMatrix.needsUpdate = true;
    this.shirts.computeBoundingSphere();
    this.rest.computeBoundingSphere();
  }
}

// inscription peinte à même la chaussée
export function roadPaint(text, p, offset = 0) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.font = '900 96px "Arial Black", Impact, Arial, sans-serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "rgba(245,245,240,0.88)";
  g.fillText(text, 256, 68, 500);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }),
  );
  // lisible par le cycliste qui arrive : le haut du texte vers l'avant
  m.rotation.order = "YXZ";
  m.rotation.set(-Math.PI / 2, Math.atan2(p.dx, p.dz) + Math.PI, 0);
  m.position.set(p.x - p.dz * offset, p.y + 0.16, p.z + p.dx * offset);
  return m;
}
