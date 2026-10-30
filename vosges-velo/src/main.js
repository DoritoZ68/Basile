import * as THREE from "three";
import { loadData } from "./data.js";
import { Heightfield, Terrain, makeTerrainMaterial, buildOuterTerrain } from "./terrain.js";
import { Ground, routeLine, networkLine, makeRoadMaterials, buildRoutes, NetworkCells, onRoute, MASK_RANGE, DISCARD } from "./ground.js";
import { RoadIndex, Forest, Streamer, buildBuildings, buildLandmarks, buildSky, textSign, signPost, gantry, Crowd, roadPaint } from "./scenery.js";
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
  mass: 72, ftp: 230, jersey: "#d8323c", level: "amateur", bike: "route",
  time: "matin", weather: "beau", wind: "none", timescale: 1,
  quality: "auto", sound: true,
};
const settings = { ...DEFAULTS, ...readLS("vv-settings", {}) };
function readLS(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
const saveSettings = () => writeLS("vv-settings", settings);

// bas : pensé pour les cartes graphiques anciennes à 512 Mo (Radeon HD 6000,
// Intel HD 3000/4000…) : textures réduites, pas d'ombres, horizon plus proche
const QUALITY = {
  bas: { netR: 750, budget: 5, treeNear: 90, mask: 4096, discard: 520, pr: 0.85, lod: 0.5, trees: 90, treeDist: 320, density: 0.5, bDist: 450, bRadius: 180, ortho: 2048, outer: 1024, shadow: 0, fogFar: 15000 },
  moyen: { netR: 1100, budget: 7, treeNear: 150, mask: 4096, discard: 880, pr: 1, lod: 0.85, trees: 170, treeDist: 700, density: 0.8, bDist: 1300, bRadius: 300, ortho: 4096, outer: 2048, shadow: 1024, fogFar: 42000 },
  eleve: { netR: 1500, budget: 9, treeNear: 230, mask: 4096, discard: 1260, pr: 1.5, lod: 1.25, trees: 240, treeDist: 1100, density: 1, bDist: 2600, bRadius: 400, ortho: 4096, outer: 2048, shadow: 2048, fogFar: 42000 },
};

// carte graphique : les modèles anciens ou à peu de mémoire passent en « bas »
function detectGpu() {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return { name: "", weak: true };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const weak =
      /Radeon (HD )?[2-7]\d{3}|Radeon (X|R[5-9] M?2)|FirePro|Intel.*(HD|GMA|Iris)( Graphics)? ?(\d{3,4})?\b|GeForce (\d{3}M?|G[T]?S? ?[1-7]\d{2}M?)\b|Quadro|Mali|Adreno|PowerVR|SwiftShader|llvmpipe|Software/i.test(name) &&
      !/Iris (Pro|Xe)|Intel.*(UHD|Arc)/i.test(name);
    return { name, weak };
  } catch {
    return { name: "", weak: true };
  }
}
const GPU = detectGpu();
let autoTier = GPU.weak ? "bas" : "moyen";
const qKey = () => (settings.quality === "auto" ? autoTier : settings.quality);

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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: qKey() !== "bas", powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
let pixelRatio = Math.min(devicePixelRatio, QUALITY[qKey()].pr);
renderer.setPixelRatio(pixelRatio);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 60000);
scene.fog = new THREE.Fog(0xcfe0ef, 2000, 16000);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5b5544, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
scene.add(hemi, sun, sun.target);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
// ombres portées du soleil dans un cadre de 90 m qui suit la caméra
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
sun.shadow.camera.right = sun.shadow.camera.top = 45;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 900;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
const sunDir = new THREE.Vector3(0.3, 0.6, 0.2).normalize();
function applyShadows() {
  const size = QUALITY[qKey()].shadow;
  const on = size > 0;
  if (sun.shadow.map && sun.shadow.mapSize.x !== size) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  sun.shadow.mapSize.set(size || 512, size || 512);
  if (renderer.shadowMap.enabled !== on) {
    renderer.shadowMap.enabled = on;
    sun.castShadow = on;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  }
  sun.castShadow = on;
}
const sky = buildSky();
scene.add(sky);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const sound = new Sound();
sound.setEnabled(settings.sound);

let D, hf, ground, roads, roadMats, terrain, forest, roadIndex, netStream, buildStream, treeStream, signs = new THREE.Group();
// distance (m) jusqu'à laquelle le relief grossier est masqué le long des routes
const discardU = { value: 1600 };
scene.add(signs);
const crowd = new Crowd();
scene.add(crowd.group);

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
const START_S = 12;
const CAMS = ["Poursuite", "Première personne", "Moto TV", "Drone"];

// ------------------------------------------------------------ chargement
(async function boot() {
  try {
    D = await loadData((p, msg) => { $("loadbar").style.width = `${p * 100}%`; $("loadmsg").textContent = msg; });
    $("loadmsg").textContent = "Construction du relief…";
    await frame();
    hf = new Heightfield(D.meta, D.terrain);
    // sol fin le long des routes ; le relief grossier y est masqué
    // parcours : portions en agglomération (trottoirs plutôt qu'accotements)
    const routeLines = D.routes.map((r) => {
      const urbanV = new Uint8Array(r.x.length);
      for (let k = 0; k < r.x.length; k++) for (const t of D.towns) if (Math.hypot(r.x[k] - t.x, r.z[k] - t.z) < t.r * 0.75) { urbanV[k] = 1; break; }
      return routeLine({ ...r, urbanV });
    });
    const netLines = prepareNetwork(D.network, hf, new Ground(hf, routeLines));
    ground = new Ground(hf, [...routeLines, ...netLines]);
    roadIndex = ground;
    const Q = QUALITY[qKey()];
    $("loadmsg").textContent = "Raccord des routes au relief…";
    await frame();
    const mask = ground.buildMask(Q.mask);
    const veg = new THREE.Texture(D.vegImage);
    veg.needsUpdate = true;
    const mat = makeTerrainMaterial(D.ortho, Q.ortho, renderer, { mask, veg, maskRange: MASK_RANGE, discard: DISCARD, discardDist: discardU });
    terrain = new Terrain(hf, mat);
    scene.add(terrain.group);
    scene.add(buildOuterTerrain(D.outerMeta, D.outer, hf, makeTerrainMaterial(D.outerImg, QUALITY[qKey()].outer, renderer)));
    $("loadbar").style.width = "70%";
    $("loadmsg").textContent = "Routes et bâtiments…";
    await frame();
    roadMats = makeRoadMaterials(makeTerrainMaterial(D.ortho, Q.ortho, renderer, { texture: mat.map, veg }), renderer);
    roads = buildRoutes(ground, routeLines.length, roadMats);
    scene.add(roads.group);
    // rues, routes et pistes cyclables, bâtiments, arbres : par cases autour du cycliste
    const netCells = new NetworkCells(ground, routeLines.length, 500);
    netStream = new Streamer(500, (i, j) => netCells.build(i, j, roadMats));
    const bCells = new Map();
    for (const b of D.buildings) {
      const k = `${Math.floor(b[2][0] / 500)},${Math.floor(b[2][1] / 500)}`;
      if (!bCells.has(k)) bCells.set(k, []);
      bCells.get(k).push(b);
    }
    buildStream = new Streamer(500, (i, j) => {
      const list = bCells.get(`${i},${j}`);
      return list ? buildBuildings(list, ground) : null;
    });
    scene.add(netStream.group, buildStream.group);
    scene.add(buildLandmarks(D.landmarks, ground, roadIndex));
    $("loadbar").style.width = "85%";
    $("loadmsg").textContent = "Plantation des sapins…";
    await frame();
    forest = new Forest(D, ground);
    treeStream = new Streamer(250, (i, j) => forest.buildCell(i, j, 250, QUALITY[qKey()].density));
    scene.add(treeStream.group);
    $("credits").textContent = D.meta.attribution;
    applyConditions();
    applyShadows();
    buildMenu();
    selectRoute(settings.route, settings.reverse);
    $("loading").hidden = true;
    showMenu();
    requestAnimationFrame(loop);
    window.__vv = { THREE, scene, camera, game, hf, ground, terrain, renderer, settings, simulate, keys, look, placePlayerOnRoad, rideCamera, poseRiders };
  } catch (e) {
    console.error(e);
    $("loadmsg").textContent = "Erreur de chargement : " + e.message;
  }
})();

