import { nextFixture, daysUntil, formatKickoffShort } from "@/lib/matchday";

export function NextMatchCard() {
  const days = daysUntil(nextFixture.kickoff);
  const label = days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`;

  return (
    <div className="rounded-2xl border border-line bg-blue-tint p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">Prochain match</p>
        <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-bold text-white">{label}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-display text-lg text-ink">{nextFixture.home}</span>
        <span className="text-sm text-ink-faint">vs</span>
        <span className="font-display text-lg text-ink">{nextFixture.away}</span>
      </div>
      <p className="mt-3 text-sm text-ink-soft">{formatKickoffShort(nextFixture.kickoff)} · Orange Vélodrome</p>
    </div>
  );
}
