import type { Attempt, Skill, Store, TestIndexEntry, UnitIndex } from './types';
import { bandFor } from './band';
import { addDays, dayKey } from './dates';
import { isActive } from './store';
import { drillBooks, type DrillGroup } from './skills';

// Bài làm thật: không phải làm lại câu sai, không phải bài bỏ dở (trả lời chưa tới một nửa)
const realAttempts = (s: Store) => s.attempts.filter(a => !a.focus?.length && !a.incomplete);

// Điểm gần nhất của một phần (lấy từ bài làm riêng phần đó hoặc bài làm cả đề)
export function unitScore(s: Store, testId: string, skill: Skill, u: UnitIndex) {
  for (let i = s.attempts.length - 1; i >= 0; i--) {
    const a = s.attempts[i];
    if (a.testId !== testId || a.skill !== skill || a.focus?.length || a.incomplete || !a.units.includes(u.n)) continue;
    let score = 0;
    let total = 0;
    for (let n = u.from; n <= u.to; n++) {
      if (n in a.results) {
        total++;
        if (a.results[n]) score++;
      }
    }
    if (total) return { score, total, at: a.finishedAt, attemptId: a.id };
  }
  return null;
}

export function fullAttempts(s: Store, skill: Skill): Attempt[] {
  return realAttempts(s).filter(a => a.skill === skill && a.total === 40);
}

export function bandEstimate(s: Store, skill: Skill) {
  const full = fullAttempts(s, skill).slice(-3);
  if (!full.length) return null;
  const bands = full.map(a => bandFor(skill, a.score));
  const avg = bands.reduce((x, y) => x + y, 0) / bands.length;
  return { latest: bands[bands.length - 1], avg: Math.round(avg * 2) / 2, count: full.length };
}

// Bài làm tính vào thống kê dạng câu: bài làm thật và bài luyện theo dạng
const statAttempts = (s: Store) => s.attempts.filter(a => !a.incomplete && (!a.focus?.length || a.drill));

// Độ chính xác theo dạng câu hỏi (60 ngày gần nhất)
export function typeStats(s: Store, skill?: Skill) {
  const since = Date.now() - 60 * 86400000;
  const map = new Map<string, { type: string; skill: Skill; ok: number; all: number }>();
  for (const a of statAttempts(s)) {
    if (a.finishedAt < since || (skill && a.skill !== skill)) continue;
    for (const [n, ok] of Object.entries(a.results)) {
      const type = a.types[Number(n)] ?? 'Khác';
      const k = `${a.skill}:${type}`;
      const v = map.get(k) ?? { type, skill: a.skill, ok: 0, all: 0 };
      v.all++;
      if (ok) v.ok++;
      map.set(k, v);
    }
  }
  return [...map.values()].sort((x, y) => x.ok / x.all - y.ok / y.all);
}

// ---------- Lộ trình bậc thang cho người mới (band 5.0–5.5) ----------
// Bậc 1: Listening Part 1–2, Reading Passage 1. Bậc 2: thêm Part 3, Passage 2. Bậc 3: tất cả.
// Lên bậc khi 5 lần làm gần nhất ở phần khó nhất của bậc hiện tại đạt trung bình ≥ 70%.

const TIERS: Record<Skill, number[][]> = {
  listening: [[1, 2], [1, 2, 3], [1, 2, 3, 4]],
  reading: [[1], [1, 2], [1, 2, 3]],
};

export function tierOf(s: Store, skill: Skill): number {
  let tier = 0;
  while (tier < 2) {
    const hardest = TIERS[skill][tier][TIERS[skill][tier].length - 1];
    const recent = realAttempts(s)
      .filter(a => a.skill === skill && a.units.includes(hardest))
      .slice(-5);
    if (recent.length < 3) break;
    const acc = recent.reduce((x, a) => x + a.score / Math.max(1, a.total), 0) / recent.length;
    if (acc < 0.7) break;
    tier++;
  }
  return tier;
}

