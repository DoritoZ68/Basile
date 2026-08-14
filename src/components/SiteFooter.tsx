import Link from "next/link";
import { CATEGORIES } from "@/lib/content";

const CATEGORY_LINKS = (["om", "ville", "culture", "mer"] as const).map((key) => ({
  href: `/rubrique/${key}`,
  label: CATEGORIES[key].label,
}));

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
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          {CATEGORY_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft transition hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/agenda" className="text-ink-soft transition hover:text-ink">
            Agenda
          </Link>
          <Link href="/favoris" className="text-ink-soft transition hover:text-ink">
            Favoris
          </Link>
          <Link href="/a-propos" className="text-ink-soft transition hover:text-ink">
            À propos
          </Link>
          <a href="mailto:redaction@3points.fr" className="text-ink-soft transition hover:text-ink">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
