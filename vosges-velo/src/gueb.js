// Guebwiller en détail (données de tools/fetch_guebwiller.py) :
// - chaque bâtiment avec ses vraies hauteurs (égout du toit, faîtage, étages)
//   et la couleur réelle de son toit mesurée sur les orthophotos IGN ;
// - les monuments modélisés d'après des photographies : églises Saint-Léger
//   et Notre-Dame, hôtel de ville, église des Dominicains, chapelle
//   Notre-Dame-du-Saering.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildingMaterial } from "./scenery.js";

const MODELS = ["stleger", "notredame", "mairie", "dominicains", "saering"];

// toits : la photo aérienne pâlit les couleurs, on les ravive un peu
// (tuiles rouges et brunes) ; les toits gris (ardoise, zinc, béton) restent gris
function roofColor(hex) {
  const c = new THREE.Color(hex || "#7d4b3a");
  const hsl = {};
  c.getHSL(hsl);
  const warm = (hsl.h < 0.11 || hsl.h > 0.93) && hsl.s > 0.06;
  return warm ? c.setHSL(hsl.h, Math.min(0.62, hsl.s * 1.6 + 0.04), Math.max(0.14, hsl.l * 0.88)) : c.setHSL(hsl.h, hsl.s * 0.5, Math.max(0.16, hsl.l * 0.9));
}
const WALLS = ["#efe4cf", "#e9d6b4", "#f1dcc0", "#e6c9a3", "#ddd5c4", "#f2e8cf", "#e8cfc6", "#d6ddd0", "#f3ede2", "#e5d6b8"];

// ------------------------------------------------------------ assemblage
// triangles accumulés pour le matériau des bâtiments (fenêtres et tuiles
// dans le shader) et pour la pierre (grès rose texturé)
class Mesher {
  constructor() {
    this.b = { pos: [], col: [], sty: [], flo: [] };
    this.s = { pos: [], col: [], uv: [] };
  }
  // f : [x, y, z] ; style 0 crépi, 1 colombages, 2 monument
  bt(a, b, c, col, style = 0, floor = [0, 0]) {
    const B = this.b;
    for (const p of [a, b, c]) { B.pos.push(p[0], p[1], p[2]); B.col.push(col.r, col.g, col.b); B.sty.push(style); B.flo.push(floor[0], floor[1]); }
  }
  bq(a, b, c, d, col, style, floor) { this.bt(a, b, c, col, style, floor); this.bt(a, c, d, col, style, floor); }
  geoB() {
    const B = this.b;
    if (!B.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(B.col, 3));
    g.setAttribute("aStyle", new THREE.Float32BufferAttribute(B.sty, 1));
    g.setAttribute("aFloor", new THREE.Float32BufferAttribute(B.flo, 2));
    g.computeVertexNormals();
    return g;
  }
}

// ------------------------------------------------------------ bâtiments
function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length]; a += x0 * z1 - x1 * z0; }
  return a / 2;
}

// rectangle orienté d'aire minimale : centre, axe long (u), longueurs
export function obb(pts) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l < 0.5) continue;
    const ux = (x1 - x0) / l, uz = (z1 - z0) / l;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, z] of pts) {
      const a = x * ux + z * uz, b = -x * uz + z * ux;
      a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b);
    }
    const area = (a1 - a0) * (b1 - b0);
    if (!best || area < best.area) best = { area, ux, uz, a0, a1, b0, b1 };
  }
  let { ux, uz, a0, a1, b0, b1 } = best;
  // axe long le long de u
  if (b1 - b0 > a1 - a0) { [ux, uz] = [-uz, ux]; [a0, a1, b0, b1] = [b0, b1, -a1, -a0]; }
  // u vers l'est : l'extrémité -X locale est à l'ouest (façade des églises)
  if (ux < 0) { ux = -ux; uz = -uz; [a0, a1] = [-a1, -a0]; [b0, b1] = [-b1, -b0]; }
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  return { cx: ca * ux - cb * uz, cz: ca * uz + cb * ux, ux, uz, L: a1 - a0, W: b1 - b0 };
}

