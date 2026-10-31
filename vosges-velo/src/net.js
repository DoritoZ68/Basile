// Multijoueur en pair à pair (WebRTC), sans serveur de jeu : l'hôte crée un
// code d'invitation, l'invité le colle et renvoie un code de réponse que
// l'hôte colle à son tour. Les codes contiennent la description de la
// connexion (SDP et adresses ICE), compressée. Topologie en étoile : l'hôte
// relaie les messages entre invités (4 joueurs au plus).
const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }];
const PREFIX = "VV1.";

async function pack(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  let bytes = data;
  if (typeof CompressionStream !== "undefined") {
    const s = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    bytes = new Uint8Array(await new Response(s).arrayBuffer());
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIX + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function unpack(code) {
  code = code.trim().replace(/\s+/g, "");
  if (!code.startsWith(PREFIX)) throw new Error("Ce n'est pas un code Vosges Vélo");
  const b64 = code.slice(PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  try {
    const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return JSON.parse(await new Response(s).text());
  } catch {
    return JSON.parse(new TextDecoder().decode(bytes));
  }
}

// attend la fin de la collecte des adresses (au plus 4 s) : un seul code
// suffit alors dans chaque sens
function gathered(pc) {
  return new Promise((res) => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(res, 4000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });
}

export const netSupported = () => typeof RTCPeerConnection !== "undefined";

export class Net {
  constructor() {
    this.role = null; // "host" | "guest"
    this.id = Math.random().toString(36).slice(2, 8);
    this.peers = new Map(); // id -> { pc, ch, info }
    this.pending = null; // connexion en cours de négociation (hôte)
    this.handlers = {};
    this.players = new Map(); // id -> infos (nom, personnage…), soi compris
  }

  on(type, fn) { this.handlers[type] = fn; }
  emit(type, ...a) { this.handlers[type]?.(...a); }
  get active() { return this.role !== null; }
  get connected() { return [...this.peers.values()].some((p) => p.ch && p.ch.readyState === "open"); }

  // ------------------------------------------------ hôte
  async invite(me) {
    this.role = "host";
    this.players.set(this.id, { ...me, id: this.id, host: true });
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const ch = pc.createDataChannel("vv", { ordered: false, maxRetransmits: 0 });
    const rel = pc.createDataChannel("vv-rel", { ordered: true });
    const peer = { pc, ch, rel, id: null };
    this.pending = peer;
    this.wire(peer);
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    return pack({ t: "offer", sdp: pc.localDescription.sdp, host: this.id });
  }

  async accept(code) {
    const msg = await unpack(code);
    if (msg.t !== "answer") throw new Error("Collez ici le code de réponse de votre ami");
    const peer = this.pending;
    if (!peer) throw new Error("Créez d'abord une invitation");
    peer.id = msg.id;
    this.peers.set(msg.id, peer);
    this.pending = null;
    await peer.pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
  }

  // ------------------------------------------------ invité
  async join(code, me) {
    const msg = await unpack(code);
    if (msg.t !== "offer") throw new Error("Collez ici le code d'invitation de l'hôte");
    this.role = "guest";
    this.players.set(this.id, { ...me, id: this.id });
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer = { pc, ch: null, rel: null, id: msg.host };
    this.peers.set(msg.host, peer);
    pc.ondatachannel = (e) => {
      if (e.channel.label === "vv") peer.ch = e.channel; else peer.rel = e.channel;
      this.wireChannel(peer, e.channel);
    };
    this.wire(peer);
    await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    return pack({ t: "answer", sdp: pc.localDescription.sdp, id: this.id });
  }

  wire(peer) {
    peer.pc.onconnectionstatechange = () => {
      const s = peer.pc.connectionState;
      if (s === "failed" || s === "closed" || s === "disconnected") this.drop(peer);
    };
    if (peer.ch) this.wireChannel(peer, peer.ch);
    if (peer.rel) this.wireChannel(peer, peer.rel);
  }

  wireChannel(peer, ch) {
    ch.onopen = () => {
      if (ch.label === "vv-rel") this.sendTo(peer, { t: "hello", info: this.players.get(this.id) });
    };
    ch.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      this.receive(peer, m);
    };
    // canal reçu déjà ouvert : onopen ne viendra pas
    if (ch.readyState === "open") ch.onopen();
  }

  drop(peer) {
    if (peer.dropped) return;
    peer.dropped = true;
    for (const [id, p] of this.peers) if (p === peer) this.peers.delete(id);
    try { peer.pc.close(); } catch { /* déjà fermée */ }
    if (this.role === "host") {
      this.players.delete(peer.id);
      this.broadcast({ t: "leave", id: peer.id });
      this.broadcast({ t: "lobby", players: [...this.players.values()] });
      this.emit("leave", peer.id);
    } else {
      // l'hôte est parti : la partie s'arrête pour tout le monde
      for (const id of [...this.players.keys()]) if (id !== this.id) { this.players.delete(id); this.emit("leave", id); }
      this.emit("lost");
    }
    this.emit("lobby");
  }

  receive(peer, m) {
    if (m.t === "hello") {
      if (this.role === "host") {
        peer.id = m.info.id;
        this.players.set(m.info.id, m.info);
        this.broadcast({ t: "lobby", players: [...this.players.values()] });
        this.emit("lobby");
        this.emit("join", m.info);
      }
      return;
    }
    if (m.t === "lobby") {
      for (const p of m.players) this.players.set(p.id, p);
      for (const id of [...this.players.keys()]) if (!m.players.some((p) => p.id === id)) this.players.delete(id);
      this.emit("lobby");
      return;
    }
    // l'hôte relaie aux autres invités ce qui vient d'un invité
    if (this.role === "host" && m.from && m.t !== "hello") this.broadcast(m, peer);
    this.emit(m.t, m);
  }

  sendTo(peer, m, fast = false) {
    const ch = fast ? peer.ch : peer.rel;
    if (ch && ch.readyState === "open") {
      try { ch.send(JSON.stringify(m)); } catch { /* tampon plein : message perdu */ }
    }
  }

  // fast : canal non fiable (positions), sinon canal fiable
  broadcast(m, except = null, fast = false) {
    for (const p of this.peers.values()) if (p !== except) this.sendTo(p, m, fast);
  }

  send(m, fast = false) { this.broadcast({ ...m, from: this.id }, null, fast); }

  updateMe(info) {
    const me = { ...this.players.get(this.id), ...info };
    this.players.set(this.id, me);
    if (this.role === "host") this.broadcast({ t: "lobby", players: [...this.players.values()] });
    else this.send({ t: "hello", info: me });
    this.emit("lobby");
  }

  close() {
    for (const p of this.peers.values()) { p.dropped = true; try { p.pc.close(); } catch { /* */ } }
    if (this.pending) try { this.pending.pc.close(); } catch { /* */ }
    this.peers.clear();
    this.pending = null;
    this.players.clear();
    this.role = null;
    this.emit("lobby");
  }
}

// ------------------------------------------------------------ par serveur
// Jeu servi par server/server.cjs (DuckDNS, redirection de port) : les
// messages passent par le serveur, qui les relaie aux joueurs du salon.
// Même interface que Net ; l'hôte est le créateur du salon.
export async function findServer() {
  if (!/^https?:$/.test(location.protocol)) return false;
  try {
    const r = await fetch("vv-server", { cache: "no-store" });
    if (!r.ok) return false;
    const j = await r.json();
    return j && j.name === "Vosges Vélo";
  } catch {
    return false;
  }
}

export class WsNet {
  constructor() {
    this.server = true;
    this.role = null;
    this.id = null;
    this.players = new Map();
    this.handlers = {};
    this.rooms = [];
    this.roomName = "";
    this.queue = [];
    this.open();
  }

  open() {
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    const ws = (this.ws = new WebSocket(url));
    ws.onopen = () => { for (const m of this.queue.splice(0)) ws.send(m); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } this.receive(m); };
    ws.onclose = () => {
      const was = this.role;
      this.leaveRoom(true);
      if (was) this.emit("lost");
      this.emit("lobby");
      // reconnexion automatique (serveur redémarré, Wi-Fi coupé…)
      setTimeout(() => this.open(), 3000);
    };
  }

  on(type, fn) { this.handlers[type] = fn; }
  emit(type, ...a) { this.handlers[type]?.(...a); }
  get active() { return this.role !== null; }
  get connected() { return this.role !== null && this.players.size > 1; }

  raw(m) {
    const s = JSON.stringify(m);
    if (this.ws.readyState === 1) this.ws.send(s); else this.queue.push(s);
  }

  create(me) { this.me = me; this.raw({ t: "create", info: me }); }
  enter(room, me) { this.me = me; this.raw({ t: "enter", room, info: me }); }
  list() { this.raw({ t: "list" }); }

  receive(m) {
    switch (m.t) {
      case "hi": this.myId = m.id; return;
      case "rooms": this.rooms = m.rooms; this.emit("lobby"); return;
      case "error": this.emit("error", m.msg); return;
      case "joined":
        this.id = m.id;
        this.role = m.host ? "host" : "guest";
        this.roomName = m.name;
        this.players.clear();
        this.players.set(this.id, { ...this.me, id: this.id, host: m.host });
        if (!m.host) this.send({ t: "hello", info: this.players.get(this.id) });
        this.emit("lobby");
        return;
      case "hello":
        if (this.role === "host") {
          this.players.set(m.info.id, m.info);
          this.send({ t: "lobby", players: [...this.players.values()] });
          this.emit("lobby");
          this.emit("join", m.info);
        }
        return;
      case "lobby":
        if (this.role !== "guest") return;
        for (const p of m.players) this.players.set(p.id, p);
        for (const id of [...this.players.keys()]) if (!m.players.some((p) => p.id === id)) this.players.delete(id);
        this.emit("lobby");
        return;
      case "leave":
        this.players.delete(m.id);
        if (this.role === "host") this.send({ t: "lobby", players: [...this.players.values()] });
        this.emit("leave", m.id);
        this.emit("lobby");
        return;
      case "hostlost":
        this.leaveRoom(true);
        this.emit("lost");
        this.emit("lobby");
        return;
      default:
        this.emit(m.t, m);
    }
  }

  send(m) { this.raw({ ...m, from: this.id }); }
  broadcast(m) { this.send(m); }

  updateMe(info) {
    this.me = { ...this.me, ...info };
    if (!this.role) return;
    const me = { ...this.players.get(this.id), ...info };
    this.players.set(this.id, me);
    if (this.role === "host") this.send({ t: "lobby", players: [...this.players.values()] });
    else this.send({ t: "hello", info: me });
    this.emit("lobby");
  }

  leaveRoom(silent) {
    for (const id of [...this.players.keys()]) if (id !== this.id) this.emit("leave", id);
    this.players.clear();
    this.role = null;
    if (!silent) this.raw({ t: "exit" });
  }

  close() { this.leaveRoom(false); this.emit("lobby"); }
}
