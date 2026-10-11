import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Faux pendant le rendu statique du site et la première hydratation, vrai ensuite. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
