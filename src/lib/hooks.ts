'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// ---- Đồng hồ dùng chung, cập nhật mỗi 30 giây ----

let now = 0;
const clockListeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(l: () => void) {
  clockListeners.add(l);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      clockListeners.forEach(f => f());
    }, 30000);
  }
  return () => {
    clockListeners.delete(l);
    if (!clockListeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Thời điểm hiện tại (ms); 0 khi render phía server. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => now || (now = Date.now()),
    () => 0,
  );
}

// ---- Có đang chạy trên trình duyệt chưa ----

const noop = () => () => {};
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

// ---- Tuỳ chọn nhỏ lưu trong localStorage ----

const prefListeners = new Set<() => void>();

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usePref<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    l => (prefListeners.add(l), () => void prefListeners.delete(l)),
    () => (readPref(key) as T | null) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (v: T) => {
      try {
        localStorage.setItem(key, v);
      } catch {}
      prefListeners.forEach(l => l());
    },
    [key],
  );
  return [value, set];
}

/**
 * Tracks active visible study time (pauses when tab is hidden)
 * and periodically flushes elapsed seconds via `onFlush`.
 */
export function useStudyTimer(active: boolean, onFlush: (seconds: number) => void, flushEveryMs = 30000) {
  const flushRef = useRef(onFlush);
  useEffect(() => {
    flushRef.current = onFlush;
  }, [onFlush]);

  useEffect(() => {
    if (!active) return;
    let startedAt: number | null = document.visibilityState === 'visible' ? Date.now() : null;

    const flush = () => {
      if (startedAt === null) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      startedAt = document.visibilityState === 'visible' ? Date.now() : null;
      // Cap each interval flush so sleep/wake jumps never distort study minutes
      if (elapsed >= 1) flushRef.current(Math.min(elapsed, 120));
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        flush();
        startedAt = null;
      } else if (startedAt === null) {
        startedAt = Date.now();
      }
    };

    const id = setInterval(flush, flushEveryMs);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [active, flushEveryMs]);
}