function frame() { return new Promise((r) => requestAnimationFrame(() => r())); }

// Réseau BD TOPO / pistes cyclables (altitudes IGN déjà calculées tous les
// 10 m par tools/fetch_network.py) : raccord exact aux parcours qui empruntent
// la même chaussée, pour qu'il n'y ait ni marche ni double route
function prepareNetwork(list, hf, routeGround) {
  const out = [];
  for (const n of list) {
    if (n.x.length < 2) continue;
    const y = Float32Array.from(n.y, (v, k) => (Number.isNaN(v) ? hf.height(n.x[k], n.z[k]) : v));
    const L = networkLine(n.cls, n.w, n.x, n.z, y, n.name, n.flags);
    const n2 = L.x.length, cov = new Uint8Array(n2);
    for (let k = 0; k < n2; k++) {
      const q = routeGround.road(L.x[k], L.z[k], 6);
      if (q && Math.abs(q.y - y[k]) < 4 && (q.edge < 0 || onRoute(routeGround, L, k, 1e9))) y[k] = q.y;
      cov[k] = onRoute(routeGround, L, k, 1e9) ? 1 : 0;
    }
    // les portions qui doublent un parcours sont retirées du réseau : la
    // chaussée du parcours les remplace (ni double route, ni sol fantôme)
    let a = 0;
    while (a < n2) {
      while (a < n2 && cov[a]) a++;
      if (a >= n2) break;
      let b = a;
      while (b < n2 && !cov[b]) b++;
      const i0 = Math.max(0, a - 1), i1 = Math.min(n2, b + 1);
      if (i1 - i0 >= 2) out.push(i0 === 0 && i1 === n2 ? L : networkLine(n.cls, n.w, n.x.slice(i0, i1), n.z.slice(i0, i1), y.slice(i0, i1), n.name, n.flags));
      a = b;
    }
  }
  return out;
}

