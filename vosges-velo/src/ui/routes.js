// Choix du parcours en coverflow : vignettes (tracé sur la photo aérienne,
// profil), détails et record du parcours sélectionné.
import { Coverflow } from "../characters.js";
import { Route } from "../route.js";
import { $, D, DEST, ORIGIN, fmt1, fmtInt, fmtTime, readLS, recordKey, routeStats, selectRoute, settings } from "../main.js";

// parcours en coverflow : vignette (tracé sur la photo aérienne, profil),
// distance, dénivelé ; détails et record sous le carrousel
export let routeFlow = null, routeFlowKey = "";
export function routeThumb(def, reverse) {
  const r = new Route(def, reverse);
  const W = 300, H = 380, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const m = D.meta, img = D.orthoSmall;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < r.n; i++) { x0 = Math.min(x0, r.x[i]); x1 = Math.max(x1, r.x[i]); z0 = Math.min(z0, r.z[i]); z1 = Math.max(z1, r.z[i]); }
  const mapH = 250, pad = 400;
  const span = Math.max(x1 - x0, ((z1 - z0) * W) / mapH) + pad * 2;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, k = W / span;
  const sx = (x) => (x - cx) * k + W / 2, sz = (z) => (z - cz) * k + mapH / 2;
  // fond : photo aérienne
  const iw = img.width / (m.x_max - m.x_min), ih = img.height / (m.z_max - m.z_min);
  g.drawImage(img, (cx - span / 2 - m.x_min) * iw, (cz - (mapH / k) / 2 - m.z_min) * ih, span * iw, (mapH / k) * ih, 0, 0, W, mapH);
  g.fillStyle = "rgba(10,16,13,0.25)"; g.fillRect(0, 0, W, mapH);
  g.lineJoin = g.lineCap = "round";
  for (const [w, col] of [[7, "rgba(0,0,0,0.55)"], [4, "#ff8a3d"]]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    for (let i = 0; i < r.n; i += 2) (i ? g.lineTo : g.moveTo).call(g, sx(r.x[i]), sz(r.z[i]));
    g.stroke();
  }
  const dot = (x, z, col) => { g.fillStyle = col; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(sx(x), sz(z), 7, 0, 7); g.fill(); g.stroke(); };
  dot(r.x[0], r.z[0], "#2f9e57");
  dot(r.x[r.n - 1], r.z[r.n - 1], "#d8323c");
  // profil
  g.fillStyle = "#121a17"; g.fillRect(0, mapH, W, H - mapH);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < r.n; i++) { y0 = Math.min(y0, r.y[i]); y1 = Math.max(y1, r.y[i]); }
  const py = (y) => H - 14 - ((y - y0) / Math.max(1, y1 - y0)) * (H - mapH - 34);
  const grd = g.createLinearGradient(0, mapH, 0, H);
  grd.addColorStop(0, "rgba(255,138,61,0.85)"); grd.addColorStop(1, "rgba(242,194,48,0.25)");
  g.fillStyle = grd; g.beginPath(); g.moveTo(0, H);
  for (let i = 0; i < r.n; i += 3) g.lineTo((r.s[i] / r.length) * W, py(r.y[i]));
  g.lineTo(W, H); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.font = "600 13px Barlow, sans-serif";
  g.fillText(`${fmtInt(y1)} m`, 8, mapH + 18);
  g.fillText(`${fmtInt(y0)} m`, 8, H - 4);
  return c.toDataURL("image/jpeg", 0.85);
}

export function renderRouteList() {
  const host = $("route-list");
  const recs = readLS("vv-records", {});
  const items = D.routes.map((def) => {
    const st = routeStats(def, settings.reverse);
    return { id: def.id, def, name: def.name, style: `${fmt1(st.km)} km · D+ ${fmtInt(st.gain)} m`, st };
  });
  const key = String(settings.reverse);
  const idx = Math.max(0, items.findIndex((it) => it.id === settings.route));
  if (routeFlowKey !== key) {
    // nouveau sens : vignettes et carrousel refaits
    routeFlowKey = key;
    host.innerHTML = `<div class="cf-host"></div><div class="route-info"></div>`;
    routeFlow = new Coverflow(host.querySelector(".cf-host"), items, idx, (it) => selectRoute(it.id, settings.reverse));
    routeFlow.el.classList.add("routes");
    setTimeout(() => routeFlow.setImages(items.map((it) => routeThumb(it.def, settings.reverse))), 0);
  } else if (routeFlow.i !== idx) {
    routeFlow.i = idx;
    routeFlow.layout();
  }
  const it = items[idx], def = it.def, rec = recs[recordKey(def.id, settings.reverse)];
  const from = settings.reverse ? DEST[def.id] : ORIGIN[def.id], to = settings.reverse ? ORIGIN[def.id] : DEST[def.id];
  host.querySelector(".route-info").innerHTML = `<h3>${def.name}</h3>
    <p>${settings.reverse ? `${from} → ${to} (sens inverse)` : def.subtitle}</p>
    <div class="char-stats">
      <div><small>Distance</small><b>${fmt1(it.st.km)} km</b><i style="width:${Math.min(100, it.st.km * 3)}%"></i></div>
      <div><small>Dénivelé</small><b>${fmtInt(it.st.gain)} m</b><i style="width:${Math.min(100, it.st.gain / 12)}%"></i></div>
      <div><small>Pente moyenne</small><b>${fmt1(it.st.avg * 100)} %</b><i style="width:${Math.min(100, Math.abs(it.st.avg) * 1200)}%"></i></div>
      <div><small>Record</small><b>${rec ? `${fmtTime(rec.time)} · ${fmtInt(rec.avgP)} W` : "—"}</b></div>
    </div>`;
}
