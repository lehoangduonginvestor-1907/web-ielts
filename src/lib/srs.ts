import type { Srs, Word } from './types';

// Simplified SM-2 spaced repetition.
// grade: 0 = again, 1 = hard, 2 = good, 3 = easy
export type Grade = 0 | 1 | 2 | 3;

const DAY = 86400000;

/** Giới hạn thẻ mới mặc định trong một phiên để tránh ngợp khi thêm hàng loạt từ. */
export const NEW_CARD_DAILY_CAP = 15;
export const QUICK_REVIEW_CAP = 10;

export function newSrs(now = Date.now()): Srs {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function review(s: Srs, grade: Grade, now = Date.now()): Srs {
  if (grade === 0) {
    // Again: review in 10 minutes, reset interval
    return { ...s, due: now + 10 * 60000, interval: 0, ease: Math.max(1.3, s.ease - 0.2), reps: 0, lapses: s.lapses + 1 };
  }
  const ease = Math.max(1.3, s.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  let interval: number;
  if (s.reps === 0) interval = grade === 1 ? 1 : grade === 2 ? 1 : 3;
  else if (s.reps === 1) interval = grade === 1 ? 2 : grade === 2 ? 3 : 6;
  else interval = Math.round(s.interval * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3));
  interval = Math.max(1, interval);
  // Align due time to early morning so daily reviews group cleanly
  const due = new Date(now + interval * DAY);
  due.setHours(4, 0, 0, 0);
  return { due: due.getTime(), interval, ease, reps: s.reps + 1, lapses: s.lapses };
}

export function preview(s: Srs, grade: Grade): string {
  if (grade === 0) return '10 min';
  const d = review(s, grade).interval;
  if (d < 30) return d === 1 ? '1 day' : `${d} days`;
  const m = Math.round(d / 30);
  return m === 1 ? '1 mo' : `${m} mos`;
}

export const isDue = (s: Srs, now = Date.now()) => s.due <= now;

export interface ReviewQueueResult {
  queue: Word[];
  dueReviewCount: number;
  dueNewCount: number;
  includedNewCount: number;
  deferredNewCount: number;
}

/**
 * Xây hàng đợi ôn tập thông minh:
 * - Luôn ưu tiên thẻ cũ đến hạn trước (chống quên).
 * - Giới hạn thẻ mới mỗi ngày (mặc định 15) để tránh ngợp khi thêm nhiều từ từ bài đọc.
 * - Hỗ trợ chế độ quick (10 thẻ ~3 phút) và extra (học thêm thẻ mới theo yêu cầu).
 */
export function buildReviewQueue(
  words: Word[],
  opts: { now?: number; maxNew?: number; maxTotal?: number; quick?: boolean } = {},
): ReviewQueueResult {
  const now = opts.now ?? Date.now();
  const maxTotal = opts.quick ? QUICK_REVIEW_CAP : (opts.maxTotal ?? 60);
  const maxNew = opts.maxNew ?? NEW_CARD_DAILY_CAP;

  const dueReviews = words
    .filter(w => w.srs.reps > 0 && w.srs.due <= now)
    .sort((a, b) => a.srs.due - b.srs.due);

  const dueNew = words
    .filter(w => w.srs.reps === 0 && w.srs.due <= now)
    .sort((a, b) => a.addedAt - b.addedAt);

  const reviewSlice = dueReviews.slice(0, maxTotal);
  const room = Math.max(0, maxTotal - reviewSlice.length);
  const newLimit = opts.quick ? Math.min(room, Math.max(maxNew, QUICK_REVIEW_CAP - reviewSlice.length)) : Math.min(Math.max(0, maxNew), room);
  const newSlice = dueNew.slice(0, newLimit);

  return {
    queue: [...reviewSlice, ...newSlice],
    dueReviewCount: dueReviews.length,
    dueNewCount: dueNew.length,
    includedNewCount: newSlice.length,
    deferredNewCount: Math.max(0, dueNew.length - newSlice.length),
  };
}
