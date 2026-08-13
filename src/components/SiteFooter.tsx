import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-blue" />
          <span className="h-2 w-2 rounded-full bg-coral" />
          <span className="h-2 w-2 rounded-full bg-teal" />
        </span>
        <p className="max-w-sm text-sm text-ink-soft">
          Marseille, résumée en 3 points. Média indépendant, non affilié à l&apos;Olympique de
          Marseille SA ni à la ville de Marseille.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/a-propos" className="text-ink-soft transition hover:text-ink">
            À propos
          </Link>
          <span className="text-ink-faint">·</span>
          <a href="mailto:redaction@3points.fr" className="text-ink-soft transition hover:text-ink">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
