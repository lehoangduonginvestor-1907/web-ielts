// Dữ liệu mẫu cho test: chỉ điền những trường cần, phần còn lại lấy giá trị trung tính.
import type { Attempt, Store, Word } from '@/lib/types';
import { newSrs } from '@/lib/srs';

export const DAY = 86400000;

export function emptyStore(patch: Partial<Store> = {}): Store {
  return {
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
    ...patch,
  };
}

let seq = 0;

/** Một bài làm. `wrong` là các câu sai; mặc định chấm đủ câu from..to. */
export function attempt(patch: Partial<Attempt> & { wrong?: number[]; from?: number; to?: number } = {}): Attempt {
  const { wrong = [], from = 1, to = 40, ...rest } = patch;
  const results: Record<number, boolean> = {};
  const types: Record<number, string> = {};
  for (let n = from; n <= to; n++) {
    results[n] = !wrong.includes(n);
    types[n] = n % 2 ? 'Note completion' : 'Multiple choice';
  }
  const finishedAt = rest.finishedAt ?? Date.UTC(2026, 10, 1) + seq * 1000;
  seq++;
  const score = Object.values(rest.results ?? results).filter(Boolean).length;
  return {
    id: `a${seq}`,
    testId: 'c17t1',
    skill: 'reading',
    units: [1, 2, 3],
    mode: 'exam',
    startedAt: finishedAt - 3600_000,
    finishedAt,
    seconds: 3600,
    answers: {},
    results,
    types,
    score,
    total: Object.keys(rest.results ?? results).length,
    ...rest,
  };
}

export function word(w: string, patch: Partial<Word> = {}): Word {
  return { id: `w-${w}`, word: w, vi: '', addedAt: 0, srs: newSrs(0), ...patch };
}
