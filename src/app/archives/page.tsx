import type { Metadata } from "next";
import { getAllWeeksDesc, getArticlesByWeek } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";
import { WeekBadge } from "@/components/WeekBadge";

export const metadata: Metadata = {
  title: "Archives",
  description: "Toutes les éditions passées d'Actu OM en 3 points, semaine par semaine.",
};

export default function ArchivesPage() {
  const weeks = getAllWeeksDesc();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="font-display text-xs tracking-[0.2em] text-sky">Archives</p>
      <h1 className="mt-1 text-balance font-display text-2xl text-white sm:text-3xl">
        Toutes les éditions, semaine par semaine
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist-dim">
        Chaque semaine, la rédaction publie une nouvelle sélection d&apos;actus résumées
        en 3 points. Retrouvez ici l&apos;historique complet des éditions.
      </p>

      <div className="mt-10 flex flex-col gap-16">
        {weeks.map((weekId) => {
          const items = getArticlesByWeek(weekId);
          return (
            <section key={weekId} id={weekId} className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
                <WeekBadge weekId={weekId} />
                <span className="text-xs text-mist-dim">
                  {items.length} article{items.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
