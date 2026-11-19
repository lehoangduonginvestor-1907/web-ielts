import type { Attempt, Skill, SpeakingTopic, Store, TestIndexEntry, UnitIndex, WritingPrompt, WritingTaskType } from './types';
import { bandFor } from './band';
import { addDays, dayKey } from './dates';
import { isActive } from './store';
import { drillBooks, type DrillGroup } from './skills';
import { buildReviewQueue, NEW_CARD_DAILY_CAP, type ReviewQueueResult } from './srs';
import { WRITING_PROMPTS } from './writingPrompts';
import { SPEAKING_TOPICS } from './speakingTopics';

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

// Bài này có phải lần đầu gặp đề (cùng kỹ năng) không: trước nó chưa có bài làm nào chạm tới đề,
// kể cả bài bỏ dở, làm lại câu sai hay luyện theo dạng. Làm lại đề đã gặp thì nhớ đáp án nên không tính.
function firstTimeOnTest(s: Store, a: Attempt): boolean {
  return !s.attempts.some(x => x !== a && x.testId === a.testId && x.skill === a.skill && x.finishedAt < a.finishedAt);
}

/** Bài tính vào band: thi thử cả 40 câu (audio không tua được, có giới hạn giờ) trên đề chưa gặp. */
export function countsForBand(s: Store, a: Attempt): boolean {
  return a.mode === 'exam' && a.total === 40 && !a.focus?.length && !a.incomplete && !a.resumed && firstTimeOnTest(s, a);
}

export function bandEstimate(s: Store, skill: Skill) {
  const full = s.attempts.filter(a => a.skill === skill && countsForBand(s, a)).slice(-3);
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
      const type = a.types[Number(n)] ?? 'Other';
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
// Lên bậc khi phần khó nhất của bậc hiện tại đạt trung bình ≥ 70% trên 3–5 đề khác nhau gần nhất.
// Chỉ tính điểm riêng của phần đó (không lấy điểm cả bài) và chỉ lần đầu làm phần đó ở mỗi đề.

const TIERS: Record<Skill, number[][]> = {
  listening: [[1, 2], [1, 2, 3], [1, 2, 3, 4]],
  reading: [[1], [1, 2], [1, 2, 3]],
};

const TIER_MIN = 3;
const TIER_WINDOW = 5;
const TIER_PASS = 0.7;

/** Điểm lần đầu làm phần `n` ở mỗi đề, theo thứ tự thời gian. Đề mà lần đầu chạm tới phần này là
 *  bài bỏ dở, làm lại câu sai hay luyện theo dạng thì bỏ qua (đã thấy câu hỏi, không còn là lần đầu). */
export function firstUnitScores(s: Store, index: TestIndexEntry[], skill: Skill, n: number) {
  const out: { testId: string; score: number; total: number; at: number }[] = [];
  const seen = new Set<string>();
  const byTime = [...s.attempts].sort((a, b) => a.finishedAt - b.finishedAt);
  for (const a of byTime) {
    if (a.skill !== skill || seen.has(a.testId)) continue;
    const u = index.find(t => t.id === a.testId)?.[skill].find(x => x.n === n);
    if (!u) continue;
    let score = 0;
    let total = 0;
    for (let q = u.from; q <= u.to; q++) {
      if (q in a.results) {
        total++;
        if (a.results[q]) score++;
      }
    }
    if (!total) continue; // bài này không chạm tới phần n
    seen.add(a.testId);
    if (a.focus?.length || a.incomplete || !a.units.includes(n)) continue;
    out.push({ testId: a.testId, score, total, at: a.finishedAt });
  }
  return out;
}

function unitAccuracy(s: Store, index: TestIndexEntry[], skill: Skill, n: number) {
  const recent = firstUnitScores(s, index, skill, n).slice(-TIER_WINDOW);
  const acc = recent.length ? recent.reduce((x, r) => x + r.score / r.total, 0) / recent.length : null;
  return { count: recent.length, acc };
}

export function tierOf(s: Store, skill: Skill, index: TestIndexEntry[]): number {
  let tier = 0;
  while (tier < 2) {
    const hardest = TIERS[skill][tier][TIERS[skill][tier].length - 1];
    const { count, acc } = unitAccuracy(s, index, skill, hardest);
    if (count < TIER_MIN || acc === null || acc < TIER_PASS) break;
    tier++;
  }
  return tier;
}

export const tierUnits = (skill: Skill, tier: number) => TIERS[skill][tier];

/** Đang ở bậc nào và còn bao xa để mở bậc tiếp theo (null khi đã mở hết). `count` là số đề khác nhau. */
export function tierProgress(s: Store, skill: Skill, index: TestIndexEntry[]) {
  const tier = tierOf(s, skill, index);
  if (tier >= 2) return null;
  const unit = TIERS[skill][tier][TIERS[skill][tier].length - 1];
  const { count, acc } = unitAccuracy(s, index, skill, unit);
  return { tier, unit, next: TIERS[skill][tier + 1][TIERS[skill][tier + 1].length - 1], count, acc, need: TIER_MIN };
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
  const tier = tierOf(s, skill, index);
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

/** Hàng đợi ôn thẻ trong ngày: ưu tiên thẻ ôn cũ + giới hạn thẻ mới còn lại của hôm nay. */
export function todayVocabQueue(
  s: Store,
  now = Date.now(),
  opts: { quick?: boolean; extraNew?: number } = {},
): ReviewQueueResult {
  const usedNew = s.days[dayKey(now)]?.newCards ?? 0;
  const remainingNew = opts.extraNew !== undefined ? opts.extraNew : Math.max(0, NEW_CARD_DAILY_CAP - usedNew);
  return buildReviewQueue(s.words, { now, maxNew: remainingNew, quick: opts.quick });
}

// Số ngày học trong 7 ngày gần nhất
export function activeDaysThisWeek(s: Store) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isActive(s.days[addDays(dayKey(), -i)])) n++;
  return n;
}

