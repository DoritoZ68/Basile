// Véhicules de la caravane : break des équipes, voiture de direction,
// voiture-balai, motos (gendarmerie, télévision, photo, commissaire,
// ardoisier). Carrosseries modélisées par sections (bas poly, une seule
// géométrie par véhicule), roues de tous les véhicules dans un seul
// InstancedMesh qui tourne, gyrophares clignotants dans un autre.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { textSign } from "./scenery.js";

// couleur par sommet ; glow : partie lumineuse (phares, feux, écrans)
function vc(geo, hex, m, glow = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute("uv");
  if (m) g.applyMatrix4(m);
  const c = new THREE.Color(hex).multiplyScalar(glow), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

// boîte dont le dessus (top) et l'avant (front) sont rétrécis
function taperBox(w, h, d, top = 1, front = 1, frontH = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    if (y > 0) x *= top;
    if (p.getZ(i) > 0) { x *= front; if (y > 0) y = -h / 2 + h * frontH; }
    p.setXY(i, x, y);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------ carrosserie
// Break : sections tous les 10 cm de l'arrière (z = −2.35) à l'avant ;
// chaque section donne le bas de caisse (passages de roue découpés), la
// ceinture de caisse, le haut (capot, pare-brise, pavillon) et la largeur.
const WHEELS_CAR = [[-0.79, -1.42], [0.79, -1.42], [-0.79, 1.42], [0.79, 1.42]];
const R_CAR = 0.33;

function carSection(z) {
  const L = 2.35;
  let top;
  if (z < -2.25) top = 1.18 + (z + L) * 2.6; // hayon
  else if (z < 0.2) top = 1.46 - Math.max(0, -z - 1.6) * 0.04;
  else if (z < 1.05) top = 1.46 - (z - 0.2) * 0.55; // pare-brise
  else if (z < 2.15) top = 0.99 - (z - 1.05) * 0.14; // capot
  else top = 0.84 - (z - 2.15) * 1.0; // calandre
  let bot = 0.3;
  for (const wz of [-1.42, 1.42]) {
    const d = Math.abs(z - wz);
    if (d < 0.45) bot = Math.max(bot, 0.3 + Math.sqrt(0.45 * 0.45 - d * d) * 0.8);
  }
  const end = Math.max(0, (Math.abs(z) - 1.95) / 0.4);
  const w = 0.9 * (1 - 0.1 * end * end - (z > 0 ? 0.04 * end : 0));
  const belt = Math.min(top, 0.98 + Math.max(0, -z) * 0.012);
  const glass = z > 0.2 && z < 1.05 ? "wind" : z < -2.25 ? "rear" : "roof";
  return { top, bot, w, belt, glass };
}

export function carBody({ body = "#d0d0d0", stripe = null, low = "#2b2d30" } = {}) {
  const GL = "#1b232b";
  const zs = [];
  for (let z = -2.35; z <= 2.351; z += 0.1) zs.push(+z.toFixed(2));
  // anneau de 10 points, de bas gauche à bas droite en passant par le toit
  const ring = (z) => {
    const c = carSection(z);
    const glassTop = c.glass === "roof" ? c.top - 0.06 : c.top;
    const sh = Math.min(0.72, c.top - 0.03), sill = Math.min(Math.max(c.bot, 0.46), sh);
    return [
      [-c.w * 0.97, c.bot], [-c.w * 0.99, sill], [-c.w, sh], [-c.w * 0.97, c.belt], [-c.w * 0.8, glassTop],
      [c.w * 0.8, glassTop], [c.w * 0.97, c.belt], [c.w, sh], [c.w * 0.99, sill], [c.w * 0.97, c.bot],
    ];
  };
  // couleur du segment j (du point j au point j + 1)
  const segColor = (j, c, z) => {
    if (j === 0 || j === 8) return low;
    if ((j === 1 || j === 7) && stripe && z > -1.0 && z < 0.9) return stripe;
    if (j === 3 || j === 5) return c.top > c.belt + 0.02 ? GL : body;
    if (j === 4) return c.glass === "wind" ? GL : body;
    return body;
  };
  const pos = [], col = [];
  const tmp = new THREE.Color();
  const push = (a, b, c, hex) => {
    tmp.set(hex);
    for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); col.push(tmp.r, tmp.g, tmp.b); }
  };
  for (let i = 0; i < zs.length - 1; i++) {
    const A = ring(zs[i]), B = ring(zs[i + 1]);
    const zm = (zs[i] + zs[i + 1]) / 2, cm = carSection(zm);
    for (let j = 0; j < A.length - 1; j++) {
      const a = [A[j][0], A[j][1], zs[i]], b = [B[j][0], B[j][1], zs[i + 1]];
      const c = [B[j + 1][0], B[j + 1][1], zs[i + 1]], d = [A[j + 1][0], A[j + 1][1], zs[i]];
      const hex = segColor(j, cm, zm);
      push(a, b, c, hex);
      push(a, c, d, hex);
    }
  }
  // faces avant et arrière : bandes horizontales entre points symétriques
  for (const [z, front] of [[zs[0], false], [zs[zs.length - 1], true]]) {
    const R = ring(z), n = R.length;
    for (let j = 0; j < n / 2 - 1; j++) {
      const l0 = R[j], l1 = R[j + 1], r0 = R[n - 1 - j], r1 = R[n - 2 - j];
      let hex = j === 0 ? low : front ? (j === 1 ? "#202224" : body) : j >= 3 ? GL : body;
      const a = [l0[0], l0[1], z], b = [l1[0], l1[1], z], c = [r1[0], r1[1], z], d = [r0[0], r0[1], z];
      if (front) { push(a, d, c, hex); push(a, c, b, hex); } else { push(a, b, c, hex); push(a, c, d, hex); }
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  // sommets fusionnés : normales lissées le long de la caisse
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  const parts = [g.toNonIndexed()];
  // châssis sombre (masque l'intérieur vu par les passages de roue)
  parts.push(vc(new THREE.BoxGeometry(1.5, 0.36, 4.3), "#141414", M(0, 0.5, 0)));
  // phares, feux, rétroviseurs, plaques, pare-chocs
  for (const s of [-1, 1]) {
    parts.push(vc(new THREE.BoxGeometry(0.36, 0.09, 0.04), "#fff4dc", M(s * 0.58, 0.74, 2.35, 0, s * 0.12), 3.2));
    parts.push(vc(new THREE.BoxGeometry(0.08, 0.3, 0.04), "#ff1a14", M(s * 0.74, 1.0, -2.36), 3.2));
    parts.push(vc(new THREE.BoxGeometry(0.22, 0.05, 0.03), "#ff1a14", M(s * 0.55, 0.62, -2.36), 1.6));
    parts.push(vc(taperBox(0.1, 0.11, 0.16, 0.8), body, M(s * 0.98, 1.05, 0.98)));
    parts.push(vc(new THREE.BoxGeometry(0.02, 0.06, 0.09), "#ff9b20", M(s * 1.02, 1.03, 0.98), 2.5));
  }
  parts.push(vc(new THREE.BoxGeometry(0.52, 0.12, 0.02), "#f2f2f2", M(0, 0.46, 2.36)));
  parts.push(vc(new THREE.BoxGeometry(0.52, 0.12, 0.02), "#f2f2f2", M(0, 0.78, -2.37)));
  parts.push(vc(new THREE.BoxGeometry(0.06, 0.12, 0.02), "#1f4fbf", M(-0.24, 0.46, 2.372)));
  parts.push(vc(new THREE.BoxGeometry(0.06, 0.12, 0.02), "#1f4fbf", M(-0.24, 0.78, -2.382)));
  return parts;
}

// vélo de rechange sur le toit (debout, roue avant démontée sur le côté)
function roofBike(x, frame) {
  const p = [];
  for (const z of [-0.5, 0.5]) p.push(vc(new THREE.TorusGeometry(0.33, 0.018, 4, 18).rotateY(Math.PI / 2), "#111", M(x, 0.36, z)));
  const tube = (a, b, r = 0.018, hex = frame) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const g = new THREE.CylinderGeometry(r, r, d.length(), 5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return vc(g, hex, new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1)));
  };
  const bb = [x, 0.3, 0], seat = [x, 0.82, -0.18], head = [x, 0.78, 0.38];
  p.push(tube(bb, seat), tube(seat, head), tube(bb, head, 0.024), tube(bb, [x, 0.36, -0.5]), tube(seat, [x, 0.36, -0.5], 0.014), tube(head, [x, 0.36, 0.5]));
  p.push(tube([x, 0.9, -0.2], [x, 0.9, -0.06], 0.03, "#111"), tube([x - 0.2, 0.86, 0.42], [x + 0.2, 0.86, 0.42], 0.014, "#222"));
  return p;
}

