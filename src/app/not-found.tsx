import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-blue" />
        <span className="h-3 w-3 rounded-full bg-coral" />
        <span className="h-3 w-3 rounded-full bg-ink-faint" />
      </span>
      <p className="mt-6 text-sm font-semibold text-blue">Erreur 404</p>
      <h1 className="mt-2 text-balance font-display text-2xl text-ink sm:text-3xl">
        Cette histoire n&apos;existe pas
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
        Le lien est peut-être obsolète.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-strong"
      >
        Retour à l&apos;accueil
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
