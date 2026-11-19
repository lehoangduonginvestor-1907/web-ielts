'use client';

import { usePref } from './hooks';

// Warm, quiet Web Audio API chimes (zero external audio files; opt-out persisted in localStorage)

const SFX_KEY = 'deu:sfx';
export type SfxKind = 'tick' | 'resolve' | 'celebrate';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

export function isSfxEnabled(): boolean {
  try {
    return localStorage.getItem(SFX_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSfxEnabled(on: boolean) {
  try {
    localStorage.setItem(SFX_KEY, on ? '1' : '0');
  } catch {}
}

export function useSfxPref(): [boolean, (on: boolean) => void] {
  const [raw, setRaw] = usePref<'1' | '0'>(SFX_KEY, '1');
  return [raw !== '0', (on: boolean) => setRaw(on ? '1' : '0')];
}

function playTone(c: AudioContext, freq: number, start: number, duration: number, gainPeak: number, type: OscillatorType = 'triangle') {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Play a soft, non-intrusive storybook chime. Fails silently if muted or blocked. */
export function playSfx(kind: SfxKind) {
  if (!isSfxEnabled()) return;
  try {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime + 0.01;
    if (kind === 'tick') {
      // Soft wooden pop + fifth (G5 -> B5)
      playTone(c, 587.33, t, 0.12, 0.06, 'sine');
      playTone(c, 783.99, t + 0.055, 0.16, 0.055, 'triangle');
    } else if (kind === 'resolve') {
      // Crisp 3-note rising chime (C5 -> E5 -> G5)
      playTone(c, 523.25, t, 0.16, 0.06, 'triangle');
      playTone(c, 659.25, t + 0.075, 0.18, 0.065, 'triangle');
      playTone(c, 783.99, t + 0.15, 0.28, 0.07, 'sine');
    } else {
      // Warm major-7th celebration arpeggio (C5 -> E5 -> G5 -> C6)
      playTone(c, 523.25, t, 0.22, 0.065, 'triangle');
      playTone(c, 659.25, t + 0.08, 0.22, 0.07, 'triangle');
      playTone(c, 783.99, t + 0.16, 0.26, 0.075, 'triangle');
      playTone(c, 1046.5, t + 0.25, 0.42, 0.08, 'sine');
    }
  } catch {
    // Ignore audio context errors
  }
}
