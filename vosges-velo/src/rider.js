// Cycliste animé : vélo de route ou de contre-la-montre, corps modelé
// (buste, mollets, chaussures, gants, lunettes), casque ventilé ou profilé.
// Les couleurs passent par une palette (maillot, casque, cadre…) pour
// pouvoir habiller n'importe quel coureur du peloton sans reconstruire.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

// emplacements de la palette
export const SLOT = { JERSEY: 0, JERSEY2: 1, SHORTS: 2, SKIN: 3, HELMET: 4, HELMET2: 5, SHOES: 6, FRAME: 7, FRAME2: 8 };
const SLOT_KEYS = ["jersey", "jersey2", "shorts", "skin", "helmet", "helmet2", "shoes", "frame", "frame2"];
export const TEAM_SLOTS = new Set([SLOT.JERSEY, SLOT.JERSEY2, SLOT.HELMET, SLOT.FRAME]);
const DEFAULT_PALETTE = { jersey: "#d81e2c", jersey2: "#ffffff", shorts: "#17181b", skin: "#e0b293", helmet: "#ffffff", helmet2: "#d81e2c", shoes: "#f2f2f2", frame: "#202020", frame2: "#c8102e" };

// oriente un repère de membre de a vers b (gabarit de longueur 1 sur +y)
function place(o, a, b, rigid) {
  o.position.copy(a);
  tmpA.subVectors(b, a);
  const len = tmpA.length();
  if (rigid) o.scale.set(1, 1, 1); else o.scale.set(1, len, 1);
  o.quaternion.setFromUnitVectors(UP, tmpA.normalize());
}

let shadowTex = null;
function blobShadow() {
  if (!shadowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, "rgba(0,0,0,0.55)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 2.1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---------------------------------------------------------------- gabarits
// Une pièce = géométrie non indexée + emplacement de palette par sommet
// (ou couleur fixe). spec : numéro d'emplacement, couleur "#rrggbb", ou
// fonction (t = hauteur relative 0..1, p = position) -> l'un des deux.
const tmpO = new THREE.Object3D();
function piece(geo, spec, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (g.attributes.uv) g.deleteAttribute("uv");
  g.computeBoundingBox();
  const bb = g.boundingBox, h = bb.max.y - bb.min.y || 1;
  const pa = g.attributes.position, n = pa.count;
  const slots = new Int8Array(n), fixed = new Float32Array(n * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pa, i);
    let s = typeof spec === "function" ? spec((v.y - bb.min.y) / h, v) : spec;
    if (typeof s === "number") slots[i] = s;
    else { slots[i] = -1; c.set(s); fixed[i * 3] = c.r; fixed[i * 3 + 1] = c.g; fixed[i * 3 + 2] = c.b; }
  }
  if (matrix) g.applyMatrix4(matrix);
  g.userData = { slots, fixed };
  return g;
}
function mergePieces(list) {
  const g = mergeGeometries(list.map((p) => { const q = p.clone(); q.userData = {}; return q; }));
  let n = 0;
  for (const p of list) n += p.attributes.position.count;
  const slots = new Int8Array(n), fixed = new Float32Array(n * 3);
  let o = 0;
  for (const p of list) { slots.set(p.userData.slots, o); fixed.set(p.userData.fixed, o * 3); o += p.attributes.position.count; }
  g.userData = { slots, fixed };
  return g;
}
const at = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { tmpO.position.set(x, y, z); tmpO.rotation.set(rx, ry, rz); tmpO.scale.setScalar(s); tmpO.updateMatrix(); return tmpO.matrix.clone(); };
const lathe = (prof, seg = 9) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), Math.max(3, seg));

// membre : gabarit de longueur 1 le long de +y, profil de rayons
function limbGeo(radii, seg = 8) {
  const prof = radii.map(([y, r]) => [r, y]);
  return lathe([[0.001, 0], ...prof, [0.001, 1]], sg(seg));
}

