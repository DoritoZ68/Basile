import type { Metadata } from "next";
import Link from "next/link";
import { getCourse, getPack, getProduct, packCourses, type Course, type Product } from "@/lib/catalog";
import { getAccessLinks, getStripe } from "@/lib/stripe";
import { formatPrice } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/site";
import { ClearCart } from "@/components/ClearCart";
import { CheckIcon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Merci pour votre commande",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { session_id } = await searchParams;
  const stripe = getStripe();
  const session =
    stripe && typeof session_id === "string" && session_id.startsWith("cs_")
      ? await stripe.checkout.sessions.retrieve(session_id).catch(() => null)
      : null;

  if (!session || session.payment_status !== "paid") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">Paiement introuvable ou en attente</h1>
        <p className="mt-3 text-ink-soft">
          Si vous venez de payer, votre reçu arrive par email. En cas de doute, écrivez-nous à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <Link href="/panier" className="mt-6 inline-block text-sm font-semibold text-brand">
          Retour au panier
        </Link>
      </div>
    );
  }

  const products = (session.metadata?.items ?? "")
    .split(",")
    .map((id) => getProduct(id))
    .filter((p): p is Product => Boolean(p));
  // Expand packs into their courses so each course gets its access link.
  const courses = new Map<string, Course>();
  for (const p of products) {
    const list = p.kind === "pack" ? packCourses(getPack(p.id)!) : [getCourse(p.id)!];
    for (const c of list) courses.set(c.slug, c);
  }
  const links = getAccessLinks();
  const email = session.customer_details?.email;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <ClearCart />
      <div className="rounded-2xl border border-line p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-tint text-green">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-ink">Merci, votre paiement est confirmé !</h1>
        <p className="mt-2 text-ink-soft">
          {formatPrice((session.amount_total ?? 0) / 100)} payés.
          {email && (
            <>
              {" "}
              Votre reçu a été envoyé à <span className="font-semibold text-ink">{email}</span>.
            </>
          )}
        </p>
      </div>

      <h2 className="mt-10 font-display text-xl text-ink">Vos formations</h2>
      <ul className="mt-4 space-y-3">
        {[...courses.values()].map((c) => (
          <li key={c.slug} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
            <span className="font-medium text-ink">{c.title}</span>
            {links[c.slug] ? (
              <a
                href={links[c.slug]}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
              >
                Accéder
              </a>
            ) : (
              <span className="shrink-0 text-xs text-ink-faint">Accès envoyé par email sous 24 h</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">
        Gardez cette page dans vos favoris. Une question ?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
