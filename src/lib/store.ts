'use client';

import { useSyncExternalStore } from 'react';
import type { Attempt, DayLog, LessonState, MistakeReason, Profile, Store, Word } from './types';
import { addDays, dayKey } from './dates';
import { newSrs } from './srs';
import { mergeStores } from './merge';
import { applyMistakes, mistakeKey } from './mistakes';

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

export const isActive = (d?: DayLog) => !!d && (d.units >= 1 || (d.drills ?? 0) >= 1 || d.cards >= 10 || d.seconds >= 600);

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

export { mistakeKey };

export function recordAttempt(a: Attempt) {
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
    s.attempts.push(a);
    delete s.drafts[draftKey(a.testId, a.skill, a.units, a.focus)];
    applyMistakes(s.mistakes, a);
    afterActivity(s, k, was);
  });
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
  update(s => {
    s.lessons[slug] = fn(s.lessons[slug] ?? {});
  });
  pushSoon();
}

// ---------- Hồ sơ ----------

export function saveProfile(p: Profile) {
  update(s => {
    s.profile = p;
  });
  pushSoon();
}

// ---------- Sao lưu ----------

export function exportData(): string {
  return JSON.stringify(load(), null, 1);
}

export function importData(json: string) {
  const parsed = JSON.parse(json) as Store;
  if (parsed.version !== 1 || !Array.isArray(parsed.attempts)) throw new Error('File không đúng định dạng');
  save({ ...empty(), ...parsed });
  pushSoon();
}
