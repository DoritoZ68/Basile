// Sol au bord des routes.
//
// Le relief IGN est une grille de 30 m : bien trop grossière pour épouser une
// chaussée de 6 m (la route flottait ou s'enfonçait selon la pente). On fait
// donc comme dans les jeux de course : un ruban de sol fin (une section tous
// les 5 m) accompagne chaque route sur ±30 m et raccorde la chaussée au
// relief réel, tandis que la grille grossière est masquée à cet endroit
// (masque de distance à la route, lu par le shader du relief).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const MASK_RANGE = 64; // distance (m) codée dans le masque sur 0..255
const VERGE_W = 1.6; // largeur d'accotement ou de trottoir
const SIDEWALK = 0.15; // hauteur des trottoirs
// discard du relief grossier quand la valeur du masque < DISCARD (voir main)
export const DISCARD = 22;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Paramètres par type de voie : demi-largeur mini, distance de raccord au
// relief (depuis le bord), largeur du ruban de sol (depuis l'axe), bande de
// texture, surélévation de la chaussée
export const CLASSES = {
  route: { half: 3.0, blend: 17.4, corr: 30, tex: 0, lift: 0.06 },
  0: { half: 3.0, blend: 14, extra: 16, tex: 0, lift: 0.07 }, // route principale
  1: { half: 2.2, blend: 9, extra: 12, tex: 1, lift: 0.06 }, // rue, route locale
  2: { half: 1.2, blend: 7, extra: 12, tex: 2, lift: 0.05 }, // piste cyclable, voie verte
  3: { half: 1.5, blend: 7, extra: 12, tex: 3, lift: 0.04 }, // route empierrée
};

// ligne de route : { x, z, y, half, blend, corr, tex, lift, route, cls, name }
export function routeLine(r) {
  const c = CLASSES.route;
  return { x: r.x, z: r.z, y: r.y, half: c.half, blend: c.blend, corr: c.corr, tex: c.tex, lift: c.lift, route: true, cls: -1, name: "", urbanV: r.urbanV || null };
}

export function networkLine(cls, width, x, z, y, name, flags) {
  const c = CLASSES[cls];
  const half = Math.max(c.half, width / 2);
  // rue d'agglomération : trottoirs au lieu d'accotements herbeux
  const urban = !!(flags & 8) && cls <= 1;
  return { x, z, y, half, blend: c.blend, corr: half + c.extra, tex: c.tex, lift: c.lift, route: false, cls, name, flags, urban };
}

export class Ground {
  constructor(hf, lines) {
    this.hf = hf;
    this.lines = lines;
    this.cell = 16;
    this.map = new Map();
    this.maxHalf = 0;
    lines.forEach((r, li) => {
      this.maxHalf = Math.max(this.maxHalf, r.half);
      for (let k = 0; k < r.x.length - 1; k++) {
        const key = this.key(Math.floor((r.x[k] + r.x[k + 1]) / 2 / this.cell), Math.floor((r.z[k] + r.z[k + 1]) / 2 / this.cell));
        let a = this.map.get(key);
        if (!a) this.map.set(key, (a = []));
        a.push(li, k);
      }
    });
    this._q = { d: 0, edge: 0, y: 0, li: 0, k: 0, line: null };
  }

  key(i, j) { return i * 73856093 ^ j * 19349663; }

