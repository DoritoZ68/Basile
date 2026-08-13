export const nextFixture = {
  home: "OM",
  away: "Rennes",
  /** ISO datetime, UTC. */
  kickoff: "2026-08-16T19:00:00Z",
};

export function daysUntil(iso: string, from: Date = new Date()): number {
  const diff = new Date(iso).getTime() - from.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function formatKickoffShort(iso: string): string {
  const d = new Date(iso);
  const paris = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const hh = String(paris.getUTCHours()).padStart(2, "0");
  const days = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()}, ${hh}h`;
}
