import { createHash } from 'node:crypto';
import 'server-only';

// Hai lớp bảo vệ quanh việc gọi AI chấm bài (chỉ chạy trên máy chủ):
// 1. Kiểm tra kết quả trả về có đủ điểm từng tiêu chí. Thiếu điểm mà vẫn dùng thì tiêu chí đó thành 0
//    và kéo band tổng xuống mà không ai biết; coi như kết quả hỏng để chấm lại hoặc chuyển model.
// 2. Gom các lượt chấm trùng: bấm "Chấm lại" sau khi mất mạng (máy chủ có thể vẫn đang chấm hoặc đã chấm xong)
//    thì dùng lại kết quả đó thay vì tốn thêm một lượt gọi model (Hydrogen miễn phí chỉ 20 lượt/ngày).

/** Các tiêu chí thiếu điểm hợp lệ (số 0–9), vd. ['lr', 'gra']. */
export function missingBands(assessment: unknown, keys: readonly string[]): string[] {
  const a = (assessment && typeof assessment === 'object' ? assessment : {}) as Record<string, { band?: unknown } | undefined>;
  return keys.filter(k => {
    const raw = a[k]?.band;
    const n = typeof raw === 'string' && raw.trim() ? Number(raw) : raw;
    return typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 9;
  });
}

/** Lời báo lỗi khi kết quả thiếu điểm; null khi đủ. */
export function bandProblem(assessment: unknown, keys: readonly string[]): string | null {
  const miss = missingBands(assessment, keys);
  return miss.length ? `missing band score for ${miss.join(', ')}` : null;
}

export const hashKey = (...parts: (string | Uint8Array)[]) => {
  const h = createHash('sha256');
  for (const p of parts) {
    h.update(p);
    h.update('\u0000');
  }
  return h.digest('hex');
};

const TTL = 30 * 60_000;
const MAX_ENTRIES = 30;
const entries = new Map<string, { at: number; value: Promise<unknown> }>();

/**
 * Chạy `run` một lần cho mỗi `key`: lượt trùng trong lúc đang chấm thì chờ chung kết quả,
 * lượt trùng sau khi chấm xong (trong 30 phút) thì nhận lại kết quả cũ. Lượt lỗi không được nhớ.
 * Bộ nhớ nằm trong tiến trình máy chủ, nên trên Vercel chỉ có tác dụng khi cùng một instance còn ấm.
 */
export function dedupeGrade<T>(key: string, run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [k, e] of entries) if (now - e.at > TTL) entries.delete(k);
  const hit = entries.get(key);
  if (hit) return hit.value as Promise<T>;

  const value = run();
  entries.set(key, { at: now, value });
  value.catch(() => {
    if (entries.get(key)?.value === value) entries.delete(key);
  });
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
  return value;
}

/** Chỉ dùng trong test. */
export function clearGradeCache() {
  entries.clear();
}
