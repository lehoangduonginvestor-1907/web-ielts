import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'node:fs';
import Link from 'next/link';
import { audioPath, getTest } from '@/lib/content';
import TestRoom from '@/components/test/TestRoom';
import type { Skill } from '@/lib/types';

type Params = { id: string; skill: string };
type Search = { p?: string; mode?: string; focus?: string; attempt?: string };

const nums = (s?: string) =>
  (s ?? '')
    .split(',')
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id, skill } = await params;
  const t = await getTest(id);
  return t ? { title: `Cam ${t.book} Test ${t.test} · ${skill === 'reading' ? 'Reading' : 'Listening'}` } : {};
}

export default async function TestPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { id, skill } = await params;
  const sp = await searchParams;
  if (skill !== 'reading' && skill !== 'listening') notFound();
  const test = await getTest(id);
  if (!test) notFound();

  const all = skill === 'reading' ? test.reading : test.listening;
  const wanted = nums(sp.p);
  const units = wanted.length ? all.filter(u => wanted.includes(u.n)) : all;
  if (!units.length) notFound();

  if (skill === 'listening') {
    const missing = test.listening.filter(u => units.includes(u) && !fs.existsSync(audioPath(u.audio)?.path ?? ''));
    if (missing.length) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="card max-w-md p-6 text-center">
            <p className="font-serif text-xl font-semibold">Chưa có audio</p>
            <p className="mt-2 text-sm text-ink-2">
              Cam {test.book} Test {test.test}: {missing.map(u => `Part ${u.n}`).join(', ')} chưa có file nghe. Đề và lời giải đã sẵn sàng, chỉ chờ audio.
            </p>
            <Link href="/practice" className="btn-ghost mt-5">
              Về thư viện đề
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <TestRoom
      key={`${id}-${skill}-${units.map(u => u.n).join('')}-${sp.focus ?? ''}`}
      testId={test.id}
      book={test.book}
      testNo={test.test}
      skill={skill as Skill}
      units={units}
      initialMode={sp.mode === 'exam' ? 'exam' : 'practice'}
      focus={nums(sp.focus)}
      attemptId={sp.attempt}
    />
  );
}
