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

export const ROAD_HALF = 3.0; // demi-largeur de la chaussée
export const VERGE = 4.6; // fin de l'accotement
const BLEND = 22; // au-delà, relief naturel
const CORR = 30; // largeur du ruban de sol de chaque côté
export const MASK_RANGE = 64; // distance (m) codée dans le masque sur 0..255

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class Ground {
  constructor(hf, routes) {
    this.hf = hf;
    this.routes = routes;
    this.cell = 16;
    this.map = new Map();
    routes.forEach((r, ri) => {
      for (let k = 0; k < r.x.length - 1; k++) {
        const key = this.key(Math.floor((r.x[k] + r.x[k + 1]) / 2 / this.cell), Math.floor((r.z[k] + r.z[k + 1]) / 2 / this.cell));
        let a = this.map.get(key);
        if (!a) this.map.set(key, (a = []));
        a.push(ri, k);
      }
    });
    this._q = { d: 0, y: 0, ri: 0, k: 0 };
  }

  key(i, j) { return i * 73856093 ^ j * 19349663; }

  // segment de route le plus proche à moins de maxD (null sinon) ;
  // maxRoute limite la recherche aux parcours d'indice inférieur
  road(x, z, maxD, maxRoute = 1e9) {
    const c = this.cell, ci = Math.floor(x / c), cj = Math.floor(z / c);
    const rr = Math.ceil((maxD + 6) / c);
    let best = maxD * maxD, found = false;
    const q = this._q;
    for (let j = cj - rr; j <= cj + rr; j++) {
      for (let i = ci - rr; i <= ci + rr; i++) {
        const a = this.map.get(this.key(i, j));
        if (!a) continue;
        for (let m = 0; m < a.length; m += 2) {
          if (a[m] >= maxRoute) continue;
          const r = this.routes[a[m]], k = a[m + 1];
          const x0 = r.x[k], z0 = r.z[k];
          const ex = r.x[k + 1] - x0, ez = r.z[k + 1] - z0;
          const l2 = ex * ex + ez * ez || 1;
          let t = ((x - x0) * ex + (z - z0) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - x0 - ex * t, dz = z - z0 - ez * t;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) {
            best = d2;
            found = true;
            q.ri = a[m]; q.k = k;
            q.y = r.y[k] + (r.y[k + 1] - r.y[k]) * t;
          }
        }
      }
    }
    if (!found) return null;
    q.d = Math.sqrt(best);
    return q;
  }

  // compatibilité avec l'ancien index : { d, y } ou y = null si rien
  nearest(x, z, maxD) {
    const q = this.road(x, z, maxD);
    return q ? { d: q.d, y: q.y } : { d: maxD, y: null };
  }

  // altitude du sol visible : chaussée, accotement, raccord, relief naturel
  height(x, z) {
    const q = this.road(x, z, BLEND);
    const n = this.hf.height(x, z);
    if (!q) return n;
    if (q.d <= ROAD_HALF) return q.y + 0.06;
    if (q.d <= VERGE) return q.y + 0.04 - ((q.d - ROAD_HALF) / (VERGE - ROAD_HALF)) * 0.08;
    const t = smooth((q.d - VERGE) / (BLEND - VERGE));
    return (q.y - 0.04) * (1 - t) + n * t;
  }

  // 0 chaussée, 1 accotement, 2 hors route
  surface(x, z) {
    const q = this.road(x, z, VERGE);
    if (!q) return 2;
    return q.d <= ROAD_HALF + 0.2 ? 0 : 1;
  }

  // masque de distance à la route pour le shader du relief (sans les bouts
  // arrondis aux extrémités des parcours, que le ruban ne couvre pas)
  buildMask(size) {
    const hf = this.hf;
    const data = new Uint8Array(size * size).fill(255);
    const px = hf.w / size, pz = hf.d / size;
    const R = CORR + 4;
    for (const r of this.routes) {
      const n = r.x.length;
      for (let k = 0; k < n - 1; k++) {
        const x0 = r.x[k], z0 = r.z[k];
        const ex = r.x[k + 1] - x0, ez = r.z[k + 1] - z0;
        const l2 = ex * ex + ez * ez || 1;
        const ia = Math.max(0, Math.floor((Math.min(x0, x0 + ex) - R - hf.x0) / px));
        const ib = Math.min(size - 1, Math.ceil((Math.max(x0, x0 + ex) + R - hf.x0) / px));
        // ligne j <-> v = (j + 0.5) / size, z = z0 + (1 - v) * d
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
            const d = Math.hypot(x - x0 - ex * t, z - z0 - ez * t);
            const v = Math.min(255, Math.round((d / MASK_RANGE) * 255));
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
function roadTexture() {
  // 6 m de large x 13 m de long : enrobé, réparations, fissures, marquages
  const W = 256, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#58585a";
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) {
    const v = 60 + r() * 60;
    g.fillStyle = `rgba(${v},${v},${v + 2},${0.18 + r() * 0.35})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2.2, 1 + r() * 2.2);
  }
  for (let i = 0; i < 3; i++) {
    g.fillStyle = `rgba(35,35,38,${0.05 + r() * 0.05})`;
    g.beginPath();
    g.ellipse(r() * W, r() * H, 20 + r() * 40, 40 + r() * 90, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = "rgba(25,25,25,0.45)";
  g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    let x = r() * W, y = r() * H;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 18; y += r() * 14; g.lineTo(x, y); }
    g.stroke();
  }
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
  // ligne axiale discontinue (3 m de trait, 10 m de vide)
  g.fillStyle = "rgba(236,236,228,0.92)";
  g.fillRect(W / 2 - 4, 0, 8, Math.round((H * 3) / 13));
  // lignes de rive
  g.fillStyle = "rgba(232,232,222,0.8)";
  g.fillRect(9, 0, 5, H);
  g.fillRect(W - 14, 0, 5, H);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function vergeTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#6a6b52";
  g.fillRect(0, 0, 64, 256);
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5000; i++) {
    const grass = r() < 0.6;
    const v = r();
    g.fillStyle = grass ? `rgba(${70 + v * 40},${95 + v * 45},${45 + v * 20},0.7)` : `rgba(${110 + v * 50},${108 + v * 50},${100 + v * 45},0.6)`;
    g.fillRect(r() * 64, r() * 256, 1 + r() * 2, 1 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// bande le long d'une portion de route ; cols = décalages latéraux,
// hfun(x, z, off) = altitude, uvMode : "road" (u en travers, v en long) ou "world"
function strip(r, a, b, cols, hfun, uvMode, hf, inner) {
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
    if (k) s += Math.hypot(r.x[i] - r.x[i - 1], r.z[i] - r.z[i - 1]);
    for (let c = 0; c < nc; c++) {
      let off = cols[c];
      // côté intérieur d'un virage serré : on ne dépasse pas le centre
      if (inner) {
        const lim = inner[i];
        if (lim && Math.sign(off) === Math.sign(lim) && Math.abs(off) > Math.abs(lim)) off = lim;
      }
      const x = r.x[i] - dz * off, z = r.z[i] + dx * off;
      const p = (k * nc + c) * 3;
      pos[p] = x; pos[p + 1] = hfun(x, z, off, i); pos[p + 2] = z;
      const q = (k * nc + c) * 2;
      if (uvMode === "road") { uv[q] = c / (nc - 1); uv[q + 1] = s / 13; }
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

// Construit chaussées, accotements et rubans de sol de tous les parcours.
// Les tronçons communs à plusieurs parcours ne sont construits qu'une fois.
export function buildRoadsAndGround(ground, routes, groundMat) {
  const hf = ground.hf;
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const vergeMat = new THREE.MeshLambertMaterial({ map: vergeTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  roadMat.map.anisotropy = 8;
  const roads = [], verges = [], chunks = [];
  const rowsH = (x, z) => ground.height(x, z);
  const corrCols = [-CORR, -24, -18, -13, -8.5, -VERGE + 0.05];
  const corrColsR = corrCols.map((c) => -c).reverse();
  routes.forEach((r, ri) => {
    const n = r.x.length;
    // déjà construit par un parcours précédent (même route, même niveau) ?
    const covered = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const q = ground.road(r.x[i], r.z[i], 1.6, ri);
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
      // découpe en tronçons de ~600 m pour pouvoir masquer ce qui est loin
      for (let a = a0; a < b0; a += 120) {
        const b = Math.min(b0, a + 120);
        if (b - a < 1) continue;
        roads.push(strip(r, a, b, [-ROAD_HALF, ROAD_HALF], (x, z, o, k) => r.y[k] + 0.06, "road", hf));
        verges.push(strip(r, a, b, [-VERGE, -ROAD_HALF + 0.1], (x, z, o, k) => r.y[k] + (o < -3.5 ? -0.04 : 0.04), "road", hf));
        verges.push(strip(r, a, b, [ROAD_HALF - 0.1, VERGE], (x, z, o, k) => r.y[k] + (o > 3.5 ? -0.04 : 0.04), "road", hf));
        const gl = strip(r, a, b, corrCols, rowsH, "world", hf, inner);
        const gr = strip(r, a, b, corrColsR, rowsH, "world", hf, inner);
        const g = mergeGeometries([gl, gr]);
        gl.dispose(); gr.dispose();
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, groundMat);
        m.matrixAutoUpdate = false;
        m.receiveShadow = true;
        chunks.push(m);
      }
      i = j;
    }
  });
  const group = new THREE.Group();
  const roadMesh = new THREE.Mesh(mergeGeometries(roads), roadMat);
  const vergeMesh = new THREE.Mesh(mergeGeometries(verges), vergeMat);
  roads.forEach((g) => g.dispose());
  verges.forEach((g) => g.dispose());
  for (const m of [roadMesh, vergeMesh]) {
    m.matrixAutoUpdate = false;
    m.receiveShadow = true;
    group.add(m);
  }
  for (const m of chunks) group.add(m);
  return {
    group,
    roadMat,
    // les rubans de sol ne servent que là où le relief grossier est masqué
    update(camPos, dist) {
      for (const m of chunks) {
        const sp = m.geometry.boundingSphere;
        m.visible = camPos.distanceTo(sp.center) - sp.radius < dist + 120;
      }
    },
  };
}
