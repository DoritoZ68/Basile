import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-4xl text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-faint">Dernière mise à jour : {updated}</p>
      <div className="mt-10 space-y-8 text-ink-soft [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_p]:mt-3 [&_li]:mt-1 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