function building(M, b, hf, rnd) {
  let pts = [];
  for (let i = 0; i < b.p.length; i += 2) pts.push([b.p[i], b.p[i + 1]]);
  if (polyArea(pts) > 0) pts.reverse();
  let hmin = Infinity;
  for (const [x, z] of pts) hmin = Math.min(hmin, hf.height(x, z));
  const g0 = b.y !== null && Math.abs(b.y - hmin) < 4 ? Math.max(b.y, hmin - 0.3) : hmin;
  const base = hmin - 1.2, eave = g0 + b.e, ridge = g0 + b.r;
  const industrial = b.n.startsWith("Industriel");
  const church = b.n === "Eglise" || b.n === "Chapelle";
  const wall = new THREE.Color(industrial ? "#c9c6bd" : church ? "#b57d6a" : WALLS[Math.floor(rnd() * WALLS.length)]).multiplyScalar(0.92 + rnd() * 0.1);
  const plinth = wall.clone().multiplyScalar(0.72);
  const roof = roofColor(b.c);
  const floors = b.f || Math.max(1, Math.round(b.e / 2.9));
  const fl = [g0, Math.max(2.4, b.e / floors)];
  const colomb = !industrial && !church && pts.length === 4 && b.e < 10 && rnd() < 0.35;
  const st = industrial ? 2 : colomb ? 1 : 0;
  // murs, soubassement sombre
  const pl = g0 + 0.6;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    M.bq([x0, base, z0], [x1, base, z1], [x1, pl, z1], [x0, pl, z0], plinth, 2, fl);
    M.bq([x0, pl, z0], [x1, pl, z1], [x1, eave, z1], [x0, eave, z0], wall, st, fl);
  }
  const dh = ridge - eave;
  if (dh < 0.6) {
    // toit plat (avec un léger acrotère)
    const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [a, c, d] of tri) M.bt([pts[a][0], eave, pts[a][1]], [pts[d][0], eave, pts[d][1]], [pts[c][0], eave, pts[c][1]], roof, 2, fl);
    return;
  }
  if (pts.length === 4) {
    // toit à deux pans (pignons sur les petits côtés) ou à quatre pans si
    // l'emprise est presque carrée
    const e0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), e1 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const q = e0 >= e1 ? pts : [pts[1], pts[2], pts[3], pts[0]];
    const lng = Math.max(e0, e1), sht = Math.min(e0, e1);
    const U = [(q[1][0] - q[0][0]) / lng, (q[1][1] - q[0][1]) / lng];
    const Wv = [(q[3][0] - q[0][0]) / sht, (q[3][1] - q[0][1]) / sht];
    const m0 = [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2], m1 = [(q[3][0] + q[0][0]) / 2, (q[3][1] + q[0][1]) / 2];
    const hip = lng / sht < 1.25 ? Math.min(lng / 2 - 0.01, sht / 2) : 0;
    const ov = 0.45, og = hip ? ov : 0.35, drop = (ov * dh) / Math.max(1, sht / 2);
    const ex = (p, su, sw) => [p[0] + U[0] * og * su + Wv[0] * ov * sw, p[1] + U[1] * og * su + Wv[1] * ov * sw];
    const k0 = ex(q[0], -1, -1), k1 = ex(q[1], 1, -1), k2 = ex(q[2], 1, 1), k3 = ex(q[3], -1, 1);
    const r0 = [m0[0] - U[0] * (hip - og), m0[1] - U[1] * (hip - og)], r1 = [m1[0] + U[0] * (hip - og), m1[1] + U[1] * (hip - og)];
    const ty = eave - drop;
    M.bq([k0[0], ty, k0[1]], [k1[0], ty, k1[1]], [r0[0], ridge, r0[1]], [r1[0], ridge, r1[1]], roof, 2, fl);
    M.bq([k2[0], ty, k2[1]], [k3[0], ty, k3[1]], [r1[0], ridge, r1[1]], [r0[0], ridge, r0[1]], roof, 2, fl);
    if (hip) {
      M.bt([k1[0], ty, k1[1]], [k2[0], ty, k2[1]], [r0[0], ridge, r0[1]], roof, 2, fl);
      M.bt([k3[0], ty, k3[1]], [k0[0], ty, k0[1]], [r1[0], ridge, r1[1]], roof, 2, fl);
    } else {
      M.bt([q[1][0], eave, q[1][1]], [q[2][0], eave, q[2][1]], [m0[0], ridge, m0[1]], wall, st, fl);
      M.bt([q[3][0], eave, q[3][1]], [q[0][0], eave, q[0][1]], [m1[0], ridge, m1[1]], wall, st, fl);
    }
    // cheminée
    if (!industrial && rnd() < 0.6 && sht > 5) {
      const t = 0.25 + rnd() * 0.5, side = rnd() < 0.5 ? -1 : 1;
      const px = m1[0] + (m0[0] - m1[0]) * t + Wv[0] * side * 0.9, pz = m1[1] + (m0[1] - m1[1]) * t + Wv[1] * side * 0.9;
      const a = 0.32, y0 = ridge - 1.6, y1 = ridge + 0.8, cc = new THREE.Color("#7a5f50");
      const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sw]) => [px + U[0] * a * su + Wv[0] * a * sw, pz + U[1] * a * su + Wv[1] * a * sw]);
      for (let k = 0; k < 4; k++) { const [ax, az] = cs[k], [bx, bz] = cs[(k + 1) % 4]; M.bq([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], cc, 2, fl); }
    }
    return;
  }
  // emprise quelconque : pans à environ 45° vers une ligne de faîte réduite
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= pts.length; cz /= pts.length;
  const top = pts.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0, 1 - dh / d);
    return [cx + (x - cx) * k, cz + (z - cz) * k];
  });
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    M.bq([pts[i][0], eave, pts[i][1]], [pts[j][0], eave, pts[j][1]], [top[j][0], ridge, top[j][1]], [top[i][0], ridge, top[i][1]], roof, 2, fl);
  }
  try {
    const tri = THREE.ShapeUtils.triangulateShape(top.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [a, c, d] of tri) M.bt([top[a][0], ridge, top[a][1]], [top[d][0], ridge, top[d][1]], [top[c][0], ridge, top[c][1]], roof, 2, fl);
  } catch { /* faîte dégénéré */ }
}

