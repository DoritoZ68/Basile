"use client";

import { useFavorites } from "@/lib/favorites-context";

export function FavoriteButton({
  slug,
  variant = "overlay",
}: {
  slug: string;
  variant?: "overlay" | "solid";
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(slug);

  const base =
    variant === "overlay"
      ? "bg-black/30 text-white backdrop-blur"
      : active
        ? "bg-coral text-white"
        : "bg-black/25 text-white";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${base}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}>
        <path
          d="M12 20.5s-7.5-4.6-10-9.2C.4 7.8 2 4 5.7 4c2 0 3.6 1.1 4.3 2.7C10.7 5.1 12.3 4 14.3 4 18 4 19.6 7.8 18 11.3c-2.5 4.6-10 9.2-10 9.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
