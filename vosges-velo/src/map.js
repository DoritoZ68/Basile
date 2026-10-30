// Carte de la zone : photo aérienne IGN + réseau routier et cyclable en
// tracés vectoriels (nets à tous les niveaux de zoom), villages, parcours,
// coureurs. Zoom à la molette ou aux boutons, déplacement en glissant.

const STYLES = {
  0: ["#f2c230", 2.2],
  1: ["rgba(255,255,255,0.85)", 1.2],
  2: ["#3ddc84", 2.2],
  3: ["rgba(214,178,124,0.85)", 1],
};

export class MapView {
  // world : { meta, ortho (image), lines, towns, routes }
  constructor(canvas, world, opts = {}) {
    this.cv = canvas;
    this.w = world;
    this.minSpan = opts.minSpan || 250;
    const m = world.meta;
    this.W = m.x_max - m.x_min;
    this.D = m.z_max - m.z_min;
    this.maxSpan = Math.max(this.W, this.D);
    this.cx = m.x_min + this.W / 2;
    this.cz = m.z_min + this.D / 2;
    this.span = this.maxSpan;
    this.onPick = opts.onPick || null; // clic simple : (x, z)
    this.onDouble = opts.onDouble || null; // double-clic : (x, z)
    this.onChange = opts.onChange || null;
    this.follow = true;
    // boîtes englobantes des lignes, pour ne dessiner que ce qui est visible
    this.boxes = world.lines.map((L) => {
      let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
      for (let k = 0; k < L.x.length; k++) { a = Math.min(a, L.x[k]); b = Math.max(b, L.x[k]); c = Math.min(c, L.z[k]); d = Math.max(d, L.z[k]); }
      return [a, b, c, d];
    });
    this.bind();
  }

  // coordonnées monde <-> écran (pixels CSS du canvas)
  scale() { return this.cv.clientWidth / this.span; }
  toScreen(x, z) {
    const k = this.scale();
    return [(x - this.cx) * k + this.cv.clientWidth / 2, (z - this.cz) * k + this.cv.clientHeight / 2];
  }
  toWorld(px, py) {
    const k = this.scale();
    return [this.cx + (px - this.cv.clientWidth / 2) / k, this.cz + (py - this.cv.clientHeight / 2) / k];
  }

  zoomAt(factor, px, py) {
    const [wx, wz] = px === undefined ? [this.cx, this.cz] : this.toWorld(px, py);
    const span = Math.max(this.minSpan, Math.min(this.maxSpan, this.span * factor));
    const f = span / this.span;
    this.cx = wx - (wx - this.cx) * f;
    this.cz = wz - (wz - this.cz) * f;
    this.span = span;
    this.clamp();
    this.onChange && this.onChange();
  }

  center(x, z) { this.cx = x; this.cz = z; this.clamp(); }

  clamp() {
    const m = this.w.meta;
    this.cx = Math.max(m.x_min, Math.min(m.x_max, this.cx));
    this.cz = Math.max(m.z_min, Math.min(m.z_max, this.cz));
  }

