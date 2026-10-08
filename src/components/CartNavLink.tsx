"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Icon } from "@/components/Icon";

export function CartNavLink({ onClick }: { onClick?: () => void }) {
  const { items } = useCart();
  const count = items.length;

  return (
    <Link
      href="/panier"
      onClick={onClick}
      aria-label={count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface hover:text-ink"
    >
      <Icon name="cart" size={19} />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
          {count}
        </span>
      )}
    </Link>
  );
}
