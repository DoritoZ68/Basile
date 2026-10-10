/**
 * Cernes de bois : cercles légèrement irréguliers et excentrés, comme sur une
 * rondelle de tronc. Partagé entre l'écran Focus, les stats et l'icône de l'app.
 */

const STEPS = 120;

/** Point d'un cerne à l'angle `theta` ; `index` donne à chaque cerne sa propre ondulation. */
function ringPoint(cx: number, cy: number, r: number, index: number, theta: number) {
  // Le bois pousse un peu plus d'un côté : le centre de chaque cerne se décale avec le rayon.
  const ox = cx + r * 0.05;
  const oy = cy + r * 0.025;
  // Ondulation qui varie lentement d'un cerne à l'autre, pour qu'ils ne se croisent jamais.
  const wobble =
    1 +
    0.022 * Math.sin(3 * theta + index * 0.35) +
    0.012 * Math.sin(5 * theta + index * 0.5) +
    0.01 * Math.sin(2 * theta + 0.6);
  return [ox + r * wobble * Math.cos(theta), oy + r * wobble * Math.sin(theta)] as const;
}

/**
 * Chemin SVG d'un cerne. `sweep` (0 → 1) permet de ne tracer qu'une partie du cerne,
 * en partant du haut et dans le sens des aiguilles d'une montre.
 */
export function ringPath(cx: number, cy: number, r: number, index: number, sweep = 1): string {
  const s = Math.max(0, Math.min(1, sweep));
  const steps = Math.max(2, Math.round(STEPS * s));
  const start = -Math.PI / 2;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const theta = start + (i / steps) * s * 2 * Math.PI;
    const [x, y] = ringPoint(cx, cy, r, index, theta);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return s >= 1 ? `${d}Z` : d;
}

/** Rayon du cerne `index` (0 = le plus proche du cœur) pour `count` cernes tenant dans `maxR`. */
export function ringRadius(index: number, count: number, maxR: number, minStep = 6, maxStep = 16) {
  const core = maxR * 0.12;
  const step = Math.max(minStep, Math.min(maxStep, (maxR - core) / Math.max(1, count)));
  return core + step * (index + 1);
}
