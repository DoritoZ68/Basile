import type { Session } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Clé de jour locale au format YYYY-MM-DD. */
export function dayKey(date: Date | number): string {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Minuit local du jour représenté par une clé YYYY-MM-DD. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date | number): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(date: Date | number, n: number): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Lundi de la semaine en cours, à minuit. */
export function startOfWeek(now: Date | number): Date {
  const d = startOfDay(now);
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

/** Nombre de jours calendaires entre aujourd'hui et la date (négatif si passée). */
export function daysUntil(key: string, now: Date | number): number {
  return Math.round((parseDayKey(key).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function minutesByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(s.startedAt);
    map.set(key, (map.get(key) ?? 0) + s.durationMin);
  }
  return map;
}

export function minutesOn(sessions: Session[], date: Date | number): number {
  return minutesByDay(sessions).get(dayKey(date)) ?? 0;
}

/**
 * Jours consécutifs avec au moins une séance. La série reste active tant que
 * l'utilisateur a révisé hier, même s'il n'a pas encore révisé aujourd'hui.
 */
export function currentStreak(sessions: Session[], now: Date | number): number {
  const days = minutesByDay(sessions);
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(sessions: Session[]): number {
  const keys = [...minutesByDay(sessions).keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    run = prev !== null && dayKey(addDays(parseDayKey(prev), 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export type DayBar = { key: string; letter: string; minutes: number; isToday: boolean };

/** Les 7 jours (lundi → dimanche) de la semaine qui contient `weekOf`. */
export function weekBars(
  sessions: Session[],
  weekOf: Date | number,
  now: Date | number = weekOf,
): DayBar[] {
  const days = minutesByDay(sessions);
  const monday = startOfWeek(weekOf);
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const key = dayKey(date);
    return {
      key,
      letter: WEEKDAY_LETTERS[date.getDay()],
      minutes: days.get(key) ?? 0,
      isToday: key === today,
    };
  });
}

/** Minutes par matière sur la semaine (lundi → dimanche) qui contient `now`. */
export function weekMinutesBySubject(sessions: Session[], now: Date | number): Map<string, number> {
  const from = startOfWeek(now).getTime();
  const to = addDays(from, 7).getTime();
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.startedAt < from || s.startedAt >= to) continue;
    map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.durationMin);
  }
  return map;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDate(key: string): string {
  return parseDayKey(key).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
