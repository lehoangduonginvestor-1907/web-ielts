import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getIndex, getTest } from './content';
import { parseLesson, type Block } from './learnParse';
import { drillBooks, LESSONS, type DrillGroup } from './skills';

// Bài học là file Markdown trong src/content/learn (nằm trong git, do mình tự viết)
const DIR = path.join(process.cwd(), 'src', 'content', 'learn');

export async function getLesson(slug: string): Promise<Block[] | null> {
  if (!LESSONS.some(l => l.slug === slug)) return null;
  try {
    return parseLesson(await fs.readFile(path.join(DIR, `${slug}.md`), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

/** Các bài đã có nội dung. */
export async function writtenLessons(): Promise<string[]> {
  try {
    const files = await fs.readdir(DIR);
    return LESSONS.map(l => l.slug).filter(s => files.includes(`${s}.md`));
  } catch {
    return [];
  }
}

/** Mọi nhóm câu trong các đề thuộc kho luyện theo dạng, theo thứ tự cuốn → đề → câu. */
export async function getDrillGroups(): Promise<DrillGroup[]> {
  const index = await getIndex();
  const books = drillBooks(index);
  const out: DrillGroup[] = [];
  for (const entry of index.filter(t => books.includes(t.book))) {
    const t = await getTest(entry.id);
    if (!t) continue;
    for (const skill of ['listening', 'reading'] as const) {
      for (const u of t[skill]) {
        // Phần nghe chưa có audio thì chưa luyện được
        if (skill === 'listening' && entry.listening.find(x => x.n === u.n)?.audio === false) continue;
        for (const g of u.groups) {
          out.push({ testId: t.id, book: t.book, test: t.test, skill, unit: u.n, unitTitle: u.title, from: g.from, to: g.to, type: g.type });
        }
      }
    }
  }
  return out;
}
