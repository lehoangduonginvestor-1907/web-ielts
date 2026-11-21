import { describe, expect, it } from 'vitest';
import { mergeStores } from './merge';
import { mistakeKey } from './mistakes';
import { attempt, DAY, emptyStore, word } from '@/test/factories';

const T0 = Date.UTC(2026, 10, 1);

describe('mergeStores', () => {
  it('keeps attempts from both devices, in time order', () => {
    const a1 = attempt({ finishedAt: T0 + 2000 });
    const a2 = attempt({ finishedAt: T0 + 1000 });
    const shared = attempt({ finishedAt: T0 });
    const out = mergeStores(emptyStore({ attempts: [shared, a1] }), emptyStore({ attempts: [shared, a2] }));
    expect(out.attempts.map(a => a.id)).toEqual([shared.id, a2.id, a1.id]);
  });

  it('lets the local copy (y) win when both edited the same record', () => {
    const base = attempt({ finishedAt: T0 });
    const out = mergeStores(emptyStore({ attempts: [{ ...base, seconds: 10 }] }), emptyStore({ attempts: [{ ...base, seconds: 99 }] }));
    expect(out.attempts).toHaveLength(1);
    expect(out.attempts[0].seconds).toBe(99);
  });

  it('takes the larger value of every day counter so no study time is lost', () => {
    const out = mergeStores(
      emptyStore({ days: { '2026-11-20': { seconds: 900, units: 1, cards: 3 }, '2026-11-19': { seconds: 60, units: 0, cards: 0 } } }),
      emptyStore({ days: { '2026-11-20': { seconds: 300, units: 2, cards: 0, drills: 1 } } }),
    );
    expect(out.days['2026-11-20']).toEqual({ seconds: 900, units: 2, cards: 3, drills: 1 });
    expect(out.days['2026-11-19'].seconds).toBe(60);
  });

  it('drops duplicate words saved separately on each device', () => {
    const out = mergeStores(
      emptyStore({ words: [word('abate', { id: 'x1', addedAt: 1 }), word('vivid', { id: 'x2' })] }),
      emptyStore({ words: [word('Abate', { id: 'y1', addedAt: 2 })] }),
    );
    expect(out.words.map(w => w.word.toLowerCase()).sort()).toEqual(['abate', 'vivid']);
  });

  it('drops a draft once its attempt was submitted on either device', () => {
    const done = attempt({ finishedAt: T0, startedAt: T0 - 100 });
    const draft = (startedAt: number) => ({ answers: {}, seconds: 0, flagged: [], startedAt });
    const out = mergeStores(
      emptyStore({ attempts: [done], drafts: { 'c17t1:reading:123': draft(T0 - 100) } }),
      emptyStore({ drafts: { 'c17t1:listening:12': draft(T0 + 5) } }),
    );
    expect(Object.keys(out.drafts)).toEqual(['c17t1:listening:12']);
  });

  it('rebuilds the mistake log from all attempts, keeping the reasons', () => {
    const k = mistakeKey('c17t1', 'reading', 5);
    const wrongHere = attempt({ finishedAt: T0, wrong: [5] });
    const redoThere = attempt({ finishedAt: T0 + DAY, focus: [5], from: 5, to: 5, units: [1] });
    const out = mergeStores(
      emptyStore({ attempts: [wrongHere], mistakes: { [k]: { step: 0, due: T0 + DAY, reason: 'locate' } } }),
      emptyStore({ attempts: [redoThere] }),
    );
    expect(out.mistakes[k]).toMatchObject({ step: 1, reason: 'locate' });
  });

  it('unions frozen days and keeps lessons done on either device', () => {
    const out = mergeStores(
      emptyStore({ frozenDays: ['2026-11-02'], lessons: { 'r-tfng': { done: true, checks: { 1: true } } } }),
      emptyStore({ frozenDays: ['2026-11-01', '2026-11-02'], lessons: { 'r-tfng': { checks: { 2: false } } } }),
    );
    expect(out.frozenDays).toEqual(['2026-11-01', '2026-11-02']);
    expect(out.lessons['r-tfng']).toEqual({ done: true, checks: { 1: true, 2: false } });
  });

  it('is stable: merging the same change again changes nothing', () => {
    const x = emptyStore({
      updatedAt: 5,
      attempts: [attempt({ finishedAt: T0, wrong: [3] })],
      days: { '2026-11-01': { seconds: 120, units: 3, cards: 0 } },
      words: [word('abate')],
    });
    const y = emptyStore({
      updatedAt: 9,
      attempts: [attempt({ finishedAt: T0 + DAY, skill: 'listening', units: [1, 2, 3, 4] })],
      days: { '2026-11-02': { seconds: 600, units: 4, cards: 12 } },
    });
    const once = mergeStores(x, y);
    expect(mergeStores(once, y)).toEqual(once);
    expect(mergeStores(x, once)).toEqual(once);
    expect(once.updatedAt).toBe(9);
  });
});