  // voie la plus proche par distance AU BORD (négative sur la chaussée),
  // à moins de maxEdge ; maxLine limite la recherche aux lignes d'indice
  // inférieur ; les parcours ont une légère priorité sur le réseau
  // yRef : altitude actuelle du cycliste ; sous un pont ou à un croisement
  // de rues à des hauteurs différentes, on garde la voie à sa hauteur
  road(x, z, maxEdge, maxLine = 1e9, minLine = 0, yRef) {
    const c = this.cell, ci = Math.floor(x / c), cj = Math.floor(z / c);
    const rr = Math.ceil((maxEdge + this.maxHalf + 8) / c);
    let best = maxEdge, found = false;
    const q = this._q;
    for (let j = cj - rr; j <= cj + rr; j++) {
      for (let i = ci - rr; i <= ci + rr; i++) {
        const a = this.map.get(this.key(i, j));
        if (!a) continue;
        for (let m = 0; m < a.length; m += 2) {
          if (a[m] >= maxLine || a[m] < minLine) continue;
          const r = this.lines[a[m]], k = a[m + 1];
          const x0 = r.x[k], z0 = r.z[k];
          const ex = r.x[k + 1] - x0, ez = r.z[k + 1] - z0;
          const l2 = ex * ex + ez * ez || 1;
          let t = ((x - x0) * ex + (z - z0) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - x0 - ex * t, dz = z - z0 - ez * t;
          const d = Math.sqrt(dx * dx + dz * dz);
          // les parcours (chaussée suivie par la course) passent devant les rues
          let score = d - r.half - (r.route ? 0.8 : 0);
          if (yRef !== undefined) score += Math.max(0, Math.abs(r.y[k] + (r.y[k + 1] - r.y[k]) * t - yRef) - 1) * 2;
          if (score < best) {
            best = score;
            found = true;
            q.li = a[m]; q.k = k; q.line = r; q.d = d; q.edge = d - r.half;
            q.y = r.y[k] + (r.y[k + 1] - r.y[k]) * t;
          }
        }
      }
    }
    return found ? q : null;
  }

  // compatibilité : { d, y } (y = null si aucune voie à moins de maxD de l'axe)
  nearest(x, z, maxD) {
    const q = this.road(x, z, maxD - 1);
    return q && q.d < maxD ? { d: q.d, y: q.y } : { d: maxD, y: null };
  }

  // altitude du sol visible : chaussée, accotement, raccord, relief naturel
  height(x, z, yRef) {
    const n = this.hf.height(x, z);
    const q = this.road(x, z, 18, 1e9, 0, yRef);
    if (!q) return n;
    const L = q.line;
    if (q.edge <= 0) return q.y + L.lift;
    if (q.edge <= VERGE_W) {
      if (L.urban || (L.urbanV && L.urbanV[q.k])) return q.edge < 0.04 ? q.y + L.lift : q.y + SIDEWALK;
      return q.y + L.lift - 0.02 - (q.edge / VERGE_W) * (L.lift + 0.02);
    }
    if (q.edge >= L.blend) return n;
    const t = smooth((q.edge - VERGE_W) / (L.blend - VERGE_W));
    return (q.y - 0.04) * (1 - t) + n * t;
  }

  // 0 chaussée, 1 accotement ou chemin empierré, 2 hors route
  surface(x, z, yRef) {
    const q = this.road(x, z, VERGE_W, 1e9, 0, yRef);
    if (!q) return 2;
    if (q.edge > 0.2) return 1;
    return q.line.cls === 3 ? 1 : 0;
  }

  // masque de distance pour le shader du relief : valeur = d - (corr - 30),
  // de sorte que le seuil unique DISCARD masque jusqu'à corr - 8 m de l'axe
  // pour chaque voie (le ruban de sol va jusqu'à corr). Pas de bouts arrondis
  // aux extrémités des lignes, que le ruban ne couvre pas.
  buildMask(size) {
    const hf = this.hf;
    const data = new Uint8Array(size * size).fill(255);
    const px = hf.w / size, pz = hf.d / size;
    for (const r of this.lines) {
      const n = r.x.length;
      const shift = r.corr - 30;
      const R = DISCARD + shift + 4;
      for (let k = 0; k < n - 1; k++) {
        const x0 = r.x[k], z0 = r.z[k];
        const ex = r.x[k + 1] - x0, ez = r.z[k + 1] - z0;
        const l2 = ex * ex + ez * ez || 1;
        const ia = Math.max(0, Math.floor((Math.min(x0, x0 + ex) - R - hf.x0) / px));
        const ib = Math.min(size - 1, Math.ceil((Math.max(x0, x0 + ex) + R - hf.x0) / px));
        const zMin = Math.min(z0, z0 + ez) - R, zMax = Math.max(z0, z0 + ez) + R;
        const ja = Math.max(0, Math.floor(size - 1 - (zMax - hf.z0) / pz));
        const jb = Math.min(size - 1, Math.ceil(size - 1 - (zMin - hf.z0) / pz));
        for (let j = ja; j <= jb; j++) {
          const z = hf.z0 + (1 - (j + 0.5) / size) * hf.d;
          for (let i = ia; i <= ib; i++) {
            const x = hf.x0 + ((i + 0.5) / size) * hf.w;
            let t = ((x - x0) * ex + (z - z0) * ez) / l2;
            if ((k === 0 && t < 0) || (k === n - 2 && t > 1)) continue;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const d = Math.hypot(x - x0 - ex * t, z - z0 - ez * t) - shift;
            const v = Math.max(0, Math.min(255, Math.round((d / MASK_RANGE) * 255)));
            const idx = j * size + i;
            if (v < data[idx]) data[idx] = v;
          }
        }
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }
}

// ------------------------------------------------------------ géométries
// Atlas de 4 revêtements côte à côte (256 px chacun, 13 m de long) :
// 0 route avec axe et rives, 1 rue sans marquage, 2 piste cyclable,
// 3 route empierrée
function roadTexture() {
  const W = 256, H = 1024;
  const c = document.createElement("canvas");
  c.width = W * 4; c.height = H;
  const g = c.getContext("2d");
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const asphalt = (x0, base, light) => {
    g.fillStyle = base;
    g.fillRect(x0, 0, W, H);
    for (let i = 0; i < 22000; i++) {
      const v = light + r() * 60;
      g.fillStyle = `rgba(${v},${v},${v + 2},${0.18 + r() * 0.35})`;
      g.fillRect(x0 + r() * W, r() * H, 1 + r() * 2.2, 1 + r() * 2.2);
    }
    g.strokeStyle = "rgba(25,25,25,0.4)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      let x = x0 + 10 + r() * (W - 20), y = r() * H;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x = Math.max(x0 + 2, Math.min(x0 + W - 2, x + (r() - 0.5) * 18)); y += r() * 14; g.lineTo(x, y); }
      g.stroke();
    }
    const grd = g.createLinearGradient(x0, 0, x0 + W, 0);
    grd.addColorStop(0, "rgba(90,88,80,0.35)");
    grd.addColorStop(0.08, "rgba(40,40,40,0)");
    grd.addColorStop(0.3, "rgba(28,28,28,0.18)");
    grd.addColorStop(0.42, "rgba(40,40,40,0)");
    grd.addColorStop(0.58, "rgba(40,40,40,0)");
    grd.addColorStop(0.7, "rgba(28,28,28,0.18)");
    grd.addColorStop(0.92, "rgba(40,40,40,0)");
    grd.addColorStop(1, "rgba(90,88,80,0.35)");
    g.fillStyle = grd;
    g.fillRect(x0, 0, W, H);
  };
  // 0 : route départementale
  asphalt(0, "#58585a", 60);
  g.fillStyle = "rgba(236,236,228,0.92)";
  g.fillRect(W / 2 - 4, 0, 8, Math.round((H * 3) / 13));
  g.fillStyle = "rgba(232,232,222,0.8)";
  g.fillRect(9, 0, 5, H);
  g.fillRect(W - 14, 0, 5, H);
  // 1 : rue de village
  asphalt(W, "#5d5c5c", 64);
  // 2 : piste cyclable, enrobé plus clair, axe discontinu court
  asphalt(2 * W, "#68676a", 76);
  g.fillStyle = "rgba(236,236,228,0.85)";
  for (let y = 0; y < H; y += H / 4) g.fillRect(2 * W + W / 2 - 3, y, 6, H / 10);
  // 3 : route empierrée (graviers, ornières)
  g.fillStyle = "#8a7e66";
  g.fillRect(3 * W, 0, W, H);
  for (let i = 0; i < 26000; i++) {
    const v = r();
    g.fillStyle = `rgba(${110 + v * 70},${100 + v * 60},${80 + v * 50},${0.35 + r() * 0.4})`;
    g.fillRect(3 * W + r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
  }
  const rut = g.createLinearGradient(3 * W, 0, 4 * W, 0);
  rut.addColorStop(0.2, "rgba(60,50,35,0)");
  rut.addColorStop(0.3, "rgba(60,50,35,0.25)");
  rut.addColorStop(0.4, "rgba(60,50,35,0)");
  rut.addColorStop(0.6, "rgba(60,50,35,0)");
  rut.addColorStop(0.7, "rgba(60,50,35,0.25)");
  rut.addColorStop(0.8, "rgba(60,50,35,0)");
  g.fillStyle = rut;
  g.fillRect(3 * W, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// accotement (herbe et gravillons) | trottoir (enrobé clair et bordure)
function vergeTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 256;
  const g = c.getContext("2d");
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#6a6b52";
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 5000; i++) {
    const grass = r() < 0.6;
    const v = r();
    g.fillStyle = grass ? `rgba(${70 + v * 40},${95 + v * 45},${45 + v * 20},0.7)` : `rgba(${110 + v * 50},${108 + v * 50},${100 + v * 45},0.6)`;
    g.fillRect(r() * 64, r() * 256, 1 + r() * 2, 1 + r() * 3);
  }
  g.fillStyle = "#8e8c88";
  g.fillRect(64, 0, 64, 256);
  for (let i = 0; i < 4000; i++) {
    const v = 120 + r() * 50;
    g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
    g.fillRect(64 + r() * 64, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  // bordure de trottoir en granit côté chaussée (colonne de droite)
  g.fillStyle = "#b8b6b0";
  g.fillRect(118, 0, 10, 256);
  g.fillStyle = "rgba(60,60,60,0.5)";
  for (let y = 0; y < 256; y += 32) g.fillRect(118, y, 10, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// bande le long d'une portion de route ; cols = décalages latéraux,
// hfun(x, z, off) = altitude, uvMode : "road" (u en travers, v en long) ou "world"
function strip(r, a, b, cols, hfun, uvMode, hf, inner, uRange = [0, 1]) {
  const nc = cols.length, nr = b - a + 1;
  const pos = new Float32Array(nr * nc * 3);
  const uv = new Float32Array(nr * nc * 2);
  let s = 0;
  for (let k = 0; k < nr; k++) {
    const i = a + k;
    const i0 = Math.max(0, i - 1), i1 = Math.min(r.x.length - 1, i + 1);
    let dx = r.x[i1] - r.x[i0], dz = r.z[i1] - r.z[i0];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    // onglet : dans un angle, on écarte les bords pour garder la largeur
    let miter = 1;
    if (i > 0 && i < r.x.length - 1) {
      let ax = r.x[i] - r.x[i - 1], az = r.z[i] - r.z[i - 1];
      const la = Math.hypot(ax, az) || 1;
      miter = 1 / Math.max(0.5, (ax * dx + az * dz) / la);
    }
    if (k) s += Math.hypot(r.x[i] - r.x[i - 1], r.z[i] - r.z[i - 1]);
    for (let c = 0; c < nc; c++) {
      let off = cols[c] * (Math.abs(cols[c]) < 6 ? miter : Math.min(miter, 1.3));
      // côté intérieur d'un virage serré : on ne dépasse pas le centre
      if (inner) {
        const lim = inner[i];
        if (lim && Math.sign(off) === Math.sign(lim) && Math.abs(off) > Math.abs(lim)) off = lim;
      }
      const x = r.x[i] - dz * off, z = r.z[i] + dx * off;
      const p = (k * nc + c) * 3;
      pos[p] = x; pos[p + 1] = hfun(x, z, off, i); pos[p + 2] = z;
      const q = (k * nc + c) * 2;
      if (uvMode === "road") { uv[q] = uRange[0] + (uRange[1] - uRange[0]) * (c / (nc - 1)); uv[q + 1] = s / 13; }
      else { uv[q] = (x - hf.x0) / hf.w; uv[q + 1] = 1 - (z - hf.z0) / hf.d; }
    }
  }
  const idx = [];
  for (let k = 0; k < nr - 1; k++) {
    for (let c = 0; c < nc - 1; c++) {
      const p = k * nc + c;
      idx.push(p, p + 1, p + nc, p + nc, p + 1, p + nc + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// limite latérale côté intérieur des virages (rayon de courbure lissé)
function innerLimits(r) {
  const n = r.x.length;
  const lim = new Float32Array(n);
  const raw = new Float32Array(n).fill(1e9);
  for (let i = 2; i < n - 2; i++) {
    const ax = r.x[i] - r.x[i - 2], az = r.z[i] - r.z[i - 2];
    const bx = r.x[i + 2] - r.x[i], bz = r.z[i + 2] - r.z[i];
    const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1;
    const cross = (ax * bz - az * bx) / (la * lb);
    const ang = Math.asin(Math.max(-1, Math.min(1, cross)));
    const k = ang / ((la + lb) / 2); // courbure signée (+ = droite)
    if (Math.abs(k) > 1 / 60) raw[i] = Math.sign(k) * 0.92 / Math.abs(k);
  }
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) {
      if (raw[j] < 1e8 && (best === 0 || Math.abs(raw[j]) < Math.abs(best))) best = raw[j];
    }
    lim[i] = best;
  }
  return lim;
}

const texU = (k) => [k / 4 + 0.004, (k + 1) / 4 - 0.004];

// chaussée + accotements + ruban de sol d'une portion [a, b] de ligne
function lineGeometry(ground, L, a, b, inner, out) {
  const hf = ground.hf;
  const h = L.half, v = h + VERGE_W;
  const lift = L.lift + (L.route ? 0 : ((a * 7 + L.x.length) % 5) * 0.004);
  const urban = L.urban || (L.urbanV && L.urbanV[(a + b) >> 1]);
  out.roads.push(strip(L, a, b, [-h, h], (x, z, o, k) => L.y[k] + lift, "road", hf, null, texU(L.tex)));
  // là où l'accotement ou le trottoir passe sur la chaussée d'une autre voie
  // (carrefours), on l'abaisse sous cet enrobé pour ne pas barrer la rue
  const under = (x, z, y) => {
    const q = ground.road(x, z, 0.05);
    return q && q.line !== L ? Math.min(y, q.y + q.line.lift - 0.04) : y;
  };
  if (urban) {
    const top = SIDEWALK;
    out.verges.push(strip(L, a, b, [-v, -h - 0.04, -h + 0.02], (x, z, o, k) => under(x, z, L.y[k] + (o > -h ? lift - 0.01 : top)), "road", hf, null, [0.5, 1]));
    out.verges.push(strip(L, a, b, [h - 0.02, h + 0.04, v], (x, z, o, k) => under(x, z, L.y[k] + (o < h ? lift - 0.01 : top)), "road", hf, null, [1, 0.5]));
  } else {
    out.verges.push(strip(L, a, b, [-v, -h + 0.1], (x, z, o, k) => under(x, z, L.y[k] + (o < -h ? -0.03 : 0.03)), "road", hf, null, [0, 0.5]));
    out.verges.push(strip(L, a, b, [h - 0.1, v], (x, z, o, k) => under(x, z, L.y[k] + (o > h ? -0.03 : 0.03)), "road", hf, null, [0.5, 0]));
  }
  const cr = L.corr;
  const colsR = L.route ? [v - 0.05, 8.5, 13, 18, 24, cr] : [v - 0.05, v + 3, v + 6.5, cr];
  const colsL = colsR.map((c) => -c).reverse();
  const hfun = (x, z) => ground.height(x, z);
  out.ground.push(strip(L, a, b, colsL, hfun, "world", hf, inner));
  out.ground.push(strip(L, a, b, colsR, hfun, "world", hf, inner));
}

function finishMeshes(out, mats, chunked) {
  const meshes = [];
  const add = (list, mat, shadow) => {
    if (!list.length) return;
    const g = mergeGeometries(list);
    list.forEach((x) => x.dispose());
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.matrixAutoUpdate = false;
    m.receiveShadow = shadow;
    meshes.push(m);
  };
  add(out.roads, mats.road, true);
  add(out.verges, mats.verge, true);
  if (!chunked) add(out.ground, mats.ground, true);
  return meshes;
}

export function makeRoadMaterials(groundMat, renderer) {
  // Phong : léger reflet du soleil sur l'enrobé, fort sur route mouillée
  const road = new THREE.MeshPhongMaterial({ map: roadTexture(), specular: 0x161616, shininess: 14, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  road.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const verge = new THREE.MeshLambertMaterial({ map: vergeTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  return { road, verge, ground: groundMat };
}

// Parcours : construits une fois pour toutes. Les tronçons communs à
// plusieurs parcours ne sont construits qu'une fois.
export function buildRoutes(ground, nRoutes, mats) {
  const roads = { roads: [], verges: [], ground: [] };
  const chunks = [];
  for (let ri = 0; ri < nRoutes; ri++) {
    const r = ground.lines[ri];
    const n = r.x.length;
    const covered = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const q = ground.road(r.x[i], r.z[i], -1.4, ri);
      covered[i] = q && Math.abs(q.y - r.y[i]) < 0.8 ? 1 : 0;
    }
    for (let i = 0; i < n; i++) {
      if (!covered[i]) continue;
      let j = i;
      while (j < n && covered[j]) j++;
      if (j - i < 10) for (let k = i; k < j; k++) covered[k] = 0;
      i = j;
    }
    const inner = innerLimits(r);
    let i = 0;
    while (i < n) {
      while (i < n && covered[i]) i++;
      if (i >= n) break;
      let j = i;
      while (j < n && !covered[j]) j++;
      const a0 = Math.max(0, i - 2), b0 = Math.min(n - 1, j + 1);
      // rubans de sol en tronçons de ~600 m, masqués quand ils sont loin
      for (let a = a0; a < b0; a += 120) {
        const b = Math.min(b0, a + 120);
        if (b - a < 1) continue;
        const out = { roads: roads.roads, verges: roads.verges, ground: [] };
        lineGeometry(ground, r, a, b, inner, out);
        const g = mergeGeometries(out.ground);
        out.ground.forEach((x) => x.dispose());
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mats.ground);
        m.matrixAutoUpdate = false;
        m.receiveShadow = true;
        chunks.push(m);
      }
      i = j;
    }
  }
  const group = new THREE.Group();
  for (const m of finishMeshes(roads, mats, true)) group.add(m);
  for (const m of chunks) group.add(m);
  return {
    group,
    update(camPos, dist) {
      for (const m of chunks) {
        const sp = m.geometry.boundingSphere;
        m.visible = camPos.distanceTo(sp.center) - sp.radius < dist + 120;
      }
    },
  };
}

// le point i de la ligne L est-il sur la chaussée d'un parcours (même route,
// géométries OSM et IGN décalées de quelques mètres) ?
export function onRoute(ground, L, i, firstNet) {
  const q = ground.road(L.x[i], L.z[i], 3.5, firstNet);
  if (!q || Math.abs(q.y - L.y[i]) > 3) return false;
  const R = q.line, k = q.k;
  const rx = R.x[k + 1] - R.x[k], rz = R.z[k + 1] - R.z[k];
  const j = Math.min(L.x.length - 1, i + 1), j0 = Math.max(0, j - 1);
  const lx = L.x[j] - L.x[j0], lz = L.z[j] - L.z[j0];
  const dot = Math.abs(rx * lx + rz * lz) / ((Math.hypot(rx, rz) * Math.hypot(lx, lz)) || 1);
  return dot > 0.85 || q.edge < -1.5;
}

// Réseau (rues, routes, pistes cyclables) : index des portions par case de
// la grille, puis construction à la demande autour du cycliste.
export class NetworkCells {
  constructor(ground, firstNet, size) {
    this.ground = ground;
    this.size = size;
    this.cells = new Map();
    const lines = ground.lines;
    for (let li = firstNet; li < lines.length; li++) {
      const L = lines[li];
      const n = L.x.length;
      // portions déjà couvertes par un parcours (même chaussée)
      const cov = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        cov[i] = onRoute(ground, L, i, firstNet) ? 1 : 0;
      }
      let a = -1, key = null;
      const flush = (b) => {
        if (a >= 0 && b > a) {
          let list = this.cells.get(key);
          if (!list) this.cells.set(key, (list = []));
          list.push([li, Math.max(0, a - 1), Math.min(n - 1, b + 1)]);
        }
        a = -1;
      };
      for (let k = 0; k < n - 1; k++) {
        const kk = this.key((L.x[k] + L.x[k + 1]) / 2, (L.z[k] + L.z[k + 1]) / 2);
        if (cov[k] && cov[k + 1]) { flush(k); continue; }
        if (a >= 0 && kk !== key) flush(k);
        if (a < 0) { a = k; key = kk; }
      }
      flush(n - 1);
    }
  }

  key(x, z) { return `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`; }

  build(ci, cj, mats) {
    const list = this.cells.get(`${ci},${cj}`);
    if (!list) return null;
    const out = { roads: [], verges: [], ground: [] };
    const inner = new Map();
    for (const [li, a, b] of list) {
      const L = this.ground.lines[li];
      if (!inner.has(li)) inner.set(li, innerLimits(L));
      lineGeometry(this.ground, L, a, b, inner.get(li), out);
    }
    const group = new THREE.Group();
    for (const m of finishMeshes(out, mats, false)) group.add(m);
    return {
      group,
      dispose() { group.traverse((o) => o.geometry && o.geometry.dispose()); },
    };
  }
}