// ------------------------------------------------------------ monuments
let stoneTex = null;
// grès rose des Vosges : assises de 50 cm, blocs de longueurs variées
function sandstone() {
  if (stoneTex) return stoneTex;
  const S = 512, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  let seed = 17;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#b98a7c";
  g.fillRect(0, 0, S, S);
  const row = S / 7; // 4 m de texture : assises de 57 cm
  for (let y = 0; y < S; y += row) {
    let x = -r() * 60;
    while (x < S) {
      const w = row * (1.6 + r() * 1.6);
      const v = 0.92 + r() * 0.14;
      g.fillStyle = `rgb(${Math.round(176 * v)},${Math.round(116 * v)},${Math.round(101 * v)})`;
      g.fillRect(x + 1, y + 1, w - 1.5, row - 1.5);
      // patine
      for (let k = 0; k < 18; k++) {
        g.fillStyle = `rgba(${r() < 0.5 ? "60,30,25" : "230,190,170"},${0.05 + r() * 0.08})`;
        g.fillRect(x + r() * w, y + r() * row, 3 + r() * 14, 2 + r() * 6);
      }
      x += w;
    }
  }
  stoneTex = new THREE.CanvasTexture(c);
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  stoneTex.colorSpace = THREE.SRGBColorSpace;
  stoneTex.anisotropy = 8;
  return stoneTex;
}

// pièces d'un monument dans son repère local (X : axe long, ouest -> est ;
// Z : travers ; Y : hauteur au-dessus du sol), regroupées par matériau
class Kit {
  constructor() { this.stone = []; this.plain = []; this.dark = []; }
  add(list, geo, m, color) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    g.computeVertexNormals();
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    list.push(g);
    return g;
  }
  // grès : coordonnées de texture projetées selon la normale (4 m par motif)
  stoneAdd(geo, m, color = "#ffffff") {
    const g = this.add(this.stone, geo, m, color);
    const p = g.attributes.position, nr = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(nr.getX(i)), ny = Math.abs(nr.getY(i)), nz = Math.abs(nr.getZ(i));
      const u = ny > nx && ny > nz ? p.getX(i) : nx > nz ? p.getZ(i) : p.getX(i);
      const v = ny > nx && ny > nz ? p.getZ(i) : p.getY(i);
      uv[i * 2] = u / 4; uv[i * 2 + 1] = v / 4;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  plainAdd(geo, m, color, style = 2) {
    const g = this.add(this.plain, geo, m, color);
    if (g.attributes.uv) g.deleteAttribute("uv");
    const n = g.attributes.position.count;
    g.setAttribute("aStyle", new THREE.BufferAttribute(new Float32Array(n).fill(style), 1));
    g.setAttribute("aFloor", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  darkAdd(geo, m, color = "#1b1f24") {
    const g = this.add(this.dark, geo, m, color);
    if (g.attributes.uv) g.deleteAttribute("uv");
  }
  build(mats) {
    const grp = new THREE.Group();
    for (const [list, mat] of [[this.stone, mats.stone], [this.plain, mats.plain], [this.dark, mats.dark]]) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}

const T = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// pyramide de base carrée (w x d), sommet à h
function pyramid(w, d, h) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);
  g.scale(w, h, d);
  return g;
}
// toit à deux pans le long de X : longueur l, largeur w, hauteur h (base y=0)
function gableRoof(l, w, h, ov = 0.4) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2 - ov, -ov * h / (w / 2)), new THREE.Vector2(w / 2 + ov, -ov * h / (w / 2)), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: l + ov * 2, bevelEnabled: false });
  g.translate(0, 0, -(l + ov * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
// pignon (triangle plein) dans le plan YZ, largeur w, hauteur h
function gableWall(w, h, t = 0.6) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
// baie en plein cintre ou en arc brisé (face +Z), largeur w, hauteur h
function arch(w, h, pointed = false) {
  const s = new THREE.Shape();
  const r = w / 2, hs = h - (pointed ? w * 0.75 : r);
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hs);
  if (pointed) { s.quadraticCurveTo(r, hs + w * 0.45, 0, h); s.quadraticCurveTo(-r, hs + w * 0.45, -r, hs); }
  else s.absarc(0, hs, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return new THREE.ShapeGeometry(s, 8);
}
// baie posée sur un mur : face +X/-X/+Z/-Z (dir), position le long du mur
function onWall(K, geo, dir, half, along, y) {
  const off = half + 0.04;
  const m = dir === "+z" ? T(along, y, off) : dir === "-z" ? T(along, y, -off, Math.PI) : dir === "+x" ? T(off, y, along, Math.PI / 2) : T(-off, y, along, -Math.PI / 2);
  K.darkAdd(geo, m);
}
function clock(K, dir, half, along, y, r = 1.1) {
  const off = half + 0.05;
  const m = dir === "+z" ? T(along, y, off) : dir === "-z" ? T(along, y, -off, Math.PI) : dir === "+x" ? T(off, y, along, Math.PI / 2) : T(-off, y, along, -Math.PI / 2);
  K.darkAdd(new THREE.CircleGeometry(r, 24), m, "#e8e2d4");
  const m2 = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.02));
  K.darkAdd(new THREE.RingGeometry(r * 0.88, r, 24), m2, "#2a2420");
  K.darkAdd(new THREE.PlaneGeometry(0.1, r * 0.7).translate(0, r * 0.3, 0), m2, "#2a2420");
}

