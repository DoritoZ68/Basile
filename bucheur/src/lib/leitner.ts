import { addDays, dayKey, daysUntil } from './stats';
import type { Card } from './types';

/** Intervalle (en jours) avant de revoir une fiche, selon sa boîte. */
export const BOX_INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = BOX_INTERVALS.length;

/**
 * Méthode Leitner : une bonne réponse fait monter la fiche d'une boîte (elle reviendra plus
 * tard), une erreur la renvoie dans la première boîte (elle revient dès demain).
 */
export function reviewCard(card: Card, correct: boolean, now: number = Date.now()): Card {
  const box = correct ? Math.min(MAX_BOX, card.box + 1) : 1;
  return {
    ...card,
    box,
    due: dayKey(addDays(now, BOX_INTERVALS[box - 1])),
    reviews: (card.reviews ?? 0) + 1,
    correct: (card.correct ?? 0) + (correct ? 1 : 0),
  };
}

/** Fiches à revoir aujourd'hui (ou en retard), les plus anciennes d'abord. */
export function dueCards(cards: Card[], now: number = Date.now()): Card[] {
  const today = dayKey(now);
  return cards
    .filter((c) => c.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box || a.createdAt - b.createdAt);
}

/** Une fiche est « acquise » quand elle a atteint la dernière boîte. */
export function masteredCount(cards: Card[]): number {
  return cards.filter((c) => c.box >= MAX_BOX).length;
}

/** Jours avant la prochaine révision d'une fiche (0 = aujourd'hui). */
export function daysBeforeReview(card: Card, now: number = Date.now()): number {
  return Math.max(0, daysUntil(card.due, now));
}
