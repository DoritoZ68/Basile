// Inventaire : bidons, poches du maillot et matériel (roues, pneus).
// Chaque choix a un effet chiffré sur la physique et le ravitaillement.

export const KIT_DEFAULT = {
  bottles: [{ size: 500, drink: "iso" }, { size: 500, drink: "iso" }],
  bars: 2, gels: 2, cafGels: 0,
  wheels: "alu", tyres: "25",
};

export const POCKETS = 8; // poches du maillot : barres + gels au total

// roues : masse en plus (kg), traînée (coefficient sur CdA)
export const WHEELS = {
  alu: { name: "Alu 30 mm", text: "Robustes, un peu lourdes", mass: 0.35, cda: 1 },
  carbon50: { name: "Carbone 50 mm", text: "Légères et plus aérodynamiques", mass: 0, cda: 0.97 },
  carbon80: { name: "Carbone 80 mm", text: "Très aéro sur le plat, plus lourdes en montée", mass: 0.18, cda: 0.955 },
};

// pneus : résistance au roulement, adhérence au sec et sur le mouillé
export const TYRES = {
  "25": { name: "Route 25 mm", text: "Le standard", crr: 1, grip: 1, wet: 1, mass: 0 },
  "28tl": { name: "Tubeless 28 mm", text: "Roule mieux, accroche un peu plus", crr: 0.88, grip: 1.04, wet: 1.04, mass: 0.06 },
  pluie: { name: "Pluie 28 mm", text: "Gomme tendre : bien plus d'adhérence sur le mouillé", crr: 1.08, grip: 1.02, wet: 1.16, mass: 0.08 },
};

export const ITEMS = {
  bar: { name: "Barre", carbs: 40, mass: 0.055 },
  gel: { name: "Gel", carbs: 25, mass: 0.035 },
  cafGel: { name: "Gel caféiné", carbs: 25, mass: 0.035 },
};

export function normKit(k) {
  const kit = { ...KIT_DEFAULT, ...(k || {}) };
  kit.bottles = (Array.isArray(kit.bottles) ? kit.bottles : KIT_DEFAULT.bottles).slice(0, 2).map((b) => ({ size: b.size === 750 ? 750 : 500, drink: b.drink === "eau" ? "eau" : "iso" }));
  for (const key of ["bars", "gels", "cafGels"]) kit[key] = Math.max(0, Math.min(POCKETS, Math.round(kit[key] || 0)));
  while (kit.bars + kit.gels + kit.cafGels > POCKETS) {
    if (kit.cafGels) kit.cafGels--; else if (kit.gels) kit.gels--; else kit.bars--;
  }
  if (!WHEELS[kit.wheels]) kit.wheels = "alu";
  if (!TYRES[kit.tyres]) kit.tyres = "25";
  return kit;
}

// masse emportée (kg) : bidons pleins (80 g à vide), poches, roues, pneus
export function kitMass(kit) {
  let m = WHEELS[kit.wheels].mass + TYRES[kit.tyres].mass;
  for (const b of kit.bottles) m += 0.08 + b.size / 1000;
  m += kit.bars * ITEMS.bar.mass + kit.gels * ITEMS.gel.mass + kit.cafGels * ITEMS.cafGel.mass;
  return m;
}

export function kitCarbs(kit) {
  let c = kit.bars * 40 + (kit.gels + kit.cafGels) * 25;
  for (const b of kit.bottles) if (b.drink === "iso") c += (b.size / 1000) * 40;
  return c;
}

export const kitLiquid = (kit) => kit.bottles.reduce((a, b) => a + b.size, 0);

// applique le matériel au coureur (physique)
export function applyKit(r, kit) {
  r.bikeMass += WHEELS[kit.wheels].mass + TYRES[kit.tyres].mass;
  r.cdaK = WHEELS[kit.wheels].cda;
  r.crrK = TYRES[kit.tyres].crr;
  r.gripK = TYRES[kit.tyres].grip;
  r.wetGripK = TYRES[kit.tyres].wet;
}
