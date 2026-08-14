import Link from "next/link";
import { getUpcomingDated } from "@/lib/agenda";
import { CATEGORIES } from "@/lib/content";
import { ACCENT } from "@/lib/accent";
import { formatDayDate } from "@/lib/date";

export function AgendaTeaser() {
  const items = getUpcomingDated().slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">À l&apos;agenda</h2>
        <Link href="/agenda" className="text-sm font-semibold text-blue hover:underline">
          Tout voir →
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const accent = ACCENT[CATEGORIES[item.category].accent];
          return (
            <Link
              key={item.title}
              href={item.relatedSlug ? `/histoire/${item.relatedSlug}` : "/agenda"}
              className="rounded-2xl border border-line p-4 transition hover:border-ink-faint"
            >
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${accent.bg}`}>
                {CATEGORIES[item.category].label}
              </span>
              <p className="mt-2 font-display text-sm leading-snug text-ink">{item.title}</p>
              <p className="mt-1 text-xs text-ink-soft">{formatDayDate(item.date)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
