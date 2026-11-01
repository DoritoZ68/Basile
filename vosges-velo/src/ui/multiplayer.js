// Multijoueur : connexion (codes ou serveur), joueurs distants, envoi
// des positions, départ commun, onglet « Multijoueur ».
import * as THREE from "three";
import { Net, WsNet, findServer, netSupported } from "../net.js";
import { RiderModel } from "../rider.js";
import { characterById, paletteOf } from "../characters.js";
import { makeRider } from "../physics.js";
import { $, START_S, applyConditions, game, saveSettings, scene, selectRoute, settings, sound, startRide, toast, updateModeUi } from "../main.js";

// ------------------------------------------------------------ multijoueur
export let net = new Net();
export function myInfo() {
  const c = characterById(settings.character);
  return { name: (settings.pseudo || "").trim() || c.name.split(" ")[0] || "Joueur", palette: paletteOf(c, settings.jersey), height: c.height, bike: settings.bike, mass: settings.mass, ftp: settings.ftp, char: c.id };
}

export function nameTag(text, color) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(14,22,19,0.75)";
  g.beginPath(); g.roundRect(4, 8, 248, 48, 12); g.fill();
  g.fillStyle = color; g.fillRect(16, 22, 8, 20);
  g.fillStyle = "#fff"; g.font = "700 30px Barlow, Arial, sans-serif"; g.textBaseline = "middle";
  g.fillText(text, 34, 33, 210);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sp.scale.set(1.8, 0.45, 1);
  sp.renderOrder = 5;
  return sp;
}

export function addRemote(info) {
  if (game.remotes.has(info.id) || !game.player) return;
  const rider = makeRider({ name: info.name, mass: info.mass || 72, ftp: info.ftp || 230, s: START_S, o: 0, bike: info.bike || "route" });
  rider.remote = true;
  rider.netId = info.id;
  rider.team = game.player.team;
  Object.assign(rider, { x: game.player.x, y: game.player.y, z: game.player.z, yaw: game.player.yaw, lean: 0 });
  const model = new RiderModel({ palette: info.palette || {}, type: info.bike || "route" });
  model.root.scale.setScalar(info.height || 1);
  scene.add(model.root);
  const tag = nameTag(info.name, (info.palette && info.palette.jersey) || "#fff");
  model.root.parent.add(tag);
  game.models.push({ root: tag });
  game.remotes.set(info.id, { rider, model, tag, info });
  game.riders.push(rider);
  game.models.push(model);
}

export function removeRemote(id) {
  const x = game.remotes.get(id);
  if (!x) return;
  scene.remove(x.model.root);
  scene.remove(x.tag);
  game.remotes.delete(id);
  game.riders = game.riders.filter((r) => r !== x.rider);
  toast(`${x.info.name} a quitté la partie`, 3);
}

// position reçue : extrapolée avec la vitesse, rejointe en douceur
export function followNet(x, dt) {
  const n = x.net;
  if (!n) return;
  const age = Math.min(1, (performance.now() - n.at) / 1000);
  const k = Math.min(1, dt * 6);
  const sT = n.s + n.v * age;
  x.s += x.v * dt;
  x.s += (sT - x.s) * (Math.abs(sT - x.s) > 30 ? 1 : k);
  x.o += (n.o - x.o) * k;
  x.v = n.v;
  x.cadence = n.cad; x.posture = n.post; x.power = n.p || 0;
  x.time = n.time + age;
  x.crashed = n.cr || 0;
  if (n.fin && !x.finished) { x.finished = true; x.finishTime = n.ft; x.place = game.riders.filter((o) => o.finished).length - 1; }
  if (x.remote) {
    const xT = n.x + Math.sin(n.yaw) * n.v * age, zT = n.z + Math.cos(n.yaw) * n.v * age;
    const far = Math.hypot(xT - x.x, zT - x.z) > 25;
    x.x = far ? xT : x.x + Math.sin(x.yaw) * x.v * dt + (xT - x.x - Math.sin(x.yaw) * x.v * dt) * k;
    x.z = far ? zT : x.z + Math.cos(x.yaw) * x.v * dt + (zT - x.z - Math.cos(x.yaw) * x.v * dt) * k;
    x.y += (n.y - x.y) * (far ? 1 : k);
    let dy = n.yaw - x.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    x.yaw += dy * (far ? 1 : k);
    x.lean += (n.lean - x.lean) * k;
    x.pitch = n.pitch;
  }
}

