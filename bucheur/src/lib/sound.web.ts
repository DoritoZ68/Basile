import type { SoundId } from './types';

/**
 * Ambiances sonores générées dans le navigateur (Web Audio) : aucun fichier à télécharger,
 * aucun service externe. Le bruit est calculé une fois puis joué en boucle.
 */
export const SOUND_SUPPORTED = true;

type Playing = { sound: SoundId; source: AudioBufferSourceNode; gain: GainNode };

let context: AudioContext | null = null;
let playing: Playing | null = null;
const buffers = new Map<SoundId, AudioBuffer>();

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  // Le navigateur suspend l'audio tant que la page n'a pas été touchée : on relance.
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/** Huit secondes de bruit : blanc, brun (grave, régulier) ou « pluie » (rose, adouci). */
function noise(ctx: AudioContext, sound: SoundId): AudioBuffer {
  const cached = buffers.get(sound);
  if (cached) return cached;
  const length = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const out = buffer.getChannelData(channel);
    let brown = 0;
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (sound === 'blanc') {
        out[i] = white * 0.25;
      } else if (sound === 'brun') {
        brown = (brown + 0.02 * white) / 1.02;
        out[i] = brown * 3.2;
      } else {
        // Bruit rose (filtre de Paul Kellet), avec quelques gouttes plus marquées.
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const drop = Math.random() < 0.0004 ? white * 2.5 : 0;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08 + drop * 0.1;
        b6 = white * 0.115926;
      }
    }
  }
  buffers.set(sound, buffer);
  return buffer;
}

export function playAmbience(sound: SoundId, volume: number) {
  if (sound === 'none') return stopAmbience();
  const ctx = audio();
  if (!ctx) return;
  if (playing?.sound === sound) {
    playing.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.2);
    return;
  }
  stopAmbience();
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, sound);
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.6);
  let node: AudioNode = source;
  if (sound === 'pluie') {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    source.connect(filter);
    node = filter;
  }
  node.connect(gain).connect(ctx.destination);
  source.start();
  playing = { sound, source, gain };
}

export function stopAmbience() {
  if (!playing || !context) return;
  const { source, gain } = playing;
  gain.gain.setTargetAtTime(0, context.currentTime, 0.3);
  source.stop(context.currentTime + 1.5);
  playing = null;
}

/** Deux notes douces, comme un bol chantant, pour signaler la fin d'une séance. */
export function playChime() {
  const ctx = audio();
  if (!ctx) return;
  [659.25, 987.77].forEach((frequency, i) => {
    const start = ctx.currentTime + i * 0.35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 2.5);
  });
}