// Église Saint-Léger (XIIe s., grès rose) : massif occidental à deux tours
// carrées (baies géminées sur deux étages, flèches de pierre et pinacles),
// porche à trois arcades, pignon central ; nef et bas-côtés ; tour de
// croisée octogonale ; abside.
function stLeger(o, b) {
  const K = new Kit();
  const L = Math.max(30, o.L), W = Math.max(16, o.W);
  const x0 = -L / 2, s = Math.min(8.5, W * 0.34), tH = 27, spire = Math.max(8, Math.min(13, (b.r > 30 ? b.r : 38) - tH));
  const nw = W * 0.42, aisle = (W - nw) / 2;
  const roofC = "#7f4a3a", stoneRoof = "#8c6f68";
  // tours
  for (const sz of [-1, 1]) {
    const zc = sz * (W / 2 - s / 2);
    K.stoneAdd(box(s, tH, s), T(x0 + s / 2, tH / 2, zc));
    K.stoneAdd(box(s + 0.3, 0.4, s + 0.3), T(x0 + s / 2, 11, zc));
    K.stoneAdd(box(s + 0.3, 0.4, s + 0.3), T(x0 + s / 2, tH, zc));
    K.stoneAdd(pyramid(s * 0.78, s * 0.78, spire), T(x0 + s / 2, tH + spire / 2, zc), stoneRoof);
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.stoneAdd(pyramid(1.1, 1.1, 2.4), T(x0 + s / 2 + px * (s / 2 - 0.6), tH + 1.2, zc + pz * (s / 2 - 0.6)), stoneRoof);
    // baies géminées sur les quatre faces, deux étages
    const sub = new Kit();
    for (const dir of ["-x", "+x", "-z", "+z"]) for (const y of [17, 21.6]) for (const d of [-1, 1]) onWall(sub, arch(0.95, 2.6), dir, s / 2, d * 1.15, y);
    for (const g of sub.dark) { g.applyMatrix4(new THREE.Matrix4().makeTranslation(x0 + s / 2, 0, zc)); K.dark.push(g); }
    onWall(K, arch(3.4, 5.2), "-x", -x0, zc, 0);
  }
  // porche et pignon entre les tours
  const mid = W - 2 * s;
  K.stoneAdd(box(s, 13, mid), T(x0 + s / 2, 6.5, 0));
  K.stoneAdd(gableWall(mid, 6, s), T(x0 + s / 2, 13, 0));
  onWall(K, arch(5, 6.2), "-x", -x0, 0, 0);
  for (const d of [-1, 0, 1]) onWall(K, arch(1.1, 2.4), "-x", -x0, d * 1.6, 8.6);
  K.darkAdd(new THREE.PlaneGeometry(0.6, 0.6).rotateY(-Math.PI / 2), T(x0 - 0.05, 15.6, 0, 0, 0, Math.PI / 4), "#1b1f24");
  // nef (fenêtres hautes) et bas-côtés à toit en appentis
  const nx0 = x0 + s, nx1 = L / 2 - nw / 2, nl = nx1 - nx0, nE = 15;
  K.stoneAdd(box(nl, nE, nw), T((nx0 + nx1) / 2, nE / 2, 0));
  K.plainAdd(gableRoof(nl, nw, 5.5), T((nx0 + nx1) / 2, nE, 0), roofC);
  for (const sz of [-1, 1]) {
    K.stoneAdd(box(nl, 8, aisle), T((nx0 + nx1) / 2, 4, sz * (nw / 2 + aisle / 2)));
    const lean = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(aisle + 0.4, -0.3), new THREE.Vector2(0, 2.6)]);
    const lg = new THREE.ExtrudeGeometry(lean, { depth: nl, bevelEnabled: false }).translate(0, 0, -nl / 2).rotateY(Math.PI / 2);
    if (sz < 0) lg.scale(1, 1, -1);
    K.plainAdd(lg, T((nx0 + nx1) / 2, 8, sz * nw / 2), roofC);
    for (let x = nx0 + 3; x < nx1 - 2; x += 4) {
      onWall(K, arch(0.9, 1.9), sz > 0 ? "+z" : "-z", nw / 2, x, 10.5);
      onWall(K, arch(0.9, 2.1), sz > 0 ? "+z" : "-z", W / 2, x, 3.5);
    }
  }
  // tour de croisée octogonale et flèche
  const cxr = nx1 - 4, rr = nw * 0.55;
  K.stoneAdd(new THREE.CylinderGeometry(rr, rr, 14, 8), T(cxr, nE + 7 - 4, 0, Math.PI / 8));
  K.stoneAdd(new THREE.ConeGeometry(rr * 1.02, 10, 8), T(cxr, nE + 10 + 5, 0, Math.PI / 8), stoneRoof);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    K.darkAdd(arch(0.8, 1.8), T(cxr + Math.cos(a) * (rr * 0.93), nE + 5.5, Math.sin(a) * (rr * 0.93), Math.PI / 2 - a));
  }
  // abside
  K.stoneAdd(new THREE.CylinderGeometry(nw / 2, nw / 2, 12, 16, 1, false, 0, Math.PI), T(nx1, 6, 0));
  K.plainAdd(new THREE.ConeGeometry(nw / 2 + 0.3, 4, 16, 1, false, 0, Math.PI), T(nx1, 14, 0), roofC);
  return K;
}

