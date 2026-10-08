import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL, SITE_NAME, SITE_URL } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  alternates: { canonical: "/cgv" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales de vente" updated="octobre 2026">
      <section>
        <h2>1. Objet et vendeur</h2>
        <p>
          Les présentes conditions régissent la vente des formations en ligne proposées sur {SITE_URL} par{" "}
          {LEGAL.owner}, {LEGAL.status}, SIRET {LEGAL.siret}, {LEGAL.address} (ci-après « {SITE_NAME} »).
          Toute commande implique leur acceptation sans réserve.
        </p>
      </section>
      <section>
        <h2>2. Produits</h2>
        <p>
          Les produits sont des contenus numériques (vidéos, documents, exercices) accessibles en ligne. Leurs
          caractéristiques essentielles (programme, durée, niveau, prérequis) sont décrites sur chaque fiche.
        </p>
      </section>
      <section>
        <h2>3. Prix</h2>
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises ({LEGAL.vat}). {SITE_NAME} peut modifier ses
          prix à tout moment ; le prix applicable est celui affiché au moment de la commande.
        </p>
      </section>
      <section>
        <h2>4. Commande et paiement</h2>
        <p>
          La commande est validée après acceptation des présentes conditions et paiement intégral en ligne par
          carte bancaire, Apple Pay ou Google Pay via la plateforme sécurisée Stripe. Un reçu est envoyé par
          email ; une facture est fournie sur demande.
        </p>
      </section>
      <section>
        <h2>5. Accès aux formations</h2>
        <p>
          L&apos;accès est fourni immédiatement après paiement, ou au plus tard sous 24 heures par email. Il est
          personnel, non cessible, et valable pour toute la durée d&apos;exploitation de la formation par{" "}
          {SITE_NAME} (« accès à vie »), mises à jour comprises.
        </p>
      </section>
      <section>
        <h2>6. Droit de rétractation et garantie satisfait ou remboursé</h2>
        <p>
          Conformément à l&apos;article L221-28 13° du Code de la consommation, le droit de rétractation de 14
          jours ne s&apos;applique pas aux contenus numériques fournis immédiatement, dès lors que le client y a
          expressément consenti et a renoncé à ce droit lors de la commande.
        </p>
        <p>
          {SITE_NAME} accorde néanmoins une garantie commerciale « satisfait ou remboursé » : pendant 30 jours
          après l&apos;achat, le client peut obtenir le remboursement intégral, sans justification, sur simple
          demande à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Le remboursement est effectué sous 14
          jours sur le moyen de paiement utilisé, et l&apos;accès à la formation est alors désactivé.
        </p>
      </section>
      <section>
        <h2>7. Propriété intellectuelle</h2>
        <p>
          Les contenus restent la propriété exclusive de {SITE_NAME}. Le client s&apos;interdit de les copier,
          revendre, partager ou diffuser, sous peine de suspension de l&apos;accès sans remboursement et de
          poursuites.
        </p>
      </section>
      <section>
        <h2>8. Responsabilité</h2>
        <p>
          Les formations ont une vocation pédagogique. Elles ne garantissent aucun résultat financier ou
          professionnel, et le contenu relatif à l&apos;investissement ne constitue pas un conseil en
          investissement personnalisé.
        </p>
      </section>
      <section>
        <h2>9. Réclamations et médiation</h2>
        <p>
          Toute réclamation peut être adressée à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. En cas de
          litige non résolu, le client consommateur peut recourir gratuitement au médiateur de la consommation :{" "}
          {LEGAL.mediator}.
        </p>
      </section>
      <section>
        <h2>10. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français.</p>
      </section>
    </LegalPage>
  );
}
