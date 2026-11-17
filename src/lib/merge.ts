import type { DayLog, Store } from './types';
import { rebuildMistakes } from './mistakes';

// Gộp hai bản tiến độ (học trên hai máy, hoặc bản trên máy chưa kịp gửi lên khi máy chủ đã có bản mới hơn).
// Không bản nào được ghi đè cả hồ sơ: bài làm và thẻ từ gộp theo id, ngày học lấy số lớn hơn, Sổ lỗi tính lại.
// Khi hai bên cùng sửa một mục, bản `y` thắng (thường là bản của máy đang dùng).
// Giới hạn: một thẻ từ bị xoá trên máy này trong lúc máy kia vẫn giữ sẽ xuất hiện lại.

function byId<T extends { id: string }>(x: T[], y: T[]): T[] {
  const m = new Map<string, T>();
  for (const v of x) m.set(v.id, v);
  for (const v of y) m.set(v.id, v);
  return [...m.values()];
}

function perKey<T>(x: Record<string, T>, y: Record<string, T>, pick: (a: T | undefined, b: T | undefined) => T | undefined) {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    const v = pick(x[k], y[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const maxDay = (a?: DayLog, b?: DayLog): DayLog => ({
  seconds: Math.max(a?.seconds ?? 0, b?.seconds ?? 0),
  units: Math.max(a?.units ?? 0, b?.units ?? 0),
  cards: Math.max(a?.cards ?? 0, b?.cards ?? 0),
  ...(a?.drills || b?.drills ? { drills: Math.max(a?.drills ?? 0, b?.drills ?? 0) } : {}),
});

export function mergeStores(x: Store, y: Store): Store {
  const attempts = byId(x.attempts, y.attempts).sort((a, b) => a.finishedAt - b.finishedAt);

  // Thẻ từ: theo id, rồi bỏ trùng chữ (hai máy cùng lưu một từ thì id khác nhau)
  const seen = new Set<string>();
  const words = byId(x.words, y.words)
    .sort((a, b) => b.addedAt - a.addedAt)
    .filter(w => {
      const k = w.word.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  // Bản nháp của bài đã nộp (ở máy bất kỳ) thì bỏ, để không hiện "Làm tiếp" cho bài đã xong
  const submitted = new Set(attempts.map(a => `${a.testId}:${a.skill}:${a.startedAt}`));
  const drafts = perKey(x.drafts, y.drafts, (a, b) => b ?? a);
  for (const [k, d] of Object.entries(drafts)) {
    const [testId, skill] = k.split(':');
    if (submitted.has(`${testId}:${skill}:${d.startedAt}`)) delete drafts[k];
  }

  return {
    ...x,
    ...y,
    version: 1,
    updatedAt: Math.max(x.updatedAt ?? 0, y.updatedAt ?? 0),
    profile: y.profile ?? x.profile,
    attempts,
    drafts,
    days: perKey(x.days, y.days, maxDay),
    journal: perKey(x.journal, y.journal, (a, b) => b ?? a),
    words,
    mistakes: rebuildMistakes(attempts, k => (k in y.mistakes ? y.mistakes[k].reason : x.mistakes[k]?.reason)),
    highlights: perKey(x.highlights, y.highlights, (a, b) => b ?? a),
    freezes: y.freezes,
    frozenDays: [...new Set([...x.frozenDays, ...y.frozenDays])].sort(),
    lessons: perKey(x.lessons ?? {}, y.lessons ?? {}, (a, b) => ({
      ...a,
      ...b,
      done: !!(a?.done || b?.done),
      checks: { ...b?.checks, ...a?.checks },
    })),
  };
}