  bind() {
    const cv = this.cv;
    let down = null, moved = false, lastClick = 0;
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = cv.getBoundingClientRect();
      this.zoomAt(Math.exp((e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY) * 0.0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    cv.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      down = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz };
      moved = false;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 5) moved = true;
      if (moved) {
        const k = this.scale();
        this.cx = down.cx - dx / k;
        this.cz = down.cz - dy / k;
        this.clamp();
        this.follow = false;
        this.onChange && this.onChange();
      }
    });
    cv.addEventListener("pointerup", (e) => {
      if (!down) return;
      down = null;
      if (moved) return;
      const r = cv.getBoundingClientRect();
      const [x, z] = this.toWorld(e.clientX - r.left, e.clientY - r.top);
      const now = performance.now();
      if (now - lastClick < 350 && this.onDouble) this.onDouble(x, z);
      else if (this.onPick) this.onPick(x, z);
      lastClick = now;
    });
  }

  // markers : [{ x, z, color, size, heading, label }]
  draw(markers = [], routeLine = null) {
    const cv = this.cv, dpr = Math.min(2, devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#1c2a22";
    g.fillRect(0, 0, w, h);
    const m = this.w.meta, img = this.w.ortho;
    // photo aérienne : portion visible de l'image 4096 px
    const [x0, z0] = this.toWorld(0, 0), [x1, z1] = this.toWorld(w, h);
    const ix = (x) => ((x - m.x_min) / this.W) * img.width, iz = (z) => ((z - m.z_min) / this.D) * img.height;
    const sx = Math.max(0, ix(x0)), sy = Math.max(0, iz(z0)), ex = Math.min(img.width, ix(x1)), ey = Math.min(img.height, iz(z1));
    if (ex > sx && ey > sy) {
      const [dx0, dy0] = this.toScreen(m.x_min + (sx / img.width) * this.W, m.z_min + (sy / img.height) * this.D);
      const [dx1, dy1] = this.toScreen(m.x_min + (ex / img.width) * this.W, m.z_min + (ey / img.height) * this.D);
      g.drawImage(img, sx, sy, ex - sx, ey - sy, dx0, dy0, dx1 - dx0, dy1 - dy0);
    }
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.fillRect(0, 0, w, h);
    // réseau : rues fines seulement quand on est assez près
    const k = this.scale();
    const showLocal = this.span < 9000;
    g.lineCap = g.lineJoin = "round";
    for (const cls of [3, 1, 0, 2]) {
      if ((cls === 1 || cls === 3) && !showLocal) continue;
      const [col, lw] = STYLES[cls];
      g.strokeStyle = col;
      g.lineWidth = lw * Math.max(0.6, Math.min(2.2, k * 4));
      g.beginPath();
      const lines = this.w.lines;
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i];
        if (L.route || L.cls !== cls) continue;
        const bx = this.boxes[i];
        if (bx[1] < x0 || bx[0] > x1 || bx[3] < z0 || bx[2] > z1) continue;
        const step = k < 0.05 ? 4 : k < 0.15 ? 2 : 1;
        let [px, py] = this.toScreen(L.x[0], L.z[0]);
        g.moveTo(px, py);
        for (let j = step; j < L.x.length + step - 1; j += step) {
          const jj = Math.min(L.x.length - 1, j);
          [px, py] = this.toScreen(L.x[jj], L.z[jj]);
          g.lineTo(px, py);
        }
      }
      g.stroke();
    }
    // routes des parcours (même style que les routes principales)
    g.strokeStyle = STYLES[0][0];
    g.lineWidth = STYLES[0][1] * Math.max(0.6, Math.min(2.2, k * 4));
    g.beginPath();
    for (const L of this.w.lines) {
      if (!L.route) continue;
      for (let j = 0; j < L.x.length; j += 3) {
        const [px, py] = this.toScreen(L.x[j], L.z[j]);
        j ? g.lineTo(px, py) : g.moveTo(px, py);
      }
    }
    g.stroke();
    // parcours choisi
    if (routeLine) {
      g.strokeStyle = "rgba(0,0,0,0.6)";
      g.lineWidth = 7;
      const path = () => {
        g.beginPath();
        for (let j = 0; j < routeLine.n; j += 2) {
          const [px, py] = this.toScreen(routeLine.x[j], routeLine.z[j]);
          j ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      };
      path();
      g.strokeStyle = "#ff8a1c";
      g.lineWidth = 3.5;
      path();
    }
    // villages
    g.font = "600 12px system-ui, sans-serif";
    g.textAlign = "center";
    g.shadowColor = "#000";
    g.shadowBlur = 3;
    g.fillStyle = "#fff";
    for (const t of this.w.towns) {
      const [tx, ty] = this.toScreen(t.x, t.z);
      if (tx > -60 && ty > -20 && tx < w + 60 && ty < h + 20) g.fillText(t.name, tx, ty);
    }
    g.shadowBlur = 0;
    // repères
    for (const mk of markers) {
      const [px, py] = this.toScreen(mk.x, mk.z);
      g.fillStyle = mk.color || "#fff";
      g.strokeStyle = "#000";
      g.lineWidth = 1.6;
      const s = mk.size || 6;
      g.beginPath();
      if (mk.heading !== undefined) {
        const dx = Math.sin(mk.heading), dz = Math.cos(mk.heading);
        g.moveTo(px + dx * s * 1.7, py + dz * s * 1.7);
        g.lineTo(px - dz * s - dx * s, py + dx * s - dz * s);
        g.lineTo(px + dz * s - dx * s, py - dx * s - dz * s);
        g.closePath();
      } else if (mk.pin) {
        g.arc(px, py - s * 1.6, s, Math.PI * 0.85, Math.PI * 2.15);
        g.lineTo(px, py);
        g.closePath();
      } else g.arc(px, py, s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (mk.label) {
        g.font = "700 12px system-ui, sans-serif";
        g.fillStyle = "#fff";
        g.shadowColor = "#000";
        g.shadowBlur = 3;
        g.fillText(mk.label, px, py - s * 3.2);
        g.shadowBlur = 0;
      }
    }
    // échelle
    const nice = [50, 100, 200, 500, 1000, 2000, 5000];
    const target = w * 0.22 / k;
    const len = nice.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const bx = 12, by = h - 14;
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx, by - 4); g.lineTo(bx, by); g.lineTo(bx + len * k, by); g.lineTo(bx + len * k, by - 4);
    g.stroke();
    g.font = "600 11px system-ui, sans-serif";
    g.textAlign = "left";
    g.fillStyle = "#fff";
    g.fillText(len >= 1000 ? `${len / 1000} km` : `${len} m`, bx + 4, by - 6);
  }
}
