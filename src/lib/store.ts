'use client';

import { useSyncExternalStore } from 'react';
import type {
  Attempt,
  DayLog,
  GrammarMistake,
  LessonState,
  MistakeReason,
  Profile,
  SpeakingAttempt,
  Store,
  Word,
  WritingAttempt,
  WritingDraft,
} from './types';
import { addDays, dayKey } from './dates';
import { newSrs } from './srs';
import { mergeStores } from './merge';
import { applyMistakes, mistakeKey } from './mistakes';
import { claimOnce, emitCelebration, STREAK_MILESTONES } from './celebrate';

// Dữ liệu học nằm trong một khoá localStorage (bản làm việc, phản hồi tức thì) và được đồng bộ
// với một file ở máy chủ (/api/progress) để không mất khi đổi máy và để người kèm xem được.
// localStorage có thể bị chặn (ẩn danh...) nên mọi thao tác đều bọc try/catch.

const KEY = 'ielts.v1';
const SYNC_KEY = 'ielts.v1.sync'; // { base, dirty }: bản máy chủ đã biết và có thay đổi chưa gửi không

const empty = (): Store => ({
  version: 1,
  attempts: [],
  drafts: {},
  days: {},
  journal: {},
  words: [],
  mistakes: {},
  highlights: {},
  freezes: 0,
  frozenDays: [],
  lessons: {},
  writingAttempts: [],
  writingDrafts: {},
  speakingAttempts: [],
  grammarMistakes: [],
});

let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...empty(), ...(JSON.parse(raw) as Store) } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

function persist(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Bỏ qua: chỉ mất khả năng ghi nhớ
  }
  listeners.forEach(l => l());
}

function save(next: Store) {
  next.updatedAt = Date.now();
  persist(next);
  setSync({ dirty: true });
  schedulePush();
}

// ---------- Đồng bộ với máy chủ ----------
// Mở app: đối chiếu với bản ở máy chủ. Sau đó mỗi thay đổi được đẩy lên, gom lại tối đa 3 phút một lần
// (kho lưu trữ tính lượt ghi); việc quan trọng (nộp bài…) đẩy gần như ngay.
// Khi cả máy này lẫn máy chủ cùng có thay đổi mới (học trên hai máy), hai bản được GỘP (lib/merge.ts),
// không bản nào ghi đè bản nào. Trạng thái đồng bộ lưu cạnh dữ liệu để còn nhớ sau khi tắt trình duyệt.

const PUSH_GAP = 180_000;
let started = false;
let ready = false; // đã đối chiếu với máy chủ (hoặc đã thử) chưa; trước đó chưa hiển thị dữ liệu
let pulled = false; // lần kéo gần nhất có thành công không; chưa kéo được thì không đẩy
let lastPush = 0;
let pushAt = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

interface SyncState {
  base: number; // updatedAt của bản ở máy chủ mà máy này đã đồng bộ tới (0 = chưa rõ)
  dirty: boolean; // có thay đổi trên máy chưa được máy chủ xác nhận
}
let syncMem: SyncState = { base: 0, dirty: false }; // dùng khi localStorage bị chặn

function getSync(): SyncState {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (raw) return { ...syncMem, ...(JSON.parse(raw) as SyncState) };
  } catch {
    // dùng bản trong bộ nhớ
  }
  return syncMem;
}

function setSync(patch: Partial<SyncState>) {
  syncMem = { ...getSync(), ...patch };
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncMem));
  } catch {
    // Bỏ qua
  }
}

const isBlank = (s: Store) => !s.profile && !s.attempts.length && !s.words.length;

