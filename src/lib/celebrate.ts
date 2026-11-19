'use client';

import type { SfxKind } from './sfx';

// Lightweight global celebration bus for Peak-End study milestones.
// Any module (store, review sessions, test room) can emit; CelebrationToast renders & plays SFX.

export type CelebrationKind =
  | 'streak_lit'
  | 'freeze_used'
  | 'daily_goal'
  | 'mistake_resolved'
  | 'lesson_done'
  | 'tier_up';

export interface CelebrationEvent {
  id: string;
  kind: CelebrationKind;
  character: 'seal' | 'hedgehog';
  title: string;
  detail: string;
  badge?: 'flame' | 'freeze' | 'goal' | 'star';
  sfx: SfxKind;
}

type Listener = (ev: CelebrationEvent) => void;
const listeners = new Set<Listener>();

export function subscribeCelebrations(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emitCelebration(ev: Omit<CelebrationEvent, 'id'>) {
  if (typeof window === 'undefined') return;
  const full: CelebrationEvent = {
    ...ev,
    id: `cel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  };
  listeners.forEach(l => l(full));
}

/** Ensures a daily celebration (e.g. streak lit / daily goal) only fires once per local day. */
export function claimOnce(key: string): boolean {
  if (typeof window === 'undefined') return false;
  const fullKey = `deu:cel:${key}`;
  try {
    if (localStorage.getItem(fullKey) === '1') return false;
    localStorage.setItem(fullKey, '1');
    return true;
  } catch {
    return true;
  }
}

export const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]);
