import Link from "next/link";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  courses,
  coursesByRank,
  lessonCount,
  packs,
  packValue,
  totalMinutes,
} from "@/lib/catalog";
import { ACCENT } from "@/lib/accent";
import { formatPrice } from "@/lib/format";
import { CourseCard } from "@/components/CourseCard";
import { CourseCover } from "@/components/CourseCover";
import { PackCard } from "@/components/PackCard";
import { Faq, GENERAL_FAQ } from "@/components/Faq";
import { CheckIcon, Icon } from "@/components/Icon";

const TOTAL_HOURS = Math.round(courses.reduce((sum, c) => sum + totalMinutes(c), 0) / 60);
const TOTAL_LESSONS = courses.reduce((sum, c) => sum + lessonCount(c), 0);

const WHY = [
  {
    icon: "spark" as const,
    title: "L'IA change tous les métiers",
    text: "Savoir utiliser, automatiser et construire avec l'IA est devenu la compétence la plus recherchée par les employeurs comme par les clients.",
  },
  {
    icon: "briefcase" as const,
    title: "L'indépendance se démocratise",
    text: "Freelance, e-commerce, produits numériques : jamais il n'a été aussi simple de créer une activité en ligne, à condition d'avoir la méthode.",
  },
  {
    icon: "search" as const,
    title: "La visibilité fait la différence",
    text: "Vidéo courte, LinkedIn, SEO et désormais GEO : ceux qui savent se rendre visibles captent les opportunités.",
  },
];

const STEPS = [
  { title: "Choisissez", text: "Une formation seule, ou un pack pour un parcours complet à prix réduit." },
  { title: "Apprenez à votre rythme", text: "Vidéos courtes, ressources téléchargeables et exercices, sur tous vos écrans." },
  { title: "Réalisez votre projet", text: "Chaque formation se termine par un projet concret que vous pouvez montrer." },
];

export default function HomePage() {
  const top = coursesByRank();
  const featuredPacks = packs.filter((p) => p.slug !== "pass-integral");
  const bestSaving = Math.max(...featuredPacks.map((p) => Math.round((1 - p.price / packValue(p)) * 100)));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night text-white">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 10%, rgba(124,116,255,0.45), transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(63,194,186,0.25), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" aria-hidden="true" />
              Catalogue mis à jour en octobre 2026
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
              Les compétences qui comptent vraiment en 2026.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              IA, automatisation, business en ligne, marketing et data : {courses.length} formations concrètes,
              pensées pour obtenir des résultats dès les premières semaines.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/formations"
                className="inline-flex h-12 items-center rounded-xl bg-white px-6 font-semibold text-[#14162b] transition hover:bg-white/90"
              >
                Voir les formations
              </Link>
              <Link
                href="/packs"
                className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 font-semibold text-white transition hover:bg-white/10"
              >
                Économiser avec les packs
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <dt className="text-xs text-white/60">Formations</dt>
                <dd className="font-display text-2xl">{courses.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">Leçons vidéo</dt>
                <dd className="font-display text-2xl">{TOTAL_LESSONS}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">Heures de contenu</dt>
                <dd className="font-display text-2xl">{TOTAL_HOURS} h</dd>
              </div>
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="space-y-4">
              {top.slice(0, 3).map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/formations/${c.slug}`}
                  className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur transition hover:bg-white/10 ${
                    i === 1 ? "translate-x-8" : ""
                  }`}
                >
                  <CourseCover icon={c.icon} category={c.category} size="sm" className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/60">{CATEGORIES[c.category].label}</p>
                    <p className="truncate font-semibold">{c.title}</p>
                  </div>
                  <span className="font-display text-lg">{formatPrice(c.price)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees strip */}
      <section className="border-b border-line">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-sm text-ink-soft sm:px-6 md:grid-cols-4">
          {["Accès à vie", "Mises à jour incluses", "Satisfait ou remboursé 30 jours", "Projet concret à la clé"].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckIcon className="shrink-0 text-green" />
                {item}
              </li>
            ),
          )}
        </ul>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Pourquoi ces formations</p>
          <h2 className="mt-2 font-display text-3xl text-ink text-balance sm:text-4xl">
            Nous avons sélectionné les sujets où la demande explose.
          </h2>
          <p className="mt-4 text-ink-soft">
            Pas de catalogue fourre-tout : seulement les compétences que les entreprises recrutent, que les
            clients achètent et qui permettent de créer une activité.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {WHY.map((item) => (
            <div key={item.title} className="rounded-2xl bg-surface p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <Icon name={item.icon} size={22} />
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((key) => {
            const count = courses.filter((c) => c.category === key).length;
            const accent = ACCENT[key];
            return (
              <Link
                key={key}
                href={`/formations?categorie=${key}`}
                className="group rounded-2xl border border-line p-5 transition hover:border-ink-faint/60"
              >
                <span className={`inline-block h-2 w-10 rounded-full ${accent.bg}`} aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg text-ink group-hover:text-brand">
                  {CATEGORIES[key].label}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">{CATEGORIES[key].description}</p>
                <p className={`mt-4 text-sm font-semibold ${accent.text}`}>
                  {count} formation{count > 1 ? "s" : ""} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Best-sellers */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">Les plus demandées</p>
            <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Le top du moment</h2>
          </div>
          <Link href="/formations" className="text-sm font-semibold text-brand">
            Tout le catalogue →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {top.slice(0, 6).map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      </section>

      {/* Packs */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand">Parcours complets</p>
            <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Les packs : jusqu&apos;à −{bestSaving} %</h2>
            <p className="mt-4 text-ink-soft">
              Les formations qui se complètent, réunies dans un parcours cohérent et moins cher qu&apos;à
              l&apos;unité.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {featuredPacks.map((p) => (
              <PackCard key={p.slug} pack={p} compact />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink-soft">
            Envie de tout ?{" "}
            <Link href="/packs" className="font-semibold text-brand">
              Découvrez le Pass intégral →
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Comment ça marche</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border border-line p-6">
              <span className="font-display text-4xl font-extrabold text-brand/30">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-16 sm:px-6 md:pb-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Questions fréquentes</h2>
        <div className="mt-8">
          <Faq items={GENERAL_FAQ} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-night px-6 py-14 text-center text-white sm:px-12">
          <div
            className="absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(124,116,255,0.5), transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl text-balance sm:text-4xl">
              Dans 3 mois, vous serez content d&apos;avoir commencé aujourd&apos;hui.
            </h2>
            <Link
              href="/formations"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-white px-6 font-semibold text-[#14162b] transition hover:bg-white/90"
            >
              Trouver ma formation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