export function teamCar(team) {
  const parts = carBody({ body: team.jersey, stripe: team.jersey2 });
  // galerie et 4 vélos
  parts.push(vc(new THREE.BoxGeometry(1.5, 0.04, 0.05), "#222", M(0, 1.52, -1.25)));
  parts.push(vc(new THREE.BoxGeometry(1.5, 0.04, 0.05), "#222", M(0, 1.52, -0.05)));
  for (const x of [-0.55, -0.18, 0.18, 0.55]) for (const g of roofBike(x, team.frame)) { g.translate(0, 1.5, -0.65); parts.push(g); }
  // roues de rechange sur le hayon
  parts.push(vc(new THREE.TorusGeometry(0.3, 0.02, 4, 16), "#111", M(-0.3, 1.0, -2.42)));
  parts.push(vc(new THREE.TorusGeometry(0.3, 0.02, 4, 16), "#111", M(0.3, 1.0, -2.42)));
  return mergeGeometries(parts);
}

export function officialCar(body, signBg) {
  const parts = carBody({ body });
  parts.push(vc(new THREE.BoxGeometry(0.06, 0.4, 0.06), "#333", M(0, 1.66, -0.6)));
  return mergeGeometries(parts);
}

// panneau de toit à deux faces (texte)
export function roofSign(lines, bg, fg = "#fff") {
  const tex = textSign(lines, { w: 320, h: 64, bg, fg, radius: 4 });
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), mat);
  m.position.set(0, 1.86, -0.6);
  return m;
}

