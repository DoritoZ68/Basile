#!/usr/bin/env node
// Serveur Vosges Vélo : sert le jeu (dist/vosges-velo.html) et relaie les
// messages des parties multijoueur (salons de 4 joueurs) par WebSocket.
// Aucune dépendance : Node.js 12 ou plus suffit.
//
//   node server/server.cjs
//
// Réglages (variables d'environnement, ou fichier server/config.json) :
//   PORT            port d'écoute (8080 par défaut)
//   DUCKDNS_DOMAIN  sous-domaine DuckDNS, sans « .duckdns.org » (facultatif)
//   DUCKDNS_TOKEN   jeton DuckDNS : l'adresse IP publique est mise à jour
//                   au démarrage puis toutes les 5 minutes
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")); } catch (e) { /* pas de fichier */ }
const PORT = Number(process.env.PORT || cfg.port || 8080);
const DOMAIN = (process.env.DUCKDNS_DOMAIN || cfg.duckdnsDomain || "").replace(/\.duckdns\.org$/, "");
const TOKEN = process.env.DUCKDNS_TOKEN || cfg.duckdnsToken || "";
// le jeu : à côté du serveur (dossier distribué) ou dans dist/ (dépôt)
const GAME = [path.join(__dirname, "vosges-velo.html"), path.join(__dirname, "..", "dist", "vosges-velo.html")].find((f) => fs.existsSync(f)) || path.join(__dirname, "vosges-velo.html");
const MAX_ROOM = 4, MAX_ROOMS = 20, MAX_MSG = 64 * 1024;

const log = (...a) => console.log(new Date().toLocaleTimeString("fr-FR"), ...a);

// ------------------------------------------------------------ fichier du jeu
let page = null, pageGz = null;
function loadGame() {
  if (!fs.existsSync(GAME)) {
    console.error(`Fichier introuvable : ${GAME}\nPlacez vosges-velo.html à côté de server.cjs (ou lancez « npm run build » dans le dépôt).`);
    process.exit(1);
  }
  page = fs.readFileSync(GAME);
  pageGz = zlib.gzipSync(page, { level: 9 });
  log(`Jeu chargé : ${(page.length / 1e6).toFixed(1)} Mo (${(pageGz.length / 1e6).toFixed(1)} Mo compressé)`);
}
loadGame();
fs.watchFile(GAME, { interval: 5000 }, () => { try { loadGame(); } catch (e) { /* en cours d'écriture */ } });

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/" || url === "/index.html" || url === "/vosges-velo.html") {
    const gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      ...(gz ? { "Content-Encoding": "gzip" } : {}),
      "Content-Length": gz ? pageGz.length : page.length,
    });
    res.end(gz ? pageGz : page);
    return;
  }
  if (url === "/vv-server") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ name: "Vosges Vélo", rooms: rooms.size, players: clients.size }));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Introuvable");
});

// ------------------------------------------------------------ WebSocket (RFC 6455)
const clients = new Set();
const rooms = new Map(); // id -> { id, name, host, members: Set }

server.on("upgrade", (req, socket) => {
  if (req.url.split("?")[0] !== "/ws" || (req.headers.upgrade || "").toLowerCase() !== "websocket") { socket.destroy(); return; }
  const key = req.headers["sec-websocket-key"];
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
  socket.setNoDelay(true);
  const c = { socket, id: crypto.randomBytes(4).toString("hex"), room: null, info: null, buf: Buffer.alloc(0), frag: [] };
  clients.add(c);
  socket.on("data", (d) => { c.buf = Buffer.concat([c.buf, d]); parse(c); });
  socket.on("close", () => bye(c));
  socket.on("error", () => bye(c));
  send(c, { t: "hi", id: c.id });
  send(c, roomList());
});

function frame(str) {
  const p = Buffer.from(str);
  const n = p.length;
  const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x81, 127, 0, 0, 0, 0]), Buffer.from([(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255])]);
  return Buffer.concat([h, p]);
}

function send(c, m) {
  if (!c.socket.destroyed) c.socket.write(frame(typeof m === "string" ? m : JSON.stringify(m)));
}