async function pull() {
  try {
    const r = await fetch('/api/progress', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const { store: remote } = (await r.json()) as { store: Store | null };
    pulled = true;
    const local = load();
    const sync = getSync();
    if (!remote) {
      // Máy chủ chưa có gì: gửi bản trên máy lên (nếu có)
      if (!isBlank(local)) {
        setSync({ dirty: true });
        schedulePush(1000);
      }
    } else if (isBlank(local)) {
      persist({ ...empty(), ...remote });
      setSync({ base: remote.updatedAt ?? 0, dirty: false });
    } else if (remote.updatedAt === sync.base) {
      // Máy chủ không đổi từ lần đồng bộ trước: chỉ cần gửi thay đổi của máy này (nếu có)
      if (sync.dirty) schedulePush(1000);
    } else if (!sync.dirty && sync.base) {
      // Máy chủ có bản mới hơn (học trên máy khác), máy này không có gì mới: dùng bản máy chủ
      persist({ ...empty(), ...remote });
      setSync({ base: remote.updatedAt ?? 0 });
    } else {
      // Cả hai bên cùng có thay đổi (hoặc chưa rõ, như lần đầu sau khi nâng cấp): gộp rồi gửi lên
      persist(mergeStores({ ...empty(), ...remote }, local));
      setSync({ base: remote.updatedAt ?? 0, dirty: true });
      schedulePush(1000);
    }
  } catch {
    pulled = false; // mất mạng: dùng tạm bản trên máy, sẽ thử lại khi cần đẩy
  }
  ready = true;
  listeners.forEach(l => l());
}

function schedulePush(delay?: number) {
  if (!started) return;
  const at = Date.now() + (delay ?? Math.max(5000, lastPush + PUSH_GAP - Date.now()));
  if (pushTimer && pushAt <= at) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushAt = at;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, at - Date.now());
}

async function push(leaving = false) {
  if (!getSync().dirty) return;
  if (!pulled) {
    if (leaving) return;
    await pull();
    if (!pulled) return schedulePush(60_000);
    if (!getSync().dirty) return;
  }
  const store = load();
  const body = JSON.stringify({ store, base: getSync().base });
  try {
    // Khi rời trang chỉ gửi kèm keepalive được nếu gói nhỏ (giới hạn của trình duyệt)
    const r = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body, keepalive: leaving && body.length < 60_000 });
    lastPush = Date.now();
    if (r.ok) {
      // Máy chủ trả về `store` khi đã phải gộp với thay đổi từ máy khác
      const res = (await r.json()) as { updatedAt: number; store?: Store };
      const now = load();
      const unchanged = now.updatedAt === store.updatedAt; // trong lúc gửi, máy này không sửa gì thêm
      if (res.store) persist(unchanged ? { ...empty(), ...res.store } : mergeStores({ ...empty(), ...res.store }, now));
      setSync({ base: res.updatedAt, dirty: !unchanged });
      if (!unchanged) schedulePush();
    } else {
      schedulePush(60_000);
    }
  } catch {
    if (!leaving) schedulePush(60_000);
  }
}

/** Đẩy sớm sau một việc đáng giữ (nộp bài, lưu hồ sơ, học xong bài). */
function pushSoon() {
  schedulePush(2000);
}

function startSync() {
  if (started) return;
  started = true;
  void pull();
  const flush = () => {
    if (document.visibilityState === 'hidden') void push(true);
  };
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', () => void push(true));
}

export function update(fn: (draft: Store) => void) {
  const next = structuredClone(load());
  fn(next);
  save(next);
}

