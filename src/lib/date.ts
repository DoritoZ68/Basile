const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Short, human relative label — falls back to a full date past a week. */
export function relativeDate(dateStr: string, from: Date = new Date()): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const days = Math.round((from.getTime() - d.getTime()) / DAY_MS);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return formatFullDate(dateStr);
}