export const r2 = (v, k = 100) => Math.round(v * k) / k;
export function netTick(dt) {
  if (!net.connected || !game.player) return;
  const p = game.player;
  game.netT = (game.netT || 0) - dt;
  if (game.netT <= 0) {
    game.netT = 0.1;
    net.send({ t: "st", s: r2(p.s, 10), o: r2(p.o), x: r2(p.x), y: r2(p.yS), z: r2(p.z), yaw: r2(p.yaw, 1000), lean: r2(p.lean, 1000), pitch: r2(Math.atan(p.gradeS || 0), 1000), v: r2(p.v), cad: Math.round(p.cadence), post: p.posture, p: Math.round(p.power), time: r2(p.time, 10), fin: p.finished ? 1 : 0, ft: p.finishTime || 0, cr: p.crashed > 0 ? 1 : 0 }, true);
  }
  // l'hôte diffuse le peloton (5 fois par seconde)
  if (net.role === "host" && game.field) {
    game.aiNetT = (game.aiNetT || 0) - dt;
    if (game.aiNetT <= 0) {
      game.aiNetT = 0.2;
      net.send({ t: "ai", d: game.field.map((x) => [r2(x.s, 10), r2(x.o), r2(x.v), Math.round(x.cadence), x.posture, x.finished ? 1 : 0, r2(x.time, 10), r2(x.finishTime || 0, 10), x.crashed > 0 ? 1 : 0]) }, true);
    }
  }
}

// l'hôte lance la partie pour tout le monde
export function hostStart() {
  game.mpJersey = null;
  if (net.role === "host" && net.connected) {
    const keys = ["route", "reverse", "mode", "weather", "time", "wind", "field", "level", "spawn"];
    const ms = Object.fromEntries(keys.map((k) => [k, settings[k]]));
    ms.jersey = paletteOf(characterById(settings.character), settings.jersey).jersey;
    game.mpJersey = ms.jersey;
    net.send({ t: "start", settings: ms });
  }
  startRide();
}

export function bindNet() {
  net.on("start", (m) => {
    if (net.role !== "guest") return;
    const ms = m.settings;
    for (const k of ["route", "reverse", "mode", "weather", "time", "wind", "field", "level", "spawn"]) if (k in ms) settings[k] = ms[k];
    game.mpJersey = ms.jersey;
    selectRoute(ms.route, ms.reverse);
    applyConditions();
    updateModeUi();
    $("pause").hidden = true;
    $("results").hidden = true;
    sound.start();
    startRide();
  });
  net.on("st", (m) => {
    const x = game.remotes.get(m.from);
    if (x) { m.at = performance.now(); x.rider.net = m; }
  });
  net.on("ai", (m) => {
    if (net.role !== "guest" || !game.field) return;
    const at = performance.now();
    m.d.forEach((a, i) => {
      const x = game.field[i];
      if (x) x.net = { s: a[0], o: a[1], v: a[2], cad: a[3], post: a[4], fin: a[5], time: a[6], ft: a[7], cr: a[8], at };
    });
  });
  net.on("join", (info) => { toast(`${info.name} a rejoint la partie`, 3); });
  net.on("leave", (id) => removeRemote(id));
  net.on("lost", () => { toast("Connexion perdue avec l'hôte : vous roulez seul", 4); });
  net.on("lobby", () => renderMp());
  net.on("error", (msg) => { $("mp-status").textContent = msg; });
}
bindNet();

