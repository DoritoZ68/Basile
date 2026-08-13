import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description: "3 Points : Marseille résumée en 3 points, sans détour.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold text-blue">À propos</p>
      <h1 className="mt-2 text-balance font-display text-3xl text-ink">
        Marseille, sans le blabla.
      </h1>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-soft">
        <p>
          <strong className="text-ink">3 Points</strong> résume l&apos;actualité marseillaise —
          l&apos;OM, la ville, la culture, la mer — en trois idées par sujet, à parcourir comme
          des stories : on glisse, on tape, on repart avec l&apos;essentiel.
        </p>
        <p>
          Chaque histoire peut se prolonger d&apos;une phrase de contexte pour qui veut creuser un
          peu plus, jamais davantage.
        </p>
        <p>
          Média indépendant, non affilié à l&apos;Olympique de Marseille SA ni à la ville de
          Marseille.
        </p>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">Crédits photo</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Les photographies proviennent de Wikimedia Commons, sous licence Creative Commons
          Attribution-ShareAlike : Randy110912, Bernard Ddd, Rémi Mathis (Orange Vélodrome) ;
          Chabe01 (tramway) ; Ingo Mehling (Vieux-Port) ; Houss 2020 (Mucem) ; Kallerna
          (Notre-Dame de la Garde) ; Georges Seguin (calanques). Détail des licences sur chaque
          fichier.
        </p>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Une correction à signaler ?{" "}
          <a href="mailto:redaction@3points.fr" className="text-blue hover:underline">
            redaction@3points.fr
          </a>
        </p>
      </div>
    </div>
  );
}