// ---------- Writing & Speaking ----------

export function writingBandEstimate(s: Store) {
  const graded = (s.writingAttempts ?? []).filter(a => a.feedback?.scores.overall !== undefined).slice(-3);
  if (!graded.length) return null;
  const bands = graded.map(a => a.feedback!.scores.overall);
  const avg = bands.reduce((x, y) => x + y, 0) / bands.length;
  return { latest: bands[bands.length - 1], avg: Math.round(avg * 2) / 2, count: graded.length };
}

export function speakingBandEstimate(s: Store) {
  const graded = (s.speakingAttempts ?? []).filter(a => a.feedback?.scores.overall !== undefined).slice(-3);
  if (!graded.length) return null;
  const bands = graded.map(a => a.feedback!.scores.overall);
  const avg = bands.reduce((x, y) => x + y, 0) / bands.length;
  return { latest: bands[bands.length - 1], avg: Math.round(avg * 2) / 2, count: graded.length };
}

// Lộ trình bậc thang Writing:
// Bậc 0: Viết theo khung từng đoạn (step) -> Bậc 1: Viết cả bài (full) sau 2 bài step -> Bậc 2: Thi thử bấm giờ (exam) sau 2 bài full
export function writingTierOf(s: Store): number {
  const list = s.writingAttempts ?? [];
  const stepDone = list.filter(a => a.mode === 'step').length;
  const fullDone = list.filter(a => a.mode === 'full' || a.mode === 'exam').length;
  if (stepDone < 2) return 0;
  if (fullDone < 2) return 1;
  return 2;
}

// Lộ trình bậc thang Speaking:
// Bậc 0: Part 1 & Part 2 -> Bậc 1: Thêm Part 3 sau 2 lượt Part 1/2 -> Bậc 2: Full Test 3 Part sau 2 lượt Part 3
export function speakingTierOf(s: Store): number {
  const list = s.speakingAttempts ?? [];
  const p12 = list.filter(a => a.mode === 'part1' || a.mode === 'part2').length;
  const p3 = list.filter(a => a.mode === 'part3' || a.mode === 'full').length;
  if (p12 < 2) return 0;
  if (p3 < 2) return 1;
  return 2;
}

export function dueGrammarMistakes(s: Store) {
  const now = Date.now();
  return (s.grammarMistakes ?? []).filter(m => !m.resolved && m.due <= now);
}

/** Tổng hợp nhịp học 7 ngày gần nhất để hiện ngay cho người học. */
export function weeklyPulse(s: Store, today = dayKey()) {
  let activeDays = 0;
  let seconds = 0;
  let cards = 0;
  let units = 0;
  let drills = 0;
  let lessons = 0;
  for (let i = 0; i < 7; i++) {
    const d = s.days[addDays(today, -i)];
    if (!d) continue;
    if (isActive(d)) activeDays++;
    seconds += d.seconds;
    cards += d.cards;
    units += d.units;
    drills += d.drills ?? 0;
    lessons += d.lessons ?? 0;
  }
  const minutes = Math.round(seconds / 60);
  const dailyGoal = s.profile?.goalMinutes ?? 30;
  return {
    activeDays,
    minutes,
    cards,
    units,
    drills,
    lessons,
    targetDays: 5,
    targetMinutes: dailyGoal * 5,
  };
}

/**
 * Gợi ý đề Writing thông minh:
 * - Cân bằng Task 1 và Task 2 (hoặc ưu tiên Task có band trung bình thấp hơn ≥ 0.5).
 * - Ưu tiên dạng biểu đồ/bài luận chưa từng làm để phủ đều các dạng.
 * - Khi đã làm hết thì quay lại đề từng đạt band thấp nhất.
 */
