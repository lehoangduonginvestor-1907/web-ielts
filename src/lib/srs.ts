import type { Srs } from './types';

// Lặp lại ngắt quãng kiểu SM-2 rút gọn.
// grade: 0 = quên, 1 = khó, 2 = nhớ, 3 = dễ
export type Grade = 0 | 1 | 2 | 3;

const DAY = 86400000;

export function newSrs(now = Date.now()): Srs {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function review(s: Srs, grade: Grade, now = Date.now()): Srs {
  if (grade === 0) {
    // Quên: gặp lại sau 10 phút, khoảng cách quay về đầu
    return { ...s, due: now + 10 * 60000, interval: 0, ease: Math.max(1.3, s.ease - 0.2), reps: 0, lapses: s.lapses + 1 };
  }
  const ease = Math.max(1.3, s.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  let interval: number;
  if (s.reps === 0) interval = grade === 1 ? 1 : grade === 2 ? 1 : 3;
  else if (s.reps === 1) interval = grade === 1 ? 2 : grade === 2 ? 3 : 6;
  else interval = Math.round(s.interval * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3));
  interval = Math.max(1, interval);
  // Đặt hạn về đầu ngày để "ôn hôm nay" gom đủ thẻ
  const due = new Date(now + interval * DAY);
  due.setHours(4, 0, 0, 0);
  return { due: due.getTime(), interval, ease, reps: s.reps + 1, lapses: s.lapses };
}

export function preview(s: Srs, grade: Grade): string {
  if (grade === 0) return '10 phút';
  const d = review(s, grade).interval;
  return d < 30 ? `${d} ngày` : `${Math.round(d / 30)} tháng`;
}

export const isDue = (s: Srs, now = Date.now()) => s.due <= now;