// ------------------------------------------------------------ conditions
function applyConditions() {
  const T = {
    matin: { dir: [0.75, 0.32, 0.45], sun: 0xffe2bf, si: 1.9, hs: 0xa9c8ec, hg: 0x5a5040, hi: 1.35, top: 0x4a82c8, hor: 0xf1dcc0 },
    midi: { dir: [0.15, 0.9, 0.4], sun: 0xffffff, si: 1.9, hs: 0xc3dbff, hg: 0x5b5544, hi: 1.45, top: 0x3a76c4, hor: 0xcfe0ef },
    soir: { dir: [-0.8, 0.22, 0.4], sun: 0xffb27a, si: 1.8, hs: 0x9db2d8, hg: 0x5a4636, hi: 1.2, top: 0x35558f, hor: 0xf3b07a },
  }[settings.time];
  const dir = new THREE.Vector3(...T.dir).normalize();
  sunDir.copy(dir);
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
  game.fogBase = { near: 3000, far: 42000 };
  if (settings.weather === "voile") {
    u.haze.value = 0.55;
    sun.intensity *= 0.6;
    hemi.intensity *= 1.1;
    fogCol.lerp(new THREE.Color(0xc9ced3), 0.6);
    u.horizon.value.copy(fogCol);
    game.fogBase = { near: 800, far: 14000 };
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
    scene.fog.far = Math.min(f.far, QUALITY[qKey()].fogFar);
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
  const sens = r.lastChild;
  seg(r, "Mode", "mode", [["race", "Course"], ["tt", "Contre-la-montre"], ["free", "Balade"], ["open", "Libre"]], () => updateModeUi());
  const note = document.createElement("p");
  note.className = "opt-note";
  note.textContent = "Course : 5 adversaires, l'aspiration compte. Contre-la-montre : seul face au fantôme de votre record. Balade : un parcours sans chrono. Libre : apparaissez où vous voulez et roulez sur toutes les routes, rues et pistes cyclables de la zone.";
  r.appendChild(note);
  // choix du point de départ (mode libre)
  const towns = $("spawn-towns");
  for (const t of D.towns) {
    const b = document.createElement("button");
    b.textContent = t.name;
    b.onclick = () => { settings.spawn = { x: t.x, z: t.z, name: t.name }; saveSettings(); drawSpawn(); };
    towns.appendChild(b);
  }
  const sm = $("spawn-map");
  sm.addEventListener("click", (e) => {
    const rect = sm.getBoundingClientRect(), m = D.meta;
    const u = (e.clientX - rect.left) / rect.width, v = (e.clientY - rect.top) / rect.height;
    settings.spawn = { x: m.x_min + u * (m.x_max - m.x_min), z: m.z_min + v * (m.z_max - m.z_min), name: "" };
    saveSettings();
    drawSpawn();
  });
  game.sensRow = sens;
  updateModeUi();

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
  seg(rd, "Vélo", "bike", [["route", "Route"], ["clm", "Contre-la-montre"]]);
  const bn = document.createElement("p");
  bn.className = "opt-note";
  bn.textContent = "Route : 7,4 kg, maniable, à l'aise partout. Contre-la-montre : 8,6 kg, position allongée sur les prolongateurs (environ 25 % de traînée en moins sur le plat), mais moins maniable en virage et moins efficace dans les fortes pentes.";
  rd.appendChild(bn);
  seg(rd, "Adversaires", "level", [["cyclo", "Cyclosportifs"], ["amateur", "Amateurs"], ["elite", "Élite"]]);
  const an = document.createElement("p");
  an.className = "opt-note";
  an.textContent = "Aucune assistance : vous dirigez le vélo en le penchant. Trop penché pour l'adhérence, ou trop vite dans un virage, c'est la chute.";
  rd.appendChild(an);

  const w = $("opts-world");
  seg(w, "Heure", "time", [["matin", "Matin"], ["midi", "Midi"], ["soir", "Soir"]], applyConditions);
  seg(w, "Météo", "weather", [["beau", "Grand beau"], ["voile", "Voilé"], ["brouillard", "Brouillard sur les crêtes"]], applyConditions);
  seg(w, "Temps", "timescale", [[1, "Réel"], [2, "Accéléré ×2"], [4, "×4"]]);
  seg(w, "Vent", "wind", [["none", "Nul"], ["ouest", "Ouest 13 km/h"], ["ouest-fort", "Ouest 27 km/h"], ["bise", "Bise de NE"]], applyConditions);
  const wn = document.createElement("p");
  wn.className = "opt-note";
  wn.textContent = "Une vraie montée du Grand Ballon dure environ une heure : le temps accéléré la ramène à 15-30 minutes sans changer la physique. Le vent agit selon l'orientation réelle de chaque portion de route. L'air plus léger en altitude réduit aussi la traînée.";
  w.appendChild(wn);

  const g = $("opts-gfx");
  seg(g, "Graphismes", "quality", [["auto", "Auto"], ["bas", "Bas"], ["moyen", "Moyen"], ["eleve", "Élevé"]], () => {
    pixelRatio = Math.min(devicePixelRatio, QUALITY[qKey()].pr);
    renderer.setPixelRatio(pixelRatio);
    treeStream.clear();
    applyShadows();
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
  $("relocate").onclick = () => { $("pause").hidden = true; showMenu(); };
  $("r-again").onclick = () => { $("results").hidden = true; startRide(); };
  $("r-menu").onclick = () => { $("results").hidden = true; showMenu(); };
}

function drawSpawn() {
  const sp = settings.spawn || D.towns[0];
  drawFreeMap($("spawn-map"), sp.x, sp.z, 0, false);
  $("spawn-towns").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.textContent === sp.name));
}

function updateModeUi() {
  const open = settings.mode === "open";
  $("route-list").hidden = open;
  $("menu-profile").hidden = open;
  $("spawn").hidden = !open;
  if (game.sensRow) game.sensRow.hidden = open;
  if (open) requestAnimationFrame(drawSpawn);
  else requestAnimationFrame(() => drawProfile($("menu-profile"), game.route, null));
}

function routeStats(def, reverse) {
  const r = new Route(def, reverse);
  let maxG = 0;
  for (let s = 0; s < r.length - 500; s += 100) maxG = Math.max(maxG, r.avgGrade(s, s + 500));
  const climb = r.y[r.n - 1] - r.y[0];
  return { r, km: r.finish / 1000, gain: r.gain, avg: climb / r.length, maxG };
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
  const p0 = r.sample(START_S + 1), p1 = r.sample(r.finish);
  signs.add(gantry("DÉPART", p0, "#1d5c3b"));
  signs.add(gantry("ARRIVÉE", p1, "#c8102e"));
  const dest = settings.reverse ? ORIGIN[r.id] : DEST[r.id];
  const climbing = r.y[r.n - 1] - r.y[0] > 150;
  // bornes kilométriques façon panneaux de col
  for (let km = 1; km * 1000 < r.finish - 200; km++) {
    const s = km * 1000;
    const p = r.sample(s);
    const left = (r.finish - s) / 1000;
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
  // public : départ, arrivée et, en montée, les deux derniers kilomètres
  const spots = [{ s0: 0, s1: 60, density: 0.9 }, { s0: r.finish - 140, s1: r.finish + 25, density: 1 }];
  if (climbing) spots.push({ s0: r.finish - 2000, s1: r.finish - 140, density: 0.35 });
  crowd.build(r, spots);
  if (climbing) {
    const words = ["HOPP !", "ALLEZ", "HOPP HOPP", "COURAGE", "ALLEZ !", "HOPP !", "PLUS QUE 1 KM"];
    words.forEach((w, i) => {
      const s = w === "PLUS QUE 1 KM" ? r.finish - 1000 : r.finish - 1900 + i * 230;
      if (s > 50) signs.add(roadPaint(w, r.sample(s), (i % 2 ? -1 : 1) * 0.9));
    });
  }
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
  const pad = 8, top = 16, bot = 16;
  const y0 = route.minY - 20, y1 = route.maxY + 20;
  const X = (s) => pad + (s / route.length) * (w - pad * 2);
  const Y = (y) => h - bot - ((y - y0) / (y1 - y0)) * (h - top - bot);
  // le profil lui-même ne change pas : il est dessiné une fois puis recopié
  const key = `${route.id}${route.reverse}${cv.width}x${cv.height}`;
  if (cv._key === key && cv._cache) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(cv._cache, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawProfileMarkers(g, route, riders, X, Y);
    return;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
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
  const cache = document.createElement("canvas");
  cache.width = cv.width; cache.height = cv.height;
  cache.getContext("2d").drawImage(cv, 0, 0);
  cv._cache = cache;
  cv._key = key;
  drawProfileMarkers(g, route, riders, X, Y);
}

function drawProfileMarkers(g, route, riders, X, Y) {
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

// fond de carte de toute la zone : photo aérienne + réseau routier et cyclable
let areaMap = null;
function areaMapCanvas() {
  if (areaMap) return areaMap;
  const S = 1400, m = D.meta;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.drawImage(D.orthoSmall, 0, 0, S, S);
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(0, 0, S, S);
  const W = m.x_max - m.x_min, Dd = m.z_max - m.z_min;
  const X = (x) => ((x - m.x_min) / W) * S, Z = (z) => ((z - m.z_min) / Dd) * S;
  const styles = { 0: ["#f2c230", 1.6], 1: ["rgba(255,255,255,0.75)", 0.8], 2: ["#3ddc84", 1.8], 3: ["rgba(205,170,120,0.7)", 0.7] };
  for (const cls of [3, 1, 0, 2]) {
    g.strokeStyle = styles[cls][0];
    g.lineWidth = styles[cls][1];
    g.beginPath();
    for (const L of ground.lines) {
      if (L.route || L.cls !== cls) continue;
      g.moveTo(X(L.x[0]), Z(L.z[0]));
      for (let k = 1; k < L.x.length; k++) g.lineTo(X(L.x[k]), Z(L.z[k]));
    }
    g.stroke();
  }
  areaMap = { canvas: c, S, X, Z, W, Dd };
  return areaMap;
}

// dessine la carte de la zone : entière, ou centrée sur (x, z) sur span m
function drawFreeMap(cv, x, z, span, centered) {
  const A = areaMapCanvas(), m = D.meta;
  const dpr = Math.min(2, devicePixelRatio);
  const w = cv.clientWidth, h = cv.clientHeight || w;
  if (!w) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.save();
  g.beginPath();
  g.roundRect ? g.roundRect(0, 0, cv.width, cv.height, 12 * dpr) : g.rect(0, 0, cv.width, cv.height);
  g.clip();
  let sx = 0, sy = 0, sw = A.S, sh = A.S;
  if (centered) {
    sw = sh = (span / A.W) * A.S;
    sx = A.X(x) - sw / 2; sy = A.Z(z) - sh / 2;
  }
  g.fillStyle = "#1c2a22";
  g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(A.canvas, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  const k = cv.width / sw;
  const P = (wx, wz) => [(A.X(wx) - sx) * k, (A.Z(wz) - sy) * k];
  // noms des villages à taille fixe
  g.font = `600 ${11 * dpr}px system-ui, sans-serif`;
  g.fillStyle = "#fff";
  g.shadowColor = "#000";
  g.shadowBlur = 3 * dpr;
  for (const t of D.towns) {
    const [tx, ty] = P(t.x, t.z);
    if (tx > -60 && ty > -20 && tx < cv.width + 60 && ty < cv.height + 20) g.fillText(t.name, tx - g.measureText(t.name).width / 2, ty);
  }
  g.shadowBlur = 0;
  if (x !== undefined) {
    const [mx, my] = P(x, z);
    g.fillStyle = "#fff";
    g.strokeStyle = "#000";
    g.lineWidth = 2 * dpr;
    g.beginPath();
    if (centered && game.player) {
      const dx = Math.sin(game.player.yaw), dz = Math.cos(game.player.yaw);
      g.moveTo(mx + dx * 10 * dpr, my + dz * 10 * dpr);
      g.lineTo(mx - dz * 6 * dpr - dx * 5 * dpr, my + dx * 6 * dpr - dz * 5 * dpr);
      g.lineTo(mx + dz * 6 * dpr - dx * 5 * dpr, my - dx * 6 * dpr - dz * 5 * dpr);
      g.closePath();
    } else g.arc(mx, my, 7 * dpr, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
  return { sx, sy, sw, k };
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
  const player = makeRider({ name: "Vous", isPlayer: true, mass: settings.mass, ftp: settings.ftp, o: 1.3, s: START_S, bike: settings.bike });
  player.target = Math.round(settings.ftp * 0.7 / 5) * 5;
  player.color = settings.jersey;
  game.free = settings.mode === "open";
  if (game.free) {
    const sp = settings.spawn || D.towns[0];
    placePlayerFree(player, sp.x, sp.z);
    player.s = 0;
    game.lastTown = placeNames(player.x, player.z).town;
  } else placePlayerOnRoad(player, START_S, 1.3);
  game.player = player;
  game.riders.push(player);
  const pm = new RiderModel({ jersey: settings.jersey, helmet: settings.jersey === "#ffffff" ? "#222" : "#ffffff", type: settings.bike, bike: settings.bike === "clm" ? "#1d1f24" : "#202020" });
  game.models.push(pm);
  scene.add(pm.root);
  if (settings.mode === "race") {
    const base = LEVEL_WKG[settings.level];
    RIVALS.forEach((rv, i) => {
      const ftp = Math.round(rv.mass * base * rv.wkg);
      // grille de départ : le joueur occupe la première place à droite
      const slot = i + 1, row = Math.floor(slot / 3), lane = [1.3, 0.1, -1.1][slot % 3];
      const a = makeRider({
        name: rv.name, mass: rv.mass, ftp, s: START_S - row * 2.2, o: lane,
        ai: { climb: rv.climb, flat: rv.flat, aggr: rv.aggr, mood: 1, t: 0, attack: 0, lane: 0.3 + (i % 3) * 0.6, mu: 0.5 + Math.random() * 0.1 },
      });
      a.color = rv.jersey;
      game.riders.push(a);
      const m = new RiderModel({ jersey: rv.jersey, helmet: rv.helmet, bike: i % 2 ? "#e9e9e9" : "#202020" });
      game.models.push(m);
      scene.add(m.root);
    });
  }
  // fantôme du record
  const rec = readLS("vv-records", {})[recordKey(r.id, settings.reverse)];
  if (settings.mode === "tt" && rec && rec.ghost) {
    game.ghost = { data: rec.ghost, s: 0, o: 1.3, isPlayer: false, ghost: true, color: "#fff", name: "Fantôme", time: rec.time };
    game.ghostModel = new RiderModel({ jersey: "#ffffff", ghost: true, type: settings.bike });
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
  game.countdown = settings.mode === "free" || game.free ? 0.01 : 3.99;
  $("relocate").hidden = !game.free;
  $("profile").hidden = game.free;
  $("h-leftlabel").textContent = game.free ? "Distance" : "Reste";
  if (game.free) {
    $("h-route").textContent = "Balade libre";
    $("h-poslabel").textContent = "Vitesse moy.";
    // monde construit autour du point de départ avant de partir
    const q = QUALITY[qKey()];
    netStream.update(player.x, player.z, q.netR, 1e9);
    treeStream.update(player.x, player.z, q.treeDist, 1e9);
    buildStream.update(player.x, player.z, q.bDist, 1e9);
  }
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
  updateModeUi();
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
  const avgV = (r.finish - START_S) / Math.max(1, p.time);
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
  $("r-sub").textContent = [r.def.name, `${fmt1(r.finish / 1000)} km`, old && !isRecord ? `record : ${fmtTime(old.time)}` : ""].filter(Boolean).join(" · ");
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
      let t = x.finished ? x.finishTime : x.time + (r.finish - x.s) / Math.max(1, x.s / Math.max(1, x.time));
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
const EFFORT_STEP = 20; // watts par pression
// lettres tapées (indépendantes de la disposition AZERTY / QWERTY)
const letters = new Set();
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  keys.add(e.code);
  if (e.key && e.key.length === 1) letters.add(e.key.toLowerCase());
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  const p = game.player;
  if (e.code === "KeyC" && game.player) { game.camMode = (game.camMode + 1) % CAMS.length; showCamHint(); }
  if ((e.code === "Escape" || e.code === "KeyP") && game.state !== "menu") setPaused(game.state !== "paused");
  const L = (e.key || "").toLowerCase();
  if (L === "x" && p) p.tuck = !p.tuck;
  if (e.code === "KeyR") { look.yaw = 0; look.pitch = 0; }
  if (e.code === "KeyM") { settings.sound = !settings.sound; sound.setEnabled(settings.sound); saveSettings(); }
  if ((e.code === "ArrowUp" || L === "e") && p) p.target = Math.min(1500, p.target + EFFORT_STEP);
  if ((e.code === "ArrowDown" || L === "a") && p) p.target = Math.max(0, p.target - EFFORT_STEP);
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.key && e.key.length === 1) letters.delete(e.key.toLowerCase());
});
addEventListener("blur", () => { keys.clear(); letters.clear(); });
// molette : zoom de la caméra active (distance, ou champ de vision en
// première personne) ; chaque caméra garde son propre zoom
const zoom = [1, 1, 1, 1];
const ZOOM_LIM = [[0.45, 3.5], [0.45, 1.25], [0.5, 3], [0.4, 3]];
canvas.addEventListener("wheel", (e) => {
  if (!game.player || game.state === "menu") return;
  e.preventDefault();
  const m = game.camMode, [lo, hi] = ZOOM_LIM[m];
  const d = Math.max(-200, Math.min(200, e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY));
  zoom[m] = Math.max(lo, Math.min(hi, zoom[m] * Math.exp(d * 0.0015)));
}, { passive: false });
document.querySelectorAll("#touch button").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    sound.start();
    if (k === "pause") return setPaused(game.state !== "paused");
    touchKeys.add(k);
    if (k === "up" && game.player) game.player.target = Math.min(1500, game.player.target + EFFORT_STEP);
    if (k === "down" && game.player) game.player.target = Math.max(0, game.player.target - EFFORT_STEP);
  });
  const up = () => touchKeys.delete(k);
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  b.addEventListener("pointerleave", up);
});
// regard à la souris : capture du pointeur (ou glisser si elle est refusée)
const look = { yaw: 0, pitch: 0, idle: 0 };
let dragging = false;
canvas.addEventListener("mousedown", () => {
  if (!game.player || game.state === "menu") return;
  dragging = true;
  if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* refusé : on glisse */ }
  }
});
addEventListener("mouseup", () => (dragging = false));
addEventListener("mousemove", (e) => {
  if (!game.player || (document.pointerLockElement !== canvas && !dragging)) return;
  look.yaw = Math.max(-2.6, Math.min(2.6, look.yaw - e.movementX * 0.0028));
  look.pitch = Math.max(-1.35, Math.min(0.9, look.pitch - e.movementY * 0.0028));
  look.idle = 0;
});
canvas.addEventListener("dblclick", () => { look.yaw = 0; look.pitch = 0; });

