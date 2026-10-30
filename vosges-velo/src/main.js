import * as THREE from "three";
import { loadData } from "./data.js";
import { Heightfield, Terrain, makeTerrainMaterial } from "./terrain.js";
import { RoadIndex, buildRoads, Forest, buildBuildings, buildLandmarks, buildSky, textSign, signPost, gantry } from "./scenery.js";
import { Route, townCrossings, townAt } from "./route.js";
import { RiderModel } from "./rider.js";
import { makeRider, step, computeDrafts, aiThink, gearLabel, G } from "./physics.js";
import { Sound } from "./audio.js";

const $ = (id) => document.getElementById(id);
const fmt1 = (v) => v.toFixed(1).replace(".", ",");
const fmtInt = (v) => Math.round(v).toLocaleString("fr-FR");
const fmtTime = (t) => {
  t = Math.max(0, t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

// ------------------------------------------------------------ réglages
const DEFAULTS = {
  route: "grand-ballon-willer", reverse: false, mode: "race",
  mass: 72, ftp: 230, jersey: "#d8323c", level: "amateur", assist: true,
  time: "matin", weather: "beau", wind: "none",
  quality: "auto", sound: true,
};
const settings = { ...DEFAULTS, ...readLS("vv-settings", {}) };
function readLS(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
const saveSettings = () => writeLS("vv-settings", settings);

const QUALITY = {
  bas: { pr: 0.7, lod: 0.6, trees: 120, treeDist: 450, density: 0.55, bDist: 700, ortho: 2048 },
  moyen: { pr: 1, lod: 0.85, trees: 170, treeDist: 700, density: 0.8, bDist: 1300, ortho: 4096 },
  eleve: { pr: 1.5, lod: 1.25, trees: 240, treeDist: 1100, density: 1, bDist: 2600, ortho: 4096 },
};
const qKey = () => (settings.quality === "auto" ? "moyen" : settings.quality);

const DEST = {
  "vieil-armand": "Vieil Armand",
  "grand-ballon-willer": "Grand Ballon",
  "route-des-cretes": "Grand Ballon",
  "grand-ballon-markstein": "Grand Ballon",
  piemont: "Guebwiller",
};
const ORIGIN = {
  "vieil-armand": "Cernay",
  "grand-ballon-willer": "Willer-sur-Thur",
  "route-des-cretes": "Cernay",
  "grand-ballon-markstein": "Guebwiller",
  piemont: "Thann",
};

const RIVALS = [
  { name: "Léon Schmitt", jersey: "#1f6fd1", helmet: "#1f6fd1", wkg: 1.08, mass: 68, climb: 0.95, flat: 0.78, aggr: 0.8 },
  { name: "Camille Muller", jersey: "#f2c230", helmet: "#222", wkg: 1.0, mass: 58, climb: 0.97, flat: 0.72, aggr: 0.5 },
  { name: "Julien Meyer", jersey: "#2f9e57", helmet: "#fff", wkg: 0.94, mass: 76, climb: 0.9, flat: 0.85, aggr: 0.3 },
  { name: "Sarah Kieffer", jersey: "#e85d9a", helmet: "#fff", wkg: 1.03, mass: 61, climb: 0.96, flat: 0.75, aggr: 0.6 },
  { name: "Hugo Weber", jersey: "#f0f0f0", helmet: "#c8102e", wkg: 0.9, mass: 81, climb: 0.88, flat: 0.88, aggr: 0.2 },
];
const LEVEL_WKG = { cyclo: 2.9, amateur: 3.7, elite: 4.9 };

// ------------------------------------------------------------ moteur 3D
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality !== "bas", powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
let pixelRatio = Math.min(devicePixelRatio, QUALITY[qKey()].pr);
renderer.setPixelRatio(pixelRatio);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 60000);
scene.fog = new THREE.Fog(0xcfe0ef, 2000, 16000);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5b5544, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
scene.add(hemi, sun);
const sky = buildSky();
scene.add(sky);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const sound = new Sound();
sound.setEnabled(settings.sound);

let D, hf, terrain, forest, buildings, roadIndex, signs = new THREE.Group();
scene.add(signs);

// ------------------------------------------------------------ état de jeu
const game = {
  state: "loading", // menu | countdown | ride | paused | finished
  route: null,
  crossings: [],
  riders: [],
  models: [],
  player: null,
  ghost: null,
  ghostModel: null,
  ghostRec: [],
  recT: 0,
  t: 0,
  countdown: 0,
  camMode: 0,
  events: [],
  nextEvent: 0,
  lastKm: 0,
  menuT: 0,
  env: { windX: 0, windZ: 0 },
  fogBase: { near: 2000, far: 16000 },
};
const CAMS = ["Poursuite", "Embarquée", "Moto TV", "Drone"];

// ------------------------------------------------------------ chargement
(async function boot() {
  try {
    D = await loadData((p, msg) => { $("loadbar").style.width = `${p * 100}%`; $("loadmsg").textContent = msg; });
    $("loadmsg").textContent = "Construction du relief…";
    await frame();
    hf = new Heightfield(D.meta, D.terrain);
    hf.flattenRoads(D.routes);
    roadIndex = new RoadIndex(D.routes);
    const mat = makeTerrainMaterial(D.ortho, QUALITY[qKey()].ortho, renderer);
    terrain = new Terrain(hf, mat);
    scene.add(terrain.group);
    $("loadbar").style.width = "70%";
    $("loadmsg").textContent = "Routes et bâtiments…";
    await frame();
    scene.add(buildRoads(D.routes, renderer));
    buildings = buildBuildings(D.buildings, hf);
    scene.add(buildings.group);
    scene.add(buildLandmarks(D.landmarks, hf, roadIndex));
    $("loadbar").style.width = "85%";
    $("loadmsg").textContent = "Plantation des sapins…";
    await frame();
    forest = new Forest(D, hf, roadIndex);
    scene.add(forest.group);
    $("credits").textContent = D.meta.attribution;
    applyConditions();
    buildMenu();
    selectRoute(settings.route, settings.reverse);
    $("loading").hidden = true;
    showMenu();
    requestAnimationFrame(loop);
    window.__vv = { THREE, scene, camera, game, hf, terrain, renderer, settings };
  } catch (e) {
    console.error(e);
    $("loadmsg").textContent = "Erreur de chargement : " + e.message;
  }
})();

function frame() { return new Promise((r) => requestAnimationFrame(() => r())); }

// ------------------------------------------------------------ conditions
function applyConditions() {
  const T = {
    matin: { dir: [0.75, 0.32, 0.45], sun: 0xffe2bf, si: 1.9, hs: 0xa9c8ec, hg: 0x5a5040, hi: 1.35, top: 0x4a82c8, hor: 0xf1dcc0 },
    midi: { dir: [0.15, 0.9, 0.4], sun: 0xffffff, si: 1.9, hs: 0xc3dbff, hg: 0x5b5544, hi: 1.45, top: 0x3a76c4, hor: 0xcfe0ef },
    soir: { dir: [-0.8, 0.22, 0.4], sun: 0xffb27a, si: 1.8, hs: 0x9db2d8, hg: 0x5a4636, hi: 1.2, top: 0x35558f, hor: 0xf3b07a },
  }[settings.time];
  const dir = new THREE.Vector3(...T.dir).normalize();
  sun.position.copy(dir).multiplyScalar(1000);
  sun.color.set(T.sun);
  sun.intensity = T.si;
  hemi.color.set(T.hs);
  hemi.groundColor.set(T.hg);
  hemi.intensity = T.hi;
  const u = sky.material.uniforms;
  u.sunDir.value.copy(dir);
  u.top.value.set(T.top);
  u.horizon.value.set(T.hor);
  u.haze.value = 0;
  let fogCol = new THREE.Color(T.hor);
  game.fogBase = { near: 2500, far: 17000 };
  if (settings.weather === "voile") {
    u.haze.value = 0.55;
    sun.intensity *= 0.6;
    hemi.intensity *= 1.1;
    fogCol.lerp(new THREE.Color(0xc9ced3), 0.6);
    u.horizon.value.copy(fogCol);
    game.fogBase = { near: 800, far: 8000 };
  } else if (settings.weather === "brouillard") {
    u.haze.value = 1;
    sun.intensity *= 0.35;
    hemi.intensity *= 1.15;
    fogCol = new THREE.Color(0xc4c9cc);
    u.horizon.value.copy(fogCol);
    game.fogBase = { near: 30, far: 2600, mist: true };
  }
  scene.fog.color.copy(fogCol);
  renderer.setClearColor(fogCol);
  const W = { none: [0, 0], ouest: [3.5, 0], "ouest-fort": [7.5, 0], bise: [-4.2, 4.2] }[settings.wind];
  game.env.windX = W[0];
  game.env.windZ = W[1];
}

// brouillard des crêtes : plus dense en altitude
function updateFog(camY) {
  const f = game.fogBase;
  if (f.mist) {
    const k = THREE.MathUtils.smoothstep(camY, 700, 1050);
    scene.fog.near = THREE.MathUtils.lerp(f.near, 5, k);
    scene.fog.far = THREE.MathUtils.lerp(f.far, 140, k);
  } else {
    scene.fog.near = f.near;
    scene.fog.far = f.far;
  }
  camera.far = Math.min(60000, scene.fog.far * 1.3 + 500);
  camera.updateProjectionMatrix();
}

// ------------------------------------------------------------ menu
function seg(container, label, key, options, onChange) {
  const row = document.createElement("div");
  row.className = "opt";
  row.innerHTML = `<label>${label}</label><div class="seg"></div>`;
  const s = row.querySelector(".seg");
  for (const [v, text] of options) {
    const b = document.createElement("button");
    b.textContent = text;
    b.className = settings[key] === v ? "on" : "";
    b.onclick = () => {
      settings[key] = v;
      saveSettings();
      s.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      onChange && onChange(v);
    };
    s.appendChild(b);
  }
  container.appendChild(row);
  return row;
}

function range(container, label, key, min, max, stepV, unit, onChange) {
  const row = document.createElement("div");
  row.className = "opt";
  row.innerHTML = `<label>${label}</label><div class="range"><input type="range" min="${min}" max="${max}" step="${stepV}" value="${settings[key]}"><output></output></div>`;
  const inp = row.querySelector("input"), out = row.querySelector("output");
  const show = () => { out.textContent = `${settings[key]} ${unit}`; onChange && onChange(); };
  inp.oninput = () => { settings[key] = Number(inp.value); saveSettings(); show(); };
  show();
  container.appendChild(row);
}

function buildMenu() {
  // onglets
  $("tabs").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      $("tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
    };
  });
  renderRouteList();

  const r = $("opts-routes");
  seg(r, "Sens", "reverse", [[false, "Montée / aller"], [true, "Descente / retour"]], (v) => selectRoute(settings.route, v));
  seg(r, "Mode", "mode", [["race", "Course"], ["tt", "Contre-la-montre"], ["free", "Balade"]]);
  const note = document.createElement("p");
  note.className = "opt-note";
  note.textContent = "Course : 5 adversaires, l'aspiration compte. Contre-la-montre : seul face au fantôme de votre record. Balade : sans chrono, pour admirer le paysage.";
  r.appendChild(note);

  const rd = $("opts-rider");
  const wkgNote = document.createElement("p");
  wkgNote.className = "opt-note";
  const upd = () => { wkgNote.textContent = `Rapport poids/puissance : ${fmt1(settings.ftp / settings.mass)} W/kg au seuil (FTP). Un bon cyclosportif tourne autour de 3 W/kg, un coureur pro dépasse 5,5 W/kg.`; };
  range(rd, "Poids", "mass", 45, 110, 1, "kg", upd);
  range(rd, "Puissance seuil (FTP)", "ftp", 120, 420, 5, "W", upd);
  rd.appendChild(wkgNote);
  const sw = document.createElement("div");
  sw.className = "opt";
  sw.innerHTML = `<label>Maillot</label><div class="swatches"></div>`;
  for (const c of ["#d8323c", "#1f6fd1", "#f2c230", "#2f9e57", "#111111", "#ffffff", "#e85d9a", "#ff7a1a"]) {
    const b = document.createElement("button");
    b.style.background = c;
    b.className = settings.jersey === c ? "on" : "";
    b.onclick = () => { settings.jersey = c; saveSettings(); sw.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); };
    sw.querySelector(".swatches").appendChild(b);
  }
  rd.appendChild(sw);
  seg(rd, "Adversaires", "level", [["cyclo", "Cyclosportifs"], ["amateur", "Amateurs"], ["elite", "Élite"]]);
  seg(rd, "Freinage assisté", "assist", [[true, "Oui"], [false, "Non"]]);
  const an = document.createElement("p");
  an.className = "opt-note";
  an.textContent = "Sans assistance, c'est à vous de freiner avant les virages : trop vite, c'est la chute.";
  rd.appendChild(an);

  const w = $("opts-world");
  seg(w, "Heure", "time", [["matin", "Matin"], ["midi", "Midi"], ["soir", "Soir"]], applyConditions);
  seg(w, "Météo", "weather", [["beau", "Grand beau"], ["voile", "Voilé"], ["brouillard", "Brouillard sur les crêtes"]], applyConditions);
  seg(w, "Vent", "wind", [["none", "Nul"], ["ouest", "Ouest 13 km/h"], ["ouest-fort", "Ouest 27 km/h"], ["bise", "Bise de NE"]], applyConditions);
  const wn = document.createElement("p");
  wn.className = "opt-note";
  wn.textContent = "Le vent agit selon l'orientation réelle de chaque portion de route. L'air plus léger en altitude réduit aussi la traînée.";
  w.appendChild(wn);

  const g = $("opts-gfx");
  seg(g, "Graphismes", "quality", [["auto", "Auto"], ["bas", "Bas"], ["moyen", "Moyen"], ["eleve", "Élevé"]], () => {
    pixelRatio = Math.min(devicePixelRatio, QUALITY[qKey()].pr);
    renderer.setPixelRatio(pixelRatio);
    if (game.route) forest.build(game.route, QUALITY[qKey()].trees, QUALITY[qKey()].density);
  });
  seg(g, "Son", "sound", [[true, "Oui"], [false, "Non"]], (v) => sound.setEnabled(v));
  const gn = document.createElement("p");
  gn.className = "opt-note";
  gn.textContent = "« Auto » ajuste la résolution en continu pour rester fluide, même sur un petit portable.";
  g.appendChild(gn);

  $("go").onclick = () => { sound.start(); startRide(); };
  $("resume").onclick = () => setPaused(false);
  $("restart").onclick = () => { $("pause").hidden = true; startRide(); };
  $("quit").onclick = () => { $("pause").hidden = true; showMenu(); };
  $("r-again").onclick = () => { $("results").hidden = true; startRide(); };
  $("r-menu").onclick = () => { $("results").hidden = true; showMenu(); };
}