// ------------------------------------------------------------ motos
// moto de route (type grand tourisme) : avant = +z ; kind : tv, photo,
// com (commissaire), ardoise, gendarme ; le passager du caméraman est assis
// à l'envers pour filmer les coureurs derrière
const WHEELS_MOTO = [[0, -0.74], [0, 0.78]];
const R_MOTO = 0.32;
const ONE = new THREE.Vector3(1, 1, 1);

function person(p, { suit, helmet, x = 0, z = 0, y = 0, back = false, arms = "bars", lean = 0.25 }) {
  const dir = back ? -1 : 1;
  const T = (g, hex, m) => p.push(vc(g, hex, m));
  // bassin, buste, tête
  T(new THREE.BoxGeometry(0.34, 0.2, 0.3), suit, M(x, y + 0.98, z));
  T(new THREE.CylinderGeometry(0.16, 0.19, 0.62, 9).scale(1.15, 1, 0.75), suit, M(x, y + 1.32, z + dir * 0.08, dir * lean));
  T(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6), suit, M(x, y + 1.66, z + dir * 0.15));
  T(new THREE.SphereGeometry(0.15, 10, 8).scale(1, 1.08, 1.12), helmet, M(x, y + 1.76, z + dir * 0.2));
  T(new THREE.BoxGeometry(0.2, 0.08, 0.04), "#151a20", M(x, y + 1.76, z + dir * 0.36));
  // cuisses et jambes vers les repose-pieds
  for (const s of [-1, 1]) {
    T(new THREE.CylinderGeometry(0.08, 0.07, 0.46, 6), suit, M(x + s * 0.15, y + 0.96, z + dir * 0.2, Math.PI / 2 - dir * 0.15));
    T(new THREE.CylinderGeometry(0.065, 0.055, 0.48, 6), suit, M(x + s * 0.2, y + 0.72, z + dir * 0.38, dir * 0.35));
    T(new THREE.BoxGeometry(0.1, 0.08, 0.24), "#151515", M(x + s * 0.2, y + 0.5, z + dir * 0.48));
  }
  if (arms === "bars") for (const s of [-1, 1]) T(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 6), suit, M(x + s * 0.24, y + 1.36, z + dir * 0.4, dir * 1.05, 0, s * 0.18));
}