function subscribe(l: () => void) {
  listeners.add(l);
  startSync();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

/** Toàn bộ dữ liệu; null khi đang render phía server, lúc hydrate, và trong lúc chờ đối chiếu với máy chủ. */
export function useStore(): Store | null {
  return useSyncExternalStore(subscribe, () => (ready ? load() : null), () => null);
}

export const getStore = load;

// ---------- Hoạt động & streak ----------

export const isActive = (d?: DayLog) =>
  !!d && (d.units >= 1 || (d.drills ?? 0) >= 1 || (d.lessons ?? 0) >= 1 || d.cards >= 10 || d.seconds >= 600);

function touchDay(s: Store, key: string): DayLog {
  return (s.days[key] ??= { seconds: 0, units: 0, cards: 0 });
}

function afterActivity(s: Store, key: string, wasActive: boolean) {
  if (!wasActive && isActive(s.days[key])) {
    // Mỗi 7 ngày liên tiếp được thưởng một vé nghỉ (giữ tối đa 2)
    const streak = streakOf(s);
    let earnedFreeze = false;
    if (streak > 0 && streak % 7 === 0) {
      const before = s.freezes;
      s.freezes = Math.min(2, s.freezes + 1);
      earnedFreeze = s.freezes > before;
    }
    if (key === dayKey() && claimOnce(`streak:${key}`)) {
      const isMilestone = STREAK_MILESTONES.has(streak);
      const detail = earnedFreeze
        ? `${streak} days in a row — you also earned +1 Streak Freeze!`
        : isMilestone
          ? `${streak} days strong! Consistency is paying off.`
          : streak <= 1
            ? 'You showed up today. Every band jump starts here.'
            : `Today’s flame is lit — ${7 - (streak % 7)} more ${7 - (streak % 7) === 1 ? 'day' : 'days'} until your next Streak Freeze.`;
      emitCelebration({
        kind: 'streak_lit',
        character: 'hedgehog',
        title: isMilestone ? `${streak}-Day Streak Milestone!` : `Day ${streak} Streak Lit!`,
        detail,
        badge: earnedFreeze ? 'freeze' : 'flame',
        sfx: 'celebrate',
      });
    }
  }
}

export function logSeconds(seconds: number) {
  if (seconds < 1) return;
  let crossedGoal = false;
  let goalMinutes = 30;
  update(s => {
    const k = dayKey();
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    const prevSec = d.seconds;
    d.seconds += Math.round(seconds);
    afterActivity(s, k, was);
    if (s.profile && s.profile.goalMinutes > 0) {
      goalMinutes = s.profile.goalMinutes;
      const goalSec = goalMinutes * 60;
      if (prevSec < goalSec && d.seconds >= goalSec) crossedGoal = true;
    }
  });
  if (crossedGoal && claimOnce(`goal:${dayKey()}`)) {
    emitCelebration({
      kind: 'daily_goal',
      character: 'hedgehog',
      title: 'Daily Goal Reached!',
      detail: `You completed ${goalMinutes} minutes of focused study today. Anything extra is a bonus.`,
      badge: 'goal',
      sfx: 'celebrate',
    });
  }
}

export function logCards(n: number, isNew = false) {
  update(s => {
    const k = dayKey();
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    d.cards += n;
    if (isNew) d.newCards = (d.newCards ?? 0) + n;
    afterActivity(s, k, was);
  });
}

/** Ngày được tính vào chuỗi: có học, hoặc đã dùng vé nghỉ */
function counts(s: Store, key: string) {
  return isActive(s.days[key]) || s.frozenDays.includes(key);
}

export function streakOf(s: Store, today = dayKey()): number {
  let k = counts(s, today) ? today : addDays(today, -1);
  let n = 0;
  while (counts(s, k)) {
    if (isActive(s.days[k])) n++;
    k = addDays(k, -1);
  }
  return n;
}

export function longestStreak(s: Store): number {
  const keys = Object.keys(s.days).filter(k => isActive(s.days[k])).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of keys) {
    let gapOk = prev && addDays(prev, 1) === k;
    if (prev && !gapOk) {
      // các ngày đóng băng nối liền chuỗi
      let x = addDays(prev, 1);
      while (x < k && s.frozenDays.includes(x)) x = addDays(x, 1);
      gapOk = x === k;
    }
    run = gapOk ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/** Tự dùng vé nghỉ cho những ngày bỏ lỡ gần nhất, nếu đủ vé để nối chuỗi. */
export function applyFreezes() {
  const s = load();
  const today = dayKey();
  const yesterday = addDays(today, -1);
  if (counts(s, yesterday) || s.freezes === 0) return;
  // Tìm ngày học gần nhất trước hôm qua
  let k = addDays(yesterday, -1);
  let gap = 1;
  while (!counts(s, k) && gap <= s.freezes) {
    k = addDays(k, -1);
    gap++;
  }
  const savedStreak = streakOf(s, k);
  if (counts(s, k) && gap <= s.freezes && savedStreak > 0) {
    let left = 0;
    update(d => {
      for (let i = 0; i < gap; i++) d.frozenDays.push(addDays(yesterday, -i));
      d.freezes -= gap;
      left = d.freezes;
    });
    if (claimOnce(`freeze-used:${today}`)) {
      emitCelebration({
        kind: 'freeze_used',
        character: 'hedgehog',
        title: 'Streak Protected!',
        detail: `Hedgehog used ${gap} ${gap === 1 ? 'Streak Freeze' : 'Streak Freezes'} to save your ${savedStreak}-day streak (${left} left).`,
        badge: 'freeze',
        sfx: 'resolve',
      });
    }
  }
}

// ---------- Bài làm ----------

export { mistakeKey };

export function recordAttempt(a: Attempt) {
  let newlyResolved = 0;
  update(s => {
    const k = dayKey(a.finishedAt);
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    // Thời gian đã được ghi dần trong lúc làm bài. Bài trả lời chưa tới một nửa số câu
    // không được tính là đã làm (nên cũng không tự giữ chuỗi ngày).
    // Bài làm thật đếm theo số Part/Passage; làm lại câu sai và luyện theo dạng đếm riêng thành lượt.
    if (!a.incomplete) {
      if (a.focus?.length) d.drills = (d.drills ?? 0) + 1;
      else d.units += a.units.length;
    }
    const prevResolved = new Set(Object.entries(s.mistakes).filter(([, m]) => m.resolved).map(([mk]) => mk));
    s.attempts.push(a);
    delete s.drafts[draftKey(a.testId, a.skill, a.units, a.focus)];
    applyMistakes(s.mistakes, a);
    for (const [mk, m] of Object.entries(s.mistakes)) {
      if (m.resolved && !prevResolved.has(mk)) newlyResolved++;
    }
    afterActivity(s, k, was);
  });
  if (newlyResolved > 0) {
    emitCelebration({
      kind: 'mistake_resolved',
      character: 'hedgehog',
      title: newlyResolved === 1 ? 'Mistake Cleared (3/3)!' : `${newlyResolved} Mistakes Cleared!`,
      detail: 'Mastered on schedule across 1, 3, and 7 days — permanently crossed off your log.',
      badge: 'star',
      sfx: 'resolve',
    });
  }
  pushSoon();
}

export function draftKey(testId: string, skill: string, units: number[], focus?: number[]) {
  return `${testId}:${skill}:${units.join('')}${focus?.length ? `:f${focus.join(',')}` : ''}`;
}

export function setMistakeReason(key: string, reason: MistakeReason | undefined) {
  update(s => {
    if (s.mistakes[key]) s.mistakes[key].reason = reason;
  });
}

// ---------- Từ vựng ----------

export function addWord(w: Pick<Word, 'word' | 'vi'> & Partial<Pick<Word, 'pos' | 'context' | 'source'>>): boolean {
  const word = w.word.trim();
  if (!word) return false;
  let added = false;
  update(s => {
    if (s.words.some(x => x.word.toLowerCase() === word.toLowerCase())) return;
    s.words.unshift({
      id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      word,
      vi: w.vi.trim(),
      pos: w.pos,
      context: w.context,
      source: w.source,
      addedAt: Date.now(),
      srs: newSrs(),
    });
    added = true;
  });
  return added;
}

export function hasWord(s: Store | null, word: string) {
  return !!s?.words.some(x => x.word.toLowerCase() === word.trim().toLowerCase());
}

// ---------- Bài học ----------

export function updateLesson(slug: string, fn: (p: LessonState) => LessonState) {
  let justCompleted = false;
  update(s => {
    const prev = s.lessons[slug] ?? {};
    const next = fn(prev);
    s.lessons[slug] = next;
    if (!prev.done && next.done) {
      justCompleted = true;
      const k = dayKey();
      const was = isActive(s.days[k]);
      const d = touchDay(s, k);
      d.lessons = (d.lessons ?? 0) + 1;
      afterActivity(s, k, was);
    }
  });
  if (justCompleted) {
    emitCelebration({
      kind: 'lesson_done',
      character: 'seal',
      title: 'Strategy Lesson Completed!',
      detail: 'Try a Cambridge drill set right away to lock the technique in.',
      badge: 'star',
      sfx: 'resolve',
    });
  }
  pushSoon();
}

// ---------- Hồ sơ ----------

export function saveProfile(p: Profile) {
  update(s => {
    s.profile = p;
  });
  pushSoon();
}

// ---------- Writing & Speaking ----------

const DAY_MS = 86400000;
const GRAMMAR_GAPS = [1, 3, 7];

function calcWritingTier(list: WritingAttempt[]): number {
  const stepDone = list.filter(a => a.mode === 'step').length;
  const fullDone = list.filter(a => a.mode === 'full' || a.mode === 'exam').length;
  if (stepDone < 2) return 0;
  if (fullDone < 2) return 1;
  return 2;
}

function calcSpeakingTier(list: SpeakingAttempt[]): number {
  const p12 = list.filter(a => a.mode === 'part1' || a.mode === 'part2').length;
  const p3 = list.filter(a => a.mode === 'part3' || a.mode === 'full').length;
  if (p12 < 2) return 0;
  if (p3 < 2) return 1;
  return 2;
}

export function recordWritingAttempt(a: WritingAttempt) {
  let unlockedTier: number | null = null;
  update(s => {
    const prevTier = calcWritingTier(s.writingAttempts ?? []);
    const k = dayKey(a.finishedAt);
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    d.units += 1;
    (s.writingAttempts ??= []).push(a);
    if (s.writingDrafts) delete s.writingDrafts[a.promptId];
    const nextTier = calcWritingTier(s.writingAttempts);
    if (nextTier > prevTier) unlockedTier = nextTier;
    afterActivity(s, k, was);
  });
  if (unlockedTier !== null) {
    const label = unlockedTier === 1 ? 'Full Essay (Freeform)' : 'Timed Mock Exam';
    emitCelebration({
      kind: 'tier_up',
      character: 'seal',
      title: 'Writing Tier Unlocked!',
      detail: `You’re ready for ${label} mode.`,
      badge: 'star',
      sfx: 'celebrate',
    });
  }
  pushSoon();
}

export function updateWritingAttempt(id: string, fn: (a: WritingAttempt) => void) {
  update(s => {
    const a = s.writingAttempts?.find(x => x.id === id);
    if (a) fn(a);
  });
  pushSoon();
}

export function saveWritingDraft(d: WritingDraft) {
  update(s => {
    (s.writingDrafts ??= {})[d.promptId] = d;
  });
}

export function recordSpeakingAttempt(a: SpeakingAttempt) {
  let unlockedTier: number | null = null;
  update(s => {
    const prevTier = calcSpeakingTier(s.speakingAttempts ?? []);
    const k = dayKey(a.finishedAt);
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    d.units += 1;
    (s.speakingAttempts ??= []).push(a);
    const nextTier = calcSpeakingTier(s.speakingAttempts);
    if (nextTier > prevTier) unlockedTier = nextTier;
    afterActivity(s, k, was);
  });
  if (unlockedTier !== null) {
    const label = unlockedTier === 1 ? 'Part 3 (In-Depth Discussion)' : 'Full 3-Part Test';
    emitCelebration({
      kind: 'tier_up',
      character: 'seal',
      title: 'Speaking Tier Unlocked!',
      detail: `You’re ready for ${label}.`,
      badge: 'star',
      sfx: 'celebrate',
    });
  }
  pushSoon();
}

export function updateSpeakingAttempt(id: string, fn: (a: SpeakingAttempt) => void) {
  update(s => {
    const a = s.speakingAttempts?.find(x => x.id === id);
    if (a) fn(a);
  });
  pushSoon();
}

export function addGrammarMistakes(
  items: Omit<GrammarMistake, 'id' | 'addedAt' | 'step' | 'due' | 'resolved'>[],
): number {
  let added = 0;
  const now = Date.now();
  update(s => {
    const list = (s.grammarMistakes ??= []);
    for (const item of items) {
      const orig = item.original.trim();
      const imp = item.improved.trim();
      if (!orig || !imp) continue;
      if (list.some(x => x.original.trim().toLowerCase() === orig.toLowerCase())) continue;
      list.unshift({
        ...item,
        original: orig,
        improved: imp,
        id: `gm${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        addedAt: now,
        step: 0,
        due: now + DAY_MS,
        resolved: false,
      });
      added++;
    }
  });
  if (added > 0) pushSoon();
  return added;
}

export function reviewGrammarMistake(id: string, ok: boolean) {
  const now = Date.now();
  let justResolved = false;
  update(s => {
    const m = s.grammarMistakes?.find(x => x.id === id);
    if (!m) return;
    const wasResolved = !!m.resolved;
    if (!ok) {
      m.step = 0;
      m.due = now + DAY_MS;
      m.resolved = false;
    } else if (!m.resolved && now >= m.due) {
      const step = m.step + 1;
      m.step = step;
      if (step >= GRAMMAR_GAPS.length) {
        m.resolved = true;
        m.due = Number.MAX_SAFE_INTEGER;
        if (!wasResolved) justResolved = true;
      } else {
        m.due = now + GRAMMAR_GAPS[step] * DAY_MS;
      }
    }
    const k = dayKey(now);
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    d.drills = (d.drills ?? 0) + 1;
    afterActivity(s, k, was);
  });
  if (justResolved) {
    emitCelebration({
      kind: 'mistake_resolved',
      character: 'hedgehog',
      title: 'Fix Mastered (3/3)!',
      detail: 'That Writing/Speaking expression is permanently cleared from your Mistake Log.',
      badge: 'star',
      sfx: 'resolve',
    });
  }
  pushSoon();
}

// ---------- Sao lưu ----------

export function exportData(): string {
  return JSON.stringify(load(), null, 1);
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as Store;
  if (parsed.version !== 1 || !Array.isArray(parsed.attempts)) throw new Error('Invalid backup file format');
  save({ ...empty(), ...parsed });
  pushSoon();
}