function routeStats(def, reverse) {
  const r = new Route(def, reverse);
  let maxG = 0;
  for (let s = 0; s < r.length - 500; s += 100) maxG = Math.max(maxG, r.avgGrade(s, s + 500));
  const climb = r.y[r.n - 1] - r.y[0];
  return { r, km: r.length / 1000, gain: r.gain, avg: climb / r.length, maxG };
}

function recordKey(id, reverse) { return `${id}${reverse ? ":r" : ""}`; }

function renderRouteList() {
  const list = $("route-list");
  list.innerHTML = "";
  const recs = readLS("vv-records", {});
  for (const def of D.routes) {
    const st = routeStats(def, settings.reverse);
    const rec = recs[recordKey(def.id, settings.reverse)];
    const b = document.createElement("button");
    b.className = "route-card" + (def.id === settings.route ? " on" : "");
    const from = settings.reverse ? DEST[def.id] : ORIGIN[def.id];
    const to = settings.reverse ? ORIGIN[def.id] : DEST[def.id];
    b.innerHTML = `<span class="n">${def.name}</span>
      <span class="s">${settings.reverse ? `${from} → ${to} (sens inverse)` : def.subtitle}</span>
      <span class="k"><b>${fmt1(st.km)} km</b><br>D+ ${fmtInt(st.gain)} m · ${fmt1(st.avg * 100)} %</span>
      ${rec ? `<span class="rec">Record : ${fmtTime(rec.time)} · ${fmtInt(rec.avgP)} W</span>` : ""}`;
    b.onclick = () => selectRoute(def.id, settings.reverse);
    list.appendChild(b);
  }
}

