export type FaqItem = { q: string; a: string };

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-bg">
      {items.map((item) => (
        <details key={item.q} className="group px-5 sm:px-6">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 font-semibold text-ink">
            {item.q}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="faq-chevron shrink-0 text-ink-faint transition"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <p className="-mt-1 pb-5 text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export const GENERAL_FAQ: FaqItem[] = [
  {
    q: "Comment se passe l'accès aux formations ?",
    a: "Dès le paiement validé, vous recevez vos identifiants par email. Les vidéos, ressources et exercices sont accessibles depuis votre espace, sur ordinateur, tablette ou téléphone.",
  },
  {
    q: "Combien de temps ai-je accès au contenu ?",
    a: "À vie. Vous avancez à votre rythme et vous gardez l'accès aux futures mises à jour de la formation sans payer de supplément.",
  },
  {
    q: "Et si la formation ne me convient pas ?",
    a: "Vous disposez de 30 jours pour demander un remboursement intégral, sans justification, par simple email.",
  },
  {
    q: "Les formations sont-elles à jour ?",
    a: "Oui. Chaque fiche indique la date de la dernière mise à jour. Les formations IA et marketing, qui évoluent vite, sont revues plusieurs fois par an.",
  },
  {
    q: "Puis-je payer en plusieurs fois ?",
    a: "Oui, le paiement en 3 fois sans frais est proposé au moment du règlement pour toute commande à partir de 150 €.",
  },
  {
    q: "Je suis une entreprise, puis-je obtenir une facture ?",
    a: "Une facture est générée automatiquement à chaque commande. Pour former une équipe, contactez-nous pour un devis et des licences multiples.",
  },
];
