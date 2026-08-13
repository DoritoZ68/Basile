import Image from "next/image";
import { daysUntil, formatKickoff, nextFixture } from "@/lib/matchday";

export function NextMatchWidget() {
  const days = daysUntil(nextFixture.kickoff);
  const label = days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line">
      <div className="absolute inset-0">
        <Image
          src="/images/velodrome/tribune-virage-sud.jpg"
          alt="Tribune du virage Sud du Vélodrome un soir de match"
          fill
          sizes="360px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/80" />
      </div>

      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-xs tracking-wide text-sky">Prochain match</p>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold ring-1 ring-inset ring-gold/30">
            {label}
          </span>
        </div>

        <p className="text-xs text-mist-dim">{nextFixture.competition}</p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-balance font-display text-lg leading-tight text-white">
            {nextFixture.home}
          </span>
          <span className="font-display text-sm text-mist-dim">VS</span>
          <span className="text-balance text-right font-display text-lg leading-tight text-white">
            {nextFixture.away}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-mist">
          <span>{formatKickoff(nextFixture.kickoff)}</span>
          <span>{nextFixture.venue}</span>
        </div>
      </div>
    </div>
  );
}
