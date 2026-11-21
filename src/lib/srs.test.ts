import { describe, expect, it } from 'vitest';
import { buildReviewQueue, isNewCard, NEW_CARD_DAILY_CAP, newSrs, QUICK_REVIEW_CAP, review } from './srs';
import type { Srs, Word } from './types';

const NOW = new Date(2026, 10, 21, 20, 0).getTime(); // 21/11/2026, 8 PM local
const DAY = 86400000;

function word(id: string, srs: Partial<Srs> = {}, addedAt = 0): Word {
  return { id, word: id, vi: '', addedAt, srs: { ...newSrs(NOW - DAY), ...srs } };
}

describe('review', () => {
  it('schedules a new card 1 / 1 / 3 days ahead for hard / good / easy', () => {
    const s = newSrs(NOW);
    expect(review(s, 1, NOW).interval).toBe(1);
    expect(review(s, 2, NOW).interval).toBe(1);
    expect(review(s, 3, NOW).interval).toBe(3);
  });

  it('grows the interval with ease once the card has two reviews', () => {
    let s = newSrs(NOW);
    s = review(s, 2, NOW); // 1 day
    s = review(s, 2, NOW); // 3 days
    expect(s.interval).toBe(3);
    s = review(s, 2, NOW);
    expect(s.interval).toBe(Math.round(3 * 2.5));
    expect(s.reps).toBe(3);
  });

  it('aligns the next due time to 4 AM so a day’s reviews group together', () => {
    const due = new Date(review(newSrs(NOW), 2, NOW).due);
    expect(due.getHours()).toBe(4);
    expect(due.getMinutes()).toBe(0);
    expect(due.getDate()).toBe(22);
  });

  it('"again" brings the card back in 10 minutes and records a lapse', () => {
    const s = review({ due: NOW, interval: 20, ease: 2.5, reps: 5, lapses: 0 }, 0, NOW);
    expect(s.due).toBe(NOW + 10 * 60000);
    expect(s.interval).toBe(0);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeCloseTo(2.3);
  });

  it('never lets ease drop below 1.3', () => {
    let s: Srs = { due: NOW, interval: 10, ease: 1.35, reps: 4, lapses: 0 };
    s = review(s, 0, NOW);
    s = review(s, 0, NOW);
    expect(s.ease).toBe(1.3);
    expect(review({ ...s, reps: 3, interval: 10 }, 1, NOW).ease).toBe(1.3);
  });
});

describe('isNewCard', () => {
  it('is only true for cards that were never reviewed', () => {
    expect(isNewCard(newSrs(NOW))).toBe(true);
    expect(isNewCard(review(newSrs(NOW), 2, NOW))).toBe(false);
    // Đã học rồi quên (bấm Again): reps về 0 nhưng không phải thẻ mới
    expect(isNewCard(review({ due: NOW, interval: 9, ease: 2.5, reps: 3, lapses: 0 }, 0, NOW))).toBe(false);
  });
});

describe('buildReviewQueue', () => {
  it('puts due reviews (most overdue first) before new cards (oldest first)', () => {
    const words = [
      word('new-late', {}, 20),
      word('rev-recent', { reps: 2, interval: 3, due: NOW - 1000 }),
      word('new-early', {}, 10),
      word('rev-old', { reps: 2, interval: 3, due: NOW - 5 * DAY }),
      word('not-due', { reps: 2, interval: 3, due: NOW + DAY }),
    ];
    const r = buildReviewQueue(words, { now: NOW });
    expect(r.queue.map(w => w.id)).toEqual(['rev-old', 'rev-recent', 'new-early', 'new-late']);
    expect(r.dueReviewCount).toBe(2);
    expect(r.dueNewCount).toBe(2);
  });

  it('caps new cards per day and reports how many were deferred', () => {
    const words = Array.from({ length: 40 }, (_, i) => word(`n${i}`, {}, i));
    const r = buildReviewQueue(words, { now: NOW });
    expect(r.includedNewCount).toBe(NEW_CARD_DAILY_CAP);
    expect(r.deferredNewCount).toBe(40 - NEW_CARD_DAILY_CAP);
    expect(buildReviewQueue(words, { now: NOW, maxNew: 0 }).queue).toHaveLength(0);
  });

  it('never defers forgotten cards behind the new-card cap', () => {
    const forgotten = Array.from({ length: 20 }, (_, i) =>
      word(`f${i}`, { reps: 0, lapses: 1, interval: 0, due: NOW - 1000 }, i),
    );
    const fresh = Array.from({ length: 5 }, (_, i) => word(`n${i}`, {}, 100 + i));
    const r = buildReviewQueue([...forgotten, ...fresh], { now: NOW, maxNew: 3 });
    expect(r.dueReviewCount).toBe(20);
    expect(r.dueNewCount).toBe(5);
    expect(r.queue.filter(w => w.id.startsWith('f'))).toHaveLength(20);
    expect(r.includedNewCount).toBe(3);
  });

  it('quick mode serves at most 10 cards, reviews first', () => {
    const reviews = Array.from({ length: 6 }, (_, i) => word(`r${i}`, { reps: 2, interval: 3, due: NOW - i * 1000 }));
    const fresh = Array.from({ length: 10 }, (_, i) => word(`n${i}`, {}, i));
    const r = buildReviewQueue([...reviews, ...fresh], { now: NOW, quick: true });
    expect(r.queue).toHaveLength(QUICK_REVIEW_CAP);
    expect(r.queue.slice(0, 6).every(w => w.id.startsWith('r'))).toBe(true);
  });

  it('respects maxTotal even when reviews alone overflow it', () => {
    const reviews = Array.from({ length: 80 }, (_, i) => word(`r${i}`, { reps: 2, interval: 3, due: NOW - i }));
    const r = buildReviewQueue([...reviews, word('n', {}, 0)], { now: NOW });
    expect(r.queue).toHaveLength(60);
    expect(r.includedNewCount).toBe(0);
    expect(r.deferredNewCount).toBe(1);
  });
});
