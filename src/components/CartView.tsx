"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getPack, getProduct, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { CourseCover } from "@/components/CourseCover";
import { CheckIcon } from "@/components/Icon";
import { CONTACT_EMAIL } from "@/lib/site";

type Status = "idle" | "loading" | "disabled" | "error";

export function CartView() {
  const { items, remove } = useCart();
  const [status, setStatus] = useState<Status>("idle");

  const products = items.map((id) => getProduct(id)).filter((p): p is Product => Boolean(p));
  const total = products.reduce((sum, p) => sum + p.price, 0);

  // A course already bundled in a pack that is also in the cart would be paid twice.
  const packsInCart = products.filter((p) => p.kind === "pack").map((p) => getPack(p.id)!);
  function coveredBy(product: Product) {
    if (product.kind === "course") return packsInCart.find((pack) => pack.courses.includes(product.id));
    // Any other pack is redundant next to the full pass.
    if (product.id === "pass-integral") return undefined;
    return packsInCart.find((pack) => pack.slug === "pass-integral");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.status === 503) return setStatus("disabled");
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) return setStatus("error");
      window.location.assign(data.url);
    } catch {
      setStatus("error");
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <p className="font-display text-xl text-ink">Votre panier est vide</p>
        <p className="mt-2 text-ink-soft">Parcourez le catalogue pour trouver la formation qu&apos;il vous faut.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/formations"
            className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand"
          >
            Voir les formations
          </Link>
          <Link
            href="/packs"
            className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold text-ink"
          >
            Voir les packs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <ul className="space-y-3">
        {products.map((p) => {
          const pack = coveredBy(p);
          return (
            <li key={p.id} className="rounded-2xl border border-line bg-bg p-4">
              <div className="flex items-center gap-4">
                <CourseCover icon={p.icon} category={p.category} size="sm" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {p.kind === "pack" ? "Pack" : "Formation"}
                  </p>
                  <Link href={p.href} className="block truncate font-semibold text-ink hover:text-brand">
                    {p.title}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-ink">{formatPrice(p.price)}</p>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="text-xs font-medium text-ink-faint hover:text-coral"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              {pack && (
                <p className="mt-3 rounded-lg bg-amber-tint px-3 py-2 text-xs text-amber">
                  Déjà inclus dans « {pack.title} » qui est dans votre panier.{" "}
                  <button type="button" onClick={() => remove(p.id)} className="font-semibold underline">
                    Retirer le doublon
                  </button>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg text-ink">Récapitulatif</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>
              {products.length} article{products.length > 1 ? "s" : ""}
            </dt>
            <dd>{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
            <dt>Total TTC</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex gap-2 text-xs text-ink-soft">
            <input type="checkbox" required className="mt-0.5 accent-[var(--brand)]" />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgv" className="font-semibold text-ink underline" target="_blank">
                conditions générales de vente
              </Link>{" "}
              et je demande l&apos;accès immédiat au contenu, en renonçant à mon droit légal de rétractation
              de 14 jours (la garantie satisfait ou remboursé de 30 jours reste acquise).
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-on-brand transition hover:bg-brand-strong disabled:opacity-60"
          >
            {status === "loading" ? "Redirection vers le paiement…" : `Payer ${formatPrice(total)}`}
          </button>
          <p className="text-center text-xs text-ink-faint">
            Paiement sécurisé par Stripe : carte bancaire, Apple Pay, Google Pay.
          </p>
          {status === "disabled" && (
            <p className="rounded-xl bg-amber-tint px-4 py-3 text-xs text-amber">
              Le paiement en ligne n&apos;est pas encore activé sur ce site. Écrivez-nous à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
                {CONTACT_EMAIL}
              </a>{" "}
              pour commander.
            </p>
          )}
          {status === "error" && (
            <p className="rounded-xl bg-coral-tint px-4 py-3 text-xs text-coral">
              Le paiement n&apos;a pas pu démarrer. Réessayez dans un instant.
            </p>
          )}
        </form>

        <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Satisfait ou remboursé pendant 30 jours
          </li>
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Accès à vie et mises à jour incluses
          </li>
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Reçu envoyé par email
          </li>
        </ul>
      </aside>
    </div>
  );
}
