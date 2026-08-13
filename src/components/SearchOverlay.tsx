"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { articles, CATEGORIES } from "@/lib/content";

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return articles
      .filter(
        (a) =>
          normalize(a.title).includes(q) ||
          normalize(a.dek).includes(q) ||
          a.tags.some((t) => normalize(t).includes(q))
      )
      .slice(0, 8);
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-mist transition hover:border-sky hover:text-sky"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/80 px-4 pt-24 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fermer la recherche"
            onClick={close}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-panel shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-mist-dim">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un article, un joueur, un sujet…"
                className="w-full bg-transparent text-sm text-white placeholder:text-mist-dim focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-mist-dim sm:block">
                Échap
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query.trim() === "" && (
                <p className="px-3 py-6 text-center text-sm text-mist-dim">
                  Commencez à taper pour chercher dans toutes les actus.
                </p>
              )}
              {query.trim() !== "" && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-mist-dim">Aucun résultat pour « {query} ».</p>
              )}
              {results.map((article) => (
                <Link
                  key={article.slug}
                  href={`/actu/${article.slug}`}
                  onClick={close}
                  className="flex flex-col gap-1 rounded-xl px-3 py-2.5 transition hover:bg-ink/50"
                >
                  <span className="text-xs font-semibold text-sky">{CATEGORIES[article.category].short}</span>
                  <span className="font-display text-sm leading-tight text-white">{article.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
