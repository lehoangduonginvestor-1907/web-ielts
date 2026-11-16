import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Test, TestIndexEntry } from './types';

// Đề nằm trong content/ (không đưa lên git, không nằm trong public/)
const ROOT = path.join(process.cwd(), 'content');

export async function getIndex(): Promise<TestIndexEntry[]> {
  try {
    const raw = await fs.readFile(path.join(ROOT, 'index.json'), 'utf8');
    return (JSON.parse(raw) as { tests: TestIndexEntry[] }).tests;
  } catch {
    return [];
  }
}

export async function getTest(id: string): Promise<Test | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'tests', `${id}.json`), 'utf8')) as Test;
  } catch {
    return null;
  }
}

const AUDIO_TYPES: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' };

const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export function imagePath(file: string): { path: string; type: string } | null {
  const m = /^[a-z0-9-]+\.(png|jpg|webp)$/.exec(file);
  if (!m) return null;
  return { path: path.join(ROOT, 'images', file), type: IMAGE_TYPES[m[1]] };
}

export function audioPath(file: string): { path: string; type: string } | null {
  const m = /^[a-z0-9-]+\.(mp3|m4a|wav)$/.exec(file);
  if (!m) return null;
  return { path: path.join(ROOT, 'audio', file), type: AUDIO_TYPES[m[1]] };
}
