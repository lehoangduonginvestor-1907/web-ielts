import 'server-only';

// Kiểm tra kết quả chấm mà người học dán từ Gemini (thanh Gemini của Chrome hoặc gemini.google.com).
// Thiếu điểm một tiêu chí mà vẫn dùng thì tiêu chí đó thành 0 và kéo band tổng xuống mà không ai biết,
// nên kết quả như vậy bị từ chối kèm lời báo để người học xin Gemini gửi lại.

/** Lấy phần JSON từ câu trả lời: bỏ khối suy nghĩ <think>, rào ```json, chữ thừa trước/sau. */
export function extractJson(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  return first >= 0 && last > first ? s.slice(first, last + 1) : s;
}

/** Các tiêu chí thiếu điểm hợp lệ (số 0–9), vd. ['lr', 'gra']. */
export function missingBands(assessment: unknown, keys: readonly string[]): string[] {
  const a = (assessment && typeof assessment === 'object' ? assessment : {}) as Record<string, { band?: unknown } | undefined>;
  return keys.filter(k => {
    const raw = a[k]?.band;
    const n = typeof raw === 'string' && raw.trim() ? Number(raw) : raw;
    return typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 9;
  });
}
