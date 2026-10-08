"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  coursesByRank,
  totalMinutes,
  type CategoryKey,
  type Level,
} from "@/lib/catalog";
import { CourseCard } from "@/components/CourseCard";
import { Icon } from "@/components/Icon";

type Sort = "popular" | "price-asc" | "price-desc" | "duration";

const LEVELS: Level[] = ["Débutant", "Intermédiaire", "Avancé"];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function CatalogBrowser({ initialCategory }: { initialCategory: CategoryKey | null }) {
  const [category, setCategory] = useState<CategoryKey | null>(initialCategory);
  const [level, setLevel] = useState<Level | "all">("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = coursesByRank().filter((c) => {
      if (category && c.category !== category) return false;
      if (level !== "all" && c.level !== level) return false;
      if (!q) return true;
      return normalize([c.title, c.subtitle, c.description, ...c.tools].join(" ")).includes(q);
    });
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "duration") list.sort((a, b) => totalMinutes(b) - totalMinutes(a));
    return list;
  }, [category, level, sort, query]);

  function pickCategory(next: CategoryKey | null) {
    setCategory(next);
    // Keep the URL shareable without triggering a server round-trip.
    const url = next ? `/formations?categorie=${next}` : "/formations";
    window.history.replaceState(null, "", url);
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-ink bg-ink text-bg" : "border-line text-ink-soft hover:border-ink-faint hover:text-ink"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher une formation</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : IA, Shopify, SQL, Figma…"
            className="h-11 w-full rounded-xl border border-line bg-bg pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </label>
        <div className="flex gap-3">
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Niveau</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level | "all")}
              className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">Tous niveaux</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Trier par</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="popular">Les plus populaires</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="duration">Les plus complètes</option>
            </select>
          </label>
        </div>
      </div>

      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => pickCategory(null)} className={chip(category === null)}>
          Toutes
        </button>
        {CATEGORY_ORDER.map((key) => (
          <button key={key} type="button" onClick={() => pickCategory(key)} className={chip(category === key)}>
            {CATEGORIES[key].label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink-faint" aria-live="polite">
        {results.length} formation{results.length > 1 ? "s" : ""}
      </p>

      {results.length > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-semibold text-ink">Aucune formation ne correspond.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLevel("all");
              pickCategory(null);
            }}
            className="mt-3 text-sm font-semibold text-brand"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}
