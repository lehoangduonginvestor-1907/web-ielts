'use client';

import { usePref } from './hooks';

// Local browser study reminder preference (no server required).
const ENABLED_KEY = 'deu:reminder:on';
const TIME_KEY = 'deu:reminder:time';
const SENT_KEY = 'deu:reminder:sent';

export function useReminderPref() {
  const [rawOn, setRawOn] = usePref<'1' | '0'>(ENABLED_KEY, '0');
  const [time, setTime] = usePref<string>(TIME_KEY, '20:00');
  return {
    enabled: rawOn === '1',
    setEnabled: (on: boolean) => setRawOn(on ? '1' : '0'),
    time,
    setTime,
  };
}

export function reminderSentToday(today: string): boolean {
  try {
    return localStorage.getItem(SENT_KEY) === today;
  } catch {
    return false;
  }
}

export function markReminderSent(today: string) {
  try {
    localStorage.setItem(SENT_KEY, today);
  } catch {}
}

export function parseTimeHHMM(hhmm: string): { h: number; m: number } {
  const [hStr, mStr] = hhmm.split(':');
  const h = Math.min(23, Math.max(0, Number(hStr) || 20));
  const m = Math.min(59, Math.max(0, Number(mStr) || 0));
  return { h, m };
}