const SKIN = SLOT.SKIN;
let LITE = false; // gabarits simplifiés pour les coureurs lointains
const sg = (n) => (LITE ? Math.max(3, Math.round(n / 2)) : n);
function bodyParts(TT) {
  const P = {};
  // cuisse : cuissard jusqu'au-dessus du genou
  P.thigh = piece(limbGeo([[0, 0.078], [0.25, 0.08], [0.6, 0.068], [0.9, 0.052], [1, 0.048]]), (t) => (t < 0.78 ? SLOT.SHORTS : t < 0.8 ? SLOT.JERSEY : SKIN));
  // jambe : mollet galbé, socquette blanche
  P.shin = piece(limbGeo([[0, 0.046], [0.22, 0.056], [0.4, 0.052], [0.75, 0.034], [1, 0.03]]), (t) => (t < 0.78 ? SKIN : "#f2f2f2"));
  // chaussure : semelle carbone, bout effilé
  const shoe = lathe([[0.001, 0], [0.04, 0.02], [0.048, 0.1], [0.044, 0.2], [0.02, 0.26], [0.001, 0.27]], 8);
  shoe.scale(1, 1, 0.75);
  shoe.rotateX(Math.PI / 2);
  shoe.translate(0, 0.0, -0.07);
  P.foot = piece(shoe, (t, p) => (p.y < -0.025 ? "#121212" : SLOT.SHOES));
  // buste rigide de 0,56 m (bassin -> épaules) : torse élargi, bande de couleur
  const torso = lathe([[0.001, 0], [0.12, 0.02], [0.135, 0.12], [0.145, 0.28], [0.16, 0.42], [0.165, 0.5], [0.13, 0.56], [0.05, 0.58], [0.001, 0.585]], sg(12));
  torso.scale(1.18, 1, 0.78);
  const tparts = [piece(torso, (t) => (t < 0.14 ? SLOT.SHORTS : t > 0.52 && t < 0.62 ? SLOT.JERSEY2 : t > 0.86 ? SLOT.JERSEY2 : SLOT.JERSEY))];
  for (const sx of [-1, 1]) tparts.push(piece(new THREE.SphereGeometry(0.065, 8, 6), SLOT.JERSEY, at(sx * 0.165, 0.52, 0)));
  tparts.push(piece(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 8), SKIN, at(0, 0.6, 0.02)));
  // numéro de dossard : rectangle blanc dans le dos
  tparts.push(piece(new THREE.BoxGeometry(0.16, 0.12, 0.01), "#f6f6f6", at(0, 0.28, -0.115)));
  P.torso = mergePieces(tparts);
  // bras : manche courte avec liseré, avant-bras, gant
  P.upper = piece(limbGeo([[0, 0.05], [0.4, 0.046], [1, 0.038]]), (t) => (t < 0.5 ? SLOT.JERSEY : t < 0.56 ? SLOT.JERSEY2 : SKIN));
  P.fore = piece(limbGeo([[0, 0.036], [0.3, 0.038], [1, 0.027]]), SKIN);
  const glove = new THREE.SphereGeometry(0.038, 8, 6);
  glove.scale(0.8, 1.2, 1);
  P.hand = piece(glove, "#1c1c1e");
  // tête : visage, lunettes enveloppantes, casque
  const head = [piece(new THREE.SphereGeometry(0.098, sg(12), sg(9)), SKIN)];
  head.push(piece(new THREE.SphereGeometry(0.03, 6, 4), SKIN, at(0, -0.01, 0.1))); // nez
  const lens = new THREE.CylinderGeometry(0.104, 0.104, 0.045, 14, 1, true, -1.15, 2.3);
  head.push(piece(lens, "#0d1d2c", at(0, 0.012, 0)));
  if (TT) {
    // casque profilé : coque en goutte d'eau, queue longue, visière
    const shell = new THREE.SphereGeometry(0.128, 14, 10);
    shell.scale(0.92, 0.82, 1.0);
    const pa = shell.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const z = pa.getZ(i);
      if (z < 0) { pa.setZ(i, z * 2.4); pa.setY(i, pa.getY(i) * (1 + z * 1.6) + z * 0.1); }
    }
    shell.computeVertexNormals();
    head.push(piece(shell, (t, p) => (p.y > 0.06 && Math.abs(p.x) < 0.03 ? SLOT.HELMET2 : SLOT.HELMET), at(0, 0.03, -0.01, 0.2)));
    const visor = new THREE.SphereGeometry(0.135, 12, 6, Math.PI / 2 - 1.0, 2.0, 1.2, 0.7);
    head.push(piece(visor, "#1b2a3a", at(0, 0.0, 0.0, 0, 0, 0)));
  } else {
    // casque de route : coque ovale à aérations, bande de couleur, molette
    const shell = new THREE.SphereGeometry(0.124, sg(18), sg(10), 0, Math.PI * 2, 0, Math.PI / 1.85);
    shell.scale(0.93, 0.86, 1.22);
    head.push(piece(shell, (t, p) => {
      const ang = Math.atan2(p.x, p.z);
      const vent = Math.abs(Math.sin(ang * 3.5)) > 0.82 && p.y > 0.03 && p.y < 0.095 && p.z > -0.11;
      if (vent) return "#141414";
      if (Math.abs(p.x) < 0.022 && p.y > 0.06) return SLOT.HELMET2;
      return SLOT.HELMET;
    }, at(0, 0.04, -0.012, 0.32)));
    head.push(piece(new THREE.BoxGeometry(0.06, 0.03, 0.03), "#1a1a1a", at(0, -0.02, -0.12, 0.2))); // molette de réglage
    for (const sx of [-1, 1]) head.push(piece(new THREE.BoxGeometry(0.006, 0.12, 0.012), "#1a1a1a", at(sx * 0.088, -0.05, 0.01, 0.1))); // sangles
  }
  P.head = mergePieces(head);
  return P;
}

