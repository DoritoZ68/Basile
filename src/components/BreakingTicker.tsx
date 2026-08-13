import Link from "next/link";
import type { Article } from "@/lib/content";

export function BreakingTicker({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  // Duplicated once so the CSS marquee loops seamlessly.
  const loop = [...articles, ...articles];

  return (
    <div className="border-b border-line bg-panel/70">
      <div className="mx-auto flex max-w-6xl items-stretch">
        <span className="hidden shrink-0 items-center gap-2 bg-gold px-4 text-xs font-bold uppercase tracking-wide text-ink sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
          En bref
        </span>
        <div className="ticker-mask relative flex-1 overflow-hidden py-2.5">
          <div className="ticker-track flex w-max items-center gap-10 whitespace-nowrap">
            {loop.map((article, i) => (
              <Link
                key={`${article.slug}-${i}`}
                href={`/actu/${article.slug}`}
                className="text-xs text-mist transition hover:text-white"
              >
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
