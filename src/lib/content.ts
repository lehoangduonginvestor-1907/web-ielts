import 'server-only';
import type { Test, TestIndexEntry } from './types';
import { currentRole } from './session';
import { onBlob, readText } from './storage';

// Đề nằm ngoài git và ngoài public/: thư mục content/ trên máy, hoặc kho Blob riêng tư khi chạy trên Vercel.

// Trên Blob mỗi lần đọc là một lượt tải, nên giữ tạm trong bộ nhớ của máy chủ (đề không đổi thường xuyên)
const TTL = 10 * 60 * 1000;
const memo = new Map<string, { at: number; value: unknown }>();

async function readJson<T>(key: string): Promise<T | null> {
  const hit = memo.get(key);
  if (onBlob && hit && Date.now() - hit.at < TTL) return hit.value as T;
  const raw = await readText(key);
  if (raw === null) return null;
  const value = JSON.parse(raw) as T;
  if (onBlob) memo.set(key, { at: Date.now(), value });
  return value;
}

/** Mục lục đề (tên bài, số câu): người học và người kèm đều xem được. */
export async function getIndex(): Promise<TestIndexEntry[]> {
  if (!(await currentRole())) return [];
  try {
    return (await readJson<{ tests: TestIndexEntry[] }>('content/index.json'))?.tests ?? [];
  } catch {
    return [];
  }
}

export async function getTest(id: string): Promise<Test | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  if ((await currentRole()) !== 'learner') return null; // nội dung đề chỉ dành cho người học đã đăng nhập
  try {
    return await readJson<Test>(`content/tests/${id}.json`);
  } catch {
    return null;
  }
}

const AUDIO_TYPES: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' };
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/** Khoá lưu trữ và kiểu nội dung của một file audio; null nếu tên không hợp lệ. */
export function audioKey(file: string): { key: string; type: string } | null {
  const m = /^[a-z0-9-]+\.(mp3|m4a|wav)$/.exec(file);
  return m ? { key: `content/audio/${file}`, type: AUDIO_TYPES[m[1]] } : null;
}

export function imageKey(file: string): { key: string; type: string } | null {
  const m = /^[a-z0-9-]+\.(png|jpg|webp)$/.exec(file);
  return m ? { key: `content/images/${file}`, type: IMAGE_TYPES[m[1]] } : null;
}