export function renderMp() {
  const st = $("mp-status"), list = $("mp-players");
  if (!st) return;
  const host = net.role === "host", guest = net.role === "guest";
  const srv = !!net.server;
  $("mp-start").hidden = srv || net.active;
  $("mp-hostbox").hidden = srv || !host;
  $("mp-guestbox").hidden = srv || !guest || net.connected;
  $("mp-serverbox").hidden = !srv || net.active;
  if (srv) {
    const rl = $("mp-rooms");
    rl.innerHTML = net.rooms.length ? "" : "<li class=\"empty\">Aucun salon ouvert pour l'instant.</li>";
    for (const r of net.rooms) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${r.name} <small>${r.players}/4</small></span>`;
      const b = document.createElement("button");
      b.className = "mp-btn small";
      b.textContent = r.full ? "Complet" : "Rejoindre";
      b.disabled = r.full;
      b.onclick = () => { st.textContent = "Connexion au salon…"; net.enter(r.id, myInfo()); };
      li.appendChild(b);
      rl.appendChild(li);
    }
  }
  $("mp-leave").hidden = !net.active;
  const n = net.players.size;
  if (srv && net.active && !net.connected) st.textContent = host ? `${net.roomName} ouvert : vos amis le voient dans leur liste en ouvrant la même adresse.` : "Connexion au salon…";
  else st.textContent = !net.active ? "" : net.connected
    ? host ? `${n} joueurs connectés. Choisissez le parcours et le mode, puis « Partir » : tout le monde part en même temps.` : "Connecté ! L'hôte choisit le parcours et lancera la partie."
    : host ? "En attente d'un joueur…" : "";
  list.innerHTML = [...net.players.values()].map((p) => `<li><i style="background:${(p.palette && p.palette.jersey) || "#fff"}"></i>${p.name}${p.host ? " <small>hôte</small>" : ""}${p.id === net.id ? " <small>vous</small>" : ""}</li>`).join("");
  const go = $("go");
  if (guest && net.connected) { go.textContent = "En attente de l'hôte…"; go.disabled = true; }
  else { go.textContent = host && net.connected ? `Partir à ${n}` : "Partir"; go.disabled = false; }
  $("restart").disabled = $("r-again").disabled = guest && net.connected;
}

export function buildMp() {
  // jeu servi par server/server.cjs : salons par le serveur, sans codes
  findServer().then((ok) => {
    if (!ok) return;
    net.close();
    net = new WsNet();
    bindNet();
    $("mp-intro").textContent = "Partie sur ce serveur : créez un salon, ou rejoignez celui d'un ami qui a ouvert la même adresse. 4 joueurs par salon. L'hôte (créateur du salon) choisit le parcours, le mode et les conditions, puis lance la partie avec « Partir ».";
    $("mp-create").onclick = () => { $("mp-status").textContent = "Ouverture du salon…"; net.create(myInfo()); };
    renderMp();
  });
  if (!netSupported()) { $("mp-intro").textContent = "Ce navigateur ne permet pas les connexions directes (WebRTC)."; $("mp-start").hidden = true; return; }
  const name = $("mp-name");
  name.value = settings.pseudo || "";
  name.oninput = () => { settings.pseudo = name.value.slice(0, 16); saveSettings(); if (net.active) net.updateMe(myInfo()); };
  const err = (e) => { $("mp-status").textContent = e.message || String(e); };
  const copy = (id, btn) => {
    const t = $(id);
    t.select();
    (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).catch(() => document.execCommand("copy"));
    const old = btn.textContent; btn.textContent = "Copié !"; setTimeout(() => (btn.textContent = old), 1500);
  };
  $("mp-host").onclick = () => { net.role = "host"; net.players.set(net.id, { ...myInfo(), id: net.id, host: true }); renderMp(); };
  $("mp-join").onclick = () => { net.role = "guest"; renderMp(); };
  $("mp-invite").onclick = async () => {
    if (net.players.size >= 4) return err("4 joueurs au plus");
    $("mp-status").textContent = "Préparation du code…";
    try {
      $("mp-offer").value = await net.invite(myInfo());
      $("mp-answer-in").value = "";
      $("mp-offerbox").hidden = false;
      renderMp();
    } catch (e) { err(e); }
  };
  $("mp-copy-offer").onclick = (e) => copy("mp-offer", e.target);
  $("mp-copy-answer").onclick = (e) => copy("mp-answer", e.target);
  $("mp-connect").onclick = async () => {
    try { await net.accept($("mp-answer-in").value); $("mp-offerbox").hidden = true; $("mp-status").textContent = "Connexion…"; } catch (e) { err(e); }
  };
  $("mp-answer-btn").onclick = async () => {
    $("mp-status").textContent = "Préparation du code…";
    try {
      $("mp-answer").value = await net.join($("mp-offer-in").value, myInfo());
      $("mp-answerbox").hidden = false;
      $("mp-status").textContent = "Envoyez ce code de réponse à l'hôte.";
    } catch (e) { err(e); }
  };
  $("mp-leave").onclick = () => { net.close(); $("mp-offerbox").hidden = true; $("mp-answerbox").hidden = true; renderMp(); };
  renderMp();
}
