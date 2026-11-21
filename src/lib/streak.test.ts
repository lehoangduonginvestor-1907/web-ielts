// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayLog, Store } from './types';
import { emptyStore } from '@/test/factories';

// Hôm nay trong các test: 21/11/2026, buổi tối theo giờ Việt Nam
const TODAY = new Date(2026, 10, 21, 20, 0);
const active: DayLog = { seconds: 0, units: 1, cards: 0 };
const idle: DayLog = { seconds: 300, units: 0, cards: 5 };

/** Các ngày học liên tiếp kết thúc ở `last`, lùi lại `n` ngày. */
function run(last: string, n: number, addDays: (k: string, n: number) => string): Record<string, DayLog> {
  const out: Record<string, DayLog> = {};
  for (let i = 0; i < n; i++) out[addDays(last, -i)] = active;
  return out;
}

/** Nạp lại store.ts với dữ liệu `s` trong localStorage (store giữ bộ nhớ đệm ở cấp module). */
async function loadStore(s?: Store) {
  vi.resetModules();
  localStorage.clear();
  if (s) localStorage.setItem('ielts.v1', JSON.stringify(s));
  return import('./store');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});
afterEach(() => vi.useRealTimers());

describe('isActive', () => {
  it('counts a day with one part, one drill, one lesson, 10 cards or 10 minutes', async () => {
    const { isActive } = await loadStore();
    expect(isActive({ seconds: 0, units: 1, cards: 0 })).toBe(true);
    expect(isActive({ seconds: 0, units: 0, cards: 0, drills: 1 })).toBe(true);
    expect(isActive({ seconds: 0, units: 0, cards: 0, lessons: 1 })).toBe(true);
    expect(isActive({ seconds: 0, units: 0, cards: 10 })).toBe(true);
    expect(isActive({ seconds: 600, units: 0, cards: 0 })).toBe(true);
    expect(isActive(idle)).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
});

describe('streakOf', () => {
  it('counts back from today, or from yesterday when today is not done yet', async () => {
    const { streakOf } = await loadStore();
    const { addDays } = await import('./dates');
    expect(streakOf(emptyStore({ days: run('2026-11-21', 4, addDays) }), '2026-11-21')).toBe(4);
    expect(streakOf(emptyStore({ days: run('2026-11-20', 4, addDays) }), '2026-11-21')).toBe(4);
    expect(streakOf(emptyStore({ days: run('2026-11-19', 4, addDays) }), '2026-11-21')).toBe(0);
  });

  it('does not count a day with too little study', async () => {
    const { streakOf } = await loadStore();
    const s = emptyStore({ days: { '2026-11-21': idle, '2026-11-20': active } });
    expect(streakOf(s, '2026-11-21')).toBe(1);
  });

  it('bridges frozen days without counting them', async () => {
    const { streakOf } = await loadStore();
    const s = emptyStore({
      days: { '2026-11-21': active, '2026-11-18': active, '2026-11-17': active },
      frozenDays: ['2026-11-19', '2026-11-20'],
    });
    expect(streakOf(s, '2026-11-21')).toBe(3);
  });
});

describe('longestStreak', () => {
  it('finds the best run, bridged by frozen days', async () => {
    const { longestStreak } = await loadStore();
    const { addDays } = await import('./dates');
    const s = emptyStore({
      days: { ...run('2026-10-10', 5, addDays), ...run('2026-11-03', 3, addDays), ...run('2026-11-07', 3, addDays) },
      frozenDays: ['2026-11-04'],
    });
    expect(longestStreak(s)).toBe(6);
    expect(longestStreak(emptyStore())).toBe(0);
  });
});

describe('applyFreezes', () => {
  it('spends one freeze to save the streak after missing yesterday', async () => {
    const { addDays } = await import('./dates');
    const store = await loadStore(emptyStore({ days: run('2026-11-19', 5, addDays), freezes: 2 }));
    store.applyFreezes();
    const s = store.getStore();
    expect(s.frozenDays).toEqual(['2026-11-20']);
    expect(s.freezes).toBe(1);
    expect(store.streakOf(s, '2026-11-21')).toBe(5);
  });

  it('covers two missed days when two freezes are left', async () => {
    const { addDays } = await import('./dates');
    const store = await loadStore(emptyStore({ days: run('2026-11-18', 3, addDays), freezes: 2 }));
    store.applyFreezes();
    expect(store.getStore().frozenDays.sort()).toEqual(['2026-11-19', '2026-11-20']);
    expect(store.getStore().freezes).toBe(0);
  });

  it('does nothing when the gap is longer than the freezes left', async () => {
    const { addDays } = await import('./dates');
    const store = await loadStore(emptyStore({ days: run('2026-11-18', 3, addDays), freezes: 1 }));
    store.applyFreezes();
    expect(store.getStore().frozenDays).toEqual([]);
    expect(store.getStore().freezes).toBe(1);
  });

  it('does nothing when yesterday already counts or there was no streak', async () => {
    const { addDays } = await import('./dates');
    const kept = await loadStore(emptyStore({ days: run('2026-11-20', 2, addDays), freezes: 2 }));
    kept.applyFreezes();
    expect(kept.getStore().freezes).toBe(2);

    const none = await loadStore(emptyStore({ freezes: 2 }));
    none.applyFreezes();
    expect(none.getStore().freezes).toBe(2);
  });
});

describe('earning freezes', () => {
  it('gives a freeze on every 7th day in a row, holding at most 2', async () => {
    const { addDays } = await import('./dates');
    const store = await loadStore(emptyStore({ days: run('2026-11-20', 6, addDays), freezes: 0 }));
    store.logSeconds(600); // hôm nay thành ngày học thứ 7
    expect(store.getStore().freezes).toBe(1);
    store.logSeconds(600); // cùng ngày: không thưởng thêm
    expect(store.getStore().freezes).toBe(1);

    const full = await loadStore(emptyStore({ days: run('2026-11-20', 13, addDays), freezes: 2 }));
    full.logSeconds(600);
    expect(full.getStore().freezes).toBe(2);
  });

  it('gives nothing on other days', async () => {
    const { addDays } = await import('./dates');
    const store = await loadStore(emptyStore({ days: run('2026-11-20', 4, addDays) }));
    store.logCards(10);
    expect(store.getStore().days['2026-11-21'].cards).toBe(10);
    expect(store.getStore().freezes).toBe(0);
  });
});
