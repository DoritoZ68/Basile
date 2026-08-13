export const nextFixture = {
  competition: "Ligue 1 · Journée 1",
  home: "Olympique de Marseille",
  away: "Stade Rennais",
  venue: "Orange Vélodrome",
  /** ISO datetime, UTC. */
  kickoff: "2026-08-16T19:00:00Z",
};

export const mercatoTracker = {
  arrivals: 0,
  departures: 1,
  /** ISO datetime, UTC — traditional closing date of the summer window. */
  deadline: "2026-09-01T22:00:00Z",
};

export function daysUntil(iso: string, from: Date = new Date()): number {
  const diff = new Date(iso).getTime() - from.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const day = WEEKDAYS_FR[d.getUTCDay()];
  const paris = new Date(d.getTime() + 2 * 60 * 60 * 1000); // UTC+2 en août (heure d'été)
  const hh = String(paris.getUTCHours()).padStart(2, "0");
  const mm = String(paris.getUTCMinutes()).padStart(2, "0");
  return `${day} ${d.getUTCDate()} ${MONTHS_FR[d.getUTCMonth()]}, ${hh}h${mm}`;
}
