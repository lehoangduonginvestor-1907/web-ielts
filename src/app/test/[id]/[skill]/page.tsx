import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getIndex, getTest } from '@/lib/content';
import TestRoom from '@/components/test/TestRoom';
import type { Skill } from '@/lib/types';

type Params = { id: string; skill: string };
type Search = { p?: string; mode?: string; focus?: string; attempt?: string; drill?: string };

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

  const index = await getIndex();

  if (skill === 'listening') {
    const entry = index.find(t => t.id === test.id);
    const missing = units.filter(u => entry?.listening.find(x => x.n === u.n)?.audio === false);
    if (missing.length) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="card max-w-md p-6 text-center">
            <p className="font-serif text-xl font-semibold">Audio unavailable</p>
            <p className="mt-2 text-sm text-ink-2">
              Cam {test.book} Test {test.test}: {missing.map(u => `Part ${u.n}`).join(', ')} does not have audio files yet. The questions and explanations are ready—just waiting on audio.
            </p>
            <Link href="/practice" className="btn-ghost mt-5">
              Back to Practice Library
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <TestRoom
      key={`${id}-${skill}-${units.map(u => u.n).join('')}-${sp.focus ?? ''}-${sp.drill ?? ''}`}
      testId={test.id}
      book={test.book}
      testNo={test.test}
      skill={skill as Skill}
      units={units}
      index={index}
      initialMode={sp.mode === 'exam' ? 'exam' : 'practice'}
      focus={nums(sp.focus)}
      drill={sp.drill === '1' && nums(sp.focus).length > 0}
      attemptId={sp.attempt}
    />
  );
}
