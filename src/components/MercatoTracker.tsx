import { daysUntil, mercatoTracker } from "@/lib/matchday";

export function MercatoTracker() {
  const days = daysUntil(mercatoTracker.deadline);

  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-5">
      <p className="font-display text-xs tracking-wide text-sky">Mercato en chiffres</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-ink/40 p-3 text-center">
          <p className="font-display text-3xl text-white">{mercatoTracker.arrivals}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-mist-dim">Arrivée{mercatoTracker.arrivals > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-line bg-ink/40 p-3 text-center">
          <p className="font-display text-3xl text-white">{mercatoTracker.departures}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-mist-dim">Départ{mercatoTracker.departures > 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 px-3 py-2.5">
        <span className="text-xs text-mist">Avant la clôture du mercato</span>
        <span className="font-display text-sm text-gold">J-{days}</span>
      </div>
    </div>
  );
}
