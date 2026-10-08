import type { Metadata } from "next";
import { getPack, packs } from "@/lib/catalog";
import { PackCard } from "@/components/PackCard";
import { Faq } from "@/components/Faq";

export const metadata: Metadata = {
  title: "Packs & Pass intégral",
  description: "Des parcours complets à prix réduit : IA, entrepreneuriat, création de contenu, ou tout le catalogue.",
};

export default function PacksPage() {
  const themed = packs.filter((p) => p.slug !== "pass-integral");
  const pass = getPack("pass-integral")!;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand">Packs</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Des parcours complets, à prix réduit</h1>
        <p className="mt-3 text-ink-soft">
          Chaque pack réunit des formations qui se complètent pour atteindre un objectif précis. Vous
          obtenez exactement les mêmes contenus qu&apos;à l&apos;unité, pour beaucoup moins cher.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {themed.map((p) => (
          <PackCard key={p.slug} pack={p} />
        ))}
      </div>

      <section className="mt-16 grid gap-8 rounded-3xl bg-night p-6 text-white sm:p-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#fbbf24]">Pour aller plus loin</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{pass.title}</h2>
          <p className="mt-3 text-white/75">{pass.description}</p>
          <p className="mt-3 text-white/75">
            Idéal pour une reconversion, pour monter en compétences sur plusieurs fronts à la fois, ou pour
            former un associé ou un salarié.
          </p>
        </div>
        <div className="text-ink">
          <PackCard pack={pass} compact />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="font-display text-2xl text-ink">Questions sur les packs</h2>
        <div className="mt-6">
          <Faq
            items={[
              {
                q: "Le contenu est-il le même qu'à l'unité ?",
                a: "Oui, exactement. Un pack donne accès aux formations complètes qu'il contient, avec leurs projets, ressources et mises à jour.",
              },
              {
                q: "J'ai déjà acheté une formation incluse dans un pack, que faire ?",
                a: "Écrivez-nous : nous déduisons le prix déjà payé de celui du pack.",
              },
              {
                q: "Le Pass intégral inclut-il les futures formations ?",
                a: "Oui. Chaque nouvelle formation ajoutée au catalogue est automatiquement débloquée dans votre espace.",
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
