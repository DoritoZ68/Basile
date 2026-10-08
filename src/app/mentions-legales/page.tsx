import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL, SITE_NAME, SITE_URL } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales et confidentialité",
  alternates: { canonical: "/mentions-legales" },
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales et confidentialité" updated="octobre 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site {SITE_URL} ({SITE_NAME}) est édité par {LEGAL.owner}, {LEGAL.status}, SIRET {LEGAL.siret},
          dont le siège est situé {LEGAL.address}. {LEGAL.vat}.
        </p>
        <p>
          Directeur de la publication : {LEGAL.publisher}. Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>{LEGAL.host}.</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus du site et des formations (textes, vidéos, supports, marques, logos) est
          protégé par le droit de la propriété intellectuelle. Toute reproduction ou diffusion sans autorisation
          écrite est interdite.
        </p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>
          Les données collectées lors d&apos;une commande (nom, email, informations de facturation) sont traitées
          par l&apos;éditeur pour exécuter la commande, fournir l&apos;accès aux formations et respecter ses
          obligations comptables. Elles sont conservées le temps de la relation commerciale puis pendant les
          durées légales (10 ans pour les pièces comptables).
        </p>
        <p>
          Le paiement est traité par Stripe Payments Europe Ltd. : l&apos;éditeur n&apos;a jamais accès à vos
          coordonnées bancaires. Le site est hébergé par Vercel.
        </p>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          d&apos;opposition et de portabilité de vos données, en écrivant à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Vous pouvez aussi saisir la CNIL (cnil.fr).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Le site n&apos;utilise aucun cookie publicitaire ni de mesure d&apos;audience. Seuls votre panier et votre
          préférence de thème sont mémorisés localement dans votre navigateur, ce qui ne nécessite pas de
          consentement.
        </p>
      </section>
    </LegalPage>
  );
}
