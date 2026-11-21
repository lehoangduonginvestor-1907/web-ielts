import { describe, expect, it } from 'vitest';
import { bandEstimate, countsForBand, nextUnit, reservedBook, tierOf, unitScore } from './progress';
import type { TestIndexEntry } from './types';
import { attempt, DAY, emptyStore } from '@/test/factories';

const T0 = Date.UTC(2026, 10, 1);

/** Mục lục giả: `books` cuốn, mỗi cuốn 4 đề, Reading 3 bài (13/13/14 câu), Listening 4 phần. */
function index(books: number[]): TestIndexEntry[] {
  return books.flatMap(book =>
    [1, 2, 3, 4].map(test => ({
      id: `c${book}t${test}`,
      book,
      test,
      listening: [1, 2, 3, 4].map(n => ({ n, title: '', from: n * 10 - 9, to: n * 10, audio: true })),
      reading: [
        { n: 1, title: '', from: 1, to: 13 },
        { n: 2, title: '', from: 14, to: 26 },
        { n: 3, title: '', from: 27, to: 40 },
      ],
    })),
  );
}

/** Bài thi thử Reading cả đề với `score` câu đúng. */
const exam = (testId: string, score: number, at: number, patch = {}) =>
  attempt({ testId, finishedAt: at, wrong: Array.from({ length: 40 - score }, (_, i) => 40 - i), ...patch });

describe('countsForBand / bandEstimate', () => {
  it('only counts timed full mocks on a test seen for the first time', () => {
    const first = exam('c17t1', 30, T0);
    const again = exam('c17t1', 38, T0 + DAY);
    const practice = exam('c17t2', 35, T0 + 2 * DAY, { mode: 'practice' });
    const resumed = exam('c17t3', 35, T0 + 3 * DAY, { resumed: true });
    const s = emptyStore({ attempts: [first, again, practice, resumed] });
    expect([first, again, practice, resumed].map(a => countsForBand(s, a))).toEqual([true, false, false, false]);
    expect(bandEstimate(s, 'reading')).toEqual({ latest: 7, avg: 7, count: 1 });
  });

  it('does not count a test whose questions were already seen in a mistake redo', () => {
    const redo = attempt({ testId: 'c17t1', finishedAt: T0, focus: [3], from: 3, to: 3, units: [1] });
    const s = emptyStore({ attempts: [redo, exam('c17t1', 30, T0 + DAY)] });
    expect(bandEstimate(s, 'reading')).toBeNull();
  });

  it('averages the last three counted mocks to the nearest half band', () => {
    const s = emptyStore({
      attempts: [exam('c17t1', 10, T0), exam('c17t2', 23, T0 + 1), exam('c17t3', 27, T0 + 2), exam('c17t4', 30, T0 + 3)],
    });
    // 6 + 6.5 + 7 = 19.5 / 3 = 6.5; bài band 4 cũ nhất bị bỏ
    expect(bandEstimate(s, 'reading')).toEqual({ latest: 7, avg: 6.5, count: 3 });
    expect(bandEstimate(s, 'listening')).toBeNull();
  });
});

describe('unitScore', () => {
  it('reads a passage score out of a full-test attempt', () => {
    const s = emptyStore({ attempts: [exam('c17t1', 37, T0)] }); // sai 38–40, đều ở bài 3
    const [p1, , p3] = index([17])[0].reading;
    expect(unitScore(s, 'c17t1', 'reading', p1)).toMatchObject({ score: 13, total: 13 });
    expect(unitScore(s, 'c17t1', 'reading', p3)).toMatchObject({ score: 11, total: 14 });
    expect(unitScore(s, 'c17t2', 'reading', p1)).toBeNull();
  });
});

describe('tiers', () => {
  const idx = index([10, 11, 12, 13]);
  /** Lần đầu làm Passage 1 của đề `testId`, đúng `ok`/13 câu. */
  const p1 = (testId: string, ok: number, at: number) =>
    attempt({ testId, finishedAt: at, mode: 'practice', units: [1], from: 1, to: 13, wrong: Array.from({ length: 13 - ok }, (_, i) => 13 - i) });

  it('starts everyone on the easiest parts', () => {
    expect(tierOf(emptyStore(), 'reading', idx)).toBe(0);
    expect(nextUnit(emptyStore(), idx, 'reading')).toMatchObject({ testId: 'c10t1', unit: { n: 1 } });
  });

  it('opens Passage 2 after three different tests average at least 70% on Passage 1', () => {
    const s = emptyStore({ attempts: [p1('c10t1', 10, T0), p1('c10t2', 9, T0 + 1), p1('c10t3', 9, T0 + 2)] });
    expect(tierOf(s, 'reading', idx)).toBe(1); // 28/39 ≈ 72%
    expect(nextUnit(s, idx, 'reading')).toMatchObject({ testId: 'c10t1', unit: { n: 2 } });
  });

  it('stays put below 70%, and a retake of the same test does not help', () => {
    const low = emptyStore({ attempts: [p1('c10t1', 9, T0), p1('c10t2', 9, T0 + 1), p1('c10t3', 8, T0 + 2)] });
    expect(tierOf(low, 'reading', idx)).toBe(0); // 26/39 ≈ 67%
    const retake = emptyStore({ attempts: [p1('c10t1', 13, T0), p1('c10t1', 13, T0 + 1), p1('c10t1', 13, T0 + 2)] });
    expect(tierOf(retake, 'reading', idx)).toBe(0);
  });

  it('keeps the newest book for the final mocks once there are four or more', () => {
    expect(reservedBook(idx)).toBe(13);
    expect(reservedBook(index([10, 11, 12]))).toBeNull();
    const doneAllButBook13 = emptyStore({
      attempts: idx.filter(t => t.book !== 13).map((t, i) => p1(t.id, 5, T0 + i)),
    });
    expect(nextUnit(doneAllButBook13, idx, 'reading')).toBeNull();
  });
});
