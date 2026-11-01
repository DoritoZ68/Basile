// Photographies aériennes IGN haute définition chargées en continu autour du
// coureur (service WMTS de la Géoplateforme, libre d'accès) : deux fenêtres
// emboîtées qui suivent le joueur, comme un clipmap.
//   niveau 18 : 0,4 m par pixel, fenêtre de 1 km (texture 2048, 0,5 m/px)
//   niveau 16 : 1,6 m par pixel, fenêtre de 6,5 km (texture 4096)
// Le relief, lui, garde sa photo intégrée (5 m/px) au-delà. Les zones dont
// la tuile n'est pas encore arrivée restent transparentes : le shader du
// sol retombe alors sur la photo intégrée.
import * as THREE from "three";

const R = 6371008.8;
const URL = (z, x, y) => `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&FORMAT=image/jpeg`;

const lon2tx = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2ty = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };
const tx2lon = (x, z) => (x / 2 ** z) * 360 - 180;
const ty2lat = (y, z) => { const n = Math.PI - (2 * Math.PI * y) / 2 ** z; return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };

class Level {
  constructor(owner, z, size, px, step) {
    this.o = owner;
    this.z = z;
    this.size = size; // côté de la fenêtre (m)
    this.px = px; // côté de la texture (px)
    this.step = step; // déplacement qui déclenche un recentrage (m)
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = px;
    this.ctx = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    // ligne 0 du canevas = nord de la fenêtre = v = 0 (pas de retournement)
    this.tex.flipY = false;
    this.rect = new THREE.Vector4(0, 0, size, 0); // x0, z0, côté, actif
    this.cx = null;
    this.cz = null;
    this.drawn = new Set();
    this.dirty = false;
  }

  // coordonnées locales (x est, z sud) <-> latitude, longitude
  toLL(x, z) { const o = this.o; return [o.lat0 - z / o.kz, o.lon0 + x / o.kx]; }
  toXZ(lat, lon) { const o = this.o; return [(lon - o.lon0) * o.kx, -(lat - o.lat0) * o.kz]; }

  recenter(x, z) {
    const cx = Math.round(x / this.step) * this.step, cz = Math.round(z / this.step) * this.step;
    if (cx === this.cx && cz === this.cz) return;
    const old = this.cx === null ? null : [this.cx, this.cz];
    this.cx = cx; this.cz = cz;
    const x0 = cx - this.size / 2, z0 = cz - this.size / 2, k = this.px / this.size;
    // on garde ce qui est déjà dessiné, décalé
    if (old) {
      const dx = (old[0] - cx) * k, dz = (old[1] - cz) * k;
      const tmp = document.createElement("canvas");
      tmp.width = tmp.height = this.px;
      tmp.getContext("2d").drawImage(this.canvas, 0, 0);
      this.ctx.clearRect(0, 0, this.px, this.px);
      this.ctx.drawImage(tmp, dx, dz);
    }
    this.rect.set(x0, z0, this.size, 1);
    // tuiles déjà dessinées encore entièrement dans la fenêtre
    const keep = new Set();
    for (const key of this.drawn) {
      const [tx, ty] = key.split(",").map(Number);
      const b = this.bounds(tx, ty);
      if (b[0] >= x0 && b[2] <= x0 + this.size && b[1] >= z0 && b[3] <= z0 + this.size) keep.add(key);
    }
    this.drawn = keep;
    // tuiles à charger, des plus proches aux plus lointaines
    const [latA, lonA] = this.toLL(x0, z0), [latB, lonB] = this.toLL(x0 + this.size, z0 + this.size);
    const t0x = Math.floor(lon2tx(lonA, this.z)), t1x = Math.floor(lon2tx(lonB, this.z));
    const t0y = Math.floor(lat2ty(latA, this.z)), t1y = Math.floor(lat2ty(latB, this.z));
    const want = [];
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      const key = `${tx},${ty}`;
      if (this.drawn.has(key)) continue;
      const b = this.bounds(tx, ty);
      want.push([Math.hypot((b[0] + b[2]) / 2 - x, (b[1] + b[3]) / 2 - z), tx, ty, key]);
    }
    want.sort((a, b) => a[0] - b[0]);
    this.want = want;
    this.dirty = true;
  }

  // rectangle local (x0, z0, x1, z1) d'une tuile
  bounds(tx, ty) {
    const [xa, za] = this.toXZ(ty2lat(ty, this.z), tx2lon(tx, this.z));
    const [xb, zb] = this.toXZ(ty2lat(ty + 1, this.z), tx2lon(tx + 1, this.z));
    return [xa, za, xb, zb];
  }

  draw(tx, ty, img) {
    const key = `${tx},${ty}`;
    const [xa, za, xb, zb] = this.bounds(tx, ty);
    const k = this.px / this.size, x0 = this.rect.x, z0 = this.rect.y;
    // un peu plus large pour éviter les joints entre tuiles
    this.ctx.drawImage(img, (xa - x0) * k - 0.3, (za - z0) * k - 0.3, (xb - xa) * k + 0.6, (zb - za) * k + 0.6);
    this.drawn.add(key);
    this.dirty = true;
  }
}

