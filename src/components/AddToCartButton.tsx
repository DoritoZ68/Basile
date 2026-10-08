"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function AddToCartButton({
  id,
  label = "Ajouter au panier",
  size = "md",
  className = "",
}: {
  id: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { has, add } = useCart();
  const base =
    size === "lg"
      ? "flex h-12 w-full items-center justify-center rounded-xl px-5 text-base font-semibold transition"
      : "flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition";

  if (has(id)) {
    return (
      <Link
        href="/panier"
        className={`${base} border border-green/30 bg-green-tint text-green hover:border-green/60 ${className}`}
      >
        ✓ Dans le panier — voir
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => add(id)}
      className={`${base} bg-brand text-on-brand hover:bg-brand-strong ${className}`}
    >
      {label}
    </button>
  );
}
