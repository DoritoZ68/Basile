import type { Metadata } from "next";
import { TrophyIllustration } from "@/components/illustrations";

export const metadata: Metadata = {
  title: "À propos",
  description: "La mission, le fonctionnement et les crédits d'Actu OM en 3 points.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="font-display text-xs tracking-[0.2em] text-sky">À propos</p>
      <h1 className="mt-1 text-balance font-display text-2xl text-white sm:text-3xl">
        Un média, une promesse : 3 points, chaque semaine
      </h1>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line">
        <TrophyIllustration className="h-48 w-full" />
      </div>

      <div className="prose-om mt-8 space-y-5 text-[15px] leading-relaxed text-mist">
        <p>
          <strong className="text-white">Actu OM en 3 points</strong> est un média indépendant
          consacré à l&apos;actualité de l&apos;Olympique de Marseille. Notre pari : plutôt que
          d&apos;ajouter du bruit à un flux d&apos;informations déjà saturé, condenser chaque
          sujet — mercato, match, vestiaire, coulisses — en trois points clairs, complétés
          d&apos;une vidéo, d&apos;une illustration ou d&apos;une photo selon ce qui raconte le
          mieux l&apos;histoire.
        </p>
        <p>
          Une nouvelle édition est publiée chaque semaine. La page d&apos;accueil affiche
          toujours la dernière édition disponible, et l&apos;historique complet reste
          consultable dans les <a href="/archives" className="text-sky hover:text-white">archives</a>.
        </p>
        <p>
          Ce média n&apos;est <strong className="text-white">pas affilié</strong> à
          l&apos;Olympique de Marseille SA, à la LFP ni à aucun diffuseur officiel. Les analyses
          et résumés publiés ici reflètent le travail éditorial de la rédaction.
        </p>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg text-white">Crédits photo</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist-dim">
          Les photographies de l&apos;Orange Vélodrome utilisées sur ce site proviennent de
          Wikimedia Commons, sous licence Creative Commons Attribution-ShareAlike :
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-mist-dim">
          <li>
            Intérieur du stade — Randy110912, CC BY-SA 4.0
          </li>
          <li>
            Façade de l&apos;Orange Vélodrome — Bernard Ddd, CC BY-SA 2.0
          </li>
          <li>
            Tribune du virage Sud — Rémi Mathis, CC BY-SA 3.0
          </li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-mist-dim">
          Les autres photographies proviennent d&apos;Unsplash (libres de droits). Les
          illustrations sont des créations originales du site.
        </p>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg text-white">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist-dim">
          Une info, une correction à signaler ? Écrivez à{" "}
          <a href="mailto:redaction@om-en-3-points.fr" className="text-sky hover:text-white">
            redaction@om-en-3-points.fr
          </a>
          .
        </p>
      </div>
    </div>
  );
}
