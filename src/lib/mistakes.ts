import type { Attempt, MistakeState } from './types';

const DAY = 86400000;
const GAPS = [1, 3, 7]; // ngày

export const mistakeKey = (testId: string, skill: string, n: number) => `${testId}:${skill[0].toUpperCase()}:${n}`;

/**
 * Cập nhật Sổ lỗi theo một bài vừa nộp (sửa trực tiếp `mistakes`).
 * Câu sai: vào sổ, hẹn làm lại sau 1 ngày. Câu làm lại đúng khi đã đến hạn: giãn lịch 1 → 3 → 7 ngày,
 * đúng lần thứ ba thì gạch khỏi sổ. Làm lại sớm hơn hạn vẫn được (để sửa ngay) nhưng không tính:
 * nhớ được trong vài phút chưa chứng tỏ đã hiểu.
 * Sổ lỗi chỉ phụ thuộc vào danh sách bài làm (cộng lý do người học ghi), nên tính lại được từ đầu khi gộp dữ liệu hai máy.
 */
export function applyMistakes(mistakes: Record<string, MistakeState>, a: Attempt) {
  // Bài bỏ dở: câu chưa đụng tới không phải câu sai, không đưa vào Sổ lỗi
  const untouched = new Set(a.incomplete ? a.blank : []);
  for (const [nStr, ok] of Object.entries(a.results)) {
    if (untouched.has(Number(nStr))) continue;
    const key = mistakeKey(a.testId, a.skill, Number(nStr));
    const m = mistakes[key];
    if (!ok) {
      mistakes[key] = { ...m, step: 0, due: a.finishedAt + DAY, resolved: false };
    } else if (m && !m.resolved && a.focus?.length && a.finishedAt >= m.due) {
      const step = m.step + 1;
      mistakes[key] = step >= GAPS.length ? { ...m, step, resolved: true, due: Number.MAX_SAFE_INTEGER } : { ...m, step, due: a.finishedAt + GAPS[step] * DAY };
    }
  }
}

/** Tính lại toàn bộ Sổ lỗi từ các bài làm, giữ lý do sai đã ghi. */
export function rebuildMistakes(attempts: Attempt[], reasons: (key: string) => MistakeState['reason']) {
  const out: Record<string, MistakeState> = {};
  for (const a of [...attempts].sort((x, y) => x.finishedAt - y.finishedAt)) applyMistakes(out, a);
  for (const [k, m] of Object.entries(out)) {
    const r = reasons(k);
    if (r) m.reason = r;
    else delete m.reason;
  }
  return out;
}
