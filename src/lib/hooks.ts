'use client';

import { useCallback, useSyncExternalStore } from 'react';

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
