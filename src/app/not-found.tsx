import Link from "next/link";
import { BallStarIllustration } from "@/components/illustrations";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="w-40 overflow-hidden rounded-full border border-line">
        <BallStarIllustration className="aspect-square w-full" />
      </div>
      <p className="mt-8 font-display text-xs tracking-[0.2em] text-sky">Erreur 404</p>
      <h1 className="mt-2 text-balance font-display text-2xl text-white sm:text-3xl">
        Hors-jeu : cette page n&apos;existe pas
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-mist-dim">
        Le lien est peut-être obsolète, ou l&apos;article a rejoint les archives sous une
        autre adresse.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
      >
        Retour à l&apos;accueil
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