export function motoGeometry(kind) {
  const L = {
    tv: { body: "#f2f2f2", trim: "#1b1b1b", suit: "#20262e", helmet: "#f2f2f2" },
    photo: { body: "#2a2f36", trim: "#f2c230", suit: "#3a3f2f", helmet: "#2a2a2a" },
    com: { body: "#1f5fbf", trim: "#ffffff", suit: "#18263a", helmet: "#ffffff" },
    ardoise: { body: "#e8e8e8", trim: "#c8102e", suit: "#2b2b2b", helmet: "#c8102e" },
    gendarme: { body: "#f4f4f4", trim: "#173e8c", suit: "#173061", helmet: "#f4f4f4" },
  }[kind];
  const p = [];
  const T = (g, hex, m, glow) => p.push(vc(g, hex, m, glow));
  // moteur flat-twin, cadre, échappement
  T(new THREE.BoxGeometry(0.3, 0.32, 0.6), "#3a3d42", M(0, 0.48, 0.05));
  for (const s of [-1, 1]) T(new THREE.CylinderGeometry(0.1, 0.11, 0.26, 10).rotateZ(Math.PI / 2), "#8d9399", M(s * 0.28, 0.44, 0.28));
  T(new THREE.CylinderGeometry(0.055, 0.06, 0.8, 8).rotateX(Math.PI / 2 - 0.12), "#a9adb2", M(0.24, 0.4, -0.55));
  T(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), "#555", M(0, 0.48, -0.55, 0.9));
  // fourche
  for (const s of [-1, 1]) T(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 6), "#2a2a2a", M(s * 0.1, 0.62, 0.68, -0.45));
  T(new THREE.BoxGeometry(0.22, 0.05, 0.42), L.body, M(0, 0.62, 0.78, -0.2));
  // carénage, réservoir, bulle, selle, valises, top-case
  T(taperBox(0.74, 0.52, 0.55, 0.62, 0.5, 0.8), L.body, M(0, 0.95, 0.55));
  T(new THREE.BoxGeometry(0.42, 0.04, 0.16), L.trim, M(0, 0.82, 0.83));
  T(new THREE.BoxGeometry(0.34, 0.08, 0.04), "#fff4dc", M(0, 0.98, 0.84), 3.2);
  T(new THREE.PlaneGeometry(0.4, 0.3), "#6f8291", M(0, 1.3, 0.74, -0.55));
  T(taperBox(0.42, 0.24, 0.5, 0.7), L.body, M(0, 1.0, 0.15));
  T(new THREE.BoxGeometry(0.3, 0.1, 0.78), "#161616", M(0, 1.02, -0.38));
  for (const s of [-1, 1]) {
    T(taperBox(0.2, 0.38, 0.56, 0.85), L.body, M(s * 0.36, 0.72, -0.56));
    T(new THREE.BoxGeometry(0.21, 0.03, 0.57), L.trim, M(s * 0.36, 0.82, -0.56));
    T(new THREE.BoxGeometry(0.03, 0.18, 0.22), "#3a3a3a", M(s * 0.24, 1.18, 0.36, 0, 0, s * 0.3));
    T(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 5).rotateZ(Math.PI / 2), "#222", M(s * 0.2, 1.17, 0.42));
  }
  T(new THREE.BoxGeometry(0.16, 0.06, 0.03), "#ff1a14", M(0, 0.95, -0.98), 3.2);
  T(new THREE.BoxGeometry(0.34, 0.14, 0.03), L.trim, M(0, 0.64, -0.98));
  // pilote
  person(p, { suit: L.suit, helmet: L.helmet, z: -0.08, y: 0.0 });
  if (kind === "gendarme") {
    T(new THREE.BoxGeometry(0.44, 0.3, 0.38), L.body, M(0, 1.2, -0.9));
    T(new THREE.BoxGeometry(0.45, 0.06, 0.39), L.trim, M(0, 1.22, -0.9));
    T(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), "#222", M(-0.18, 1.6, -1.0));
  } else {
    // passager
    const back = kind === "tv";
    person(p, { suit: kind === "com" ? "#16233a" : "#2f3640", helmet: L.helmet, z: -0.62, y: 0.12, back, arms: "none", lean: back ? 0.05 : 0.15 });
    if (kind === "tv") {
      // caméra d'épaule tournée vers l'arrière, antenne HF
      T(new THREE.BoxGeometry(0.16, 0.2, 0.42), "#1a1a1a", M(0.16, 1.68, -0.9));
      T(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 10).rotateX(Math.PI / 2), "#0d0d0d", M(0.16, 1.68, -1.18));
      T(new THREE.BoxGeometry(0.05, 0.05, 0.05), "#ff1a14", M(0.16, 1.82, -0.84), 3.2);
      T(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), "#cfcfcf", M(-0.2, 1.7, -1.0));
      T(new THREE.BoxGeometry(0.24, 0.12, 0.24), "#cfcfcf", M(-0.2, 2.22, -1.0));
    } else if (kind === "photo") {
      T(new THREE.BoxGeometry(0.14, 0.1, 0.1), "#111", M(-0.1, 1.5, -0.38));
      T(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8).rotateX(Math.PI / 2), "#222", M(-0.1, 1.5, -0.2));
    } else if (kind === "ardoise") {
      T(new THREE.BoxGeometry(0.64, 0.33, 0.012), "#2a2a2a", M(0.32, 1.62, -0.714));
    } else if (kind === "com") {
      T(new THREE.BoxGeometry(0.02, 0.2, 0.3), "#f2c230", M(-0.36, 1.52, -0.5));
    }
  }
  return mergeGeometries(p);
}