function showCamHint() { $("h-cam").textContent = `Caméra : ${CAMS[game.camMode]} (C)`; }

function readControls(dt) {
  const p = game.player;
  if (!p) return;
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find((x) => x) : null;
  const k = (c) => keys.has(c);
  const l = (c) => letters.has(c);
  p.sprint = k("ShiftLeft") || k("ShiftRight") || touchKeys.has("sprint");
  p.brake = k("Space") || l("s") || touchKeys.has("brake") ? 1 : 0;
  let steer = (k("ArrowRight") || l("d") || touchKeys.has("right") ? 1 : 0) - (k("ArrowLeft") || l("q") || touchKeys.has("left") ? 1 : 0);
  if (pad) {
    const rt = pad.buttons[7]?.value || 0, lt = pad.buttons[6]?.value || 0;
    if (rt > 0.05) p.target = Math.round((rt * settings.ftp * 1.3) / 5) * 5;
    if (lt > 0.05) p.brake = lt;
    if (Math.abs(pad.axes[0]) > 0.15) steer = pad.axes[0];
    if (pad.buttons[0]?.pressed) p.sprint = true;
  }
  p.steer = steer;
  p.steerAnalog = !!(pad && Math.abs(pad.axes[0]) > 0.15);
}

// ------------------------------------------------------------ conduite libre
// Le vélo n'est pas guidé : on le penche, et l'inclinaison impose le rayon
// du virage (tan φ = v² / (g·R)). Trop penché pour l'adhérence : chute.
function placePlayerOnRoad(p, s, o) {
  const r = game.route;
  const q = r.sample(s);
  p.x = q.x - q.dz * o;
  p.z = q.z + q.dx * o;
  p.yaw = Math.atan2(q.dx, q.dz);
  p.lean = 0;
  p.leanTarget = 0;
  p.leanVel = 0;
  p.ri = q.i;
  p.s = s;
  p.o = o;
  p.y = q.y + 0.06;
  p.free = { y: p.y, grade: q.grade, dx: q.dx, dz: q.dz, curv: 0, crr: 0.0045 };
  p.yS = p.y;
  p.gradeS = q.grade;
}

