import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-4xl text-ink">Votre panier</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