function parse(c) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
    let len = b[1] & 0x7f, o = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); o = 4; }
    else if (len === 127) { if (b.length < 10) return; len = b.readUInt32BE(6); o = 10; }
    if (len > MAX_MSG) { c.socket.destroy(); return; }
    const mo = o, po = o + (masked ? 4 : 0);
    if (b.length < po + len) return;
    const p = Buffer.from(b.subarray(po, po + len));
    if (masked) for (let i = 0; i < len; i++) p[i] ^= b[mo + (i & 3)];
    c.buf = b.subarray(po + len);
    if (op === 8) { c.socket.end(Buffer.from([0x88, 0])); return; }
    if (op === 9) { c.socket.write(Buffer.concat([Buffer.from([0x8a, p.length]), p])); continue; }
    if (op === 0xa) continue;
    c.frag.push(p);
    if (!fin) continue;
    const text = Buffer.concat(c.frag).toString("utf8");
    c.frag = [];
    let m;
    try { m = JSON.parse(text); } catch (e) { continue; }
    if (m && typeof m.t === "string") onMessage(c, m, text);
  }
}

// ------------------------------------------------------------ salons
function roomList() {
  return { t: "rooms", rooms: [...rooms.values()].map((r) => ({ id: r.id, name: r.name, players: r.members.size, full: r.members.size >= MAX_ROOM })) };
}
function lobbyBroadcast() {
  const l = JSON.stringify(roomList());
  for (const c of clients) if (!c.room) send(c, l);
}

function onMessage(c, m, text) {
  if (m.t === "list") { send(c, roomList()); return; }
  if (m.t === "create") {
    if (c.room) leave(c);
    if (rooms.size >= MAX_ROOMS) { send(c, { t: "error", msg: "Trop de salons ouverts sur ce serveur" }); return; }
    const name = String((m.info && m.info.name) || "Joueur").slice(0, 16);
    const room = { id: crypto.randomBytes(3).toString("hex"), name: `Salon de ${name}`, host: c, members: new Set([c]) };
    rooms.set(room.id, room);
    c.room = room;
    send(c, { t: "joined", room: room.id, id: c.id, host: true, name: room.name });
    log(`${name} ouvre « ${room.name} »`);
    lobbyBroadcast();
    return;
  }
  if (m.t === "enter") {
    const room = rooms.get(m.room);
    if (!room) { send(c, { t: "error", msg: "Ce salon n'existe plus" }); return; }
    if (room.members.size >= MAX_ROOM) { send(c, { t: "error", msg: "Salon complet (4 joueurs)" }); return; }
    if (c.room) leave(c);
    room.members.add(c);
    c.room = room;
    send(c, { t: "joined", room: room.id, id: c.id, host: false, name: room.name });
    log(`un joueur rejoint « ${room.name} » (${room.members.size})`);
    lobbyBroadcast();
    return;
  }
  if (m.t === "exit") { leave(c); send(c, roomList()); return; }
  // tout le reste est relayé aux autres joueurs du salon, avec l'expéditeur
  if (!c.room) return;
  m.from = c.id;
  const out = frame(JSON.stringify(m));
  for (const o of c.room.members) if (o !== c && !o.socket.destroyed) o.socket.write(out);
}

function leave(c) {
  const room = c.room;
  if (!room) return;
  room.members.delete(c);
  c.room = null;
  if (room.host === c) {
    for (const o of room.members) { o.room = null; send(o, { t: "hostlost" }); }
    rooms.delete(room.id);
    log(`« ${room.name} » fermé`);
  } else for (const o of room.members) send(o, { t: "leave", id: c.id });
  lobbyBroadcast();
}

function bye(c) {
  if (!clients.has(c)) return;
  clients.delete(c);
  leave(c);
}

// ------------------------------------------------------------ DuckDNS
function duck() {
  if (!DOMAIN || !TOKEN) return;
  https.get(`https://www.duckdns.org/update?domains=${encodeURIComponent(DOMAIN)}&token=${encodeURIComponent(TOKEN)}&ip=`, (res) => {
    let body = "";
    res.on("data", (d) => (body += d));
    res.on("end", () => log(body.trim() === "OK" ? `DuckDNS : ${DOMAIN}.duckdns.org pointe sur cette box` : `DuckDNS a répondu « ${body.trim()} » : vérifiez le domaine et le jeton`));
  }).on("error", (e) => log(`DuckDNS injoignable : ${e.message}`));
}
duck();
setInterval(duck, 5 * 60 * 1000);

server.listen(PORT, () => {
  const ifs = require("os").networkInterfaces();
  const local = Object.values(ifs).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  log(`Vosges Vélo en ligne sur le port ${PORT}`);
  for (const a of local) log(`  réseau local : http://${a}:${PORT}`);
  if (DOMAIN) log(`  internet     : http://${DOMAIN}.duckdns.org:${PORT}`);
  log("Ctrl+C pour arrêter.");
});