// ardoise : panneau tenu par le passager, écart affiché
export function slate() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(0.32, 1.62, -0.723);
  m.rotation.y = Math.PI;
  m.userData.draw = (top, big) => {
    const g = c.getContext("2d");
    g.fillStyle = "#151515"; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "#ddd"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "700 30px Arial, sans-serif"; g.fillText(top, 128, 36, 236);
    g.font = "700 52px Arial, sans-serif"; g.fillText(big, 128, 88, 236);
    tex.needsUpdate = true;
  };
  return m;
}

// ------------------------------------------------------------ flotte
// Matériau commun : Phong (reflets sur la peinture et les vitres) ; les
// couleurs > 1 (×3) sont des lampes, affichées sans éclairage.
function fleetMaterial() {
  const m = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x3a3a3a, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace("#include <opaque_fragment>", "if (vColor.r + vColor.g + vColor.b > 4.0) outgoingLight = vColor.rgb * 0.5;\n#include <opaque_fragment>");
  };
  return m;
}

function wheelGeometry(r, w, rim, spokes) {
  const p = [];
  p.push(vc(new THREE.TorusGeometry(r - w * 0.35, w * 0.42, 6, 18).rotateY(Math.PI / 2), "#121212"));
  p.push(vc(new THREE.CylinderGeometry(r * 0.66, r * 0.66, w * 0.7, 14, 1, true).rotateZ(Math.PI / 2), rim));
  for (let k = 0; k < spokes; k++) p.push(vc(new THREE.BoxGeometry(w * 0.5, r * 1.3, r * 0.1), rim, M(0, 0, 0, (k / spokes) * Math.PI)));
  p.push(vc(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w * 0.8, 8).rotateZ(Math.PI / 2), "#6d7177"));
  return mergeGeometries(p);
}

