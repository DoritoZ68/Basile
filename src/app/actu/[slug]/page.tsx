import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { articles, getArticle, getRelated, weekIdOf } from "@/lib/content";
import { MediaFrame } from "@/components/MediaFrame";
import { CategoryPill } from "@/components/CategoryPill";
import { ThreePoints } from "@/components/ThreePoints";
import { ArticleCard } from "@/components/ArticleCard";
import { WeekBadge } from "@/components/WeekBadge";
import { ShareButtons } from "@/components/ShareButtons";
import { formatFullDate } from "@/lib/date";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.dek,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = getRelated(article);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Link href="/" className="text-sm font-semibold text-sky hover:text-white">
        ← Retour à l&apos;accueil
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <CategoryPill category={article.category} />
        <WeekBadge weekId={weekIdOf(article)} />
        <span className="text-xs text-mist-dim">
          {formatFullDate(article.publishedAt)} · {article.readMinutes} min de lecture
        </span>
      </div>

      <h1 className="mt-4 text-balance font-display text-3xl leading-[1.05] text-white sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist-dim">{article.dek}</p>

      <div className="mt-8">
        <MediaFrame media={article.media} priority aspect="aspect-[16/10] w-full" />
      </div>

      <div className="mt-8 rounded-2xl border border-sky/20 bg-panel/60 p-6 sm:p-8">
        <p className="mb-4 font-display text-sm tracking-wide text-sky">Les 3 points à retenir</p>
        <ThreePoints points={article.points} size="lg" tone="light" />
      </div>

      <div className="prose-om mt-10 space-y-5">
        {article.body.map((paragraph, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-mist">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tag/${encodeURIComponent(tag)}`}
              className="rounded-full border border-line px-3 py-1 text-xs text-mist-dim transition hover:border-sky hover:text-sky"
            >
              #{tag}
            </Link>
          ))}
        </div>
        <ShareButtons title={article.title} url={`${SITE_URL}/actu/${article.slug}`} />
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-xl text-white">À lire aussi</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
