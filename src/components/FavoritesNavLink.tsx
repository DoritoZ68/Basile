"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites-context";

export function FavoritesNavLink({ onClick, variant = "desktop" }: { onClick?: () => void; variant?: "desktop" | "mobile" }) {
  const { favorites } = useFavorites();
  const count = favorites.length;

  if (variant === "mobile") {
    return (
      <Link
        href="/favoris"
        onClick={onClick}
        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
      >
        Favoris
        {count > 0 && (
          <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white">{count}</span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/favoris"
      onClick={onClick}
      className="relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
    >
      Favoris
      {count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