const projTmp = {};
// position sur le parcours (abscisse, écart) et sol réellement affiché
function groundAt(x, z, p) {
  const q = game.route.project(x, z, p.ri, 30, projTmp);
  return { y: ground.height(x, z), surf: ground.surface(x, z), s: q.s, d: q.d, i: q.i };
}

const MU = [0.9, 0.72, 0.55]; // asphalte, accotement, herbe/terre
function movePlayer(p, dt) {
  if (p.crashed > 0) { p.wasDown = true; return; }
  if (p.wasDown) {
    // on se relève, remis sur la route
    p.wasDown = false;
    if (game.free) placePlayerFree(p, p.lastSafe.x, p.lastSafe.z, p.lastSafe.yaw);
    else placePlayerOnRoad(p, Math.max(START_S, p.s), 1.3);
  }
  const v = p.v;
  // inclinaison : la consigne évolue progressivement, le vélo la suit avec
  // un amortissement (pas d'à-coups) et se redresse seul au relâchement
  // le vélo de contre-la-montre se penche moins vite et moins loin
  const tt = p.bike === "clm";
  const maxLean = v < 4 ? 0.4 : tt ? 0.72 : 0.85;
  if (p.steerAnalog) {
    p.leanTarget = p.steer * maxLean;
  } else if (p.steer) {
    const against = p.leanTarget && Math.sign(p.steer) !== Math.sign(p.leanTarget);
    p.leanTarget = (p.leanTarget || 0) + p.steer * (against ? 1.3 : 0.6) * (tt ? 0.75 : 1) * dt;
  } else {
    p.leanTarget = (p.leanTarget || 0) * Math.exp(-dt * 1.5);
  }
  p.leanTarget = Math.max(-maxLean, Math.min(maxLean, p.leanTarget));
  const w = 5.5;
  p.leanVel = (p.leanVel || 0) + (w * w * (p.leanTarget - (p.lean || 0)) - 2 * w * p.leanVel) * dt;
  p.lean = Math.max(-0.95, Math.min(0.95, (p.lean || 0) + p.leanVel * dt));
  // lacet : rayon imposé par l'inclinaison ; à l'arrêt, on tourne le guidon
  let yawRate = (-G * Math.tan(p.lean)) / Math.max(v, 2.5);
  if (v < 2.5) yawRate *= v / 2.5;
  p.yaw += yawRate * dt;
  const dx = Math.sin(p.yaw), dz = Math.cos(p.yaw);
  p.x += dx * v * dt;
  p.z += dz * v * dt;
  let g0;
  if (game.free) {
    // mode libre : pas de parcours, on compte la distance parcourue
    g0 = { y: ground.height(p.x, p.z), surf: ground.surface(p.x, p.z), d: 0 };
    p.s += v * dt;
    p.o = 0;
    p.safeT = (p.safeT || 0) + dt;
    if (g0.surf === 0 && p.safeT > 1) { p.safeT = 0; p.lastSafe = { x: p.x, z: p.z, yaw: p.yaw }; }
  } else {
    g0 = groundAt(p.x, p.z, p);
    p.ri = g0.i; p.s = g0.s; p.o = g0.d;
  }
  p.y = g0.y; p.surface = g0.surf;
  const ga = ground.height(p.x + dx * 2, p.z + dz * 2), gb = ground.height(p.x - dx * 2, p.z - dz * 2);
  const grade = Math.max(-0.45, Math.min(0.45, (ga - gb) / 4));
  // altitude et pente lissées : le sol échantillonné a de petits sauts
  // (jonctions de routes, accotements) qui faisaient tressauter la caméra
  p.yS += (p.y - p.yS) * Math.min(1, dt * 10);
  if (Math.abs(p.y - p.yS) > 1.5) p.yS = p.y;
  p.gradeS += (grade - p.gradeS) * Math.min(1, dt * 2.5);
  p.free = { y: p.y, grade: p.gradeS, dx, dz, curv: 0, crr: [0.0045, 0.01, 0.03][g0.surf] };
  p.offRoad = g0.surf > 0;
  // adhérence
  const mu = MU[g0.surf] * (settings.weather === "brouillard" && g0.surf === 0 ? 0.85 : 1);
  p.latG = v > 3 ? Math.abs(Math.tan(p.lean)) : 0;
  if (p.latG > mu) crash(p, g0.surf ? "Chute ! Le vélo a glissé hors de la route" : "Chute ! Trop penché, la roue a glissé");
  else if (p.latG > mu * 0.8) warn(`Limite d'adhérence · ${Math.round((Math.abs(p.lean) * 180) / Math.PI)}°`, "red");
  if (g0.surf === 2 && v > 3) warn("Hors de la route", "amber");
  // trop loin du parcours : retour sur la route (sauf une fois arrivé)
  if (game.free) return;
  if (Math.abs(g0.d) > 60 && !p.finished) {
    crash(p, "Hors parcours");
  }
  // dans le mauvais sens
  const rq = game.route.sample(p.s);
  p.wrongWay = dx * rq.dx + dz * rq.dz < -0.3 && v > 2;
}

