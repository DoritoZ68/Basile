"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/** Vide le panier une fois le paiement confirmé. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => clear(), [clear]);
  return null;
}
