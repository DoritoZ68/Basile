import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Notre méthode",
  description: "Comment nous choisissons les sujets et construisons des formations qui donnent des résultats.",
};

const PRINCIPLES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "chart-up",
    title: "Des sujets choisis selon la demande réelle",
    text: "Nous ne formons qu'aux compétences que le marché réclame : celles qui reviennent dans les offres d'emploi, les missions freelance et les budgets des entreprises.",
  },
  {
    icon: "package",
    title: "Un projet concret dans chaque formation",
    text: "Regarder des vidéos ne suffit pas. Chaque parcours aboutit à un livrable réel : une automatisation, une boutique, un tableau de bord, un portfolio.",
  },
  {
    icon: "video",
    title: "Des leçons courtes et denses",
    text: "8 à 15 minutes par leçon, sans remplissage. Vous pouvez avancer dans les transports comme le soir après le travail.",
  },
  {
    icon: "spark",
    title: "Des mises à jour en continu",
    text: "Les outils évoluent vite, surtout en IA et en marketing. Nos formations sont revues régulièrement et chaque fiche affiche sa date de mise à jour.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm font-semibold text-brand">Notre méthode</p>
      <h1 className="mt-2 font-display text-4xl text-ink text-balance">
        Apprendre ce qui sert, le mettre en pratique tout de suite.
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        Élan Académie est née d&apos;un constat simple : il existe des milliers de formations en ligne, mais
        peu sont à jour, concrètes et centrées sur les compétences qui ont vraiment de la valeur aujourd&apos;hui.
        Nous avons fait le tri.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand">
              <Icon name={p.icon} size={22} />
            </span>
            <h2 className="mt-4 font-display text-lg text-ink">{p.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{p.text}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-2xl bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl text-ink">Nos engagements</h2>
        <ul className="mt-4 space-y-2 text-ink-soft">
          <li>• Accès à vie à chaque formation achetée, mises à jour comprises.</li>
          <li>• Satisfait ou remboursé pendant 30 jours, sans justification.</li>
          <li>• Des prix affichés TTC, sans abonnement caché.</li>
          <li>• Des contenus éducatifs : pas de promesse de gains, pas de « méthode miracle ».</li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <Link
          href="/formations"
          className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand"
        >
          Explorer le catalogue
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-semibold text-brand">
          Une question ? {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