// mode libre : pose le vélo sur la voie la plus proche, dans son sens
function placePlayerFree(p, x, z, yaw) {
  let q = ground.road(x, z, 80) || ground.road(x, z, 600);
  let px = x, pz = z;
  if (q) {
    const L = q.line, k = q.k;
    const ex = L.x[k + 1] - L.x[k], ez = L.z[k + 1] - L.z[k];
    const l = Math.hypot(ex, ez) || 1;
    let t = ((x - L.x[k]) * ex + (z - L.z[k]) * ez) / (l * l);
    t = Math.max(0, Math.min(1, t));
    const off = Math.min(1.2, L.half * 0.45);
    px = L.x[k] + ex * t - (ez / l) * off;
    pz = L.z[k] + ez * t + (ex / l) * off;
    if (yaw === undefined) yaw = Math.atan2(ex, ez);
  }
  p.x = px; p.z = pz;
  p.yaw = yaw || 0;
  p.lean = p.leanTarget = p.leanVel = 0;
  p.y = p.yS = ground.height(px, pz);
  p.gradeS = 0;
  p.ri = 0; p.o = 0;
  p.free = { y: p.y, grade: 0, dx: Math.sin(p.yaw), dz: Math.cos(p.yaw), curv: 0, crr: 0.0045 };
  p.lastSafe = { x: px, z: pz, yaw: p.yaw };
}

// nom de la voie et du village sous les roues (mode libre)
function placeNames(x, z) {
  const q = ground.road(x, z, 6);
  let name = q ? q.line.name : "";
  if (q && q.line.route) {
    // nom de la voie le long d'un parcours (points tous les 5 m)
    const sAt = q.k * 5;
    for (const [d, label] of D.routes[q.li].names) if (d <= sAt + 1) name = label;
  }
  if (q && q.line.cls === 2) name = name || (q.line.flags & 1 ? "Voie verte" : "Piste cyclable");
  if (q && q.line.cls === 3 && !name) name = "Route empierrée";
  let town = "";
  for (const t of D.towns) if (Math.hypot(t.x - x, t.z - z) < t.r) { town = t.name; break; }
  return { name, town };
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
      $("countdown").textContent = settings.mode === "free" || game.free ? "" : "Partez !";
      sound.beep(1040, 0.35);
      setTimeout(() => ($("countdown").textContent = ""), 900);
      if (game.free) toast(game.lastTown ? `Bienvenue à ${game.lastTown}` : "Balade libre", 3);
      else toast(`${settings.reverse ? DEST[game.route.id] : ORIGIN[game.route.id]} → ${settings.reverse ? ORIGIN[game.route.id] : DEST[game.route.id]}\n${fmt1(game.route.finish / 1000)} km · D+ ${fmtInt(game.route.gain)} m`, 4);
    }
    poseRiders(0);
    rideCamera(dt);
    updateHud(dt);
  } else if (game.state === "ride" || game.state === "finished") {
    const k = game.state === "ride" ? settings.timescale : 1;
    for (let i = 0; i < k; i++) simulate(dt);
    poseRiders(dt * k);
    rideCamera(dt);
    updateHud(dt);
  }
  crowd.update(game.player && game.state !== "menu" ? game.player.s : -1e9, now / 1000);
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $("toast").classList.remove("on"); }

  const q = QUALITY[qKey()];
  discardU.value = q.discard;
  roads.update(camera.position, q.discard);
  terrain.update(camera.position, q.lod);
  streamWorld(q.budget);
  forest.update(camera.position, q.treeNear);
  sky.position.copy(camera.position);
  // le cadre d'ombre suit le coureur (ou le point regardé), aligné sur une grille
  const focus = game.player && game.state !== "menu" ? tmpV.set(game.player.x, game.player.y, game.player.z) : camLook;
  const snapG = 2;
  sun.target.position.set(Math.round(focus.x / snapG) * snapG, focus.y, Math.round(focus.z / snapG) * snapG);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 400);
  sun.target.updateMatrixWorld();
  updateFog(camera.position.y);
  renderer.render(scene, camera);
}

// point autour duquel le monde est construit : le cycliste, sinon la caméra
function streamWorld(budget) {
  const q = QUALITY[qKey()];
  const p = game.player && game.state !== "menu" ? game.player : null;
  const fx = p ? p.x : camera.position.x, fz = p ? p.z : camera.position.z;
  netStream.update(fx, fz, q.netR, budget * 0.45);
  treeStream.update(fx, fz, q.treeDist, budget * 0.35);
  buildStream.update(fx, fz, q.bDist, budget * 0.2);
}

