import Link from "next/link";
import type { Article } from "@/lib/content";
import { MediaFrame } from "@/components/MediaFrame";
import { CategoryPill } from "@/components/CategoryPill";
import { ThreePoints } from "@/components/ThreePoints";
import { formatFullDate } from "@/lib/date";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel/60 transition hover:border-sky/30 hover:bg-panel">
      <Link href={`/actu/${article.slug}`} className="block">
        <MediaFrame media={article.media} rounded="rounded-none" sizes="(min-width: 1024px) 380px, 100vw" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryPill category={article.category} />
          <span className="text-xs text-mist-dim">{formatFullDate(article.publishedAt)}</span>
        </div>
        <Link href={`/actu/${article.slug}`}>
          <h3 className="text-balance font-display text-xl leading-[1.05] text-white transition group-hover:text-sky">
            {article.title}
          </h3>
        </Link>
        <p className="text-sm leading-relaxed text-mist-dim">{article.dek}</p>
        <div className="mt-1 border-t border-line pt-4">
          <ThreePoints points={article.points} size="sm" />
        </div>
        <Link
          href={`/actu/${article.slug}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-sky"
        >
          Lire l&apos;article
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </article>
  );
}
