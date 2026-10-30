// Cycliste low-poly animé (pédalage, inclinaison en virage, danseuse).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function limb(radius, mat) {
  const g = new THREE.CylinderGeometry(radius, radius * 0.85, 1, 7);
  g.translate(0, 0.5, 0);
  const m = new THREE.Mesh(g, mat);
  return m;
}

// oriente un segment cylindrique de a vers b
function place(mesh, a, b) {
  mesh.position.copy(a);
  tmpA.subVectors(b, a);
  const len = tmpA.length();
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(UP, tmpA.normalize());
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

export class RiderModel {
  // type : "route" (vélo de route) ou "clm" (vélo de contre-la-montre)
  constructor({ jersey = "#d81e2c", shorts = "#1b1b1f", bike = "#202020", helmet = "#ffffff", skin = "#e0b293", ghost = false, type = "route" } = {}) {
    const TT = type === "clm";
    this.type = type;
    const mk = (c) => {
      const m = new THREE.MeshLambertMaterial({ color: c });
      if (ghost) { m.transparent = true; m.opacity = 0.35; m.depthWrite = false; }
      return m;
    };
    const mJersey = mk(jersey), mShorts = mk(shorts), mSkin = mk(skin);
    const mShoe = mk("#f0f0f0");

    this.root = new THREE.Group(); // position / cap
    this.body = new THREE.Group(); // inclinaison
    this.root.add(this.body);
    if (!ghost) {
      this.shadow = blobShadow();
      this.shadow.position.y = 0.03;
      this.root.add(this.shadow);
    }

    // --- vélo (avant = +z local). Les pièces fixes sont fusionnées en un seul
    // maillage à couleurs par sommet (un seul appel de dessin), chaque roue aussi.
    const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    if (ghost) { vcMat.transparent = true; vcMat.opacity = 0.35; vcMat.depthWrite = false; }
    const bake = (geo, color, matrix) => {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone());
      if (matrix) g.applyMatrix4(matrix);
      const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(a, 3));
      if (g.attributes.uv) g.deleteAttribute("uv");
      return g;
    };
    const tmpO = new THREE.Object3D();
    const tube = (a, b, r, color) => {
      const g = new THREE.CylinderGeometry(r, r * 0.85, 1, 6);
      g.translate(0, 0.5, 0);
      tmpO.position.copy(a);
      tmpA.subVectors(b, a);
      tmpO.scale.set(1, tmpA.length(), 1);
      tmpO.quaternion.setFromUnitVectors(UP, tmpA.normalize());
      tmpO.updateMatrix();
      return bake(g, color, tmpO.matrix);
    };
    const at = (x, y, z, rx = 0, ry = 0, rz = 0) => { tmpO.position.set(x, y, z); tmpO.rotation.set(rx, ry, rz); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix(); return tmpO.matrix.clone(); };
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    // tube profilé (CLM) : section en goutte d'eau dans le plan du cadre
    const tubeA = (a, b, r, color, aero) => {
      const g = new THREE.CylinderGeometry(r, r, 1, aero ? 8 : 7);
      if (aero) g.scale(0.55, 1, 1.9);
      g.translate(0, 0.5, 0);
      tmpO.position.copy(a);
      tmpA.subVectors(b, a);
      tmpO.scale.set(1, tmpA.length(), 1);
      tmpO.quaternion.setFromUnitVectors(UP, tmpA.normalize());
      tmpO.updateMatrix();
      return bake(g, color, tmpO.matrix);
    };
    const curve = (pts, r, color, seg = 14) => bake(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => P(...q))), seg, r, 5), color);
    const BLACK = "#16171a", METAL = "#a7a9ad", CARBON = "#2a2b2f";

    // géométrie (m) : empattement 0,995, boîtier 7 cm sous les axes
    const BB = P(0, 0.265, 0), RA = P(0, 0.335, -0.41), FA = P(0, 0.335, 0.585);
    const ST = TT ? P(0, 0.72, -0.12) : P(0, 0.765, -0.165);
    const HT = TT ? P(0, 0.69, 0.475) : P(0, 0.785, 0.47);
    const HB = TT ? P(0, 0.57, 0.515) : P(0, 0.635, 0.51);
    this.saddle = TT ? P(0, 0.905, -0.1) : P(0, 0.905, -0.2);

    // --- roues (pièces mobiles)
    const wheel = (front) => {
      const parts = [bake(new THREE.TorusGeometry(0.322, 0.0125, 6, 30), "#1a1a1a", at(0, 0, 0, 0, Math.PI / 2))];
      const rimDepth = TT ? (front ? 0.08 : 0) : 0.035;
      const rimProfile = (rIn, rOut, w) => {
        const g = new THREE.LatheGeometry([new THREE.Vector2(rIn, -w), new THREE.Vector2(rOut, -w * 1.1), new THREE.Vector2(rOut, w * 1.1), new THREE.Vector2(rIn, w), new THREE.Vector2(rIn, -w)], 28);
        g.rotateZ(Math.PI / 2);
        return g;
      };
      if (TT && !front) {
        // roue lenticulaire
        parts.push(bake(new THREE.CylinderGeometry(0.31, 0.31, 0.024, 30).rotateZ(Math.PI / 2), CARBON));
        parts.push(bake(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10).rotateZ(Math.PI / 2), "#c9c9c9"));
      } else {
        parts.push(bake(rimProfile(0.31 - rimDepth, 0.312, 0.011), TT ? CARBON : "#202124"));
        parts.push(bake(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8).rotateZ(Math.PI / 2), METAL));
        const n = TT ? 16 : 20, inner = 0.31 - rimDepth;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2, side = k % 2 ? 1 : -1;
          const len = inner - 0.02;
          const g = new THREE.BoxGeometry(0.003, len, 0.003);
          g.translate(0, 0.02 + len / 2, 0);
          g.rotateZ(side * 0.04);
          g.rotateX(ang);
          g.translate(side * 0.022, 0, 0);
          parts.push(bake(g, "#2c2c2e"));
        }
      }
      return new THREE.Mesh(mergeGeometries(parts), vcMat);
    };
    this.wheels = [wheel(false), wheel(true)];
    this.wheels[0].position.copy(RA);
    this.wheels[1].position.copy(FA);
    for (const w of this.wheels) this.body.add(w);

    // --- pédalier (pièce mobile) : manivelles de 172,5 mm et pédales
    const crankParts = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.BoxGeometry(0.014, 0.025, 0.1725);
      arm.translate(side * 0.085, 0, (side > 0 ? 1 : -1) * 0.086);
      crankParts.push(bake(arm, "#2b2b2b"));
      const pedal = new THREE.BoxGeometry(0.085, 0.018, 0.07);
      pedal.translate(side * 0.13, 0, (side > 0 ? 1 : -1) * 0.1725);
      crankParts.push(bake(pedal, "#111111"));
    }
    crankParts.push(bake(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8).rotateZ(Math.PI / 2), METAL));
    this.crank = new THREE.Mesh(mergeGeometries(crankParts), vcMat);
    this.crank.position.copy(BB);
    this.body.add(this.crank);

    // --- cadre, fourche, poste de pilotage, transmission (pièce fixe)
    const fr = [];
    const R = TT ? 0.017 : 0.016;
    fr.push(tubeA(BB, ST, R, bike, TT), tubeA(BB, HB, TT ? 0.024 : 0.021, bike, TT), tubeA(ST, HT, TT ? 0.014 : 0.015, bike, TT), tubeA(HB, HT, 0.02, bike, TT));
    for (const sx of [-1, 1]) {
      fr.push(tubeA(P(sx * 0.03, BB.y, BB.z - 0.03), P(sx * 0.06, RA.y, RA.z), 0.01, bike, false));
      fr.push(tubeA(P(sx * 0.025, ST.y - 0.03, ST.z - 0.02), P(sx * 0.06, RA.y, RA.z), 0.0085, bike, TT));
      // fourche légèrement cintrée (déport)
      fr.push(curve([[sx * 0.03, HB.y, HB.z], [sx * 0.045, 0.48, 0.56], [sx * 0.05, FA.y, FA.z]], 0.012, bike, 6));
    }
    fr.push(tubeA(ST, this.saddle, 0.0135, TT ? bike : CARBON, TT));
    // selle effilée
    const saddleG = new THREE.CylinderGeometry(0.075, 0.02, 0.27, 10, 1);
    saddleG.rotateX(Math.PI / 2);
    saddleG.scale(1, 0.25, 1);
    fr.push(bake(saddleG, BLACK, at(this.saddle.x, this.saddle.y + 0.015, this.saddle.z + 0.02)));
    if (TT) {
      // cintre de base + prolongateurs relevés et repose-coudes
      fr.push(tubeA(HT, P(0, HT.y + 0.03, HT.z + 0.06), 0.017, bike, true));
      fr.push(curve([[-0.2, HT.y + 0.05, HT.z + 0.15], [-0.17, HT.y + 0.04, HT.z + 0.08], [0, HT.y + 0.03, HT.z + 0.07], [0.17, HT.y + 0.04, HT.z + 0.08], [0.2, HT.y + 0.05, HT.z + 0.15]], 0.013, CARBON, 16));
      for (const sx of [-1, 1]) {
        fr.push(curve([[sx * 0.05, HT.y + 0.1, HT.z + 0.02], [sx * 0.05, HT.y + 0.11, HT.z + 0.3], [sx * 0.05, HT.y + 0.16, HT.z + 0.38]], 0.011, CARBON, 8));
        fr.push(tubeA(P(sx * 0.05, HT.y + 0.04, HT.z + 0.05), P(sx * 0.05, HT.y + 0.1, HT.z + 0.04), 0.008, METAL, false));
        fr.push(bake(new THREE.BoxGeometry(0.075, 0.02, 0.1), "#0d0d0d", at(sx * 0.085, HT.y + 0.115, HT.z + 0.03)));
      }
    } else {
      // potence, cintre à drops, cocottes de frein
      const top = P(0, HT.y + 0.03, HT.z + 0.1);
      fr.push(tubeA(HT, top, 0.016, BLACK, false));
      const bars = [];
      for (const sx of [-1, 1]) bars.push([[0, top.y, top.z], [sx * 0.12, top.y, top.z + 0.005], [sx * 0.2, top.y, top.z + 0.02], [sx * 0.21, top.y, top.z + 0.09], [sx * 0.21, top.y - 0.07, top.z + 0.12], [sx * 0.21, top.y - 0.13, top.z + 0.08], [sx * 0.21, top.y - 0.14, top.z + 0.02]]);
      for (const b of bars) fr.push(curve(b, 0.0125, BLACK, 16));
      for (const sx of [-1, 1]) fr.push(bake(new THREE.BoxGeometry(0.03, 0.045, 0.06), BLACK, at(sx * 0.21, top.y + 0.02, top.z + 0.08, -0.4)));
      this.hoods = top;
      // porte-bidon et bidon
      const mid = BB.clone().lerp(HB, 0.45).add(P(0, 0.045, -0.01));
      const dir = HB.clone().sub(BB).normalize();
      tmpO.position.copy(mid);
      tmpO.quaternion.setFromUnitVectors(UP, dir);
      tmpO.scale.set(1, 1, 1);
      tmpO.updateMatrix();
      fr.push(bake(new THREE.CylinderGeometry(0.034, 0.034, 0.2, 10), "#e8e8e8", tmpO.matrix));
    }
    // plateaux, cassette, dérailleur
    fr.push(bake(new THREE.CylinderGeometry(TT ? 0.115 : 0.105, TT ? 0.115 : 0.105, 0.008, 28).rotateZ(Math.PI / 2), METAL, at(0.06, BB.y, BB.z)));
    fr.push(bake(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 22).rotateZ(Math.PI / 2), "#7d7f83", at(0.05, BB.y, BB.z)));
    fr.push(bake(new THREE.CylinderGeometry(0.055, 0.03, 0.035, 16).rotateZ(Math.PI / 2), "#8d8f93", at(0.055, RA.y, RA.z)));
    fr.push(bake(new THREE.BoxGeometry(0.02, 0.08, 0.04), "#2b2b2b", at(0.065, RA.y - 0.08, RA.z + 0.01)));
    // chaîne (deux brins)
    fr.push(tubeA(P(0.058, BB.y + 0.105, BB.z), P(0.058, RA.y + 0.05, RA.z), 0.004, "#3a3a3a", false));
    fr.push(tubeA(P(0.058, BB.y - 0.105, BB.z), P(0.058, RA.y - 0.06, RA.z + 0.02), 0.004, "#3a3a3a", false));
    this.frame = new THREE.Mesh(mergeGeometries(fr), vcMat);
    this.body.add(this.frame);

    // --- cycliste
    this.legs = [];
    for (const side of [-1, 1]) {
      const thigh = limb(0.062, mShorts), shin = limb(0.045, mSkin), foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.24), mShoe);
      this.body.add(thigh, shin, foot);
      this.legs.push({ side, thigh, shin, foot });
    }
    this.torso = limb(0.13, mJersey);
    this.torso.scale.set(1, 1, 0.8);
    // tête et casque fusionnés (repère : centre de la tête) ; casque profilé
    // à queue longue pour le contre-la-montre
    let helmetParts;
    if (TT) {
      const shell = new THREE.SphereGeometry(0.13, 12, 8);
      shell.scale(0.92, 0.82, 1.75);
      helmetParts = [bake(shell, helmet, at(0, 0.035, -0.09, 0.25)), bake(new THREE.SphereGeometry(0.1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 3), "#20242a", at(0, 0.0, 0.07, 1.7))];
    } else {
      const shell = new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9);
      shell.scale(0.95, 0.9, 1.25);
      helmetParts = [bake(shell, helmet, at(0, 0.05, -0.02, 0.35))];
    }
    this.headM = new THREE.Mesh(mergeGeometries([bake(new THREE.SphereGeometry(0.105, 10, 7), skin), ...helmetParts]), vcMat);
    this.arms = [];
    for (const side of [-1, 1]) {
      const up = limb(0.045, mJersey), lo = limb(0.038, mSkin);
      this.body.add(up, lo);
      this.arms.push({ side, up, lo });
    }
    this.body.add(this.torso, this.headM);

    this.eye = new THREE.Vector3();

    // Toutes les pièces mobiles (roues, jambes, bras, buste, tête) sont
    // recopiées chaque image dans UN maillage dynamique : 2 appels de dessin
    // par coureur au lieu de 16. Les objets d'origine ne servent plus que de
    // repères (os) et ne sont pas dessinés.
    const movers = [...this.wheels, this.crank, ...this.legs.flatMap((L) => [L.thigh, L.shin, L.foot]), this.torso, this.headM, ...this.arms.flatMap((A) => [A.up, A.lo])];
    this.parts = [];
    let total = 0;
    for (const m of movers) {
      const g = m.geometry.attributes.color ? (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry) : bake(m.geometry, m.material.color);
      this.parts.push({ obj: m, pos: g.attributes.position.array, nor: (g.attributes.normal || g.computeVertexNormals() || g.attributes.normal).array, col: g.attributes.color.array, start: total });
      total += g.attributes.position.count;
      this.body.remove(m);
    }
    const dg = new THREE.BufferGeometry();
    this.dPos = new Float32Array(total * 3);
    this.dNor = new Float32Array(total * 3);
    const dCol = new Float32Array(total * 3);
    for (const pt of this.parts) dCol.set(pt.col, pt.start * 3);
    dg.setAttribute("position", new THREE.BufferAttribute(this.dPos, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute("normal", new THREE.BufferAttribute(this.dNor, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.6);
    this.dyn = new THREE.Mesh(dg, vcMat);
    this.body.add(this.dyn);
    this.hideHead = false;
    this.root.traverse((o) => { if (o.isMesh && o !== this.shadow) o.castShadow = !ghost; });
    this.phase = 0;
    this.wheelAngle = 0;
    this.standing = 0;
    this._v = [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)];
    this.TT = TT;
    this.HT = HT;
  }

  // vue embarquée : on masque la tête pour voir à travers les yeux
  setFirstPerson(on) {
    this.hideHead = on;
    if (this.shadow) this.shadow.visible = true;
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
    place(this.torso, hip, shoulder);
    const headUp = ttAero ? 0.075 : 0.1, headFwd = ttAero ? 0.15 : 0.12;
    this.headM.position.set(sway * 0.6, shoulder.y + headUp, shoulder.z + headFwd);
    this.headM.rotation.x = ttAero ? -0.25 : 0;
    // position des yeux (repère du corps) pour la vue à la première personne
    this.eye.set(sway * 0.6, shoulder.y + headUp + 0.03, shoulder.z + headFwd + 0.07);

    for (const L of this.legs) {
      const ang = this.phase + (L.side > 0 ? 0 : Math.PI);
      const pedal = tmpB.set(L.side * 0.13, 0.265 - Math.sin(ang) * 0.1725, Math.cos(ang) * 0.1725);
      const h = tH.set(L.side * 0.1 + sway * 0.3, hip.y, hip.z);
      const knee = ik(h, pedal, 0.46, 0.48, tK);
      place(L.thigh, h, knee);
      place(L.shin, knee, pedal);
      L.foot.position.set(pedal.x, pedal.y + 0.02, pedal.z + 0.02);
    }
    for (const A of this.arms) {
      const sh = tH.set(A.side * 0.18 + sway * 0.5, shoulder.y - 0.04, shoulder.z);
      let hand, elbow;
      if (ttAero) {
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
        let nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
        const l = Math.hypot(nx, ny, nz) || 1;
        N[k] = nx / l; N[k + 1] = ny / l; N[k + 2] = nz / l;
      }
    }
    this.dyn.geometry.attributes.position.needsUpdate = true;
    this.dyn.geometry.attributes.normal.needsUpdate = true;
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
  // perpendiculaire dans le plan sagittal (y, z), orientée vers l'avant
  let py = -d.z, pz = d.y;
  if (pz < 0) { py = -py; pz = -pz; }
  return out.set(hip.x + d.x * a, hip.y + d.y * a + py * h, hip.z + d.z * a + pz * h);
}
