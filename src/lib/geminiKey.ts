'use client';

const KEY = 'ielts.gemini_key';

export function getGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setGeminiKey(value: string) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(KEY, trimmed);
    else localStorage.removeItem(KEY);
  } catch {
    // Bỏ qua khi trình duyệt chặn localStorage
  }
}

export function geminiHeaders(): Record<string, string> {
  const k = getGeminiKey();
  return k ? { 'x-gemini-key': k } : {};
}