export const tierUnits = (skill: Skill, tier: number) => TIERS[skill][tier];

/** Đang ở bậc nào và còn bao xa để mở bậc tiếp theo (null khi đã mở hết). */
export function tierProgress(s: Store, skill: Skill) {
  const tier = tierOf(s, skill);
  if (tier >= 2) return null;
  const unit = TIERS[skill][tier][TIERS[skill][tier].length - 1];
  const recent = realAttempts(s)
    .filter(a => a.skill === skill && a.units.includes(unit))
    .slice(-5);
  const acc = recent.length ? recent.reduce((x, a) => x + a.score / Math.max(1, a.total), 0) / recent.length : null;
  return { tier, unit, next: TIERS[skill][tier + 1][TIERS[skill][tier + 1].length - 1], count: recent.length, acc };
}

// Đề "để dành" cho thi thử cuối kỳ: cuốn mới nhất, khi đã có từ 4 cuốn trở lên
export function reservedBook(index: TestIndexEntry[]): number | null {
  const books = [...new Set(index.map(t => t.book))].sort((a, b) => a - b);
  return books.length >= 4 ? books[books.length - 1] : null;
}

export interface Suggestion {
  testId: string;
  book: number;
  test: number;
  skill: Skill;
  unit: UnitIndex;
}

// Phần nên làm tiếp: phần chưa làm, nằm trong bậc hiện tại, ưu tiên phần dễ nhất và đề cũ hơn
export function nextUnit(s: Store, index: TestIndexEntry[], skill: Skill): Suggestion | null {
  const tier = tierOf(s, skill);
  const allowed = tierUnits(skill, tier);
  const reserved = reservedBook(index);
  const drill = drillBooks(index);
  const candidates: Suggestion[] = [];
  for (const t of index) {
    if (t.book === reserved || drill.includes(t.book)) continue;
    for (const u of t[skill]) {
      if (!allowed.includes(u.n)) continue;
      if (u.audio === false) continue; // chưa có audio thì chưa giao
      if (unitScore(s, t.id, skill, u)) continue;
      candidates.push({ testId: t.id, book: t.book, test: t.test, skill, unit: u });
    }
  }
  // Ở bậc cao, ưu tiên phần khó mới mở; ở bậc thấp đi lần lượt
  const target = tier > 0 ? allowed[allowed.length - 1] : -1;
  candidates.sort((a, b) => (a.unit.n === target ? -1 : 0) - (b.unit.n === target ? -1 : 0) || a.book - b.book || a.test - b.test || a.unit.n - b.unit.n);
  return candidates[0] ?? null;
}

// Tiến độ luyện một dạng: nhóm nào đã làm (lấy lần làm gần nhất), nhóm kế tiếp chưa làm
export function drillSummary(s: Store, groups: DrillGroup[]) {
  let done = 0;
  let ok = 0;
  let all = 0;
  let next: DrillGroup | null = null;
  for (const g of groups) {
    const a = s.attempts.findLast(x => x.testId === g.testId && x.skill === g.skill && !x.incomplete && g.from in x.results);
    if (!a) {
      next ??= g;
      continue;
    }
    done++;
    for (let n = g.from; n <= g.to; n++) {
      if (n in a.results) {
        all++;
        if (a.results[n]) ok++;
      }
    }
  }
  return { done, ok, all, next };
}

export function dueMistakes(s: Store) {
  const now = Date.now();
  return Object.entries(s.mistakes).filter(([, m]) => !m.resolved && m.due <= now);
}

export function dueWords(s: Store) {
  const now = Date.now();
  return s.words.filter(w => w.srs.due <= now);
}

// Số ngày học trong 7 ngày gần nhất
export function activeDaysThisWeek(s: Store) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isActive(s.days[addDays(dayKey(), -i)])) n++;
  return n;
}
