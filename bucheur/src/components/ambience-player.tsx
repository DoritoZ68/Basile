import { useEffect } from 'react';

import { playAmbience, stopAmbience } from '@/lib/sound';
import { useStore } from '@/lib/store';

/**
 * Joue l'ambiance sonore choisie pendant une séance de travail (pas pendant les pauses),
 * quelle que soit la page ouverte.
 */
export function AmbiencePlayer() {
  const { data, settings } = useStore();
  const timer = data.activeTimer;
  const active = !!timer && timer.kind !== 'break' && !timer.pausedAt;
  const { sound, soundVolume } = settings;

  useEffect(() => {
    if (active) playAmbience(sound, soundVolume);
    else stopAmbience();
  }, [active, sound, soundVolume]);

  useEffect(() => stopAmbience, []);
  return null;
}