// Église Notre-Dame (1766-1785, grès rouge, classique) : façade à colonnes
// et fronton, tour sud achevée (horloge, lanterne, dôme), tour nord
// arasée ; transept à bras arrondis ; chœur en hémicycle.
function notreDame(o, b) {
  const K = new Kit();
  const L = Math.max(40, o.L), W = Math.max(20, o.W);
  const x0 = -L / 2, nw = W * 0.6, E = Math.min(24, Math.max(18, b.e || 20));
  const roofC = "#6e4a3c", dome = "#5e6b6a";
  const ft = 7; // profondeur du massif de façade
  // massif de façade et tours
  K.stoneAdd(box(ft, E + 2, W), T(x0 + ft / 2, (E + 2) / 2, 0));
  K.stoneAdd(box(ft + 0.6, 0.8, W + 0.6), T(x0 + ft / 2, 11.5, 0));
  K.stoneAdd(box(ft + 0.6, 0.8, W + 0.6), T(x0 + ft / 2, E + 2, 0));
  K.stoneAdd(gableWall(W * 0.5, 4.5, 1.2), T(x0 + 0.6, E + 2.4, 0));
  // tour sud : étage carré, horloge, lanterne, dôme
  const ts = W * 0.28, zt = W / 2 - ts / 2;
  K.stoneAdd(box(ts, 12, ts), T(x0 + ft / 2, E + 2 + 6, zt));
  K.stoneAdd(new THREE.CylinderGeometry(ts * 0.42, ts * 0.46, 6, 8), T(x0 + ft / 2, E + 14 + 3, zt, Math.PI / 8));
  K.plainAdd(new THREE.SphereGeometry(ts * 0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), T(x0 + ft / 2, E + 20, zt), dome);
  K.plainAdd(new THREE.CylinderGeometry(0.4, 0.6, 2.5, 8), T(x0 + ft / 2, E + 20 + ts * 0.42 + 1, zt), dome);
  clock(K, "-x", ts / 2, zt, E + 9.5, 1.3);
  clock(K, "+z", ts / 2, 0, E + 9.5, 1.3);
  for (const g of K.dark.slice(-3)) g.applyMatrix4(new THREE.Matrix4().makeTranslation(x0 + ft / 2, 0, zt));
  for (const g of K.dark.slice(-6, -3)) g.applyMatrix4(new THREE.Matrix4().makeTranslation(x0 + ft / 2, 0, 0));
  // colonnes de la façade (deux ordres) et grande porte
  for (const d of [-1.5, -0.5, 0.5, 1.5]) {
    K.stoneAdd(new THREE.CylinderGeometry(0.55, 0.6, 11, 12), T(x0 - 1, 5.5, d * W * 0.13));
    K.stoneAdd(new THREE.CylinderGeometry(0.45, 0.5, E - 12, 12), T(x0 - 0.8, 12 + (E - 12) / 2, d * W * 0.13));
  }
  K.stoneAdd(box(1.6, 0.6, W * 0.6), T(x0 - 1, 11.3, 0));
  onWall(K, new THREE.PlaneGeometry(2.6, 5), "-x", -x0, 0, 2.5);
  onWall(K, arch(2.2, 4.2), "-x", -x0, 0, 14);
  for (const d of [-1, 1]) { onWall(K, arch(1.6, 3.4), "-x", -x0, d * W * 0.3, 3); onWall(K, arch(1.6, 3.2), "-x", -x0, d * W * 0.3, 14); }
  // nef et toit
  const nx0 = x0 + ft, nx1 = L / 2 - nw / 2, nl = nx1 - nx0;
  K.stoneAdd(box(nl, E, nw), T((nx0 + nx1) / 2, E / 2, 0));
  K.plainAdd(gableRoof(nl, nw, 6), T((nx0 + nx1) / 2, E, 0), roofC);
  for (let x = nx0 + 4; x < nx1 - 3; x += 6) for (const sz of [-1, 1]) onWall(K, arch(2, 5), sz > 0 ? "+z" : "-z", nw / 2, x, 9);
  // bras du transept arrondis et chœur
  const tx = nx0 + nl * 0.62;
  for (const sz of [-1, 1]) {
    K.stoneAdd(new THREE.CylinderGeometry(nw * 0.3, nw * 0.3, E - 4, 20, 1, false, 0, Math.PI), T(tx, (E - 4) / 2, sz * nw / 2, sz > 0 ? 0 : Math.PI));
    K.plainAdd(new THREE.ConeGeometry(nw * 0.32, 3.5, 20, 1, false, 0, Math.PI), T(tx, E - 4 + 1.75, sz * nw / 2, sz > 0 ? 0 : Math.PI), roofC);
  }
  K.stoneAdd(new THREE.CylinderGeometry(nw / 2, nw / 2, E - 2, 20, 1, false, 0, Math.PI), T(nx1, (E - 2) / 2, 0, Math.PI / 2));
  K.plainAdd(new THREE.ConeGeometry(nw / 2 + 0.3, 5, 20, 1, false, 0, Math.PI), T(nx1, E - 2 + 2.5, 0, Math.PI / 2), roofC);
  return K;
}

