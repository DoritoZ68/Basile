import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Heure courante, rafraîchie toutes les `intervalMs` et au retour de l'app au premier plan. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearTimeout(first);
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
