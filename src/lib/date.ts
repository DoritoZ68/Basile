const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Monday of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function endOfIsoWeek(date: Date): Date {
  const start = startOfIsoWeek(date);
  return new Date(start.getTime() + 6 * DAY_MS);
}

/** ISO week id like "2026-W33". */
export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function weekIdOffset(weekId: string, offsetWeeks: number): string {
  const [year, week] = weekId.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const base = startOfIsoWeek(jan4);
  const target = new Date(base.getTime() + (week - 1 + offsetWeeks) * 7 * DAY_MS);
  return isoWeekId(target);
}

export function formatWeekRange(weekId: string): string {
  const [year, week] = weekId.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = startOfIsoWeek(jan4);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const start = `${monday.getUTCDate()}`;
  const end = `${sunday.getUTCDate()} ${MONTHS_FR[sunday.getUTCMonth()]}`;
  return sameMonth
    ? `Semaine du ${start} au ${end} ${sunday.getUTCFullYear()}`
    : `Semaine du ${start} ${MONTHS_FR[monday.getUTCMonth()]} au ${end} ${sunday.getUTCFullYear()}`;
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function currentWeekId(): string {
  return isoWeekId(new Date());
}