export class HdOrtho {
  constructor(meta) {
    this.lat0 = meta.lat0;
    this.lon0 = meta.lon0;
    this.kz = (R * Math.PI) / 180;
    this.kx = Math.cos((meta.lat0 * Math.PI) / 180) * this.kz;
    this.levels = [new Level(this, 18, 1024, 2048, 256), new Level(this, 16, 6553.6, 4096, 1024)];
    this.cache = new Map(); // "z,x,y" -> Image
    this.loading = 0;
    this.maxLoading = 8;
    this.enabled = false;
    this.failures = 0;
    this.uploadT = 0;
    // uniformes partagés par les matériaux du sol
    this.uniforms = {
      hdMap1: { value: this.levels[0].tex }, hdRect1: { value: this.levels[0].rect },
      hdMap2: { value: this.levels[1].tex }, hdRect2: { value: this.levels[1].rect },
    };
  }

  setEnabled(on) {
    this.enabled = on;
    for (const l of this.levels) l.rect.w = on && l.cx !== null ? 1 : 0;
  }

  update(x, z, dt) {
    if (!this.enabled || this.failures > 30) return;
    for (const l of this.levels) {
      l.recenter(x, z);
      while (l.want && l.want.length && this.loading < this.maxLoading) {
        const [, tx, ty] = l.want.shift();
        this.fetch(l, tx, ty);
      }
    }
    // envoi au GPU au plus 4 fois par seconde (fenêtre fine) et 1 fois
    // par seconde (fenêtre large)
    this.uploadT += dt;
    if (this.uploadT > 0.25) {
      this.uploadT = 0;
      const [a, b] = this.levels;
      if (a.dirty) { a.tex.needsUpdate = true; a.dirty = false; }
      this.slow = (this.slow || 0) + 1;
      if (b.dirty && this.slow % 4 === 0) { b.tex.needsUpdate = true; b.dirty = false; }
    }
  }

  fetch(l, tx, ty) {
    const key = `${l.z},${tx},${ty}`;
    const hit = this.cache.get(key);
    if (hit) { if (hit.complete && hit.naturalWidth) l.draw(tx, ty, hit); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    this.loading++;
    img.onload = () => {
      this.loading--;
      this.failures = 0;
      this.cache.set(key, img);
      if (this.cache.size > 900) this.cache.delete(this.cache.keys().next().value);
      // la fenêtre a pu bouger entre-temps : on dessine si la tuile y est
      const [xa, za, xb, zb] = l.bounds(tx, ty);
      const r = l.rect;
      if (xb > r.x && xa < r.x + r.z && zb > r.y && za < r.y + r.z) l.draw(tx, ty, img);
    };
    img.onerror = () => { this.loading--; this.failures++; };
    img.src = URL(l.z, tx, ty);
  }
}

// GLSL : à insérer après la lecture de la photo intégrée (diffuseColor)
export const HD_GLSL_DECL = "uniform sampler2D hdMap1; uniform vec4 hdRect1; uniform sampler2D hdMap2; uniform vec4 hdRect2;";
export const HD_GLSL = `
  {
    // photos HD : la plus fine d'abord, fondu sur les bords des fenêtres
    vec2 u2 = (vWPos.xz - hdRect2.xy) / hdRect2.z;
    if (hdRect2.w > 0.5 && all(greaterThan(u2, vec2(0.0))) && all(lessThan(u2, vec2(1.0)))) {
      vec4 h = texture2D(hdMap2, u2);
      float e = min(min(u2.x, 1.0 - u2.x), min(u2.y, 1.0 - u2.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, h.rgb, h.a * smoothstep(0.0, 0.06, e));
    }
    vec2 u1 = (vWPos.xz - hdRect1.xy) / hdRect1.z;
    if (hdRect1.w > 0.5 && all(greaterThan(u1, vec2(0.0))) && all(lessThan(u1, vec2(1.0)))) {
      vec4 h = texture2D(hdMap1, u1);
      float e = min(min(u1.x, 1.0 - u1.x), min(u1.y, 1.0 - u1.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, h.rgb, h.a * smoothstep(0.0, 0.1, e));
    }
  }`;
