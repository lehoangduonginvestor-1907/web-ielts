import type { Answers, Group } from './types';

// Chuẩn hoá câu trả lời điền từ: không phân biệt hoa thường, bỏ khoảng trắng thừa,
// dấu câu ở hai đầu và ký hiệu tiền tệ.
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[£$€]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?"']+|[\s.,;:!?"']+$/g, '')
    .trim();
}

export function isFilled(v: string | string[] | undefined): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return !!v && v.trim().length > 0;
}

// Chấm một nhóm câu hỏi. Với dạng "chọn HAI đáp án", lựa chọn được lưu ở câu đầu nhóm
// và mỗi lựa chọn đúng được tính một điểm (giống cách chấm của IELTS).
export function gradeGroup(g: Group, answers: Answers): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  if (g.kind === 'multi') {
    const picked = (answers[g.from] as string[] | undefined) ?? [];
    const key = new Set(g.questions[0].answer);
    const hits = new Set(picked.filter(p => key.has(p))).size;
    g.questions.forEach((q, i) => (out[q.n] = i < hits));
    return out;
  }
  for (const q of g.questions) {
    const v = answers[q.n];
    if (typeof v !== 'string' || !v.trim()) {
      out[q.n] = false;
      continue;
    }
    const given = normalizeAnswer(v);
    out[q.n] = q.answer.some(a => normalizeAnswer(a) === given);
  }
  return out;
}

export function gradeGroups(groups: Group[], answers: Answers, focus?: number[]) {
  const results: Record<number, boolean> = {};
  const types: Record<number, string> = {};
  for (const g of groups) {
    Object.assign(results, gradeGroup(g, answers));
    g.questions.forEach(q => (types[q.n] = g.type));
  }
  if (focus?.length) {
    for (const n of Object.keys(results).map(Number)) {
      if (!focus.includes(n)) {
        delete results[n];
        delete types[n];
      }
    }
  }
  const total = Object.keys(results).length;
  const score = Object.values(results).filter(Boolean).length;
  return { results, types, score, total };
}

// Câu trả lời "hiển thị" của người học cho một câu (dạng multi lấy theo thứ tự)
export function shownAnswer(g: Group, n: number, answers: Answers): string {
  if (g.kind === 'multi') {
    const picked = (answers[g.from] as string[] | undefined) ?? [];
    const idx = g.questions.findIndex(q => q.n === n);
    const key = new Set(g.questions[0].answer);
    const ordered = [...picked.filter(p => key.has(p)), ...picked.filter(p => !key.has(p))];
    return ordered[idx] ?? '';
  }
  const v = answers[n];
  return typeof v === 'string' ? v : '';
}

export function correctDisplay(g: Group, n: number): string {
  const q = g.questions.find(x => x.n === n);
  if (!q) return '';
  if (g.kind === 'multi') return q.answer.join(' & ');
  return q.answer[0];
}
