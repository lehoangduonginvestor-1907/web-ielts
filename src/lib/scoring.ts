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

// Giới hạn số từ đọc từ hướng dẫn của nhóm câu, vd. "ONE WORD AND/OR A NUMBER", "NO MORE THAN TWO WORDS"
const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3 };
export interface WordLimit {
  words: number;
  number: boolean; // được thêm một con số
}
export function wordLimit(instructions: string): WordLimit | null {
  const m = /\b(one|two|three) words?\b(\s+and\/or\s+a\s+number)?/i.exec(instructions);
  return m ? { words: NUM_WORDS[m[1].toLowerCase()], number: !!m[2] } : null;
}
/**
 * Câu trả lời có vượt giới hạn số từ không (từ có gạch nối tính là một từ).
 * Khi đề cho thêm "a number", mọi mảnh có chữ số (số, giá, giờ, mã bưu điện như "PE9 7QT") đều thuộc phần số.
 * Đây chỉ là lời nhắc khi luyện tập, không ảnh hưởng chấm điểm.
 */
export function overLimit(v: string, lim: WordLimit | null): boolean {
  if (!lim || !v.trim()) return false;
  const tokens = v.trim().split(/\s+/);
  if (!lim.number) return tokens.length > lim.words;
  return tokens.filter(t => !/\d/.test(t)).length > lim.words;
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

/**
 * Các câu thực sự được chấm khi chỉ làm lại một số câu. Nhóm "chọn HAI đáp án" luôn được chấm cả nhóm:
 * điểm của nhóm này dồn vào câu đầu trước, nên nếu chỉ chấm câu thứ hai thì chọn đúng một đáp án vẫn ra 0/1.
 * Chấm cả nhóm thì đúng một lựa chọn là 1/2, đúng cả hai là 2/2 (câu trong Sổ lỗi chỉ qua khi đúng cả cặp).
 */
export function expandFocus(groups: Group[], focus?: number[]): number[] | undefined {
  if (!focus?.length) return focus;
  const out = new Set(focus);
  for (const g of groups) {
    if (g.kind === 'multi' && g.questions.some(q => out.has(q.n))) g.questions.forEach(q => out.add(q.n));
  }
  return [...out].sort((a, b) => a - b);
}

export function gradeGroups(groups: Group[], answers: Answers, focusIn?: number[]) {
  const results: Record<number, boolean> = {};
  const types: Record<number, string> = {};
  for (const g of groups) {
    Object.assign(results, gradeGroup(g, answers));
    g.questions.forEach(q => (types[q.n] = g.type));
  }
  const focus = expandFocus(groups, focusIn);
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
