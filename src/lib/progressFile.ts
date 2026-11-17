import 'server-only';
import type { Store } from './types';
import { readText, writeText } from './storage';

// Tiến độ học của người học duy nhất: một file JSON, kèm bản sao lưu mỗi ngày.
const KEY = 'data/progress.json';

interface Saved {
  store: Store;
  backupDay?: string; // ngày (UTC) của bản sao lưu gần nhất
}

export async function loadProgress(): Promise<Saved | null> {
  const raw = await readText(KEY, true);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Saved;
    return saved?.store?.version === 1 ? saved : null;
  } catch {
    return null;
  }
}

export async function saveProgress(store: Store, prev: Saved | null): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  // Lần ghi đầu tiên của mỗi ngày: cất bản hôm trước sang file riêng trước khi ghi đè
  if (prev && prev.backupDay !== day) await writeText(`data/backup/progress-${day}.json`, JSON.stringify(prev.store));
  await writeText(KEY, JSON.stringify({ store, backupDay: day } satisfies Saved));
}
