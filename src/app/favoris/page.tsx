import type { Metadata } from "next";
import { FavoritesList } from "@/components/FavoritesList";

export const metadata: Metadata = {
  title: "Favoris",
  description: "Les histoires que vous avez enregistrées.",
};

export default function FavorisPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold text-coral">Favoris</p>
      <h1 className="mt-2 text-balance font-display text-3xl text-ink">Vos histoires enregistrées</h1>
      <p className="mt-3 max-w-md text-sm text-ink-soft">
        Enregistrées sur cet appareil uniquement — pas de compte, pas de synchronisation.
      </p>
      <FavoritesList />
    </div>
  );
}