function selectRoute(id, reverse) {
  settings.route = id;
  settings.reverse = reverse;
  saveSettings();
  const def = D.routes.find((r) => r.id === id) || D.routes[0];
  game.route = new Route(def, reverse);
  game.crossings = townCrossings(game.route, D.towns);
  forest.build(game.route, QUALITY[qKey()].trees, QUALITY[qKey()].density);
  buildRouteSigns();
  renderRouteList();
  drawProfile($("menu-profile"), game.route, null);
  prepareMinimap();
  game.menuT = 0;
  game.menuSnap = true;
}

// ------------------------------------------------------------ panneaux du parcours
function buildRouteSigns() {
  scene.remove(signs);
  signs.traverse((o) => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } o.geometry?.dispose(); });
  signs = new THREE.Group();
  scene.add(signs);
  const r = game.route;
  const p0 = r.sample(2), p1 = r.sample(r.length - 2);
  signs.add(gantry("DÉPART", p0, "#1d5c3b"));
  signs.add(gantry("ARRIVÉE", p1, "#c8102e"));
  const dest = settings.reverse ? ORIGIN[r.id] : DEST[r.id];
  const climbing = r.y[r.n - 1] - r.y[0] > 150;
  // bornes kilométriques façon panneaux de col
  for (let km = 1; km * 1000 < r.length - 200; km++) {
    const s = km * 1000;
    const p = r.sample(s);
    const left = (r.length - s) / 1000;
    const g = r.avgGrade(s, s + 1000) * 100;
    const lines = climbing
      ? [
          { text: dest.toUpperCase(), size: 21, color: "#111" },
          { text: `Sommet à ${fmt1(left)} km`, size: 21 },
          { text: `Altitude ${fmtInt(p.y)} m`, size: 19, weight: 600 },
          { text: `Pente moyenne ${fmt1(g)} %`, size: 21, color: g > 8 ? "#b0121b" : g > 5 ? "#c25b00" : "#111" },
        ]
      : [
          { text: dest.toUpperCase(), size: 22 },
          { text: `${fmt1(left)} km`, size: 34 },
          { text: `Alt. ${fmtInt(p.y)} m`, size: 18, weight: 600 },
        ];
    const tex = textSign(lines, { w: 200, h: 130, bg: "#ffffff", border: "#f0c419", borderWidth: 9, radius: 6 });
    signs.add(signPost(tex, 0.95, 0.62, p, 1, 4.4, 1.0));
  }
  // entrées / sorties d'agglomération
  for (const e of game.crossings) {
    if (e.s < 5 || e.s > r.length - 5) continue;
    const p = r.sample(e.s);
    const tex = textSign([{ text: e.town.toUpperCase(), size: e.town.length > 14 ? 24 : 32 }], {
      w: 300, h: 110, bg: "#fff", border: "#c8102e", borderWidth: 10, radius: 4, strike: !e.enter,
    });
    signs.add(signPost(tex, 1.5, 0.55, p, 1, 4.8, 1.3));
  }
  // cols et lieux remarquables proches de la route
  game.events = [];
  for (const l of D.landmarks) {
    let best = 1e9, bs = 0;
    for (let i = 0; i < r.n; i += 2) {
      const d = Math.hypot(r.x[i] - l.x, r.z[i] - l.z);
      if (d < best) { best = d; bs = r.s[i]; }
    }
    if (best < 450) {
      game.events.push({ s: Math.max(0, bs - 60), text: l.name });
      if (l.kind === "pass" && best < 120) {
        const [name, alt] = l.name.split(" · ");
        const tex = textSign([{ text: name, size: 26, color: "#fff" }, { text: `Alt. ${alt}`, size: 22, color: "#fff" }], { w: 260, h: 110, bg: "#6b4423", border: "#fff", borderWidth: 5, radius: 8 });
        signs.add(signPost(tex, 1.6, 0.68, r.sample(Math.min(r.length - 1, bs + 5)), 1, 4.8, 1.2));
      }
    }
  }
  for (const c of game.crossings) if (c.enter && c.s > 1) game.events.push({ s: c.s, text: `Bienvenue à ${c.town}` });
  game.events.sort((a, b) => a.s - b.s);
  signs.traverse((o) => { if (o.isMesh) { o.updateMatrix(); } });
}

