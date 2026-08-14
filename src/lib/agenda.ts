import type { Category } from "@/lib/content";

type AgendaBase = {
  title: string;
  place: string;
  category: Category;
  relatedSlug?: string;
};

export type AgendaItem =
  | (AgendaBase & { recurring: true; label: string })
  | (AgendaBase & { recurring: false; date: string });

export const agendaItems: AgendaItem[] = [
  {
    title: "Marché aux poissons",
    recurring: true,
    label: "Tous les matins, 8h-13h",
    place: "Quai des Belges, Vieux-Port",
    category: "ville",
    relatedSlug: "vieux-port-coeur-de-ville",
  },
  {
    title: "OM - Stade Rennais",
    recurring: false,
    date: "2026-08-16",
    place: "Orange Vélodrome",
    category: "om",
  },
  {
    title: "Dernier jour pour réserver son accès aux calanques",
    recurring: false,
    date: "2026-08-30",
    place: "Massif des Calanques",
    category: "mer",
    relatedSlug: "calanques-reservation-obligatoire",
  },
  {
    title: "Dernier jour de l'exposition Bonnes Mères",
    recurring: false,
    date: "2026-08-31",
    place: "Mucem — J4 & fort Saint-Jean",
    category: "culture",
    relatedSlug: "bonnes-meres-mucem",
  },
];

export function getUpcomingDated(): Extract<AgendaItem, { recurring: false }>[] {
  return agendaItems
    .filter((i): i is Extract<AgendaItem, { recurring: false }> => !i.recurring)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function getRecurring(): Extract<AgendaItem, { recurring: true }>[] {
  return agendaItems.filter((i): i is Extract<AgendaItem, { recurring: true }> => i.recurring);
}
