// Ambiance sonore synthétisée (aucun fichier) : vent, roue libre, bips.
export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    this.master.connect(ctx.destination);
    // bruit blanc en boucle -> vent
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = last * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = last; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.value = 300;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
    this.tickAcc = 0;
  }

  // menu, pause, onglet caché : plus aucun son jusqu'au prochain start()
  stop() {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.8 : 0;
  }

  // vitesse air (m/s), roue libre ?, vitesse roue (m/s)
  update(dt, airSpeed, coasting, speed) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const a = Math.min(1, Math.abs(airSpeed) / 22);
    this.windGain.gain.setTargetAtTime(0.02 + a * a * 0.55, t, 0.15);
    this.windFilter.frequency.setTargetAtTime(250 + a * 2200, t, 0.15);
    // cliquetis de roue libre
    if (coasting && speed > 1) {
      this.tickAcc += dt * speed * 9;
      let n = 0;
      while (this.tickAcc > 1 && n < 4) { this.tickAcc -= 1; this.click(t + n * 0.004); n++; }
    }
  }

  click(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = 3200 + Math.random() * 400;
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.015);
  }

  beep(freq = 660, dur = 0.18, vol = 0.2) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  crash() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    n.buffer = b;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    n.connect(g).connect(this.master);
    n.start(t);
  }
}