// ------------------------------------------------------------ profils & carte
const ZONES = [[0.55, "Z1", "#8a9aa6"], [0.75, "Z2", "#4f9bd9"], [0.9, "Z3", "#4caf6a"], [1.05, "Z4", "#e8b730"], [1.2, "Z5", "#ef7d22"], [99, "Z6", "#d8323c"]];
function gradeColor(g) {
  if (g < -0.02) return "#6aa9d8";
  if (g < 0.03) return "#7fbf7a";
  if (g < 0.06) return "#e8c33a";
  if (g < 0.09) return "#ef8a2a";
  if (g < 0.12) return "#d8323c";
  return "#7a1730";
}

function drawProfile(cv, route, riders) {
  const dpr = Math.min(2, devicePixelRatio);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const pad = 8, top = 16, bot = 16;
  const y0 = route.minY - 20, y1 = route.maxY + 20;
  const X = (s) => pad + (s / route.length) * (w - pad * 2);
  const Y = (y) => h - bot - ((y - y0) / (y1 - y0)) * (h - top - bot);
  const stepS = Math.max(50, route.length / 300);
  for (let s = 0; s < route.length; s += stepS) {
    const a = route.sample(s), b = route.sample(Math.min(route.length, s + stepS));
    g.fillStyle = gradeColor((b.y - a.y) / stepS);
    g.beginPath();
    g.moveTo(X(s), h - bot);
    g.lineTo(X(s), Y(a.y));
    g.lineTo(X(s + stepS), Y(b.y));
    g.lineTo(X(s + stepS), h - bot);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.font = "10px system-ui, sans-serif";
  g.textBaseline = "alphabetic";
  g.fillText(`${fmtInt(route.y[0])} m`, pad, h - 3);
  g.textAlign = "right";
  g.fillText(`${fmtInt(route.y[route.n - 1])} m · ${fmt1(route.length / 1000)} km`, w - pad, h - 3);
  g.textAlign = "left";
  g.fillText(`max ${fmtInt(route.maxY)} m`, pad, 11);
  if (riders) {
    for (const r of riders) {
      const p = route.sample(r.s);
      g.fillStyle = r.isPlayer ? "#ffffff" : r.ghost ? "rgba(255,255,255,0.5)" : r.color;
      g.beginPath();
      g.arc(X(Math.min(route.length, r.s)), Y(p.y), r.isPlayer ? 5 : 3.5, 0, Math.PI * 2);
      g.fill();
      if (r.isPlayer) { g.strokeStyle = "#000"; g.lineWidth = 1.5; g.stroke(); }
    }
  }
}

const mini = { img: null, x0: 0, z0: 0, size: 1 };
function prepareMinimap() {
  const r = game.route, m = D.meta;
  let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < r.n; i++) { xa = Math.min(xa, r.x[i]); xb = Math.max(xb, r.x[i]); za = Math.min(za, r.z[i]); zb = Math.max(zb, r.z[i]); }
  const size = Math.max(xb - xa, zb - za) * 1.15 + 600;
  const cx = (xa + xb) / 2, cz = (za + zb) / 2;
  mini.x0 = cx - size / 2; mini.z0 = cz - size / 2; mini.size = size;
  const c = document.createElement("canvas");
  c.width = c.height = 380;
  const g = c.getContext("2d");
  const W = m.x_max - m.x_min, Dd = m.z_max - m.z_min;
  const sx = ((mini.x0 - m.x_min) / W) * D.orthoSmall.width, sy = ((mini.z0 - m.z_min) / Dd) * D.orthoSmall.height;
  g.drawImage(D.orthoSmall, sx, sy, (size / W) * D.orthoSmall.width, (size / Dd) * D.orthoSmall.height, 0, 0, 380, 380);
  g.fillStyle = "rgba(0,0,0,0.2)";
  g.fillRect(0, 0, 380, 380);
  const P = (x, z) => [((x - mini.x0) / size) * 380, ((z - mini.z0) / size) * 380];
  g.lineJoin = "round";
  g.lineWidth = 7;
  g.strokeStyle = "rgba(0,0,0,0.55)";
  const path = () => { g.beginPath(); for (let i = 0; i < r.n; i += 3) { const [x, y] = P(r.x[i], r.z[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  path();
  g.lineWidth = 3.5;
  g.strokeStyle = "#e8b730";
  path();
  g.font = "bold 15px system-ui, sans-serif";
  g.fillStyle = "#fff";
  g.shadowColor = "#000";
  g.shadowBlur = 4;
  for (const t of D.towns) {
    const [x, y] = P(t.x, t.z);
    if (x > 10 && y > 14 && x < 370 && y < 370) g.fillText(t.name, x - 20, y);
  }
  g.fillText("N ↑", 340, 22);
  mini.img = c;
}

function drawMinimap() {
  const cv = $("minimap");
  const dpr = Math.min(2, devicePixelRatio);
  const w = cv.clientWidth;
  if (cv.width !== Math.round(w * dpr)) { cv.width = cv.height = Math.round(w * dpr); }
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.save();
  g.beginPath();
  g.roundRect ? g.roundRect(0, 0, cv.width, cv.height, 14 * dpr) : g.rect(0, 0, cv.width, cv.height);
  g.clip();
  g.drawImage(mini.img, 0, 0, cv.width, cv.height);
  const k = cv.width / mini.size;
  for (const r of [...game.riders].reverse()) {
    const p = game.route.sample(r.s);
    const x = (p.x - mini.x0) * k, y = (p.z - mini.z0) * k;
    g.fillStyle = r.isPlayer ? "#fff" : r.color;
    g.beginPath();
    g.arc(x, y, (r.isPlayer ? 5 : 3.5) * dpr, 0, Math.PI * 2);
    g.fill();
    if (r.isPlayer) {
      g.strokeStyle = "#000"; g.lineWidth = 2 * dpr; g.stroke();
      g.beginPath();
      g.moveTo(x + p.dx * 12 * dpr, y + p.dz * 12 * dpr);
      g.lineTo(x - p.dz * 5 * dpr, y + p.dx * 5 * dpr);
      g.lineTo(x + p.dz * 5 * dpr, y - p.dx * 5 * dpr);
      g.fillStyle = "#fff";
      g.fill();
    }
  }
  g.restore();
}

// ------------------------------------------------------------ course
function clearRiders() {
  for (const m of game.models) scene.remove(m.root);
  if (game.ghostModel) scene.remove(game.ghostModel.root);
  game.models = [];
  game.riders = [];
  game.ghostModel = null;
  game.ghost = null;
}

function startRide() {
  clearRiders();
  const r = game.route;
  $("menu").hidden = true;
  $("results").hidden = true;
  $("hud").hidden = false;
  $("touch").hidden = !matchMedia("(pointer: coarse)").matches;
  const player = makeRider({ name: "Vous", isPlayer: true, mass: settings.mass, ftp: settings.ftp, o: 1.3 });
  player.target = Math.round(settings.ftp * 0.7 / 5) * 5;
  player.color = settings.jersey;
  game.player = player;
  game.riders.push(player);
  const pm = new RiderModel({ jersey: settings.jersey, helmet: settings.jersey === "#ffffff" ? "#222" : "#ffffff" });
  game.models.push(pm);
  scene.add(pm.root);
  if (settings.mode === "race") {
    const base = LEVEL_WKG[settings.level];
    RIVALS.forEach((rv, i) => {
      const ftp = Math.round(rv.mass * base * rv.wkg);
      const row = Math.floor((i + 1) / 3), col = (i + 1) % 3;
      const a = makeRider({
        name: rv.name, mass: rv.mass, ftp, s: -row * 2.2, o: -1 + col * 1.15,
        ai: { climb: rv.climb, flat: rv.flat, aggr: rv.aggr, mood: 1, t: 0, attack: 0, lane: 0.3 + (i % 3) * 0.6, mu: 0.5 + Math.random() * 0.1 },
      });
      a.color = rv.jersey;
      game.riders.push(a);
      const m = new RiderModel({ jersey: rv.jersey, helmet: rv.helmet, bike: i % 2 ? "#e9e9e9" : "#202020" });
      game.models.push(m);
      scene.add(m.root);
    });
    player.s = 0; player.o = 1.3;
  }
  // fantôme du record
  const rec = readLS("vv-records", {})[recordKey(r.id, settings.reverse)];
  if (settings.mode === "tt" && rec && rec.ghost) {
    game.ghost = { data: rec.ghost, s: 0, o: 1.3, isPlayer: false, ghost: true, color: "#fff", name: "Fantôme", time: rec.time };
    game.ghostModel = new RiderModel({ jersey: "#ffffff", ghost: true });
    scene.add(game.ghostModel.root);
  }
  game.ghostRec = [];
  game.recT = 0;
  game.t = 0;
  game.nextEvent = 0;
  game.lastKm = 0;
  game.camMode = game.camMode || 0;
  $("h-route").textContent = r.def.name + (settings.reverse ? " (sens inverse)" : "");
  $("h-poslabel").textContent = settings.mode === "race" ? "Place" : settings.mode === "tt" ? "Écart" : "Vitesse moy.";
  showCamHint();
  game.state = "countdown";
  game.countdown = settings.mode === "free" ? 0.01 : 3.99;
  game.lastCount = 4;
  placeCameraImmediately();
}

function showMenu() {
  clearRiders();
  game.state = "menu";
  game.menuSnap = true;
  $("hud").hidden = true;
  $("touch").hidden = true;
  $("menu").hidden = false;
  renderRouteList();
  requestAnimationFrame(() => drawProfile($("menu-profile"), game.route, null));
}

function setPaused(p) {
  if (p && (game.state === "ride" || game.state === "countdown")) {
    game.prevState = game.state;
    game.state = "paused";
    $("pause").hidden = false;
  } else if (!p && game.state === "paused") {
    game.state = game.prevState;
    $("pause").hidden = true;
  }
}

let toastTimer = 0;
function toast(text, dur = 3.5) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("on");
  toastTimer = dur;
}

function finish() {
  const p = game.player;
  game.state = "finished";
  const r = game.route;
  const avgP = p.sumP / Math.max(1, p.time);
  const avgV = r.length / Math.max(1, p.time);
  const climb = Math.max(0, r.y[r.n - 1] - r.y[0]);
  const vam = (climb / Math.max(1, p.time)) * 3600;
  const key = recordKey(r.id, settings.reverse);
  const recs = readLS("vv-records", {});
  const old = recs[key];
  let isRecord = false;
  if (settings.mode !== "free" && (!old || p.time < old.time)) {
    isRecord = true;
    recs[key] = { time: p.time, avgP, date: new Date().toISOString(), ghost: game.ghostRec };
    writeLS("vv-records", recs);
  }
  $("r-title").textContent = isRecord ? "Nouveau record !" : "Arrivée !";
  $("r-sub").textContent = `${r.def.name} · ${fmt1(r.length / 1000)} km · ${old && !isRecord ? `record : ${fmtTime(old.time)}` : ""}`;
  const stats = [
    ["Temps", fmtTime(p.time)],
    ["Vitesse moy.", `${fmt1(avgV * 3.6)} km/h`],
    ["Puissance moy.", `${fmtInt(avgP)} W`],
    ["W/kg moyen", fmt1(avgP / settings.mass)],
    [climb > 100 ? "VAM" : "Vitesse max", climb > 100 ? `${fmtInt(vam)} m/h` : `${fmt1(p.maxV * 3.6)} km/h`],
    ["Énergie", `${fmtInt(p.energy)} kJ`],
  ];
  $("r-stats").innerHTML = stats.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("");
  const table = $("r-table");
  table.innerHTML = "";
  if (settings.mode === "race") {
    const rows = game.riders.map((x) => {
      let t = x.finished ? x.finishTime : x.time + (r.length - x.s) / Math.max(1, (x.s / Math.max(1, x.time)));
      return { name: x.name, t, me: x.isPlayer };
    }).sort((a, b) => a.t - b.t);
    const best = rows[0].t;
    table.innerHTML = rows.map((x, i) => `<tr class="${x.me ? "me" : ""}"><td>${i + 1}. ${x.name}</td><td>${i ? "+" + fmtTime(x.t - best) : fmtTime(x.t)}</td></tr>`).join("");
  }
  setTimeout(() => { if (game.state === "finished") $("results").hidden = false; }, 1800);
  sound.beep(880, 0.4, 0.25);
}

// ------------------------------------------------------------ commandes
const keys = new Set();
const touchKeys = new Set();
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  const p = game.player;
  if (e.code === "KeyC" && game.player) { game.camMode = (game.camMode + 1) % CAMS.length; showCamHint(); }
  if ((e.code === "Escape" || e.code === "KeyP") && game.state !== "menu") setPaused(game.state !== "paused");
  if (e.code === "KeyE" && p) p.tuck = !p.tuck;
  if (e.code === "KeyM") { settings.sound = !settings.sound; sound.setEnabled(settings.sound); saveSettings(); }
  if ((e.code === "ArrowUp" || e.code === "KeyW") && p) p.target = Math.min(1500, p.target + 10);
  if ((e.code === "ArrowDown" || e.code === "KeyS") && p) p.target = Math.max(0, p.target - 10);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
addEventListener("wheel", (e) => {
  if (game.player && game.state !== "menu") game.player.target = Math.max(0, Math.min(1500, game.player.target - Math.sign(e.deltaY) * 10));
}, { passive: true });
document.querySelectorAll("#touch button").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    sound.start();
    if (k === "pause") return setPaused(game.state !== "paused");
    touchKeys.add(k);
    if (k === "up" && game.player) game.player.target = Math.min(1500, game.player.target + 10);
    if (k === "down" && game.player) game.player.target = Math.max(0, game.player.target - 10);
  });
  const up = () => touchKeys.delete(k);
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  b.addEventListener("pointerleave", up);
});
canvas.addEventListener("click", () => { if (game.state === "ride" && game.player) { game.camMode = (game.camMode + 1) % CAMS.length; showCamHint(); } });