// Hôtel de ville (1514) : maison gothique crépie ocre, chaînes d'angle en
// grès, grand toit de tuiles brunes, clocheton à horloge et flèche,
// oriel d'angle à balustrade, lucarnes.
function mairie(o, b) {
  const K = new Kit();
  const L = Math.max(14, o.L), W = Math.max(10, o.W);
  const E = Math.max(10, Math.min(14, b.e || 12)), R = W * 0.72;
  const wall = "#d9ad7f", roofC = "#6f4330";
  K.plainAdd(box(L, E, W), T(0, E / 2, 0), wall, 0);
  K.plainAdd(gableRoof(L, W, R, 0.5), T(0, E, 0), roofC);
  for (const sx of [-1, 1]) {
    K.plainAdd(gableWall(W, R, 0.3), T(sx * (L / 2 - 0.12), E, 0), wall, 2);
    for (const sz of [-1, 1]) K.stoneAdd(box(0.9, E, 0.9), T(sx * (L / 2 - 0.4), E / 2, sz * (W / 2 - 0.4)));
  }
  K.stoneAdd(box(L + 0.2, 0.9, W + 0.2), T(0, 0.45, 0));
  // clocheton : base carrée rose, horloge, flèche sombre
  K.stoneAdd(box(1.8, 3.4, 1.8), T(-L * 0.1, E + R + 0.7, 0));
  K.plainAdd(new THREE.ConeGeometry(1.15, 6.5, 8), T(-L * 0.1, E + R + 5.65, 0, Math.PI / 8), "#2c3134");
  const ck = new Kit();
  clock(ck, "+z", 0.9, 0, 0, 0.55); clock(ck, "-x", 0.9, 0, 0, 0.55);
  for (const g of ck.dark) { g.applyMatrix4(new THREE.Matrix4().makeTranslation(-L * 0.1, E + R + 1.1, 0)); K.dark.push(g); }
  // oriel d'angle (côté +Z, extrémité -X) et sa balustrade
  K.stoneAdd(new THREE.CylinderGeometry(1.25, 0.6, 1.4, 6), T(-L / 2 + 2.6, 4.2, W / 2 + 0.7));
  K.plainAdd(new THREE.CylinderGeometry(1.25, 1.25, 3.2, 6), T(-L / 2 + 2.6, 6.5, W / 2 + 0.7), wall, 0);
  K.stoneAdd(new THREE.CylinderGeometry(1.35, 1.35, 0.8, 6), T(-L / 2 + 2.6, 8.5, W / 2 + 0.7));
  // lucarnes
  for (const x of [-L * 0.25, L * 0.2]) for (const sz of [-1, 1]) {
    K.plainAdd(box(1.4, 1.4, 1.2), T(x, E + R * 0.32, sz * (W / 2 - W * 0.32 * 0.9)), wall, 2);
    K.plainAdd(gableRoof(1.2, 1.6, 0.9, 0.1).rotateY(Math.PI / 2), T(x, E + R * 0.32 + 0.7, sz * (W / 2 - W * 0.32 * 0.9)), roofC);
    K.darkAdd(new THREE.PlaneGeometry(0.6, 0.7).rotateY(sz > 0 ? 0 : Math.PI), T(x, E + R * 0.32, sz * (W / 2 - W * 0.32 * 0.9 + 0.64)));
  }
  return K;
}

