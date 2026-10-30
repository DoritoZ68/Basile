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
  constructor({ jersey = "#d81e2c", shorts = "#1b1b1f", bike = "#202020", helmet = "#ffffff", skin = "#e0b293", ghost = false } = {}) {
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
    this.wheels = [];
    for (const z of [-0.5, 0.5]) {
      const parts = [
        bake(new THREE.TorusGeometry(0.335, 0.016, 5, 20), "#151515", at(0, 0, 0, 0, Math.PI / 2)),
        bake(new THREE.TorusGeometry(0.31, 0.012, 3, 20), "#9a9a9a", at(0, 0, 0, 0, Math.PI / 2)),
        bake(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), "#9a9a9a", at(0, 0, 0, 0, 0, Math.PI / 2)),
      ];
      for (let k = 0; k < 3; k++) parts.push(bake(new THREE.BoxGeometry(0.008, 0.6, 0.02), "#9a9a9a", at(0, 0, 0, (k * Math.PI) / 3)));
      const w = new THREE.Mesh(mergeGeometries(parts), vcMat);
      w.position.set(0, 0.335, z);
      this.body.add(w);
      this.wheels.push(w);
    }
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    const bb = P(0, 0.28, -0.04), seatTop = P(0, 0.86, -0.22), head = P(0, 0.82, 0.38), rear = P(0, 0.335, -0.5), front = P(0, 0.335, 0.5);
    const frame = [
      tube(bb, seatTop, 0.018, bike), tube(bb, head, 0.022, bike), tube(seatTop, head, 0.018, bike),
      tube(bb, rear, 0.012, bike), tube(seatTop, rear, 0.011, bike), tube(head, front, 0.014, bike),
      tube(head, P(0, 0.9, 0.46), 0.014, "#9a9a9a"), tube(seatTop, P(0, 0.92, -0.22), 0.012, "#9a9a9a"),
      bake(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), "#9a9a9a", at(0, 0.9, 0.47, 0, 0, Math.PI / 2)),
      bake(new THREE.BoxGeometry(0.08, 0.03, 0.26), "#111111", at(0, 0.92, -0.2)),
      bake(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14), "#9a9a9a", at(0.05, 0.28, -0.04, 0, 0, Math.PI / 2)),
    ];
    this.frame = new THREE.Mesh(mergeGeometries(frame), vcMat);
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
    // tête et casque fusionnés (repère : centre de la tête)
    const helmetG = new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9);
    helmetG.scale(0.95, 0.9, 1.25);
    this.headM = new THREE.Mesh(mergeGeometries([
      bake(new THREE.SphereGeometry(0.105, 10, 7), skin),
      bake(helmetG, helmet, at(0, 0.05, -0.02, 0.35)),
    ]), vcMat);
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
    const movers = [...this.wheels, ...this.legs.flatMap((L) => [L.thigh, L.shin, L.foot]), this.torso, this.headM, ...this.arms.flatMap((A) => [A.up, A.lo])];
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
    const hip = this._v[0].set(0, 0.97 + st * 0.2 - aero * 0.02, -0.2 + st * 0.18 + aero * 0.04);
    const shoulder = this._v[1].set(sway * 0.5, 1.38 + st * 0.12 - aero * 0.17, 0.2 + st * 0.12 + aero * 0.06);
    place(this.torso, hip, shoulder);
    this.headM.position.set(sway * 0.6, shoulder.y + 0.1 - aero * 0.02, shoulder.z + 0.12);
    // position des yeux (repère du corps) pour la vue à la première personne
    this.eye.set(sway * 0.6, shoulder.y + 0.13 - aero * 0.02, shoulder.z + 0.19);

    for (const L of this.legs) {
      const ang = this.phase + (L.side > 0 ? 0 : Math.PI);
      const pedal = tmpB.set(L.side * 0.11, 0.28 - Math.sin(ang) * 0.17, -0.04 + Math.cos(ang) * 0.17);
      const h = tH.set(L.side * 0.1 + sway * 0.3, hip.y, hip.z);
      const knee = ik(h, pedal, 0.46, 0.48, tK);
      place(L.thigh, h, knee);
      place(L.shin, knee, pedal);
      L.foot.position.set(pedal.x, pedal.y - 0.02, pedal.z + 0.03);
    }
    for (const A of this.arms) {
      const sh = tH.set(A.side * 0.18 + sway * 0.5, shoulder.y - 0.04, shoulder.z);
      const hand = tK.set(A.side * 0.19, 0.9 - aero * 0.06, 0.45 + aero * 0.02);
      const elbow = tE.set((sh.x + hand.x) / 2 + A.side * 0.05, (sh.y + hand.y) / 2 - 0.03 - aero * 0.05, (sh.z + hand.z) / 2 - 0.02);
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
