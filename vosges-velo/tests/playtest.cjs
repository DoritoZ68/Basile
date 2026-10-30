// Joueur automatique : parcourt les tracés comme un joueur (inclinaison au
// clavier, freinage avant les virages, effort dosé) et note les anomalies.
// Usage : npm run build && node tests/playtest.cjs [scénario…]
//   scénarios : race:<parcours>[:inv] · tt:<parcours>[:inv] · free:<n>
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROUTES = ["vieil-armand", "grand-ballon-willer", "route-des-cretes", "grand-ballon-markstein", "piemont"];
const args = process.argv.slice(2);
const scenarios = args.length ? args : [
  ...ROUTES.map((r) => `tt:${r}`), ...ROUTES.map((r) => `tt:${r}:inv`),
  "race:piemont", "race:vieil-armand", "free:12",
];
const file = "file://" + path.resolve(__dirname, "../dist/vosges-velo.html");
const shots = process.env.SHOTS || "";

// boucle de jeu exécutée dans la page
async function drive(page, opts) {
  return page.evaluate(async (opts) => {
    const v = window.__vv, g = v.game, p = g.player, r = g.route;
    const issues = [];
    const add = (kind, msg) => { if (issues.filter((i) => i.kind === kind).length < 8) issues.push({ kind, msg, t: +p.time.toFixed(1), s: +(p.s || 0).toFixed(0), x: +p.x.toFixed(0), z: +p.z.toFixed(0) }); };
    const keys = v.keys;
    const dt = 1 / 60;
    let crashes = 0, wasC = false, stuck = 0, prevY = p.y, prevGrade = 0, offroad = 0, maxSteps = opts.maxMin * 3600;
    g.state = "ride";
    let lastToast = "";
    for (let step = 0; step < maxSteps; step++) {
      if (g.state === "finished") break;
      // pilotage : vise un point devant, sur la voie de droite
      let tx, tz;
      if (g.free) {
        const q = v.ground.road(p.x + Math.sin(p.yaw) * 12, p.z + Math.cos(p.yaw) * 12, 25);
        if (q) {
          const L = q.line, k = Math.min(L.x.length - 1, q.k + 1);
          // sens de la ligne : celui qui correspond au cap actuel
          const fwd = (L.x[k] - L.x[q.k]) * Math.sin(p.yaw) + (L.z[k] - L.z[q.k]) * Math.cos(p.yaw) >= 0;
          const kk = fwd ? Math.min(L.x.length - 1, q.k + 2) : Math.max(0, q.k - 1);
          tx = L.x[kk]; tz = L.z[kk];
        } else { tx = p.x + Math.sin(p.yaw); tz = p.z + Math.cos(p.yaw); }
      } else {
        const a = r.sample(p.s + Math.max(8, p.v * 1.3));
        tx = a.x - a.dz * 1.2; tz = a.z + a.dx * 1.2;
      }
      let err = Math.atan2(tx - p.x, tz - p.z) - p.yaw;
      err = Math.atan2(Math.sin(err), Math.cos(err));
      const lw = Math.max(-0.6, Math.min(0.6, -Math.atan((err * 2.2 * Math.max(p.v, 3)) / 9.81)));
      keys.delete("ArrowLeft"); keys.delete("ArrowRight"); keys.delete("Space");
      if (lw > p.leanTarget + 0.02) keys.add("ArrowRight"); else if (lw < p.leanTarget - 0.02) keys.add("ArrowLeft");
      if (!g.free) {
        const safe = r.safeSpeedAhead(p.s, 70, 0.55);
        if (p.v > safe.v) keys.add("Space");
      } else if (p.v > Math.max(5, 12 - Math.abs(err) * 14)) keys.add("Space");
      p.target = opts.watts;
      // ravitaillement comme un joueur prudent
      if (p.fuel) {
        if (p.fuel.gly / p.fuel.glyMax < 0.4 && step % 600 === 0) window.dispatchEvent(new KeyboardEvent("keydown", { key: p.fuel.bars ? "1" : "2" }));
        if (p.fuel.deficit > 0.5 && step % 900 === 0) window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
      }
      const pre = { v: p.v, lean: p.lean, o: p.o, surf: p.surface, x: p.x, z: p.z, yaw: p.yaw, curv: r ? r.sample(p.s).curv : 0, draft: p.draft, near: g.riders.filter((a) => a !== p && Math.abs(a.s - p.s) < 3).length };
      v.simulate(dt);
      // --- contrôles
      if (!Number.isFinite(p.x + p.z + p.y + p.v)) { add("nan", "position ou vitesse invalide"); break; }
      if (p.crashed > 0 && !wasC) { crashes++; add("chute", document.getElementById("toast").textContent.split("\n")[0] + ` (avant : ${(pre.v * 3.6).toFixed(0)} km/h, angle ${(pre.lean * 57.3).toFixed(0)}°, écart ${pre.o.toFixed(1)} m, surface ${pre.surf}, courbure ${pre.curv.toFixed(3)}, voisins ${pre.near})`); }
      const justUp = wasC && p.crashed <= 0;
      wasC = p.crashed > 0;
      const dy = Math.abs(p.y - prevY);
      if (dy > 0.6 && p.crashed <= 0 && !wasC && !justUp) add("saut", `saut d'altitude de ${dy.toFixed(2)} m en une image (surface ${p.surface})`);
      prevY = p.y;
      if (Math.abs(p.gradeS) > 0.22 && p.surface === 0) add("pente", `pente lissée de ${(p.gradeS * 100).toFixed(0)} % sur la chaussée`);
      if (p.surface === 2) offroad++; else offroad = 0;
      if (offroad === 120) add("horsroute", "hors de la chaussée depuis 2 s");
      if (p.v < 0.5 && p.crashed <= 0 && g.state === "ride") stuck++; else stuck = 0;
      if (stuck === 600) add("bloqué", `immobile 10 s (puissance ${p.power.toFixed(0)} W, frein ${p.brake})`);
      // peloton
      if (step % 60 === 0 && g.riders.length > 1) {
        const ai = g.riders.filter((x) => !x.isPlayer);
        for (const a of ai) {
          if (!Number.isFinite(a.s + a.v)) { add("ia-nan", a.name); break; }
          if (Math.abs(a.o) > 2.9) { add("ia-bord", `${a.name} à ${a.o.toFixed(1)} m de l'axe`); break; }
        }
        const srt = [...ai].sort((a, b) => a.s - b.s);
        for (let i = 1; i < srt.length; i++) {
          const a = srt[i - 1], b = srt[i];
          if (b.s - a.s < 0.8 && Math.abs(b.o - a.o) < 0.4 && !a.finished && !b.finished && a.v > 2) { add("ia-chevauche", `${a.name} et ${b.name} superposés`); break; }
        }
        if (g.convoy) {
          for (const it of g.convoy.items) {
            if (!it.mesh.visible) continue;
            for (const a of g.riders) {
              const q = r.sample(a.s);
              const ax = q.x - q.dz * a.o, az = q.z + q.dx * a.o;
              if (Math.hypot(it.mesh.position.x - ax, it.mesh.position.z - az) < 1.6) { add("voiture", `${it.role} sur ${a.name}`); break; }
            }
          }
        }
      }
      const toast = document.getElementById("toast").textContent;
      if (toast !== lastToast && /Hors parcours|Mauvais sens/.test(toast)) add("parcours", toast.split("\n")[0]);
      lastToast = toast;
      if (g.free && step % 1200 === 0) v.streamWorld(1e9);
    }
    keys.clear();
    const sum = {
      fini: g.state === "finished", temps: +p.time.toFixed(0), s: +(p.s || 0).toFixed(0), longueur: r ? +r.finish.toFixed(0) : 0,
      chutes: crashes, glycogene: p.fuel ? +p.fuel.gly.toFixed(0) : null, deficit: p.fuel ? +p.fuel.deficit.toFixed(2) : null,
      place: g.riders.length > 1 ? 1 + g.riders.filter((x) => !x.isPlayer && (x.finished ? x.finishTime < p.time || !p.finished : x.s > p.s)).length : null,
      groupes: g.groups ? g.groups.map((x) => x.riders.length).join("/") : "",
    };
    return { sum, issues };
  }, opts);
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const report = [];
  for (const sc of scenarios) {
    const [mode, route, inv] = sc.split(":");
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const set = { quality: "bas", time: "midi", timescale: 1, field: 40, level: "amateur", bike: "route" };
    if (mode === "free") Object.assign(set, { mode: "open" });
    else Object.assign(set, { mode: mode === "race" ? "race" : "tt", route, reverse: inv === "inv" });
    await page.addInitScript((s) => localStorage.setItem("vv-settings", JSON.stringify(s)), set);
    await page.goto(file);
    await page.waitForSelector("#menu:not([hidden])", { timeout: 300000 });
    if (mode === "free") {
      const n = +(route || 8);
      const towns = await page.evaluate(() => window.__vv.D.towns.map((t) => [t.name, t.x, t.z]));
      for (let i = 0; i < n; i++) {
        const [name, x, z] = towns[i % towns.length];
        await page.evaluate(([x, z]) => { const v = window.__vv; v.settings.spawn = { x, z, name: "" }; v.startRide(); }, [x + ((i * 97) % 300) - 150, z + ((i * 53) % 300) - 150]);
        const res = await drive(page, { maxMin: 3, watts: 200 });
        report.push({ sc: `libre ${name}`, ...res, errors: [...errors] });
        errors.length = 0;
        if (shots) await page.screenshot({ path: `${shots}/free-${i}.png` });
      }
    } else {
      await page.click("#go");
      await page.waitForTimeout(500);
      const res = await drive(page, { maxMin: mode === "race" ? 45 : 90, watts: inv === "inv" ? 180 : 240 });
      report.push({ sc, ...res, errors });
      if (shots) await page.screenshot({ path: `${shots}/${sc.replace(/:/g, "-")}.png` });
    }
    await page.close();
  }
  await browser.close();
  for (const r of report) {
    console.log(`\n== ${r.sc} : ${JSON.stringify(r.sum)}`);
    for (const e of r.errors) console.log("   ERREUR JS", e);
    for (const i of r.issues) console.log(`   [${i.kind}] t=${i.t}s s=${i.s} (${i.x},${i.z}) ${i.msg}`);
  }
  fs.writeFileSync(path.resolve(__dirname, "playtest-report.json"), JSON.stringify(report, null, 1));
})();
