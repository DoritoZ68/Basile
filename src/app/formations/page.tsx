import type { Metadata } from "next";
import { CATEGORIES, type CategoryKey } from "@/lib/catalog";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export const metadata: Metadata = {
  title: "Toutes les formations",
  description: "Le catalogue complet : IA, automatisation, business en ligne, marketing, data, cybersécurité et design.",
};

export default async function FormationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { categorie } = await searchParams;
  const initial = typeof categorie === "string" && categorie in CATEGORIES ? (categorie as CategoryKey) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm font-semibold text-brand">Catalogue</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Toutes les formations</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Chaque formation est construite autour d&apos;un projet concret, avec accès à vie et mises à jour
        incluses.
      </p>
      <div className="mt-10">
        {/* key: remount when the category in the URL changes (e.g. footer link while already on this page) */}
        <CatalogBrowser key={initial ?? "all"} initialCategory={initial} />
      </div>
    </div>
  );
}
