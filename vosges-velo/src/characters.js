// Personnages jouables (fictifs) et sélection en coverflow : cartes en
// perspective, portrait 3D de chaque coureur rendu une fois au démarrage.
import * as THREE from "three";
import { RiderModel } from "./rider.js";

// mass (kg), ftp (W), wp : réserve anaérobie W′ (J), height : échelle du modèle
export const CHARACTERS = [
  { id: "grimpeuse", name: "Léa Kieffer", style: "Grimpeuse", text: "Légère et endurante, elle danse sur les pentes du Grand Ballon.", mass: 53, ftp: 245, wp: 17000, height: 0.95,
    palette: { jersey: "#e85d9a", jersey2: "#ffffff", shorts: "#1c1c22", skin: "#f1c6a6", helmet: "#ffffff", helmet2: "#e85d9a", shoes: "#ffffff", frame: "#f4f4f4", frame2: "#e85d9a" } },
  { id: "rouleur", name: "Marc Hirtz", style: "Rouleur", text: "Gros moteur sur le plat et contre la montre, moins à l'aise quand ça grimpe.", mass: 79, ftp: 330, wp: 22000, height: 1.05,
    palette: { jersey: "#1f5fbf", jersey2: "#f2c230", shorts: "#14213d", skin: "#e0b08f", helmet: "#1f5fbf", helmet2: "#f2c230", shoes: "#111111", frame: "#1d1f24", frame2: "#f2c230" } },
  { id: "sprinteur", name: "Hugo Baumann", style: "Sprinteur", text: "Une grosse réserve anaérobie pour les arrivées groupées.", mass: 76, ftp: 290, wp: 30000, height: 1.0,
    palette: { jersey: "#2f9e57", jersey2: "#111111", shorts: "#111111", skin: "#c99272", helmet: "#111111", helmet2: "#2f9e57", shoes: "#2f9e57", frame: "#111111", frame2: "#2f9e57" } },
  { id: "puncheuse", name: "Sophie Wurtz", style: "Puncheuse", text: "Explosive dans les côtes courtes du piémont.", mass: 58, ftp: 240, wp: 24000, height: 0.97,
    palette: { jersey: "#ff7a1a", jersey2: "#1d1d1d", shorts: "#1d1d1d", skin: "#8d5a3b", helmet: "#1d1d1d", helmet2: "#ff7a1a", shoes: "#ffffff", frame: "#ff7a1a", frame2: "#1d1d1d" } },
  { id: "baroudeur", name: "Yann Ehrhart", style: "Baroudeur", text: "Attaquant infatigable, à l'aise partout sans briller nulle part.", mass: 68, ftp: 285, wp: 21000, height: 1.01,
    palette: { jersey: "#d8323c", jersey2: "#ffffff", shorts: "#202020", skin: "#e8b896", helmet: "#ffffff", helmet2: "#d8323c", shoes: "#d8323c", frame: "#d8323c", frame2: "#ffffff" } },
  { id: "cyclo", name: "Jean Schaller", style: "Cyclosportif", text: "Le dimanche matin depuis Cernay, fidèle au Vieil Armand.", mass: 82, ftp: 220, wp: 18000, height: 1.03,
    palette: { jersey: "#f2c230", jersey2: "#1f5fbf", shorts: "#111111", skin: "#f0c3a0", helmet: "#f2f2f2", helmet2: "#1f5fbf", shoes: "#111111", frame: "#8d939a", frame2: "#f2c230" } },
  { id: "debutante", name: "Inès Riehl", style: "Débutante", text: "Premières sorties sur les routes des Vosges : on y va doucement.", mass: 62, ftp: 165, wp: 14000, height: 0.96,
    palette: { jersey: "#7fd3ff", jersey2: "#ffffff", shorts: "#2d3540", skin: "#5e3a26", helmet: "#ffffff", helmet2: "#7fd3ff", shoes: "#ffffff", frame: "#ffffff", frame2: "#7fd3ff" } },
  { id: "perso", name: "Personnalisé", style: "Votre réglage", text: "Votre poids, votre puissance seuil et votre maillot (réglages ci-dessous).", custom: true, wp: 20000, height: 1.0, palette: {} },
];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[CHARACTERS.length - 1];