function showCamHint() { $("h-cam").textContent = `Caméra : ${CAMS[game.camMode]} (C)`; }

let holdT = 0;
function readControls(dt) {
  const p = game.player;
  if (!p) return;
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find((x) => x) : null;
  const k = (c) => keys.has(c);
  const up = k("ArrowUp") || k("KeyW") || touchKeys.has("up");
  const down = k("ArrowDown") || k("KeyS") || touchKeys.has("down");
  if (up || down) {
    holdT += dt;
    if (holdT > 0.35) p.target = Math.max(0, Math.min(1500, p.target + (up ? 1 : -1) * 120 * dt));
  } else holdT = 0;
  p.sprint = k("ShiftLeft") || k("ShiftRight") || touchKeys.has("sprint");
  p.brake = k("Space") || touchKeys.has("brake") ? 1 : 0;
  let steer = (k("ArrowRight") || k("KeyD") || touchKeys.has("right") ? 1 : 0) - (k("ArrowLeft") || k("KeyA") || touchKeys.has("left") ? 1 : 0);
  if (pad) {
    const rt = pad.buttons[7]?.value || 0, lt = pad.buttons[6]?.value || 0;
    if (rt > 0.05) p.target = Math.round((rt * settings.ftp * 1.3) / 5) * 5;
    if (lt > 0.05) p.brake = lt;
    if (Math.abs(pad.axes[0]) > 0.15) steer = pad.axes[0];
    if (pad.buttons[0]?.pressed) p.sprint = true;
  }
  p.oTarget = Math.max(-3.4, Math.min(3.4, p.o + steer * 1.8));
  p.o += steer * 1.8 * dt;
  if (settings.assist && !p.brake) {
    const g = game.route.sample(p.s).grade;
    if (g < -0.045 && p.target < settings.ftp * 0.3 && p.v > 10) p.tuck = true;
    else if (g > -0.02 && p.tuck && !keys.has("KeyE")) p.tuck = false;
  }
}

