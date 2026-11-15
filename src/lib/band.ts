import type { Skill } from './types';

// Bảng quy đổi điểm thô (trên 40) sang band, theo bảng tham khảo phổ biến của IELTS.
// Đề luyện chỉ cho band ước tính.
const LISTENING: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];
const READING: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];

export function bandFor(skill: Skill, raw: number): number {
  const table = skill === 'listening' ? LISTENING : READING;
  for (const [min, band] of table) if (raw >= min) return band;
  return raw > 0 ? 2 : 0;
}

// Cần bao nhiêu câu đúng để đạt band mục tiêu
export function rawFor(skill: Skill, band: number): number {
  const table = skill === 'listening' ? LISTENING : READING;
  const row = [...table].reverse().find(([, b]) => b >= band);
  return row ? row[0] : 40;
}

export const fmtBand = (b: number) => (Number.isInteger(b) ? `${b}.0` : `${b}`);