function bikeParts(TT) {
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const F = SLOT.FRAME, F2 = SLOT.FRAME2;
  const tube = (a, b, r, spec, aero) => {
    const g = new THREE.CylinderGeometry(r, r, 1, sg(aero ? 8 : 7));
    if (aero) g.scale(0.55, 1, 1.9);
    g.translate(0, 0.5, 0);
    tmpO.position.copy(a);
    tmpA.subVectors(b, a);
    tmpO.scale.set(1, tmpA.length(), 1);
    tmpO.quaternion.setFromUnitVectors(UP, tmpA.normalize());
    tmpO.updateMatrix();
    return piece(g, spec, tmpO.matrix);
  };
  const curve = (pts, r, spec, seg = 14) => piece(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => P(...q))), sg(seg), r, LITE ? 3 : 5), spec);
  const BLACK = "#16171a", METAL = "#a7a9ad", CARBON = "#2a2b2f";
  const BB = P(0, 0.265, 0), RA = P(0, 0.335, -0.41), FA = P(0, 0.335, 0.585);
  const ST = TT ? P(0, 0.72, -0.12) : P(0, 0.765, -0.165);
  const HT = TT ? P(0, 0.69, 0.475) : P(0, 0.785, 0.47);
  const HB = TT ? P(0, 0.57, 0.515) : P(0, 0.635, 0.51);
  const saddle = TT ? P(0, 0.905, -0.1) : P(0, 0.905, -0.2);
  const out = { BB, RA, FA, HT, saddle };

  const wheel = (front) => {
    const parts = [piece(new THREE.TorusGeometry(0.322, 0.0125, sg(6), sg(30)), "#1a1a1a", at(0, 0, 0, 0, Math.PI / 2))];
    const rimDepth = TT ? (front ? 0.08 : 0) : 0.035;
    if (TT && !front) {
      parts.push(piece(new THREE.CylinderGeometry(0.31, 0.31, 0.024, 30).rotateZ(Math.PI / 2), CARBON));
      parts.push(piece(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10).rotateZ(Math.PI / 2), "#c9c9c9"));
    } else {
      const w = 0.011, rIn = 0.31 - rimDepth;
      const rim = lathe([[rIn, -w], [0.312, -w * 1.1], [0.312, w * 1.1], [rIn, w], [rIn, -w]], sg(28));
      rim.rotateZ(Math.PI / 2);
      parts.push(piece(rim, TT ? CARBON : "#202124"));
      parts.push(piece(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8).rotateZ(Math.PI / 2), METAL));
      const n = LITE ? 0 : TT ? 16 : 20;
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2, side = k % 2 ? 1 : -1, len = rIn - 0.02;
        const g = new THREE.BoxGeometry(0.003, len, 0.003);
        g.translate(0, 0.02 + len / 2, 0);
        g.rotateZ(side * 0.04);
        g.rotateX(ang);
        g.translate(side * 0.022, 0, 0);
        parts.push(piece(g, "#2c2c2e"));
      }
    }
    return mergePieces(parts);
  };
  out.rear = wheel(false);
  out.front = wheel(true);

  const crank = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.014, 0.025, 0.1725);
    arm.translate(side * 0.085, 0, (side > 0 ? 1 : -1) * 0.086);
    crank.push(piece(arm, "#2b2b2b"));
    const pedal = new THREE.BoxGeometry(0.085, 0.018, 0.07);
    pedal.translate(side * 0.13, 0, (side > 0 ? 1 : -1) * 0.1725);
    crank.push(piece(pedal, "#111111"));
  }
  crank.push(piece(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8).rotateZ(Math.PI / 2), METAL));
  out.crank = mergePieces(crank);

  const fr = [];
  fr.push(tube(BB, ST, 0.017, F, TT), tube(BB, HB, TT ? 0.024 : 0.021, F, TT), tube(ST, HT, TT ? 0.014 : 0.015, F, TT), tube(HB, HT, 0.02, F2, TT));
  for (const sx of [-1, 1]) {
    fr.push(tube(P(sx * 0.03, BB.y, BB.z - 0.03), P(sx * 0.06, RA.y, RA.z), 0.01, F, false));
    fr.push(tube(P(sx * 0.025, ST.y - 0.03, ST.z - 0.02), P(sx * 0.06, RA.y, RA.z), 0.0085, F2, TT));
    fr.push(curve([[sx * 0.03, HB.y, HB.z], [sx * 0.045, 0.48, 0.56], [sx * 0.05, FA.y, FA.z]], 0.012, F, 6));
  }
  fr.push(tube(ST, saddle, 0.0135, TT ? F : CARBON, TT));
  const saddleG = new THREE.CylinderGeometry(0.075, 0.02, 0.27, 10, 1);
  saddleG.rotateX(Math.PI / 2);
  saddleG.scale(1, 0.25, 1);
  fr.push(piece(saddleG, BLACK, at(saddle.x, saddle.y + 0.015, saddle.z + 0.02)));
  if (TT) {
    fr.push(tube(HT, P(0, HT.y + 0.03, HT.z + 0.06), 0.017, F, true));
    fr.push(curve([[-0.2, HT.y + 0.05, HT.z + 0.15], [-0.17, HT.y + 0.04, HT.z + 0.08], [0, HT.y + 0.03, HT.z + 0.07], [0.17, HT.y + 0.04, HT.z + 0.08], [0.2, HT.y + 0.05, HT.z + 0.15]], 0.013, CARBON, 16));
    for (const sx of [-1, 1]) {
      fr.push(curve([[sx * 0.05, HT.y + 0.1, HT.z + 0.02], [sx * 0.05, HT.y + 0.11, HT.z + 0.3], [sx * 0.05, HT.y + 0.16, HT.z + 0.38]], 0.011, CARBON, 8));
      fr.push(tube(P(sx * 0.05, HT.y + 0.04, HT.z + 0.05), P(sx * 0.05, HT.y + 0.1, HT.z + 0.04), 0.008, METAL, false));
      fr.push(piece(new THREE.BoxGeometry(0.075, 0.02, 0.1), "#0d0d0d", at(sx * 0.085, HT.y + 0.115, HT.z + 0.03)));
    }
  } else {
    const top = P(0, HT.y + 0.03, HT.z + 0.1);
    fr.push(tube(HT, top, 0.016, BLACK, false));
    for (const sx of [-1, 1]) {
      fr.push(curve([[0, top.y, top.z], [sx * 0.12, top.y, top.z + 0.005], [sx * 0.2, top.y, top.z + 0.02], [sx * 0.21, top.y, top.z + 0.09], [sx * 0.21, top.y - 0.07, top.z + 0.12], [sx * 0.21, top.y - 0.13, top.z + 0.08], [sx * 0.21, top.y - 0.14, top.z + 0.02]], 0.0125, BLACK, 16));
      fr.push(piece(new THREE.BoxGeometry(0.03, 0.045, 0.06), BLACK, at(sx * 0.21, top.y + 0.02, top.z + 0.08, -0.4)));
    }
    out.hoods = top;
    const mid = BB.clone().lerp(HB, 0.45).add(P(0, 0.045, -0.01));
    tmpO.position.copy(mid);
    tmpO.quaternion.setFromUnitVectors(UP, HB.clone().sub(BB).normalize());
    tmpO.scale.set(1, 1, 1);
    tmpO.updateMatrix();
    fr.push(piece(new THREE.CylinderGeometry(0.034, 0.034, 0.2, 10), (t) => (t > 0.85 ? "#222" : SLOT.JERSEY2), tmpO.matrix));
  }
  fr.push(piece(new THREE.CylinderGeometry(TT ? 0.115 : 0.105, TT ? 0.115 : 0.105, 0.008, 28).rotateZ(Math.PI / 2), METAL, at(0.06, BB.y, BB.z)));
  fr.push(piece(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 22).rotateZ(Math.PI / 2), "#7d7f83", at(0.05, BB.y, BB.z)));
  fr.push(piece(new THREE.CylinderGeometry(0.055, 0.03, 0.035, 16).rotateZ(Math.PI / 2), "#8d8f93", at(0.055, RA.y, RA.z)));
  fr.push(piece(new THREE.BoxGeometry(0.02, 0.08, 0.04), "#2b2b2b", at(0.065, RA.y - 0.08, RA.z + 0.01)));
  fr.push(tube(P(0.058, BB.y + 0.105, BB.z), P(0.058, RA.y + 0.05, RA.z), 0.004, "#3a3a3a", false));
  fr.push(tube(P(0.058, BB.y - 0.105, BB.z), P(0.058, RA.y - 0.06, RA.z + 0.02), 0.004, "#3a3a3a", false));
  out.frame = mergePieces(fr);
  return out;
}