// ------------------------------------------------------------ boucle
let last = performance.now();
let fpsAcc = 0, fpsN = 0, fpsT = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function loop(now) {
  requestAnimationFrame(loop);
  const dtReal = Math.min(0.1, (now - last) / 1000);
  last = now;
  autoQuality(dtReal);
  const dt = Math.min(dtReal, 0.05);

  if (game.state === "menu") {
    menuCamera(dt);
  } else if (game.state === "countdown") {
    game.countdown -= dt;
    const n = Math.ceil(game.countdown);
    if (n !== game.lastCount && n > 0) { $("countdown").textContent = n; sound.beep(520, 0.15); game.lastCount = n; }
    if (game.countdown <= 0) {
      game.state = "ride";
      $("countdown").textContent = settings.mode === "free" ? "" : "Partez !";
      sound.beep(1040, 0.35);
      setTimeout(() => ($("countdown").textContent = ""), 900);
      toast(`${settings.reverse ? DEST[game.route.id] : ORIGIN[game.route.id]} → ${settings.reverse ? ORIGIN[game.route.id] : DEST[game.route.id]}\n${fmt1(game.route.length / 1000)} km · D+ ${fmtInt(game.route.gain)} m`, 4);
    }
    poseRiders(0);
    rideCamera(dt);
    updateHud(dt);
  } else if (game.state === "ride" || game.state === "finished") {
    simulate(dt);
    poseRiders(dt);
    rideCamera(dt);
    updateHud(dt);
  }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $("toast").classList.remove("on"); }

  const q = QUALITY[qKey()];
  terrain.update(camera.position, q.lod);
  forest.update(camera.position, q.treeDist);
  buildings.update(camera.position, q.bDist);
  sky.position.copy(camera.position);
  updateFog(camera.position.y);
  renderer.render(scene, camera);
}