export function nextWritingPrompt(s: Store): { prompt: WritingPrompt; reason: string } {
  const attempts = s.writingAttempts ?? [];
  const doneIds = new Set(attempts.map(a => a.promptId));
  const doneCats = new Set(
    attempts
      .map(a => WRITING_PROMPTS.find(p => p.id === a.promptId)?.category)
      .filter((c): c is WritingPrompt['category'] => !!c),
  );

  const avgTaskBand = (task: WritingTaskType) => {
    const scored = attempts
      .filter(a => a.task === task && a.feedback?.scores.overall !== undefined)
      .slice(-3);
    if (!scored.length) return null;
    return scored.reduce((sum, a) => sum + a.feedback!.scores.overall, 0) / scored.length;
  };

  const b1 = avgTaskBand('task1');
  const b2 = avgTaskBand('task2');
  const lastTask = attempts[attempts.length - 1]?.task;
  let preferredTask: WritingTaskType;
  let taskReason = '';

  if (b1 !== null && b2 !== null && Math.abs(b1 - b2) >= 0.5) {
    preferredTask = b1 < b2 ? 'task1' : 'task2';
    const weakBand = Math.min(b1, b2);
    taskReason = `Focus: ${preferredTask === 'task1' ? 'Task 1' : 'Task 2'} avg ${weakBand.toFixed(1)}`;
  } else if (lastTask) {
    preferredTask = lastTask === 'task1' ? 'task2' : 'task1';
    taskReason = `Balanced next: ${preferredTask === 'task1' ? 'Task 1' : 'Task 2'}`;
  } else {
    preferredTask = 'task2';
    taskReason = 'Start with Task 2 (worth 2/3 of Writing score)';
  }

  const inTask = WRITING_PROMPTS.filter(p => p.task === preferredTask);
  const unseenCat = inTask.find(p => !doneIds.has(p.id) && !doneCats.has(p.category));
  if (unseenCat) return { prompt: unseenCat, reason: taskReason };

  const unseenInTask = inTask.find(p => !doneIds.has(p.id));
  if (unseenInTask) return { prompt: unseenInTask, reason: taskReason };

  const unseenAny = WRITING_PROMPTS.find(p => !doneIds.has(p.id));
  if (unseenAny) return { prompt: unseenAny, reason: `New prompt · ${unseenAny.categoryLabel}` };

  // Đã làm hết: quay lại đề đạt band thấp nhất (ưu tiên đề đã chấm)
  const latestByPrompt = new Map<string, { band: number; at: number }>();
  for (const a of attempts) {
    latestByPrompt.set(a.promptId, { band: a.feedback?.scores.overall ?? 9.5, at: a.finishedAt });
  }
  const ranked = [...WRITING_PROMPTS].sort((a, b) => {
    const ra = latestByPrompt.get(a.id) ?? { band: 9.5, at: 0 };
    const rb = latestByPrompt.get(b.id) ?? { band: 9.5, at: 0 };
    return ra.band - rb.band || ra.at - rb.at;
  });
  const bestRetry = ranked[0] ?? WRITING_PROMPTS[0];
  const prevBand = latestByPrompt.get(bestRetry.id)?.band;
  return {
    prompt: bestRetry,
    reason: prevBand !== undefined && prevBand <= 9 ? `Retry to beat Band ${prevBand.toFixed(1)}` : 'Revisit prompt',
  };
}

/** Gợi ý chủ đề Speaking thông minh: ưu tiên chủ đề mới, nếu làm hết thì ôn lại chủ đề band thấp nhất. */
export function nextSpeakingTopic(s: Store): { topic: SpeakingTopic; reason: string } {
  const attempts = s.speakingAttempts ?? [];
  const tier = speakingTierOf(s);
  const modeHint = tier >= 2 ? 'Full 3-Part Mock' : tier === 1 ? 'Part 3 Discussion' : 'Part 1 & 2 Warm-up';
  const doneIds = new Set(attempts.map(a => a.topicId));
  const unseen = SPEAKING_TOPICS.find(t => !doneIds.has(t.id));
  if (unseen) return { topic: unseen, reason: `Recommended: ${modeHint}` };

  const latestByTopic = new Map<string, { band: number; at: number }>();
  for (const a of attempts) {
    latestByTopic.set(a.topicId, { band: a.feedback?.scores.overall ?? 9.5, at: a.finishedAt });
  }
  const ranked = [...SPEAKING_TOPICS].sort((a, b) => {
    const ra = latestByTopic.get(a.id) ?? { band: 9.5, at: 0 };
    const rb = latestByTopic.get(b.id) ?? { band: 9.5, at: 0 };
    return ra.band - rb.band || ra.at - rb.at;
  });
  const pick = ranked[0] ?? SPEAKING_TOPICS[0];
  const prevBand = latestByTopic.get(pick.id)?.band;
  return {
    topic: pick,
    reason: prevBand !== undefined && prevBand <= 9 ? `Retry to beat Band ${prevBand.toFixed(1)}` : `Recommended: ${modeHint}`,
  };
}