function autoQuality(dt) {
  fpsAcc += dt; fpsN++; fpsT += dt;
  if (fpsT < 2) return;
  const fps = fpsN / fpsAcc;
  fpsAcc = 0; fpsN = 0; fpsT = 0;
  if (settings.quality !== "auto") return;
  const maxPr = Math.min(devicePixelRatio, QUALITY[autoTier].pr);
  // toujours trop lent à basse résolution : on passe au niveau inférieur
  if (fps < 28 && pixelRatio <= 0.6 && autoTier !== "bas") {
    autoTier = "bas";
    applyShadows();
    treeStream.clear();
    return;
  }
  if (fps < 40 && pixelRatio > 0.5) pixelRatio = Math.max(0.5, pixelRatio - 0.15);
  else if (fps > 57 && pixelRatio < maxPr) pixelRatio = Math.min(maxPr, pixelRatio + 0.1);
  else return;
  renderer.setPixelRatio(pixelRatio);
}

function simulate(dt) {
  const r = game.route;
  const p = game.player;
  if (game.state === "ride") readControls(dt);
  else {
    // après l'arrivée : roue libre, freinage doux, le vélo suit la route
    p.target = 0; p.sprint = false; p.tuck = false;
    p.brake = p.v > 1 ? 0.45 : 0;
    const a = r.sample(p.s + Math.max(6, p.v * 1.5));
    // on se décale vers l'axe : les coureurs arrivés se rangent à droite
    let err = Math.atan2(a.x + a.dz * 0.6 - p.x, a.z - a.dx * 0.6 - p.z) - p.yaw;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    p.steerAnalog = true;
    p.steer = Math.max(-1, Math.min(1, -err * 2.5));
  }
  computeDrafts(game.riders);
  for (const x of game.riders) {
    if (x.finished && !x.isPlayer) {
      // coureur arrivé : il ralentit, se range à droite en file indienne
      // (5 m d'écart) et s'arrête, sans dépasser la fin de la route
      const park = Math.min(r.length - 3 - x.place * 1.5, r.finish + 35 + x.place * 5);
      const left = park - x.s;
      const vmax = left > 0 ? Math.max(1.2, Math.sqrt(2 * 2.5 * left)) : 0;
      x.v = Math.max(0, Math.min(vmax, x.v - (x.v > vmax ? 3 : 0) * dt));
      x.s = Math.min(park, x.s + x.v * dt);
      x.o += (2.3 - x.o) * Math.min(1, dt * 0.8);
      x.power = 0; x.cadence *= 0.95; x.posture = 0;
      continue;
    }
    if (x.ai) aiThink(x, r, game.riders, dt);
    step(x, r, game.env, dt);
    if (x.isPlayer) movePlayer(x, dt);
    // pas de traversée des autres coureurs
    for (const o of game.riders) {
      if (o === x || o.finished || o.crashed > 0) continue;
      const gap = o.s - x.s;
      if (gap > 0 && gap < 1.9 && Math.abs(o.o - x.o) < 0.55 && x.v > o.v) {
        x.v = o.v;
        if (!x.isPlayer) x.s = Math.min(x.s, o.s - 1.9 + 0.01);
      }
    }
    if (!game.free && !x.finished && x.s >= r.finish) {
      x.finished = true;
      x.finishTime = x.time;
      x.place = game.riders.filter((o) => o.finished).length - 1;
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
  if (game.state === "ride" && game.free) {
    game.townT = (game.townT || 0) + dt;
    if (game.townT > 0.5) {
      game.townT = 0;
      const { town } = placeNames(p.x, p.z);
      if (town && town !== game.lastTown) toast(`Bienvenue à ${town}`);
      game.lastTown = town;
    }
  } else if (game.state === "ride") {
    game.recT += dt;
    if (game.recT >= 0.5) { game.recT -= 0.5; game.ghostRec.push([Math.round(p.s * 10) / 10, Math.round(p.o * 10) / 10]); }
    // événements le long du parcours
    while (game.nextEvent < game.events.length && game.events[game.nextEvent].s <= p.s) {
      toast(game.events[game.nextEvent].text);
      game.nextEvent++;
    }
    const km = Math.floor(p.s / 1000);
    if (km > game.lastKm && p.s < r.finish - 300) {
      game.lastKm = km;
      const g = r.avgGrade(p.s, p.s + 1000) * 100;
      toast(`Kilomètre ${km}\nprochain km : ${fmt1(g)} %`, 3);
    }
    if (p.wbal < p.wPrime * 0.08 && p.power > p.cp * 0.9) warn("Dans le dur ! Réserve vide", "amber");
    if (p.wrongWay) warn("Mauvais sens !", "red");
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
  if (!x.isPlayer) x.o = 1.3;
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
    const v = x.ghost ? 8 : x.v;
    if (x.isPlayer) {
      m.root.position.set(x.x, x.yS, x.z);
      m.root.rotation.y = x.yaw;
      const lean = x.crashed > 0 ? 1.35 * Math.sign(x.lean || 1) : x.lean;
      m.animate(dt, v, x.cadence, x.posture, lean, Math.atan(x.gradeS));
      m.setFirstPerson(game.camMode === 1);
      if (m.shadow) m.shadow.visible = !renderer.shadowMap.enabled;
      continue;
    }
    const p = r.sample(Math.max(0, Math.min(r.length, x.s)), pose);
    const rx = -p.dz, rz = p.dx;
    m.root.position.set(p.x + rx * x.o, p.y + 0.06, p.z + rz * x.o);
    m.root.rotation.y = Math.atan2(p.dx, p.dz);
    // coureurs lointains : invisibles et non animés (ils ne font que quelques pixels)
    m.root.visible = m.root.position.distanceToSquared(camera.position) < 350 * 350;
    if (!m.root.visible) continue;
    const lean = x.crashed > 0 ? 1.35 : Math.atan((v * v * p.curv) / G) * 0.9;
    m.animate(dt, v, x.ghost ? 85 : x.cadence, x.ghost ? 0 : x.posture, lean, Math.atan(p.grade));
    if (m.shadow) m.shadow.visible = !renderer.shadowMap.enabled;
  }
}

function placeCameraImmediately() {
  rideCamera(1, true);
}

const camEuler = new THREE.Euler(0, 0, 0, "YXZ");
let camYaw = 0;
let camY = 0;
function rideCamera(dt, snap = false) {
  const p = game.player;
  const r = game.route;
  if (!p) return;
  const mode = game.camMode;
  const px = p.x, py = p.yS, pz = p.z;
  const zm = zoom[mode];
  // cap de caméra lissé (évite les à-coups)
  let dy = p.yaw - camYaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  camYaw = snap ? p.yaw : camYaw + dy * (1 - Math.exp(-dt * 5));
  // en poursuite, le regard revient doucement derrière le coureur
  look.idle += dt;
  if (mode === 0 && look.idle > 1.5 && !dragging && document.pointerLockElement !== canvas) {
    look.yaw *= Math.exp(-dt * 2);
    look.pitch *= Math.exp(-dt * 2);
  }
  camera.near = mode === 1 ? 0.06 : 0.5;
  if (mode === 1) {
    // première personne : yeux du coureur, inclinaison du vélo comprise
    game.models[0].eyeWorld(camPos);
    camera.position.copy(camPos);
    camEuler.set(-0.3 + look.pitch + Math.atan(p.gradeS) * 0.6, p.yaw + Math.PI + look.yaw, -(p.crashed > 0 ? 1.0 : p.lean) * 0.6);
    camera.quaternion.setFromEuler(camEuler);
    camera.fov = 78 * zm;
    camY = camPos.y;
    camera.updateProjectionMatrix();
    return;
  }
  let want, lk;
  if (mode === 0) {
    const yaw = camYaw + look.yaw, pitch = 0.3 - look.pitch * 0.8;
    const dist = 6.2 * zm;
    const c = Math.cos(Math.max(-0.2, Math.min(1.3, pitch)));
    want = tmpV.set(px - Math.sin(yaw) * dist * c, py + 1.1 + Math.sin(Math.max(-0.2, Math.min(1.3, pitch))) * dist, pz - Math.cos(yaw) * dist * c);
    lk = camLook.set(px + Math.sin(camYaw) * 3, py + 1.2, pz + Math.cos(camYaw) * 3);
  } else if (game.free && mode === 2) {
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    want = tmpV.set(px + (fx * 9 + fz * 2.5) * zm, py + 1.8 * zm, pz + (fz * 9 - fx * 2.5) * zm);
    lk = camLook.set(px, py + 1.0, pz);
  } else if (game.free) {
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    want = tmpV.set(px - (fx * 45 + fz * 25) * zm, py + 38 * zm, pz - (fz * 45 - fx * 25) * zm);
    lk = camLook.set(px, py, pz);
  } else if (mode === 2) {
    // moto TV qui précède le coureur, de trois quarts
    const a = r.sample(p.s + 9);
    want = tmpV.set(px + (a.x + a.dz * 2.5 - px) * zm, py + 1.8 * zm, pz + (a.z - a.dx * 2.5 - pz) * zm);
    lk = camLook.set(px, py + 1.0, pz);
  } else {
    const b = r.sample(Math.max(0, p.s - 45 * zm));
    want = tmpV.set(b.x - b.dz * 25 * zm, Math.max(b.y, py) + 38 * zm, b.z + b.dx * 25 * zm);
    lk = camLook.set(px, py, pz);
  }
  // garde au sol : on regarde le sol sous la caméra et un peu autour, pour
  // ne pas suivre chaque bosse du talus
  const floor = Math.max(
    ground.height(want.x, want.z),
    0.5 * (ground.height(want.x + 1.5, want.z) + ground.height(want.x - 1.5, want.z)),
    0.5 * (ground.height(want.x, want.z + 1.5) + ground.height(want.x, want.z - 1.5)),
  ) + 1.0;
  if (want.y < floor) want.y = floor;
  if (snap || mode === 0) { camPos.x = want.x; camPos.z = want.z; }
  else { camPos.x += (want.x - camPos.x) * (1 - Math.exp(-dt * (mode === 3 ? 2 : 6))); camPos.z += (want.z - camPos.z) * (1 - Math.exp(-dt * (mode === 3 ? 2 : 6))); }
  // la hauteur est toujours amortie : plus de hauts et bas brusques
  camY = snap ? want.y : camY + (want.y - camY) * (1 - Math.exp(-dt * (mode === 3 ? 2 : 4)));
  camPos.y = Math.max(camY, floor - 0.6);
  if (Math.hypot(camPos.x - want.x, camPos.z - want.z) > 60) { camPos.copy(want); camY = want.y; }
  camera.position.copy(camPos);
  camera.lookAt(lk);
  // léger roulis de la caméra de poursuite avec le vélo
  if (mode === 0) camera.rotateZ(-p.lean * 0.18);
  camera.fov = 62;
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
  const floor = ground.height(want.x, want.z) + 60;
  if (want.y < floor) want.y = floor;
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
  if (game.state === "ride" && !game.free && p.v > 8) {
    const safe = r.safeSpeedAhead(p.s, 80, 0.6);
    if (safe.dist > 5 && p.v > safe.v + 1.5 && warnT <= 0.1) warn(`Virage serré dans ${Math.round(safe.dist)} m · ${Math.round(safe.v * 3.6)} km/h`, "amber");
  }
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.1;
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
  const g = p.free.grade * 100;
  const gEl = $("h-grade");
  gEl.textContent = `${g > 0 ? "+" : ""}${fmt1(g)} %`;
  gEl.style.color = gradeColor(p.free.grade);
  $("h-alt").textContent = `${fmtInt(p.y)} m`;
  $("h-lean").textContent = `${Math.round((Math.abs(p.lean) * 180) / Math.PI)}°`;
  $("h-left").textContent = game.free ? `${fmt1(p.s / 1000)} km` : `${fmt1(Math.max(0, r.finish - p.s) / 1000)} km`;
  $("h-time").textContent = fmtTime(p.time);
  if (game.free) {
    $("h-pos").textContent = p.time > 5 ? `${fmt1((p.s / p.time) * 3.6)} km/h` : "–";
  } else if (settings.mode === "race") {
    const pos = 1 + game.riders.filter((x) => !x.isPlayer && x.s > p.s).length;
    $("h-pos").textContent = `${pos}e / ${game.riders.length}`;
  } else if (settings.mode === "tt" && game.ghost) {
    const d = p.s - game.ghost.s;
    $("h-pos").textContent = `${d >= 0 ? "+" : "−"}${fmtInt(Math.abs(d))} m`;
    $("h-pos").style.color = d >= 0 ? "#7fdc8f" : "#ff8a8a";
  } else {
    $("h-pos").textContent = p.time > 5 ? `${fmt1(((p.s - START_S) / p.time) * 3.6)} km/h` : "–";
  }
  $("h-draft").classList.toggle("on", p.draft > 0.08);
  $("h-draft").textContent = `Dans la roue · −${Math.round(p.draft * 100)} % d'effort aéro`;
  if (game.free) {
    const nm = placeNames(p.x, p.z);
    $("h-road").textContent = nm.name;
    $("h-town").textContent = nm.town;
    drawFreeMap($("minimap"), p.x, p.z, 1400, true);
  } else {
    $("h-road").textContent = r.roadName(p.s) || "";
    const town = townAt(r, game.crossings, p.s);
    $("h-town").textContent = town ? town : "";
    const list = game.ghost ? [...game.riders, game.ghost] : game.riders;
    drawProfile($("profile"), r, list);
    drawMinimap();
  }
  const air = p.v - (game.env.windX * p.free.dx + game.env.windZ * p.free.dz);
  sound.update(0.1, air, p.power < 5, p.v);
}