// Ancienne église des Dominicains (XIVe s.) : nef haute crépie, grandes
// baies gothiques à remplage encadrées de grès, contreforts, toit de tuiles
// très pentu, clocheton sur le faîte.
function dominicains(o, b) {
  const K = new Kit();
  const L = Math.max(30, o.L), W = Math.max(10, o.W);
  const E = Math.max(12, Math.min(20, b.e || 15)), R = Math.max(7, (b.r || E + 9) - E);
  const wall = "#e4cfae", roofC = "#7a4836";
  K.plainAdd(box(L, E, W), T(0, E / 2, 0), wall, 2);
  K.plainAdd(gableRoof(L, W, R, 0.4), T(0, E, 0), roofC);
  for (const sx of [-1, 1]) K.plainAdd(gableWall(W, R, 0.3), T(sx * (L / 2 - 0.12), E, 0), wall, 2);
  for (let x = -L / 2 + 4; x <= L / 2 - 3; x += 5.5) {
    for (const sz of [-1, 1]) {
      K.stoneAdd(box(1.2, E * 0.75, 1.1), T(x - 2.75, E * 0.375, sz * (W / 2 + 0.5)));
      K.stoneAdd(box(2.3, 0.3, 0.3), T(x, 2.8, sz * (W / 2 + 0.1)));
      onWall(K, arch(2, E * 0.62, true), sz > 0 ? "+z" : "-z", W / 2, x, 3);
    }
  }
  onWall(K, arch(3, E * 0.7, true), "+x", L / 2, 0, 3);
  // clocheton (flèche) sur le faîte, côté ouest
  K.plainAdd(box(1.6, 2.6, 1.6), T(-L * 0.3, E + R - 0.4, 0), "#5a3f33", 2);
  K.plainAdd(new THREE.ConeGeometry(1.1, 7, 8), T(-L * 0.3, E + R + 4.3, 0, Math.PI / 8), "#3a3a3c");
  return K;
}

// Chapelle Notre-Dame-du-Saering : longue nef crépie, baies en plein
// cintre encadrées de grès, contreforts, toit de tuiles à croupe côté
// chœur, clocheton à flèche sur le pignon ouest, oculus.
function saering(o, b) {
  const K = new Kit();
  const L = Math.max(18, o.L), W = Math.max(8, o.W);
  const E = Math.max(6, Math.min(9, b.e || 7.5)), R = W * 0.55;
  const wall = "#d8c8ad", roofC = "#9a5a40";
  K.plainAdd(box(L, E, W), T(0, E / 2, 0), wall, 2);
  K.stoneAdd(box(L + 0.1, 0.25, W + 0.1), T(0, E - 0.1, 0));
  K.plainAdd(gableRoof(L - W * 0.4, W, R, 0.45), T(-W * 0.2, E, 0), roofC);
  K.plainAdd(pyramid(W * 0.8, W + 0.9, R).translate(0, R / 2, 0), T(L / 2 - W * 0.4, E, 0), roofC);
  K.plainAdd(gableWall(W, R, 0.3), T(-L / 2 + 0.12, E, 0), wall, 2);
  for (let x = -L / 2 + 3; x < L / 2 - 2; x += 3.6) for (const sz of [-1, 1]) {
    onWall(K, arch(1.1, 2.4), sz > 0 ? "+z" : "-z", W / 2, x, 2.6);
    if (x > 0) K.stoneAdd(box(0.9, E * 0.7, 0.8), T(x + 1.8, E * 0.35, sz * (W / 2 + 0.4)));
  }
  K.darkAdd(new THREE.CircleGeometry(0.55, 16).rotateY(-Math.PI / 2), T(-L / 2 - 0.05, E * 0.75, 0));
  // clocheton
  K.plainAdd(box(1.2, 2.2, 1.2), T(-L / 2 + 1.4, E + R - 0.2, 0), "#4a3a32", 2);
  K.plainAdd(new THREE.ConeGeometry(0.85, 3.4, 8), T(-L / 2 + 1.4, E + R + 2.6, 0, Math.PI / 8), "#2e3032");
  return K;
}

const BUILDERS = { stleger: stLeger, notredame: notreDame, mairie, dominicains, saering };

