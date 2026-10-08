import Link from "next/link";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/catalog";
import { CONTACT_EMAIL } from "@/lib/site";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-soft">
            Des formations numériques concrètes, à jour et orientées résultats, pour apprendre les compétences
            qui comptent sur le marché en 2026.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-semibold text-brand">
            {CONTACT_EMAIL}
          </a>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Catalogue</p>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORY_ORDER.map((key) => (
              <li key={key}>
                <Link href={`/formations?categorie=${key}`} className="text-ink-soft transition hover:text-ink">
                  {CATEGORIES[key].label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/packs" className="text-ink-soft transition hover:text-ink">
                Packs & Pass intégral
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Élan Académie</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/a-propos" className="text-ink-soft transition hover:text-ink">
                Notre méthode
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="text-ink-soft transition hover:text-ink">
                Questions fréquentes
              </Link>
            </li>
            <li>
              <Link href="/panier" className="text-ink-soft transition hover:text-ink">
                Panier
              </Link>
            </li>
            <li>
              <Link href="/cgv" className="text-ink-soft transition hover:text-ink">
                Conditions générales de vente
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="text-ink-soft transition hover:text-ink">
                Mentions légales et confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-faint sm:px-6">
          © {new Date().getFullYear()} Élan Académie · Satisfait ou remboursé 30 jours · Paiement sécurisé par Stripe
        </p>
      </div>
    </footer>
  );
}
