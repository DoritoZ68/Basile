// Cycliste low-poly animé (pédalage, inclinaison en virage, danseuse).
import * as THREE from "three";

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
    const mJersey = mk(jersey), mShorts = mk(shorts), mBike = mk(bike), mSkin = mk(skin), mHelmet = mk(helmet);
    const mTire = mk("#151515"), mMetal = mk("#9a9a9a"), mShoe = mk("#f0f0f0");

    this.root = new THREE.Group(); // position / cap
    this.body = new THREE.Group(); // inclinaison
    this.root.add(this.body);
    if (!ghost) {
      this.shadow = blobShadow();
      this.shadow.position.y = 0.03;
      this.root.add(this.shadow);
    }

    // --- vélo (avant = +z local)
    const bikeG = new THREE.Group();
    this.body.add(bikeG);
    this.wheels = [];
    for (const z of [-0.5, 0.5]) {
      const w = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.016, 6, 22), mTire);
      tire.rotation.y = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 4, 22), mMetal);
      rim.rotation.y = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), mMetal);
      hub.rotation.z = Math.PI / 2;
      w.add(tire, rim, hub);
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.6, 0.02), mMetal);
        sp.rotation.x = (k * Math.PI) / 3;
        w.add(sp);
      }
      w.position.set(0, 0.335, z);
      bikeG.add(w);
      this.wheels.push(w);
    }
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    const bb = P(0, 0.28, -0.04), seatTop = P(0, 0.86, -0.22), head = P(0, 0.82, 0.38), rear = P(0, 0.335, -0.5), front = P(0, 0.335, 0.5);
    const tubes = [[bb, seatTop, 0.018], [bb, head, 0.022], [seatTop, head, 0.018], [bb, rear, 0.012], [seatTop, rear, 0.011], [head, front, 0.014]];
    for (const [a, b, r] of tubes) {
      const t = limb(r, mBike);
      place(t, a, b);
      bikeG.add(t);
    }
    const stem = limb(0.014, mMetal);
    place(stem, head, P(0, 0.9, 0.46));
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), mMetal);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.9, 0.47);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.26), mk("#111"));
    saddle.position.set(0, 0.92, -0.2);
    const seatpost = limb(0.012, mMetal);
    place(seatpost, seatTop, P(0, 0.92, -0.22));
    bikeG.add(stem, bar, saddle, seatpost);
    this.crank = new THREE.Group();
    this.crank.position.copy(bb);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), mMetal);
    ring.rotation.z = Math.PI / 2;
    ring.position.x = 0.05;
    this.crank.add(ring);
    bikeG.add(this.crank);

    // --- cycliste
    this.legs = [];
    for (const side of [-1, 1]) {
      const thigh = limb(0.062, mShorts), shin = limb(0.045, mSkin), foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.24), mShoe);
      this.body.add(thigh, shin, foot);
      this.legs.push({ side, thigh, shin, foot });
    }
    this.torso = limb(0.13, mJersey);
    this.torso.scale.set(1, 1, 0.8);
    this.headM = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8), mSkin);
    this.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), mHelmet);
    this.helmet.scale.set(0.95, 0.9, 1.25);
    this.arms = [];
    for (const side of [-1, 1]) {
      const up = limb(0.045, mJersey), lo = limb(0.038, mSkin);
      this.body.add(up, lo);
      this.arms.push({ side, up, lo });
    }
    this.body.add(this.torso, this.headM, this.helmet);

    this.eye = new THREE.Vector3();
    this.phase = 0;
    this.wheelAngle = 0;
    this.standing = 0;
    this._v = [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)];
  }

  // vue embarquée : on masque la tête pour voir à travers les yeux
  setFirstPerson(on) {
    this.headM.visible = !on;
    this.helmet.visible = !on;
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
    this.crank.rotation.x = this.phase;
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
    this.helmet.position.set(sway * 0.6, shoulder.y + 0.15 - aero * 0.02, shoulder.z + 0.1);
    this.helmet.rotation.x = 0.35 + aero * 0.3;
    // position des yeux (repère du corps) pour la vue à la première personne
    this.eye.set(sway * 0.6, shoulder.y + 0.13 - aero * 0.02, shoulder.z + 0.19);

    for (const L of this.legs) {
      const ang = this.phase + (L.side > 0 ? 0 : Math.PI);
      const pedal = tmpB.set(L.side * 0.11, 0.28 - Math.sin(ang) * 0.17, -0.04 + Math.cos(ang) * 0.17);
      const h = new THREE.Vector3(L.side * 0.1 + sway * 0.3, hip.y, hip.z);
      const knee = ik(h, pedal, 0.46, 0.48);
      place(L.thigh, h, knee);
      place(L.shin, knee, pedal);
      L.foot.position.set(pedal.x, pedal.y - 0.02, pedal.z + 0.03);
    }
    for (const A of this.arms) {
      const sh = new THREE.Vector3(A.side * 0.18 + sway * 0.5, shoulder.y - 0.04, shoulder.z);
      const hand = new THREE.Vector3(A.side * 0.19, 0.9 - aero * 0.06, 0.45 + aero * 0.02);
      const elbow = new THREE.Vector3((sh.x + hand.x) / 2 + A.side * 0.05, (sh.y + hand.y) / 2 - 0.03 - aero * 0.05, (sh.z + hand.z) / 2 - 0.02);
      place(A.up, sh, elbow);
      place(A.lo, elbow, hand);
    }
  }
}

// genou par cinématique inverse à deux segments (le genou part vers l'avant)
function ik(hip, foot, l1, l2) {
  const d = new THREE.Vector3().subVectors(foot, hip);
  const dist = Math.min(d.length(), l1 + l2 - 1e-3);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const dir = d.clone().normalize();
  // perpendiculaire dans le plan sagittal (y, z), orientée vers l'avant
  const perp = new THREE.Vector3(0, -dir.z, dir.y);
  if (perp.z < 0) perp.negate();
  return hip.clone().addScaledVector(dir, a).addScaledVector(perp, h);
}