// ------------------------------------------------------------ données
export class Guebwiller {
  constructor(data, hf) {
    this.data = data;
    this.hf = hf;
    const [x0, z0, x1, z1] = data.bbox;
    this.box = { x0, z0, x1, z1 };
    // monuments modélisés : leur bâtiment BD TOPO n'est pas construit
    this.landmarkOf = new Map();
    for (const [k, i] of Object.entries(data.lm)) if (MODELS.includes(k)) this.landmarkOf.set(i, k);
    // emprises des monuments (rectangle orienté élargi de 2 m) : les autres
    // morceaux BD TOPO du même édifice (tours, nef, porche) sont absorbés
    // pour une église, l'emprise du modèle réunit toutes les parties BD TOPO
    // de nature « Eglise », « Chapelle » ou « Tour » à moins de 55 m
    const cen = (b) => { let x = 0, z = 0; for (let q = 0; q < b.p.length; q += 2) { x += b.p[q]; z += b.p[q + 1]; } return [x / (b.p.length / 2), z / (b.p.length / 2)]; };
    const zones = [];
    this.fp = new Map();
    for (const [i, k] of this.landmarkOf) {
      const b = data.b[i], c0 = cen(b), pts = [];
      const parts = [i];
      if (k !== "mairie") data.b.forEach((o, j) => {
        if (j === i || !/^(Eglise|Chapelle|Tour)/.test(o.n)) return;
        const c = cen(o);
        if (Math.hypot(c[0] - c0[0], c[1] - c0[1]) < 55) parts.push(j);
      });
      for (const j of parts) for (let q = 0; q < data.b[j].p.length; q += 2) pts.push([data.b[j].p[q], data.b[j].p[q + 1]]);
      const o = obb(pts);
      this.fp.set(i, pts);
      for (const j of parts) if (j !== i) this.hidden0 = (this.hidden0 || new Set()).add(j);
      zones.push({ i, o, L: o.L / 2 + 1.5, W: o.W / 2 + 1.5 });
    }
    this.hidden = new Set(this.hidden0 || []);
    data.b.forEach((b, i) => {
      if (this.landmarkOf.has(i)) return;
      let cx = 0, cz = 0;
      for (let k = 0; k < b.p.length; k += 2) { cx += b.p[k]; cz += b.p[k + 1]; }
      cx /= b.p.length / 2; cz /= b.p.length / 2;
      for (const z of zones) {
        const dx = cx - z.o.cx, dz = cz - z.o.cz;
        if (Math.abs(dx * z.o.ux + dz * z.o.uz) < z.L && Math.abs(-dx * z.o.uz + dz * z.o.ux) < z.W) { this.hidden.add(i); break; }
      }
    });
    this.cells = new Map();
    data.b.forEach((b, i) => {
      if (this.hidden.has(i)) return;
      let cx = 0, cz = 0;
      for (let k = 0; k < b.p.length; k += 2) { cx += b.p[k]; cz += b.p[k + 1]; }
      cx /= b.p.length / 2; cz /= b.p.length / 2;
      const key = `${Math.floor(cx / 500)},${Math.floor(cz / 500)}`;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(i);
    });
    const stone = new THREE.MeshLambertMaterial({ map: sandstone(), vertexColors: true });
    this.mats = { stone, plain: buildingMaterial(), dark: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }) };
  }

  // un bâtiment du jeu de base est-il remplacé par la version détaillée ?
  covers(x, z) { const b = this.box; return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1; }

  buildCell(i, j) {
    const list = this.cells.get(`${i},${j}`);
    if (!list) return null;
    let seed = (i * 7919) ^ (j * 104729) ^ 0x2f1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const M = new Mesher();
    const group = new THREE.Group();
    for (const k of list) {
      const b = this.data.b[k];
      const lm = this.landmarkOf.get(k);
      if (lm) { group.add(this.landmark(lm, b, k)); continue; }
      building(M, b, this.hf, rnd);
    }
    const g = M.geoB();
    if (g) {
      const mesh = new THREE.Mesh(g, this.mats.plain);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    return {
      group,
      dispose() { group.traverse((o) => o.geometry && o.geometry.dispose()); },
    };
  }

  landmark(key, b, idx) {
    const pts = this.fp.get(idx);
    const o = obb(pts);
    let hmin = Infinity;
    for (const [x, z] of pts) hmin = Math.min(hmin, this.hf.height(x, z));
    const K = BUILDERS[key](o, b);
    for (const g of K.plain) {
      const st = g.attributes.aStyle, fa = g.attributes.aFloor;
      for (let i = 0; i < st.count; i++) if (st.getX(i) < 0.5) fa.setXY(i, hmin - 0.3, 2.9);
    }
    const grp = K.build(this.mats);
    // base un peu enterrée pour suivre la pente du terrain
    grp.position.set(o.cx, hmin - 0.3, o.cz);
    grp.rotation.y = -Math.atan2(o.uz, o.ux);
    grp.userData.landmark = key;
    return grp;
  }
}