function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(0.6, "rgba(0,0,0,0.35)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Fleet {
  constructor(scene, capacity = 24) {
    this.scene = scene;
    this.mat = fleetMaterial();
    this.list = [];
    this.carWheels = new THREE.InstancedMesh(wheelGeometry(R_CAR, 0.22, "#9aa0a6", 5), this.mat, capacity * 4);
    this.motoWheels = new THREE.InstancedMesh(wheelGeometry(R_MOTO, 0.16, "#2d2f33", 6), this.mat, capacity * 2);
    this.beacons = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }), capacity * 2);
    // ombre de contact sous chaque véhicule (même sans ombres portées)
    this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), capacity);
    this.shadows.renderOrder = 1;
    for (const m of [this.carWheels, this.motoWheels, this.beacons, this.shadows]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
    this.carWheels.castShadow = true;
    this.t = 0;
    this._m = new THREE.Matrix4();
    this._w = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  // kind : "car" ou "moto" ; beacons : [[x, y, z, couleur, phase]]
  add(geo, kind, beacons = []) {
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.castShadow = true;
    mesh.rotation.order = "YXZ";
    this.scene.add(mesh);
    const v = { mesh, kind, spin: 0, lean: 0, yaw: null, beacons, visible: true };
    this.list.push(v);
    return v;
  }

  // place un véhicule : position, cap, pente ; vitesse et inclinaison
  // déduites du déplacement
  place(v, x, y, z, yaw, pitch, dt, visible = true) {
    const m = v.mesh;
    const dist = v.yaw === null ? 0 : Math.hypot(x - m.position.x, z - m.position.z);
    const speed = dt > 0 ? dist / dt : 0;
    if (v.yaw !== null && dt > 0) {
      let dy = yaw - v.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const want = -Math.atan(Math.max(-0.7, Math.min(0.7, (speed * dy / dt) / 9.81)));
      v.lean += ((v.kind === "moto" ? want : want * 0.06) - v.lean) * Math.min(1, dt * 4);
    }
    v.yaw = yaw;
    v.spin += (dist / (v.kind === "moto" ? R_MOTO : R_CAR)) % (Math.PI * 2);
    m.position.set(x, y, z);
    m.rotation.set(pitch, yaw, v.lean);
    m.visible = v.visible = visible;
  }

  update(dt) {
    this.t += dt;
    let nc = 0, nm = 0, nb = 0, ns = 0;
    const W = this._w, Mx = this._m, q = this._q, P = this._v;
    for (const v of this.list) {
      if (!v.visible) continue;
      v.mesh.updateMatrix();
      W.makeScale(v.kind === "moto" ? 1.1 : 2.5, 1, v.kind === "moto" ? 2.6 : 5.6).setPosition(0, 0.04, 0);
      Mx.multiplyMatrices(v.mesh.matrix, W);
      this.shadows.setMatrixAt(ns++, Mx);
      const wheels = v.kind === "moto" ? WHEELS_MOTO : WHEELS_CAR;
      const r = v.kind === "moto" ? R_MOTO : R_CAR;
      const im = v.kind === "moto" ? this.motoWheels : this.carWheels;
      for (const [x, z] of wheels) {
        q.setFromAxisAngle(P.set(1, 0, 0), v.spin);
        W.compose(P.set(x, r, z), q, ONE);
        Mx.multiplyMatrices(v.mesh.matrix, W);
        im.setMatrixAt(v.kind === "moto" ? nm++ : nc++, Mx);
      }
      for (const [x, y, z, hex, ph] of v.beacons) {
        const on = Math.sin((this.t + ph) * 11) > 0.2;
        W.makeTranslation(x, y, z);
        if (!on) W.scale(P.set(0.001, 0.001, 0.001));
        Mx.multiplyMatrices(v.mesh.matrix, W);
        this.beacons.setMatrixAt(nb, Mx);
        this.beacons.setColorAt(nb++, this._c.set(hex).multiplyScalar(1.6));
      }
    }
    this.carWheels.count = nc;
    this.motoWheels.count = nm;
    this.beacons.count = nb;
    this.shadows.count = ns;
    for (const m of [this.carWheels, this.motoWheels, this.beacons, this.shadows]) m.instanceMatrix.needsUpdate = true;
    if (this.beacons.instanceColor) this.beacons.instanceColor.needsUpdate = true;
  }

  // distance horizontale du véhicule visible le plus proche
  nearest(x, z) {
    let best = 1e9;
    for (const v of this.list) if (v.visible) best = Math.min(best, Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z));
    return best;
  }

  dispose() {
    for (const v of this.list) { this.scene.remove(v.mesh); v.mesh.geometry.dispose(); }
    for (const m of [this.carWheels, this.motoWheels, this.beacons, this.shadows]) { this.scene.remove(m); m.geometry.dispose(); }
    this.shadows.material.map.dispose();
    this.list = [];
  }
}
