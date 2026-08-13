import Link from "next/link";
import type { Article } from "@/lib/content";
import { MediaFrame } from "@/components/MediaFrame";
import { CategoryPill } from "@/components/CategoryPill";
import { ThreePoints } from "@/components/ThreePoints";

export function DigestStrip({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
      {articles.map((article) => (
        <Link
          key={article.slug}
          href={`/actu/${article.slug}`}
          className="group flex w-[85vw] shrink-0 snap-start gap-4 rounded-2xl border border-line bg-panel/60 p-4 transition hover:border-sky/30 hover:bg-panel sm:w-[380px]"
        >
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line">
            <MediaFrame
              media={article.media}
              rounded="rounded-none"
              aspect="h-full w-full"
              showBadge={false}
              sizes="96px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CategoryPill category={article.category} />
            <h3 className="line-clamp-2 font-display text-[15px] leading-tight text-white transition group-hover:text-sky">
              {article.title}
            </h3>
            <ThreePoints
              points={[
                article.points[0].length > 58 ? `${article.points[0].slice(0, 58)}…` : article.points[0],
                article.points[1].length > 58 ? `${article.points[1].slice(0, 58)}…` : article.points[1],
                article.points[2].length > 58 ? `${article.points[2].slice(0, 58)}…` : article.points[2],
              ]}
              size="sm"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