// palette effective : celle du personnage, ou le maillot choisi pour
// « Personnalisé »
export function paletteOf(c, jersey) {
  if (!c.custom) return c.palette;
  return { jersey, jersey2: jersey === "#ffffff" ? "#222222" : "#ffffff", helmet: jersey === "#ffffff" ? "#222222" : "#ffffff", helmet2: jersey, frame: "#202020" };
}

// portraits : un rendu 3/4 avant de chaque personnage, dans un contexte
// WebGL temporaire libéré ensuite
export function renderPortraits(list, jersey, w = 240, h = 300) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  let r;
  try { r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return list.map(() => null); }
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x4a4338, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(2, 3, 2.5);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  cam.position.set(2.2, 1.35, 2.6);
  cam.lookAt(0, 0.85, 0.05);
  const out = [];
  for (const c of list) {
    const m = new RiderModel({ palette: paletteOf(c, jersey), type: "route" });
    m.root.scale.setScalar(c.height || 1);
    if (m.shadow) m.shadow.visible = false;
    m.animate(0.25, 8, 85, 0, 0, 0);
    scene.add(m.root);
    r.render(scene, cam);
    out.push(canvas.toDataURL("image/png"));
    scene.remove(m.root);
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}

// coverflow : cartes alignées, celle du centre de face, les autres
// tournées et reculées ; flèches, clic, molette, glisser au doigt, ← →
export class Coverflow {
  constructor(el, items, index, onChange) {
    this.el = el;
    this.items = items;
    this.i = index;
    this.onChange = onChange;
    el.classList.add("coverflow");
    el.innerHTML = `<button class="cf-nav cf-prev" aria-label="Précédent">‹</button><div class="cf-stage"></div><button class="cf-nav cf-next" aria-label="Suivant">›</button>`;
    this.stage = el.querySelector(".cf-stage");
    this.cards = items.map((it, k) => {
      const d = document.createElement("button");
      d.className = "cf-card";
      d.innerHTML = `<div class="cf-img"></div><b>${it.name}</b><small>${it.style}</small>`;
      d.onclick = () => this.go(k);
      this.stage.appendChild(d);
      return d;
    });
    el.querySelector(".cf-prev").onclick = () => this.go(this.i - 1);
    el.querySelector(".cf-next").onclick = () => this.go(this.i + 1);
    let wheelT = 0;
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const now = performance.now();
      if (now - wheelT < 180) return;
      wheelT = now;
      this.go(this.i + Math.sign(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY));
    }, { passive: false });
    let x0 = null;
    el.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    el.addEventListener("pointerup", (e) => {
      if (x0 !== null && Math.abs(e.clientX - x0) > 40) this.go(this.i + (e.clientX < x0 ? 1 : -1));
      x0 = null;
    });
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { this.go(this.i - 1); e.preventDefault(); e.stopPropagation(); }
      if (e.key === "ArrowRight") { this.go(this.i + 1); e.preventDefault(); e.stopPropagation(); }
    });
    this.layout();
  }

  setImages(urls) {
    urls.forEach((u, k) => { if (u) this.cards[k].querySelector(".cf-img").style.backgroundImage = `url(${u})`; });
  }

  go(k) {
    k = Math.max(0, Math.min(this.items.length - 1, k));
    if (k === this.i) return;
    this.i = k;
    this.layout();
    this.onChange(this.items[k], k);
  }

  layout() {
    this.cards.forEach((c, k) => {
      const d = k - this.i, a = Math.abs(d);
      const x = d === 0 ? 0 : Math.sign(d) * (110 + (a - 1) * 58);
      c.style.transform = `translateX(${x}px) translateZ(${-a * 90 - (a ? 60 : 0)}px) rotateY(${-Math.sign(d) * Math.min(a, 1) * 55}deg)`;
      c.style.zIndex = 100 - a;
      c.style.opacity = a > 3 ? 0 : 1 - a * 0.18;
      c.classList.toggle("on", d === 0);
      c.tabIndex = d === 0 ? 0 : -1;
    });
  }
}
