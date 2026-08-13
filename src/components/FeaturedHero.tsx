import Link from "next/link";
import type { Article } from "@/lib/content";
import { MediaFrame } from "@/components/MediaFrame";
import { CategoryPill } from "@/components/CategoryPill";
import { ThreePoints } from "@/components/ThreePoints";
import { formatFullDate } from "@/lib/date";

export function FeaturedHero({ article }: { article: Article }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-line bg-panel">
      <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
        <div className="relative order-1 aspect-[4/3] lg:order-2 lg:aspect-auto">
          <MediaFrame
            media={article.media}
            priority
            rounded="rounded-none"
            aspect="h-full w-full"
            sizes="(min-width: 1024px) 640px, 100vw"
          />
        </div>

        <div className="relative order-2 flex flex-col justify-center gap-5 p-6 sm:p-10 lg:order-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold ring-1 ring-inset ring-gold/30">
              À la une
            </span>
            <CategoryPill category={article.category} />
            <span className="text-xs text-mist-dim">{formatFullDate(article.publishedAt)}</span>
          </div>

          <h1 className="text-balance font-display text-3xl leading-[1.02] text-white sm:text-4xl lg:text-[2.6rem]">
            {article.title}
          </h1>

          <p className="max-w-lg text-[15px] leading-relaxed text-mist-dim">{article.dek}</p>

          <div className="max-w-md rounded-2xl border border-line bg-ink/40 p-5">
            <p className="mb-3 font-display text-xs tracking-wide text-sky">Les 3 points à retenir</p>
            <ThreePoints points={article.points} size="lg" />
          </div>

          <Link
            href={`/actu/${article.slug}`}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-sky px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
          >
            Lire l&apos;article complet
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
