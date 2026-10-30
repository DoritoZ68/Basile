// Parcours : polyligne réelle (pas de 5 m), altitude IGN, pente et courbure.

export class Route {
  constructor(def, reverse = false) {
    this.id = def.id;
    this.def = def;
    this.reverse = reverse;
    const n = def.x.length;
    const ord = (a) => (reverse ? Float32Array.from(a).reverse() : Float32Array.from(a));
    this.x = ord(def.x);
    this.y = ord(def.y);
    this.z = ord(def.z);
    this.n = n;
    this.s = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      this.s[i] = this.s[i - 1] + Math.hypot(this.x[i] - this.x[i - 1], this.z[i] - this.z[i - 1]);
    }
    this.length = this.s[n - 1];

    // direction lissée (sur ±10 m)
    this.dx = new Float32Array(n);
    this.dz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
      const ddx = this.x[b] - this.x[a], ddz = this.z[b] - this.z[a];
      const l = Math.hypot(ddx, ddz) || 1;
      this.dx[i] = ddx / l;
      this.dz[i] = ddz / l;
    }
    // courbure signée (positive = virage à droite), lissée
    const k = new Float32Array(n);
    for (let i = 1; i < n - 1; i++) {
      const ds = this.s[i + 1] - this.s[i - 1] || 1;
      k[i] = (this.dx[i - 1] * this.dz[i + 1] - this.dz[i - 1] * this.dx[i + 1]) / ds;
    }
    this.curv = boxSmooth(k, 2);
    // pente lissée (sur ±15 m)
    const g = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3);
      g[i] = (this.y[b] - this.y[a]) / Math.max(1, this.s[b] - this.s[a]);
    }
    this.grade = g;

    let gain = 0, loss = 0;
    for (let i = 1; i < n; i++) {
      const d = this.y[i] - this.y[i - 1];
      if (d > 0) gain += d; else loss -= d;
    }
    this.gain = gain;
    this.loss = loss;
    this.minY = Math.min(...this.y);
    this.maxY = Math.max(...this.y);

    // noms de route (abscisses converties si sens inverse)
    this.names = def.names
      .map(([d, label]) => [reverse ? def.length - d : d, label])
      .sort((a, b) => a[0] - b[0]);
    if (reverse) {
      // en sens inverse, le nom s'applique à partir de la fin du tronçon précédent
      const src = [...def.names].sort((a, b) => a[0] - b[0]);
      this.names = [];
      for (let i = src.length - 1; i >= 0; i--) {
        const end = i + 1 < src.length ? src[i + 1][0] : def.length;
        this.names.push([def.length - end, src[i][1]]);
      }
    }
  }

  index(s) {
    s = Math.min(Math.max(s, 0), this.length);
    let lo = 0, hi = this.n - 1;
    // estimation directe (pas quasi constant de 5 m) puis ajustement
    let i = Math.min(this.n - 2, Math.max(0, Math.floor(s / 5)));
    if (this.s[i] <= s && this.s[i + 1] >= s) return i;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] <= s) lo = m; else hi = m;
    }
    return lo;
  }

  sample(s, out = {}) {
    const i = this.index(s);
    const j = Math.min(i + 1, this.n - 1);
    const seg = this.s[j] - this.s[i] || 1;
    const t = Math.min(1, Math.max(0, (Math.min(Math.max(s, 0), this.length) - this.s[i]) / seg));
    out.x = this.x[i] + (this.x[j] - this.x[i]) * t;
    out.y = this.y[i] + (this.y[j] - this.y[i]) * t;
    out.z = this.z[i] + (this.z[j] - this.z[i]) * t;
    let dx = this.dx[i] + (this.dx[j] - this.dx[i]) * t;
    let dz = this.dz[i] + (this.dz[j] - this.dz[i]) * t;
    const l = Math.hypot(dx, dz) || 1;
    out.dx = dx / l;
    out.dz = dz / l;
    out.grade = this.grade[i] + (this.grade[j] - this.grade[i]) * t;
    out.curv = this.curv[i] + (this.curv[j] - this.curv[i]) * t;
    out.i = i;
    return out;
  }

  // vitesse de passage conseillée sur les prochains mètres (adhérence ~0,55 g)
  safeSpeedAhead(s, look, mu = 0.55) {
    let vmin = 99;
    let dist = 0;
    for (let d = 0; d <= look; d += 5) {
      const i = this.index(s + d);
      const k = Math.abs(this.curv[i]);
      if (k > 1e-4) {
        const v = Math.sqrt((mu * 9.81) / k);
        // on doit pouvoir freiner (~4 m/s²) d'ici là
        const vReach = Math.sqrt(v * v + 2 * 4 * d);
        if (vReach < vmin) { vmin = vReach; dist = d; }
      }
    }
    return { v: vmin, dist };
  }

  // projection d'un point sur le parcours, cherchée autour de l'indice hint
  // -> { s, d (écart latéral, + = droite), i, y }
  project(x, z, hint, win = 80, out = {}) {
    const a = Math.max(0, hint - win), b = Math.min(this.n - 2, hint + win);
    let best = 1e18;
    for (let i = a; i <= b; i++) {
      const x0 = this.x[i], z0 = this.z[i];
      const ex = this.x[i + 1] - x0, ez = this.z[i + 1] - z0;
      const l2 = ex * ex + ez * ez || 1;
      let t = ((x - x0) * ex + (z - z0) * ez) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = x0 + ex * t, pz = z0 + ez * t;
      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < best) {
        best = d2;
        const l = Math.sqrt(l2);
        out.i = i;
        out.s = this.s[i] + t * l;
        out.y = this.y[i] + (this.y[i + 1] - this.y[i]) * t;
        // signe : produit vectoriel direction × (point - projeté)
        const side = (ex * (z - pz) - ez * (x - px)) / l;
        out.d = Math.sign(side) * Math.sqrt(d2);
      }
    }
    return out;
  }

  roadName(s) {
    let name = "";
    for (const [d, label] of this.names) {
      if (d <= s + 1) name = label; else break;
    }
    return name;
  }

  avgGrade(s0, s1) {
    const a = this.sample(Math.max(0, s0)).y;
    const b = this.sample(Math.min(this.length, s1)).y;
    return (b - a) / Math.max(1, Math.min(this.length, s1) - Math.max(0, s0));
  }
}

function boxSmooth(a, r) {
  const n = a.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) { sum += a[j]; c++; }
    out[i] = sum / c;
  }
  return out;
}

// entrées / sorties d'agglomération le long du parcours
export function townCrossings(route, towns) {
  const events = [];
  for (const t of towns) {
    let inside = false;
    for (let i = 0; i < route.n; i += 2) {
      const d = Math.hypot(route.x[i] - t.x, route.z[i] - t.z);
      const now = d < t.r;
      if (now !== inside) {
        events.push({ s: route.s[i], town: t.name, enter: now });
        inside = now;
      }
    }
    if (inside) events.push({ s: route.length + 1, town: t.name, enter: false });
  }
  return events.sort((a, b) => a.s - b.s);
}

export function townAt(route, crossings, s) {
  let cur = null;
  for (const e of crossings) {
    if (e.s > s) break;
    cur = e.enter ? e.town : cur === e.town ? null : cur;
  }
  return cur;
}
