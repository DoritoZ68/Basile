"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getPack, getProduct, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { CourseCover } from "@/components/CourseCover";
import { CheckIcon } from "@/components/Icon";

type Order = { number: string; email: string; total: number; titles: string[] };

function newOrderNumber() {
  return `EL-${Date.now().toString(36).toUpperCase()}`;
}

export function CartView() {
  const { items, remove, clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);

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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setOrder({
      number: newOrderNumber(),
      email: String(data.get("email")),
      total,
      titles: products.map((p) => p.title),
    });
    clear();
  }

  if (order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-bg p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-tint text-green">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl text-ink">Merci pour votre commande !</h2>
        <p className="mt-2 text-ink-soft">
          Commande <span className="font-semibold text-ink">{order.number}</span> —{" "}
          {formatPrice(order.total)}. Les accès seront envoyés à{" "}
          <span className="font-semibold text-ink">{order.email}</span>.
        </p>
        <ul className="mt-5 space-y-1 text-sm text-ink-soft">
          {order.titles.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-6 rounded-xl bg-amber-tint px-4 py-3 text-xs text-amber">
          Mode démonstration : aucun paiement n&apos;a été encaissé. Le paiement en ligne (Stripe) reste à
          connecter.
        </p>
        <Link
          href="/formations"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-bg"
        >
          Continuer à explorer
        </Link>
      </div>
    );
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
          {total >= 150 && (
            <p className="text-xs text-ink-faint">ou 3 × {formatPrice(Math.ceil(total / 3))} sans frais</p>
          )}
        </dl>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Prénom</span>
            <input
              name="name"
              required
              autoComplete="given-name"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Email (pour recevoir vos accès)</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex gap-2 text-xs text-ink-soft">
            <input type="checkbox" required className="mt-0.5 accent-[var(--brand)]" />
            J&apos;accepte les conditions générales de vente et je demande l&apos;accès immédiat au contenu.
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-base font-semibold text-on-brand transition hover:bg-brand-strong"
          >
            Valider la commande
          </button>
        </form>

        <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Satisfait ou remboursé pendant 30 jours
          </li>
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Accès à vie et mises à jour incluses
          </li>
          <li className="flex gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-green" /> Facture disponible immédiatement
          </li>
        </ul>
      </aside>
    </div>
  );
}
