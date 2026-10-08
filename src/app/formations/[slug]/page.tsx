import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  courses,
  coursesByRank,
  getCourse,
  lessonCount,
  packsIncluding,
  packValue,
  totalMinutes,
} from "@/lib/catalog";
import { ACCENT } from "@/lib/accent";
import { formatDuration, formatMonth, formatPrice } from "@/lib/format";
import { CourseCover } from "@/components/CourseCover";
import { CourseCard } from "@/components/CourseCard";
import { AddToCartButton } from "@/components/AddToCartButton";
import { CheckIcon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return {};
  const description = `${course.subtitle} ${course.level}, ${lessonCount(course)} leçons, projet concret, accès à vie.`;
  return {
    title: `Formation ${course.title}`,
    description,
    alternates: { canonical: `/formations/${course.slug}` },
    openGraph: { type: "website", title: course.title, description, url: `/formations/${course.slug}` },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const accent = ACCENT[course.category];
  const minutes = totalMinutes(course);
  const lessons = lessonCount(course);
  const relatedPacks = packsIncluding(course.slug);
  const related = coursesByRank()
    .filter((c) => c.category === course.category && c.slug !== course.slug)
    .slice(0, 3);

  const facts = [
    { label: "Niveau", value: course.level },
    { label: "Durée", value: formatDuration(minutes) },
    { label: "Leçons", value: String(lessons) },
    { label: "Mise à jour", value: formatMonth(course.updated) },
  ];

  const purchase = (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg shadow-[0_16px_40px_-24px_rgba(20,22,43,0.35)]">
      <CourseCover icon={course.icon} category={course.category} size="lg" className="aspect-[16/9]" />
      <div className="p-6">
        <p className="font-display text-3xl text-ink">{formatPrice(course.price)}</p>
        <p className="mt-1 text-sm text-ink-faint">Paiement unique · accès immédiat</p>
        <AddToCartButton id={course.slug} size="lg" className="mt-5" />
        <ul className="mt-5 space-y-2 text-sm text-ink-soft">
          {[
            `${lessons} leçons vidéo · ${formatDuration(minutes)}`,
            "Ressources et modèles téléchargeables",
            "Projet final guidé",
            "Certificat de réussite",
            "Accès à vie et mises à jour",
            "Satisfait ou remboursé 30 jours",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <CheckIcon className="h-4 w-4 shrink-0 translate-y-0.5 text-green" />
              {item}
            </li>
          ))}
        </ul>
        {relatedPacks[0] && (
          <Link
            href="/packs"
            className="mt-5 block rounded-xl bg-brand-tint p-3 text-sm text-ink transition hover:opacity-90"
          >
            Incluse dans le <span className="font-semibold">{relatedPacks[0].title}</span> :{" "}
            {formatPrice(relatedPacks[0].price)} au lieu de {formatPrice(packValue(relatedPacks[0]))} →
          </Link>
        )}
      </div>
    </div>
  );

  const url = `${SITE_URL}/formations/${course.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      description: course.description,
      url,
      inLanguage: "fr",
      educationalLevel: course.level,
      teaches: course.outcomes,
      provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
      offers: {
        "@type": "Offer",
        category: "Paid",
        price: course.price,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url,
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: `PT${Math.floor(minutes / 60)}H${minutes % 60}M`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Formations", item: `${SITE_URL}/formations` },
        { "@type": "ListItem", position: 2, name: course.title, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-12">
          <header>
            <nav className="text-sm text-ink-faint" aria-label="Fil d'Ariane">
              <Link href="/formations" className="hover:text-ink">
                Formations
              </Link>{" "}
              /{" "}
              <Link href={`/formations?categorie=${course.category}`} className="hover:text-ink">
                {CATEGORIES[course.category].label}
              </Link>
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accent.tint} ${accent.text}`}>
                {CATEGORIES[course.category].label}
              </span>
              {course.badge && (
                <span className="rounded-full bg-amber-tint px-3 py-1 text-xs font-semibold text-amber">
                  {course.badge}
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink text-balance sm:text-4xl">
              {course.title}
            </h1>
            <p className="mt-3 text-lg text-ink-soft">{course.subtitle}</p>
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl border border-line bg-surface p-3">
                  <dt className="text-xs text-ink-faint">{f.label}</dt>
                  <dd className="mt-0.5 font-semibold text-ink first-letter:uppercase">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 lg:hidden">{purchase}</div>
          </header>

          <section>
            <h2 className="font-display text-2xl text-ink">Présentation</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">{course.description}</p>
          </section>

          <section className="rounded-2xl border border-line p-6">
            <h2 className="font-display text-2xl text-ink">Ce que vous saurez faire</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex gap-2.5 text-sm text-ink">
                  <CheckIcon className="shrink-0 text-green" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl text-ink">Programme</h2>
              <p className="text-sm text-ink-faint">
                {course.modules.length} modules · {lessons} leçons · {formatDuration(minutes)}
              </p>
            </div>
            <ol className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {course.modules.map((m, i) => (
                <li key={m.title} className="flex items-center gap-4 p-4">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${accent.tint} ${accent.text}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-ink">{m.title}</span>
                  <span className="shrink-0 text-right text-xs text-ink-faint">
                    {m.lessons} leçons
                    <br />
                    {formatDuration(m.minutes)}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-4 bg-surface p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-tint text-sm font-bold text-amber">
                  ★
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-amber">Projet final</span>
                  <span className="font-medium text-ink">{course.project}</span>
                </span>
              </li>
            </ol>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface p-6">
              <h2 className="font-display text-lg text-ink">Pour qui ?</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {course.audience.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent.bg}`} aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-surface p-6">
              <h2 className="font-display text-lg text-ink">Prérequis</h2>
              <p className="mt-3 text-sm text-ink-soft">{course.prerequisites}</p>
              <h2 className="mt-5 font-display text-lg text-ink">Outils abordés</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {course.tools.map((t) => (
                  <li key={t} className="rounded-full border border-line bg-bg px-3 py-1 text-xs text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">{purchase}</div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl text-ink">Dans la même thématique</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <CourseCard key={c.slug} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
