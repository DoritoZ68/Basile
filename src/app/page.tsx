import Link from "next/link";
import {
  CATEGORIES,
  type Category,
  getArticlesByCategory,
  getArticlesByWeek,
  getFeatured,
  getLatestWeekId,
} from "@/lib/content";
import { FeaturedHero } from "@/components/FeaturedHero";
import { DigestStrip } from "@/components/DigestStrip";
import { ArticleCard } from "@/components/ArticleCard";
import { WeekBadge } from "@/components/WeekBadge";
import { NextMatchWidget } from "@/components/NextMatchWidget";
import { MercatoTracker } from "@/components/MercatoTracker";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { currentWeekId } from "@/lib/date";

const SECTION_ORDER: Category[] = ["mercato", "match", "vestiaire", "video"];

export default function Home() {
  const latestWeek = getLatestWeekId();
  const isLiveWeek = latestWeek === currentWeekId();
  const weekArticles = getArticlesByWeek(latestWeek);
  const featured = getFeatured(latestWeek);
  const restOfWeek = weekArticles.filter((a) => a.slug !== featured.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <section className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-sky">
            {isLiveWeek ? "Édition de la semaine" : "Dernière édition publiée"}
          </p>
          <h1 className="mt-1 text-balance font-display text-2xl text-white sm:text-3xl">
            Toute l&apos;actu OM, en 3 points.
          </h1>
        </div>
        <WeekBadge weekId={latestWeek} />
      </section>

      <FeaturedHero article={featured} />

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-10">
        <div className="min-w-0">
          {restOfWeek.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-white sm:text-2xl">
                Le reste de la semaine, en <span className="text-gold">3</span> points
              </h2>
              <p className="mt-1 text-sm text-mist-dim">
                Glissez pour tout lire sans ouvrir un seul article.
              </p>
              <div className="mt-6">
                <DigestStrip articles={restOfWeek} />
              </div>
            </section>
          )}

          {SECTION_ORDER.map((category) => {
            const items = getArticlesByCategory(category, undefined, 3);
            if (items.length === 0) return null;
            return (
              <section key={category} id={category} className="mt-16 scroll-mt-24">
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-4">
                  <h2 className="font-display text-xl text-white sm:text-2xl">
                    {CATEGORIES[category].label}
                  </h2>
                  <Link
                    href="/archives"
                    className="shrink-0 text-sm font-semibold text-sky hover:text-white"
                  >
                    Voir tout →
                  </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {items.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <NextMatchWidget />
          <MercatoTracker />
          <NewsletterSignup />
        </aside>
      </div>

      <section className="mt-16 flex flex-col items-center gap-3 rounded-3xl border border-line bg-panel/50 p-10 text-center">
        <p className="font-display text-lg text-white">Envie de revivre les semaines passées ?</p>
        <p className="max-w-md text-sm text-mist-dim">
          Chaque édition reste consultable dans nos archives, classée semaine par semaine.
        </p>
        <Link
          href="/archives"
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky hover:text-sky"
        >
          Parcourir les archives
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
