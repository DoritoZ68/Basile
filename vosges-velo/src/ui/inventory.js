// Onglet « Inventaire » : bidons, poches, roues et pneus.
import { POCKETS, TYRES, WHEELS, kitCarbs, kitLiquid, kitMass, normKit } from "../kit.js";
import { $, fmt1, fmtInt, game, saveSettings, settings } from "../main.js";

// ------------------------------------------------------------ inventaire
export function buildInventory() {
  const el = $("opts-kit");
  const kit = (settings.kit = normKit(settings.kit));
  const save = () => { settings.kit = normKit(kit); saveSettings(); render(); };
  const segH = (opts, cur, onPick) => `<div class="seg">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const render = () => {
    const cages = [0, 1].map((i) => {
      const b = kit.bottles[i];
      return `<div class="kit-card" data-cage="${i}"><div class="kit-ico bottle ${b ? (b.drink === "eau" ? "eau" : "iso") : "none"} ${b && b.size === 750 ? "big" : ""}"></div>
        <div><b>Porte-bidon ${i + 1}</b>${segH([["0", "Vide"], ["500", "500 mL"], ["750", "750 mL"]], b ? b.size : 0)}
        ${b ? segH([["iso", "Isotonique"], ["eau", "Eau"]], b.drink) : ""}</div></div>`;
    }).join("");
    const used = kit.bars + kit.gels + kit.cafGels;
    const slots = [];
    for (let i = 0; i < POCKETS; i++) slots.push(`<i class="${i < kit.bars ? "bar" : i < kit.bars + kit.gels ? "gel" : i < used ? "caf" : ""}"></i>`);
    const row = (k, label, sub) => `<div class="kit-row"><span><b>${label}</b><small>${sub}</small></span><div class="kit-count"><button data-k="${k}" data-d="-1">−</button><b>${kit[k]}</b><button data-k="${k}" data-d="1" ${used >= POCKETS ? "disabled" : ""}>+</button></div></div>`;
    const ftp = settings.ftp, P = 0.7 * ftp;
    const burn = (((P / 0.23 + 90) * Math.min(1, 0.25 + 0.75 * 0.7)) / 17000) * 3600; // g/h
    const carbs = kitCarbs(kit), liquid = kitLiquid(kit);
    const autoC = (320 + carbs) / Math.max(1, burn), autoL = liquid / 1000 / (0.35 + 0.9 * 0.7) + 0.6;
    const hm = (h) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
    const W = WHEELS[kit.wheels], T = TYRES[kit.tyres];
    el.innerHTML = `
      <h3 class="kit-h">Porte-bidons</h3><div class="kit-cages">${cages}</div>
      <h3 class="kit-h">Poches du maillot <small>${used} / ${POCKETS}</small></h3>
      <div class="kit-slots">${slots.join("")}</div>
      ${row("bars", "Barres", "40 g de glucides, lentes · touche 1")}
      ${row("gels", "Gels", "25 g, rapides · touche 2")}
      ${row("cafGels", "Gels caféinés", "25 g et +3 % de puissance pendant 45 min · touche 4")}
      <h3 class="kit-h">Matériel</h3>
      <div class="opt"><label>Roues</label>${segH(Object.entries(WHEELS).map(([k, w]) => [k, w.name]), kit.wheels)}</div>
      <p class="opt-note kit-wheels">${W.text}.</p>
      <div class="opt"><label>Pneus</label>${segH(Object.entries(TYRES).map(([k, t]) => [k, t.name]), kit.tyres)}</div>
      <p class="opt-note kit-tyres">${T.text}.</p>
      <div class="kit-sum">
        <div><small>Masse emportée</small><b>${fmt1(kitMass(kit))} kg</b></div>
        <div><small>Glucides</small><b>${fmtInt(carbs)} g</b></div>
        <div><small>Boisson</small><b>${fmt1(liquid / 1000)} L</b></div>
        <div><small>Autonomie (~70 % FTP)</small><b>${hm(Math.min(autoC, autoL))}</b></div>
        <div><small>Traînée</small><b>${W.cda < 1 ? "−" + fmtInt((1 - W.cda) * 100) + " %" : "réf."}</b></div>
        <div><small>Roulement</small><b>${T.crr !== 1 ? (T.crr < 1 ? "−" : "+") + fmtInt(Math.abs(1 - T.crr) * 100) + " %" : "réf."}</b></div>
        <div><small>Adhérence mouillé</small><b>${T.wet > 1 ? "+" + fmtInt((T.wet - 1) * 100) + " %" : "réf."}</b></div>
      </div>
      <p class="opt-note">La voiture d'équipe et la musette remplissent les bidons de boisson isotonique, la fontaine d'eau. Les poches se rechargent aussi à la voiture.</p>`;
    el.querySelectorAll(".kit-card").forEach((card) => {
      const i = Number(card.dataset.cage);
      const [sz, dr] = card.querySelectorAll(".seg");
      sz.querySelectorAll("button").forEach((b) => (b.onclick = () => {
        const v = Number(b.dataset.v);
        if (!v) kit.bottles.splice(i, 1);
        else if (kit.bottles[i]) kit.bottles[i].size = v;
        else kit.bottles.push({ size: v, drink: "iso" });
        save();
      }));
      if (dr) dr.querySelectorAll("button").forEach((b) => (b.onclick = () => { kit.bottles[i].drink = b.dataset.v; save(); }));
    });
    el.querySelectorAll(".kit-count button").forEach((b) => (b.onclick = () => { kit[b.dataset.k] = Math.max(0, kit[b.dataset.k] + Number(b.dataset.d)); save(); }));
    const segs = el.querySelectorAll(":scope > .opt .seg");
    segs[0].querySelectorAll("button").forEach((b) => (b.onclick = () => { kit.wheels = b.dataset.v; save(); }));
    segs[1].querySelectorAll("button").forEach((b) => (b.onclick = () => { kit.tyres = b.dataset.v; save(); }));
  };
  render();
  game.kitRender = render;
}