function autoQuality(dt) {
  fpsAcc += dt; fpsN++; fpsT += dt;
  if (fpsT < 2) return;
  const fps = fpsN / fpsAcc;
  fpsAcc = 0; fpsN = 0; fpsT = 0;
  if (settings.quality !== "auto") return;
  const maxPr = Math.min(devicePixelRatio, 1.5);
  if (fps < 40 && pixelRatio > 0.5) pixelRatio = Math.max(0.5, pixelRatio - 0.15);
  else if (fps > 57 && pixelRatio < maxPr) pixelRatio = Math.min(maxPr, pixelRatio + 0.1);
  else return;
  renderer.setPixelRatio(pixelRatio);
}

function simulate(dt) {
  const r = game.route;
  const p = game.player;
  if (game.state === "ride") readControls(dt);
  else { p.target = 60; p.brake = p.v > 4 ? 0.4 : 0; p.sprint = false; }
  computeDrafts(game.riders);
  for (const x of game.riders) {
    if (x.finished && !x.isPlayer) { x.v *= 0.98; x.s += x.v * dt; continue; }
    if (x.ai) aiThink(x, r, game.riders, dt);
    const sp = step(x, r, game.env, dt, settings.assist);
    // dérapage en virage trop rapide
    const lim = x.isPlayer ? 1.0 : 2;
    if (x.latG > 0.75 && x.isPlayer && !settings.assist) {
      x.o -= Math.sign(sp.curv) * (x.latG - 0.75) * 3 * dt;
      warn("Trop vite ! Freinez", "red");
    }
    if (x.isPlayer && x.latG > lim && !settings.assist) crash(x, "Chute ! Trop vite dans le virage");
    x.offRoad = Math.abs(x.o) > 3.3;
    if (x.isPlayer && Math.abs(x.o) > 4.2) {
      if (x.v > 9) crash(x, "Chute ! Sortie de route");
      x.o = Math.sign(x.o) * 4.2;
    }
    // pas de traversée des autres coureurs
    for (const o of game.riders) {
      if (o === x) continue;
      const gap = o.s - x.s;
      if (gap > 0 && gap < 1.9 && Math.abs(o.o - x.o) < 0.55 && x.v > o.v) {
        x.v = o.v;
        x.s = Math.min(x.s, o.s - 1.9 + 0.01);
      }
    }
    if (!x.finished && x.s >= r.length) {
      x.finished = true;
      x.finishTime = x.time;
      if (x.isPlayer) finish();
    }
  }
  // fantôme
  if (game.ghost) {
    const d = game.ghost.data;
    const t = p.time;
    const i = Math.min(d.length - 1, Math.floor(t / 0.5));
    const j = Math.min(d.length - 1, i + 1);
    const f = (t / 0.5) - i;
    game.ghost.s = d[i][0] + (d[j][0] - d[i][0]) * Math.min(1, f);
    game.ghost.o = d[i][1];
  }
  if (game.state === "ride") {
    game.recT += dt;
    if (game.recT >= 0.5) { game.recT -= 0.5; game.ghostRec.push([Math.round(p.s * 10) / 10, Math.round(p.o * 10) / 10]); }
    // événements le long du parcours
    while (game.nextEvent < game.events.length && game.events[game.nextEvent].s <= p.s) {
      toast(game.events[game.nextEvent].text);
      game.nextEvent++;
    }
    const km = Math.floor(p.s / 1000);
    if (km > game.lastKm && p.s < r.length - 300) {
      game.lastKm = km;
      const g = r.avgGrade(p.s, p.s + 1000) * 100;
      toast(`Kilomètre ${km}\nprochain km : ${fmt1(g)} %`, 3);
    }
    if (p.wbal < p.wPrime * 0.08 && p.power > p.cp * 0.9) warn("Dans le dur ! Réserve vide", "amber");
  }
}

let warnT = 0;
function warn(text, kind) {
  const w = $("warn");
  w.textContent = text;
  w.className = `warn on ${kind === "amber" ? "amber" : ""}`;
  warnT = 0.6;
}

function crash(x, msg) {
  if (x.crashed > 0) return;
  x.crashed = 3.5;
  x.v = 0;
  x.o = 1.3;
  x.brake = 0;
  x.tuck = false;
  toast(`${msg}\n(3 secondes perdues)`, 3);
  sound.crash();
}

const pose = {};
function poseRiders(dt) {
  const r = game.route;
  const all = [...game.riders.map((x, i) => [x, game.models[i]])];
  if (game.ghost && game.ghostModel) all.push([game.ghost, game.ghostModel]);
  for (const [x, m] of all) {
    const p = r.sample(Math.max(0, Math.min(r.length, x.s)), pose);
    const rx = -p.dz, rz = p.dx;
    m.root.position.set(p.x + rx * x.o, p.y + 0.1, p.z + rz * x.o);
    m.root.rotation.y = Math.atan2(p.dx, p.dz);
    const v = x.ghost ? 8 : x.v;
    const lean = x.crashed > 0 ? 1.35 : Math.atan((v * v * p.curv) / G) * 0.9;
    m.animate(dt, v, x.ghost ? 85 : x.cadence, x.ghost ? 0 : x.posture, lean, Math.atan(p.grade));
    m.root.visible = !(x.isPlayer && game.camMode === 1);
  }
}

function placeCameraImmediately() {
  rideCamera(1, true);
}

