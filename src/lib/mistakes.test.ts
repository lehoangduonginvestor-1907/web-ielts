import { describe, expect, it } from 'vitest';
import { applyMistakes, mistakeKey, rebuildMistakes } from './mistakes';
import type { MistakeState } from './types';
import { attempt, DAY } from '@/test/factories';

const T0 = Date.UTC(2026, 10, 1);
const KEY = mistakeKey('c17t1', 'reading', 5);

/** Làm lại riêng câu 5 vào thời điểm `at`. */
const redo = (at: number, ok: boolean) =>
  attempt({ finishedAt: at, focus: [5], from: 5, to: 5, wrong: ok ? [] : [5], units: [1] });

describe('mistakeKey', () => {
  it('uses the skill initial', () => {
    expect(mistakeKey('c17t1', 'listening', 12)).toBe('c17t1:L:12');
  });
});

describe('applyMistakes', () => {
  it('logs a wrong answer for a redo one day later', () => {
    const m: Record<string, MistakeState> = {};
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [5] }));
    expect(m[KEY]).toEqual({ step: 0, due: T0 + DAY, resolved: false });
    expect(Object.keys(m)).toHaveLength(1);
  });

  it('crosses a mistake off after three on-schedule correct redos (1 → 3 → 7 days)', () => {
    const m: Record<string, MistakeState> = {};
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [5] }));
    applyMistakes(m, redo(T0 + DAY, true));
    expect(m[KEY]).toMatchObject({ step: 1, due: T0 + DAY + 3 * DAY, resolved: false });
    applyMistakes(m, redo(T0 + 4 * DAY, true));
    expect(m[KEY]).toMatchObject({ step: 2, due: T0 + 4 * DAY + 7 * DAY });
    applyMistakes(m, redo(T0 + 11 * DAY, true));
    expect(m[KEY].resolved).toBe(true);
  });

  it('does not count a correct redo made before it is due', () => {
    const m: Record<string, MistakeState> = {};
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [5] }));
    applyMistakes(m, redo(T0 + 60_000, true));
    expect(m[KEY]).toMatchObject({ step: 0, due: T0 + DAY });
  });

  it('resets the schedule when the redo is wrong again, keeping the reason', () => {
    const m: Record<string, MistakeState> = {};
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [5] }));
    m[KEY].reason = 'paraphrase';
    applyMistakes(m, redo(T0 + DAY, true));
    applyMistakes(m, redo(T0 + 4 * DAY, false));
    expect(m[KEY]).toEqual({ step: 0, due: T0 + 5 * DAY, resolved: false, reason: 'paraphrase' });
  });

  it('only advances on a mistake redo, not on a normal attempt', () => {
    const m: Record<string, MistakeState> = {};
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [5] }));
    applyMistakes(m, attempt({ finishedAt: T0 + 2 * DAY }));
    expect(m[KEY].step).toBe(0);
  });

  it('ignores untouched questions of an abandoned attempt', () => {
    const m: Record<string, MistakeState> = {};
    const blank = Array.from({ length: 30 }, (_, i) => i + 11);
    applyMistakes(m, attempt({ finishedAt: T0, wrong: [2, ...blank], blank, incomplete: true }));
    expect(Object.keys(m)).toEqual(['c17t1:R:2']);
  });
});

describe('rebuildMistakes', () => {
  it('replays attempts in time order no matter how they are stored', () => {
    const a = [attempt({ finishedAt: T0, wrong: [5] }), redo(T0 + DAY, true), redo(T0 + 4 * DAY, true)];
    const forward = rebuildMistakes(a, () => undefined);
    const shuffled = rebuildMistakes([a[2], a[0], a[1]], () => undefined);
    expect(shuffled).toEqual(forward);
    expect(forward[KEY].step).toBe(2);
  });

  it('keeps recorded reasons and drops reasons for keys that no longer exist', () => {
    const out = rebuildMistakes([attempt({ finishedAt: T0, wrong: [5] })], k => (k === KEY ? 'vocab' : 'time'));
    expect(out[KEY].reason).toBe('vocab');
    expect(Object.keys(out)).toEqual([KEY]);
  });
});
