import type { Metadata } from "next";
import { getUpcomingDated, getRecurring } from "@/lib/agenda";
import { CATEGORIES } from "@/lib/content";
import { ACCENT } from "@/lib/accent";
import { formatDayDate, daysUntilDate } from "@/lib/date";
import { AgendaRow } from "@/components/AgendaRow";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Les dates à cocher à Marseille : matchs, expos, deadlines.",
};

export default function AgendaPage() {
  const dated = getUpcomingDated();
  const recurring = getRecurring();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold text-blue">Agenda</p>
      <h1 className="mt-2 text-balance font-display text-3xl text-ink">Les dates à cocher</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Ce qui approche à Marseille — matchs, expositions, deadlines.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {dated.map((item) => {
          const accent = ACCENT[CATEGORIES[item.category].accent];
          const days = daysUntilDate(item.date);
          const href = item.relatedSlug ? `/histoire/${item.relatedSlug}` : undefined;
          return (
            <AgendaRow key={item.title} href={href}>
              <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${accent.tint}`}>
                <span className={`font-display text-lg leading-none ${accent.text}`}>
                  {new Date(`${item.date}T00:00:00Z`).getUTCDate()}
                </span>
                <span className={`text-[10px] uppercase ${accent.text}`}>
                  {new Date(`${item.date}T00:00:00Z`).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base leading-tight text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {formatDayDate(item.date)} · {item.place}
                </p>
              </div>
              {days >= 0 && days <= 30 && (
                <span className="shrink-0 text-xs font-semibold text-ink-faint">
                  {days === 0 ? "Aujourd'hui" : `J-${days}`}
                </span>
              )}
            </AgendaRow>
          );
        })}
      </div>

      {recurring.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-wide text-ink-faint">Tous les jours</h2>
          <div className="mt-3 flex flex-col gap-3">
            {recurring.map((item) => {
              const accent = ACCENT[CATEGORIES[item.category].accent];
              const href = item.relatedSlug ? `/histoire/${item.relatedSlug}` : undefined;
              return (
                <AgendaRow key={item.title} href={href}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base leading-tight text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {item.label} · {item.place}
                    </p>
                  </div>
                </AgendaRow>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
