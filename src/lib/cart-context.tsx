"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getProduct } from "@/lib/catalog";

const STORAGE_KEY = "elan:panier";
const listeners = new Set<() => void>();

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    // Drop products that no longer exist in the catalogue.
    return Array.isArray(ids) ? ids.filter((id) => getProduct(id)) : [];
  } catch {
    return [];
  }
}

let cache: string[] = typeof window !== "undefined" ? readStorage() : [];

function commit(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode, quota) — keep the in-memory value only
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) {
      cache = readStorage();
      callback();
    }
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string[] {
  return cache;
}

const EMPTY: string[] = [];

function getServerSnapshot(): string[] {
  return EMPTY;
}

type CartContextValue = {
  items: string[];
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((id: string) => {
    if (!cache.includes(id)) commit([...cache, id]);
  }, []);
  const remove = useCallback((id: string) => commit(cache.filter((i) => i !== id)), []);
  const clear = useCallback(() => commit([]), []);
  const has = useCallback((id: string) => items.includes(id), [items]);

  return <CartContext.Provider value={{ items, has, add, remove, clear }}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
