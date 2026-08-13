import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { NewsletterSignup } from "@/components/NewsletterSignup";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <NewsletterSignup variant="inline" />

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-strong font-display text-base text-ink">
                OM
              </span>
              <span className="font-display text-lg text-white">
                en <span className="text-gold">3</span> points
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist-dim">
              L&apos;essentiel de l&apos;actualité marseillaise, résumé en trois points,
              chaque semaine — en vidéo, en illustration, en image.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">Rubriques</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(CATEGORIES).map(([key, value]) => (
                <li key={key}>
                  <Link href={`/#${key}`} className="text-mist-dim transition hover:text-sky">
                    {value.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/archives" className="text-mist-dim transition hover:text-sky">
                  Éditions précédentes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">Ressources</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/a-propos" className="text-mist-dim transition hover:text-sky">
                  À propos &amp; crédits
                </Link>
              </li>
              <li>
                <a href="/rss.xml" className="text-mist-dim transition hover:text-sky">
                  Flux RSS
                </a>
              </li>
              <li>
                <a href="mailto:redaction@om-en-3-points.fr" className="text-mist-dim transition hover:text-sky">
                  Nous contacter
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wide text-white">La rédaction</h3>
            <p className="mt-4 text-sm leading-relaxed text-mist-dim">
              Média indépendant non affilié à l&apos;Olympique de Marseille SA. Édition
              mise à jour chaque semaine par la rédaction, qui sélectionne et résume
              l&apos;actualité du club.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-mist-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Actu OM en 3 points.</p>
          <p>Allez l&apos;OM.</p>
        </div>
      </div>
    </footer>
  );
}
