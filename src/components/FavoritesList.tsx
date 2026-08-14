"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites-context";
import { stories } from "@/lib/content";
import { StoryCard } from "@/components/StoryCard";

export function FavoritesList() {
  const { favorites } = useFavorites();
  const saved = stories.filter((s) => favorites.includes(s.slug));

  if (saved.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line py-16 text-center">
        <span className="text-3xl" aria-hidden="true">
          ♡
        </span>
        <p className="font-display text-lg text-ink">Aucun favori pour l&apos;instant</p>
        <p className="max-w-xs text-sm text-ink-soft">
          Appuyez sur le cœur d&apos;une histoire pour la retrouver ici.
        </p>
        <Link href="/" className="mt-2 text-sm font-semibold text-blue hover:underline">
          Parcourir les histoires →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
      {saved.map((story) => (
        <StoryCard key={story.slug} story={story} />
      ))}
    </div>
  );
}