function rideCamera(dt, snap = false) {
  const p = game.player;
  const r = game.route;
  if (!p) return;
  const me = r.sample(Math.max(0, p.s));
  const rx = -me.dz, rz = me.dx;
  const px = me.x + rx * p.o, pz = me.z + rz * p.o, py = me.y + 0.1;
  const mode = game.camMode;
  let want, look;
  if (mode === 0) {
    const b = r.sample(Math.max(0, p.s - 6.5));
    want = tmpV.set(b.x + (-b.dz) * p.o * 0.8, b.y + 2.4, b.z + b.dx * p.o * 0.8);
    const a = r.sample(p.s + 12);
    look = camLook.set((px * 2 + a.x) / 3, py + 1.2 + (a.y - me.y) * 0.3, (pz * 2 + a.z) / 3);
  } else if (mode === 1) {
    want = tmpV.set(px + me.dx * 0.25, py + 1.55 + (p.posture < 0 ? -0.2 : 0), pz + me.dz * 0.25);
    const a = r.sample(p.s + 25);
    look = camLook.set(a.x + (-a.dz) * p.o, a.y + 1.2, a.z + a.dx * p.o);
  } else if (mode === 2) {
    // moto TV qui précède le coureur, de trois quarts
    const a = r.sample(p.s + 9);
    want = tmpV.set(a.x + (-a.dz) * -2.5, a.y + 1.8, a.z + a.dx * -2.5);
    look = camLook.set(px, py + 1.0, pz);
  } else {
    const b = r.sample(Math.max(0, p.s - 45));
    want = tmpV.set(b.x - b.dz * 25, Math.max(b.y, me.y) + 38, b.z + b.dx * 25);
    look = camLook.set(px, py, pz);
  }
  const ground = hf.height(want.x, want.z) + 1.2;
  if (want.y < ground) want.y = ground;
  if (snap || mode === 1) camPos.copy(want);
  else camPos.lerp(want, 1 - Math.exp(-dt * (mode === 3 ? 2 : 6)));
  const g2 = hf.height(camPos.x, camPos.z) + 1.2;
  if (camPos.y < g2) camPos.y = g2;
  if (camPos.distanceTo(want) > 60) camPos.copy(want);
  camera.position.copy(camPos);
  camera.lookAt(look);
  camera.fov = mode === 1 ? 75 : 62;
  camera.updateProjectionMatrix();
}

function menuCamera(dt) {
  const r = game.route;
  game.menuT += dt;
  const s = (game.menuT * 35) % r.length;
  const p = r.sample(s);
  const a = r.sample(Math.min(r.length, s + 500));
  const side = 170;
  const want = tmpV.set(p.x - p.dz * side, p.y + 140, p.z + p.dx * side);
  const ground = hf.height(want.x, want.z) + 60;
  if (want.y < ground) want.y = ground;
  const snap = game.menuSnap;
  game.menuSnap = false;
  if (snap) camPos.copy(want);
  else camPos.lerp(want, 1 - Math.exp(-dt * 0.8));
  camera.position.copy(camPos);
  camLook.lerp(tmpV.set(a.x, a.y, a.z), snap ? 1 : 1 - Math.exp(-dt * 0.8));
  camera.lookAt(camLook);
}

// ------------------------------------------------------------ HUD
let hudT = 0;
function updateHud(dt) {
  const p = game.player;
  const r = game.route;
  if (warnT > 0) { warnT -= dt; if (warnT <= 0) $("warn").classList.remove("on"); }
  // avertissement de virage
  if (game.state === "ride" && p.v > 8) {
    const safe = r.safeSpeedAhead(p.s, 80, 0.6);
    if (safe.dist > 5 && p.v > safe.v + 1.5 && warnT <= 0.1) warn(`Virage serré dans ${Math.round(safe.dist)} m · ${Math.round(safe.v * 3.6)} km/h`, "amber");
  }
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.1;
  const sp = r.sample(Math.min(p.s, r.length));
  $("h-speed").textContent = Math.round(p.v * 3.6);
  $("h-power").textContent = Math.round(p.power);
  const ratio = p.power / settings.ftp;
  const z = ZONES.find(([lim]) => ratio < lim);
  const zone = $("h-zone");
  zone.textContent = p.tuck ? "AÉRO" : p.sprint ? "ATTAQUE" : z[1];
  zone.style.background = p.tuck ? "#7fd3ff" : z[2];
  $("h-target").textContent = Math.round(p.target);
  $("h-wkg").textContent = fmt1(p.power / settings.mass);
  $("h-wbal").style.width = `${(p.wbal / p.wPrime) * 100}%`;
  $("h-cad").textContent = Math.round(p.cadence);
  $("h-gear").textContent = gearLabel(p);
  $("h-hr").textContent = Math.round(p.hr);
  const g = sp.grade * 100;
  const gEl = $("h-grade");
  gEl.textContent = `${g > 0 ? "+" : ""}${fmt1(g)} %`;
  gEl.style.color = gradeColor(sp.grade);
  $("h-alt").textContent = `${fmtInt(sp.y)} m`;
  $("h-left").textContent = `${fmt1(Math.max(0, r.length - p.s) / 1000)} km`;
  $("h-time").textContent = fmtTime(p.time);
  if (settings.mode === "race") {
    const pos = 1 + game.riders.filter((x) => !x.isPlayer && x.s > p.s).length;
    $("h-pos").textContent = `${pos}e / ${game.riders.length}`;
  } else if (settings.mode === "tt" && game.ghost) {
    const d = p.s - game.ghost.s;
    $("h-pos").textContent = `${d >= 0 ? "+" : "−"}${fmtInt(Math.abs(d))} m`;
    $("h-pos").style.color = d >= 0 ? "#7fdc8f" : "#ff8a8a";
  } else {
    $("h-pos").textContent = `${fmt1((p.s / Math.max(1, p.time)) * 3.6)} km/h`;
  }
  $("h-draft").classList.toggle("on", p.draft > 0.08);
  $("h-draft").textContent = `Dans la roue · −${Math.round(p.draft * 100)} % d'effort aéro`;
  $("h-road").textContent = r.roadName(p.s) || "";
  const town = townAt(r, game.crossings, p.s);
  $("h-town").textContent = town ? town : "";
  const list = game.ghost ? [...game.riders, game.ghost] : game.riders;
  drawProfile($("profile"), r, list);
  drawMinimap();
  const air = p.v - (game.env.windX * sp.dx + game.env.windZ * sp.dz);
  sound.update(0.1, air, p.power < 5, p.v);
}