// gabarits partagés (construits une fois par type de vélo)
const TEMPLATES = {};
function templates(type, lite = false) {
  const key = type + (lite ? "-lite" : "");
  if (!TEMPLATES[key]) {
    const TT = type === "clm";
    LITE = lite;
    TEMPLATES[key] = { body: bodyParts(TT), bike: bikeParts(TT) };
    LITE = false;
  }
  return TEMPLATES[key];
}

function paletteColors(pal) {
  const p = { ...DEFAULT_PALETTE, ...pal };
  return SLOT_KEYS.map((k) => new THREE.Color(p[k]));
}

function writeColors(attr, ud, cols) {
  const a = attr.array, s = ud.slots, f = ud.fixed;
  for (let i = 0; i < s.length; i++) {
    if (s[i] < 0) { a[i * 3] = f[i * 3]; a[i * 3 + 1] = f[i * 3 + 1]; a[i * 3 + 2] = f[i * 3 + 2]; }
    else { const c = cols[s[i]]; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  }
  attr.needsUpdate = true;
}

export class RiderModel {
  // type : "route" ou "clm" ; palette : voir DEFAULT_PALETTE
  constructor({ jersey, helmet, bike, palette = {}, ghost = false, type = "route", lite = false } = {}) {
    const TT = type === "clm";
    this.type = type;
    this.TT = TT;
    const pal = { ...palette };
    if (jersey) { pal.jersey = jersey; pal.helmet2 = pal.helmet2 || jersey; }
    if (helmet) pal.helmet = helmet;
    if (bike) pal.frame = bike;
    const T = templates(type, lite);
    const B = T.bike;
    this.HT = B.HT;
    this.saddle = B.saddle;
    this.hoods = B.hoods;

    this.root = new THREE.Group(); // position / cap
    this.body = new THREE.Group(); // inclinaison
    this.root.add(this.body);
    if (!ghost) {
      this.shadow = blobShadow();
      this.shadow.position.y = 0.03;
      this.root.add(this.shadow);
    }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    if (ghost) { mat.transparent = true; mat.opacity = 0.35; mat.depthWrite = false; }

    // cadre (pièce fixe)
    const fg = B.frame.clone();
    fg.userData = B.frame.userData;
    fg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(fg.attributes.position.count * 3), 3));
    this.frame = new THREE.Mesh(fg, mat);
    this.body.add(this.frame);

    // Pièces mobiles : des « os » (Object3D non dessinés) portent les
    // transformations ; leurs gabarits sont recopiés chaque image dans UN
    // maillage dynamique (2 appels de dessin par coureur)
    const bone = () => new THREE.Object3D();
    this.wheels = [bone(), bone()];
    this.wheels[0].position.copy(B.RA);
    this.wheels[1].position.copy(B.FA);
    this.crank = bone();
    this.crank.position.copy(B.BB);
    this.legs = [-1, 1].map((side) => ({ side, thigh: bone(), shin: bone(), foot: bone() }));
    this.arms = [-1, 1].map((side) => ({ side, up: bone(), lo: bone(), hand: bone() }));
    this.torso = bone();
    this.headM = bone();
    const Bd = T.body;
    const list = [
      [this.wheels[0], B.rear], [this.wheels[1], B.front], [this.crank, B.crank],
      ...this.legs.flatMap((L) => [[L.thigh, Bd.thigh], [L.shin, Bd.shin], [L.foot, Bd.foot]]),
      [this.torso, Bd.torso], [this.headM, Bd.head],
      ...this.arms.flatMap((A) => [[A.up, Bd.upper], [A.lo, Bd.fore], [A.hand, Bd.hand]]),
    ];
    this.parts = [];
    let total = 0;
    for (const [obj, g] of list) {
      this.parts.push({ obj, pos: g.attributes.position.array, nor: g.attributes.normal.array, ud: g.userData, start: total });
      total += g.attributes.position.count;
    }
    const dg = new THREE.BufferGeometry();
    this.dPos = new Float32Array(total * 3);
    this.dNor = new Float32Array(total * 3);
    dg.setAttribute("position", new THREE.BufferAttribute(this.dPos, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute("normal", new THREE.BufferAttribute(this.dNor, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.6);
    this.dyn = new THREE.Mesh(dg, mat);
    this.body.add(this.dyn);
    this.setPalette(pal);

    this.eye = new THREE.Vector3();
    this.hideHead = false;
    this.feed = 0; // geste de ravitaillement (main à la bouche)
    this.root.traverse((o) => { if (o.isMesh && o !== this.shadow) o.castShadow = !ghost; });
    this.phase = Math.random() * 6;
    this.wheelAngle = 0;
    this.standing = 0;
    this._v = [new THREE.Vector3(), new THREE.Vector3()];
  }

  // habille le coureur (maillot, casque, cadre…) sans reconstruire
  setPalette(pal) {
    const cols = paletteColors(pal);
    writeColors(this.frame.geometry.attributes.color, this.frame.geometry.userData, cols);
    const attr = this.dyn.geometry.attributes.color;
    const a = attr.array;
    for (const pt of this.parts) {
      const tmp = { array: a.subarray(pt.start * 3, pt.start * 3 + pt.pos.length) };
      writeColors(tmp, pt.ud, cols);
    }
    attr.needsUpdate = true;
  }

  // vue embarquée : on masque la tête pour voir à travers les yeux
  setFirstPerson(on) {
    this.hideHead = on;
  }

  eyeWorld(out) {
    this.root.updateMatrixWorld(true);
    return this.body.localToWorld(out.copy(this.eye));
  }

  // cadence en tr/min, vitesse en m/s, posture : 0 assis, 1 danseuse, -1 position aéro
  animate(dt, speed, cadence, posture = 0, lean = 0, pitch = 0) {
    this.wheelAngle += (speed / 0.335) * dt;
    for (const w of this.wheels) w.rotation.x = this.wheelAngle;
    this.phase += (cadence / 60) * Math.PI * 2 * dt;
    this.standing += ((posture > 0 ? 1 : 0) - this.standing) * Math.min(1, dt * 4);
    this.feed = Math.max(0, this.feed - dt);
    const aero = posture < 0 ? 1 : 0;
    this.body.rotation.z = lean;
    this.body.rotation.x = -pitch;

    const st = this.standing;
    const sway = Math.sin(this.phase) * 0.12 * st;
    const TT = this.TT, HT = this.HT, S = this.saddle;
    this.crank.rotation.x = this.phase;
    // posture : CLM allongé sur les prolongateurs (sauf en danseuse),
    // route : mains aux cocottes, ou en bas du cintre en position aéro
    const ttAero = TT && st < 0.5;
    const hip = this._v[0].set(0, S.y + 0.05 + st * 0.2, S.z + 0.01 + st * 0.18);
    let shY, shZ;
    if (ttAero) { shY = 1.15; shZ = 0.42; }
    else if (TT) { shY = 1.3; shZ = 0.3; }
    else if (aero) { shY = 1.22; shZ = 0.28; }
    else { shY = 1.35; shZ = 0.22; }
    const shoulder = this._v[1].set(sway * 0.5, shY + st * 0.1, shZ + st * 0.1);
    // buste rigide orienté du bassin vers les épaules
    tmpB.subVectors(shoulder, hip).normalize();
    this.torso.position.copy(hip);
    this.torso.quaternion.setFromUnitVectors(UP, tmpB);
    const scale = hip.distanceTo(shoulder) / 0.56;
    this.torso.scale.set(1, scale, 1);
    const headUp = ttAero ? 0.075 : 0.1, headFwd = ttAero ? 0.15 : 0.12;
    this.headM.position.set(sway * 0.6, shoulder.y + headUp, shoulder.z + headFwd);
    this.headM.rotation.set(ttAero ? -0.25 : aero ? -0.15 : 0, 0, 0);
    // position des yeux (repère du corps) pour la vue à la première personne
    this.eye.set(sway * 0.6, shoulder.y + headUp + 0.03, shoulder.z + headFwd + 0.07);

    for (const L of this.legs) {
      const ang = this.phase + (L.side > 0 ? 0 : Math.PI);
      const pedal = tmpB.set(L.side * 0.13, 0.265 - Math.sin(ang) * 0.1725, Math.cos(ang) * 0.1725);
      const h = tH.set(L.side * 0.1 + sway * 0.3, hip.y, hip.z);
      const knee = ik(h, pedal, 0.46, 0.48, tK);
      place(L.thigh, h, knee);
      place(L.shin, knee, pedal);
      L.foot.position.set(pedal.x, pedal.y + 0.03, pedal.z + 0.01);
      L.foot.rotation.set(-0.15 + Math.sin(ang) * 0.12, 0, 0);
    }
    for (const A of this.arms) {
      const sh = tH.set(A.side * 0.18 + sway * 0.5, shoulder.y - 0.04, shoulder.z);
      let hand, elbow;
      if (A.side > 0 && this.feed > 0) {
        // main droite à la bouche (barre, gel ou bidon)
        hand = tK.set(0.04, this.headM.position.y - 0.08, this.headM.position.z + 0.1);
        elbow = tE.set(0.2, shoulder.y - 0.2, shoulder.z + 0.05);
      } else if (ttAero) {
        hand = tK.set(A.side * 0.05, HT.y + 0.15, HT.z + 0.34);
        elbow = tE.set(A.side * 0.085, HT.y + 0.14, HT.z + 0.02);
      } else {
        if (TT) hand = tK.set(A.side * 0.2, HT.y + 0.06, HT.z + 0.14);
        else if (aero) hand = tK.set(A.side * 0.21, this.hoods.y - 0.12, this.hoods.z + 0.1);
        else hand = tK.set(A.side * 0.21, this.hoods.y + 0.04, this.hoods.z + 0.08);
        elbow = tE.set((sh.x + hand.x) / 2 + A.side * 0.06, (sh.y + hand.y) / 2 - 0.02 - aero * 0.04, (sh.z + hand.z) / 2 - 0.03);
      }
      place(A.up, sh, elbow);
      place(A.lo, elbow, hand);
      A.hand.position.copy(hand);
      A.hand.quaternion.copy(A.lo.quaternion);
    }
    this.writeParts();
  }

  writeParts() {
    const P = this.dPos, N = this.dNor, e = tM.elements;
    for (const pt of this.parts) {
      const o = pt.obj;
      const n = pt.pos.length / 3;
      if (o === this.headM && this.hideHead) { P.fill(0, pt.start * 3, (pt.start + n) * 3); continue; }
      o.updateMatrix();
      tM.copy(o.matrix);
      const src = pt.pos, sn = pt.nor;
      for (let i = 0, k = pt.start * 3; i < src.length; i += 3, k += 3) {
        const x = src[i], y = src[i + 1], z = src[i + 2];
        P[k] = e[0] * x + e[4] * y + e[8] * z + e[12];
        P[k + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        P[k + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const a = sn[i], b = sn[i + 1], c = sn[i + 2];
        const nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
        const l = Math.hypot(nx, ny, nz) || 1;
        N[k] = nx / l; N[k + 1] = ny / l; N[k + 2] = nz / l;
      }
    }
    this.dyn.geometry.attributes.position.needsUpdate = true;
    this.dyn.geometry.attributes.normal.needsUpdate = true;
  }

  // géométrie figée (pose assise) pour les coureurs lointains du peloton :
  // { team (pièces aux couleurs d'équipe, en blanc), rest (couleurs fixes) }
  bakeStatic() {
    this.animate(0, 0, 0, 0, 0, 0);
    const cols = paletteColors({ jersey: "#ffffff", jersey2: "#ffffff", helmet: "#ffffff", frame: "#ffffff" });
    const team = [], rest = [];
    const split = (geo, matrix, slots) => {
      const pos = geo.attributes.position.array, nor = geo.attributes.normal.array;
      const v = new THREE.Vector3(), nn = new THREE.Vector3();
      const nm = new THREE.Matrix3().getNormalMatrix(matrix);
      for (let i = 0; i < pos.length / 3; i++) {
        const s = slots ? slots[i] : -1;
        const c = s >= 0 ? cols[s] : null;
        const isTeam = s >= 0 && TEAM_SLOTS.has(s);
        const dst = isTeam ? team : rest;
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(matrix);
        nn.set(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]).applyMatrix3(nm).normalize();
        const col = isTeam ? [1, 1, 1] : c ? [c.r, c.g, c.b] : [geo.userData.fixed[i * 3], geo.userData.fixed[i * 3 + 1], geo.userData.fixed[i * 3 + 2]];
        dst.push(v.x, v.y, v.z, nn.x, nn.y, nn.z, col[0], col[1], col[2]);
      }
    };
    split(this.frame.geometry, new THREE.Matrix4(), this.frame.geometry.userData.slots);
    for (const pt of this.parts) {
      pt.obj.updateMatrix();
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pt.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(pt.nor, 3));
      g.userData = pt.ud;
      split(g, pt.obj.matrix, pt.ud.slots);
    }
    const make = (arr) => {
      const n = arr.length / 9, p = new Float32Array(n * 3), no = new Float32Array(n * 3), c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { p.set(arr.slice(i * 9, i * 9 + 3), i * 3); no.set(arr.slice(i * 9 + 3, i * 9 + 6), i * 3); c.set(arr.slice(i * 9 + 6, i * 9 + 9), i * 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(no, 3));
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return g;
    };
    return { team: make(team), rest: make(rest) };
  }
}

const tM = new THREE.Matrix4();

// genou par cinématique inverse à deux segments (le genou part vers l'avant) ;
// sans allocation, pour ménager le ramasse-miettes
const tH = new THREE.Vector3(), tK = new THREE.Vector3(), tE = new THREE.Vector3(), tD = new THREE.Vector3();
function ik(hip, foot, l1, l2, out) {
  const d = tD.subVectors(foot, hip);
  const dist = Math.min(d.length(), l1 + l2 - 1e-3);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  d.normalize();
  let py = -d.z, pz = d.y;
  if (pz < 0) { py = -py; pz = -pz; }
  return out.set(hip.x + d.x * a, hip.y + d.y * a + py * h, hip.z + d.z * a + pz * h);
}
