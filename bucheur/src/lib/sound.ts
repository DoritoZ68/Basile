import type { SoundId } from './types';

/**
 * Ambiances sonores et carillon : disponibles sur la version web (Web Audio).
 * Sur iPhone, ces fonctions ne font rien pour l'instant.
 */
export const SOUND_SUPPORTED = false;

export function playAmbience(_sound: SoundId, _volume: number) {}

export function stopAmbience() {}

export function playChime() {}
