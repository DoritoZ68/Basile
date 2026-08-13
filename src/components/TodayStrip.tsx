import { todaySnapshot } from "@/lib/today";
import { nextFixture, daysUntil, formatKickoffShort } from "@/lib/matchday";

export function TodayStrip() {
  const days = daysUntil(nextFixture.kickoff);
  const matchLabel = days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : formatKickoffShort(nextFixture.kickoff);

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-2 text-xs text-ink-soft sm:px-6">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">☀️</span>
          Marseille {todaySnapshot.tempC}°
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">🌊</span>
          Mer {todaySnapshot.seaTempC}°
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
          OM · {nextFixture.away} — {matchLabel}
        </span>
      </div>
    </div>
  );
}
