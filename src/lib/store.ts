'use client';

import { useSyncExternalStore } from 'react';
import type { Attempt, DayLog, LessonState, MistakeReason, Profile, Store, Word } from './types';
import { addDays, dayKey } from './dates';
import { newSrs } from './srs';

// Mọi dữ liệu học của người dùng nằm trong một khoá localStorage.
// localStorage có thể bị chặn (ẩn danh...) nên mọi thao tác đều bọc try/catch.

const KEY = 'ielts.v1';
const DAY = 86400000;

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

function save(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Bỏ qua: chỉ mất khả năng ghi nhớ
  }
  listeners.forEach(l => l());
}

export function update(fn: (draft: Store) => void) {
  const next = structuredClone(load());
  fn(next);
  save(next);
}

function subscribe(l: () => void) {
  listeners.add(l);
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

/** Toàn bộ dữ liệu; null khi đang render phía server / lúc hydrate. */
export function useStore(): Store | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

export const getStore = load;

// ---------- Hoạt động & streak ----------

export const isActive = (d?: DayLog) => !!d && (d.units >= 1 || d.cards >= 10 || d.seconds >= 600);

function touchDay(s: Store, key: string): DayLog {
  return (s.days[key] ??= { seconds: 0, units: 0, cards: 0 });
}

function afterActivity(s: Store, key: string, wasActive: boolean) {
  if (!wasActive && isActive(s.days[key])) {
    // Mỗi 7 ngày liên tiếp được thưởng một vé nghỉ (giữ tối đa 2)
    const streak = streakOf(s);
    if (streak > 0 && streak % 7 === 0) s.freezes = Math.min(2, s.freezes + 1);
  }
}

export function logSeconds(seconds: number) {
  if (seconds < 1) return;
  update(s => {
    const k = dayKey();
    const was = isActive(s.days[k]);
    touchDay(s, k).seconds += Math.round(seconds);
    afterActivity(s, k, was);
  });
}

export function logCards(n: number) {
  update(s => {
    const k = dayKey();
    const was = isActive(s.days[k]);
    touchDay(s, k).cards += n;
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
  if (counts(s, k) && gap <= s.freezes && streakOf(s, k) > 0) {
    update(d => {
      for (let i = 0; i < gap; i++) d.frozenDays.push(addDays(yesterday, -i));
      d.freezes -= gap;
    });
  }
}

// ---------- Bài làm ----------

export const mistakeKey = (testId: string, skill: string, n: number) => `${testId}:${skill[0].toUpperCase()}:${n}`;

export function recordAttempt(a: Attempt) {
  update(s => {
    const k = dayKey(a.finishedAt);
    const was = isActive(s.days[k]);
    const d = touchDay(s, k);
    // Thời gian đã được ghi dần trong lúc làm bài. Bài trả lời chưa tới một nửa số câu
    // không được tính là một phần đã làm (nên cũng không tự giữ chuỗi ngày).
    if (!a.incomplete) d.units += 1;
    s.attempts.push(a);
    delete s.drafts[draftKey(a.testId, a.skill, a.units, a.focus)];
    // Sổ lỗi: câu sai đưa vào lịch làm lại; câu làm lại đúng thì giãn lịch
    // Bài bỏ dở: câu chưa đụng tới không phải câu sai, không đưa vào Sổ lỗi
    const untouched = new Set(a.incomplete ? a.blank : []);
    for (const [nStr, ok] of Object.entries(a.results)) {
      if (untouched.has(Number(nStr))) continue;
      const key = mistakeKey(a.testId, a.skill, Number(nStr));
      const m = s.mistakes[key];
      if (!ok) {
        s.mistakes[key] = { ...m, step: 0, due: a.finishedAt + DAY, resolved: false };
      } else if (m && !m.resolved && a.focus?.length) {
        const step = m.step + 1;
        s.mistakes[key] = step >= 3 ? { ...m, step, resolved: true, due: Number.MAX_SAFE_INTEGER } : { ...m, step, due: a.finishedAt + [1, 3, 7][step] * DAY };
      }
    }
    afterActivity(s, k, was);
  });
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
  update(s => {
    s.lessons[slug] = fn(s.lessons[slug] ?? {});
  });
}

// ---------- Hồ sơ ----------

export function saveProfile(p: Profile) {
  update(s => {
    s.profile = p;
  });
}

// ---------- Sao lưu ----------

export function exportData(): string {
  return JSON.stringify(load(), null, 1);
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as Store;
  if (parsed.version !== 1 || !Array.isArray(parsed.attempts)) throw new Error('File không đúng định dạng');
  save({ ...empty(), ...parsed });
}
