// Onglet « Coureur » : coverflow des personnages, fiche, créateur.
import { CharacterEditor, Coverflow, ROSTER, characterById, renderPortraits, setCustomCharacters } from "../characters.js";
import { myInfo, net } from "./multiplayer.js";
import { $, fmt1, game, rangeRefresh, saveSettings, settings } from "../main.js";

// ------------------------------------------------------------ personnages
export let coverflow = null;
export let editor = null;
export function buildCharacters(container) {
  setCustomCharacters(settings.customChars);
  const box = document.createElement("div");
  box.className = "chars";
  box.innerHTML = `<div class="cf-host"></div><div class="char-info"><h3></h3><p></p><div class="char-stats"></div><div class="char-btns"><button class="mp-btn small cr-new">＋ Créer un personnage</button><button class="mp-btn small cr-edit" hidden>Modifier</button><button class="mp-btn small ghost cr-del" hidden>Supprimer</button></div></div>`;
  container.appendChild(box);
  // le personnage choisi impose son poids et sa puissance
  const c0 = characterById(settings.character);
  if (!c0.custom) { settings.mass = c0.mass; settings.ftp = c0.ftp; }
  const info = () => {
    const c = characterById(settings.character);
    box.querySelector("h3").textContent = c.custom ? c.name : `${c.name} · ${c.style}`;
    box.querySelector("p").textContent = c.text;
    const stat = (k, v, pct) => `<div><small>${k}</small><b>${v}</b><i style="width:${Math.max(4, Math.min(100, pct))}%"></i></div>`;
    const wkg = settings.ftp / settings.mass;
    box.querySelector(".char-stats").innerHTML =
      stat("Poids", `${settings.mass} kg`, (settings.mass - 45) / 0.6) +
      stat("Seuil (FTP)", `${settings.ftp} W`, (settings.ftp - 120) / 2.6) +
      stat("Grimpe (W/kg)", fmt1(wkg), (wkg - 2) * 28) +
      stat("Explosivité (W′)", `${Math.round(c.wp / 1000)} kJ`, (c.wp - 12000) / 200);
    box.querySelector(".cr-edit").hidden = box.querySelector(".cr-del").hidden = !c.user;
  };
  let portraits = false;
  const mount = () => {
    const idx = Math.max(0, ROSTER.findIndex((c) => c.id === settings.character));
    coverflow = new Coverflow(box.querySelector(".cf-host"), ROSTER, idx, (c) => {
      settings.character = c.id;
      if (!c.custom) { settings.mass = c.mass; settings.ftp = c.ftp; }
      saveSettings();
      rangeRefresh.mass?.();
      rangeRefresh.ftp?.();
      info();
      if (net.active) net.updateMe(myInfo());
    });
    if (portraits) coverflow.setImages(renderPortraits(ROSTER, settings.jersey));
  };
  mount();
  game.charInfo = info;
  info();
  // portraits rendus quand l'onglet s'ouvre (le contexte WebGL temporaire
  // ne coûte rien tant qu'on ne regarde pas les personnages)
  const tab = document.querySelector('#tabs [data-tab="rider"]');
  tab.addEventListener("click", () => {
    if (portraits) return;
    portraits = true;
    setTimeout(() => coverflow.setImages(renderPortraits(ROSTER, settings.jersey)), 30);
  });
  const select = (id) => {
    setCustomCharacters(settings.customChars);
    settings.character = id;
    const c = characterById(id);
    if (!c.custom) { settings.mass = c.mass; settings.ftp = c.ftp; }
    saveSettings();
    mount();
    rangeRefresh.mass?.();
    rangeRefresh.ftp?.();
    info();
    if (net.active) net.updateMe(myInfo());
  };
  editor = editor || new CharacterEditor((c) => {
    const list = (settings.customChars || []).filter((x) => x.id !== c.id);
    list.push(c);
    settings.customChars = list;
    select(c.id);
  });
  box.querySelector(".cr-new").onclick = () => editor.open(null, { mass: settings.mass, ftp: settings.ftp });
  box.querySelector(".cr-edit").onclick = () => editor.open(characterById(settings.character));
  box.querySelector(".cr-del").onclick = () => {
    const c = characterById(settings.character);
    if (!c.user || !confirm(`Supprimer ${c.name} ?`)) return;
    settings.customChars = (settings.customChars || []).filter((x) => x.id !== c.id);
    select("perso");
  };
}
