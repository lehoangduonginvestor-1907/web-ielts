'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, Headphones } from 'lucide-react';
import type { Skill, TestIndexEntry, UnitIndex } from '@/lib/types';
import { useStore } from '@/lib/store';
import { nextUnit, reservedBook, tierOf, tierUnits, unitScore } from '@/lib/progress';
import { bandFor, fmtBand } from '@/lib/band';
import { usePref } from '@/lib/hooks';

const SKILL_KEY = 'ielts.libskill';

export default function Library({ index }: { index: TestIndexEntry[] }) {
  const store = useStore();
  const [skillPref, choose] = usePref<Skill>(SKILL_KEY, 'listening');
  const skill: Skill = skillPref === 'reading' ? 'reading' : 'listening';

  // Cuốn cũ nhất lên đầu (lộ trình đi từ đó), cuốn để dành thi thử xuống cuối
  const reserved = reservedBook(index);
  const sorted = [...new Set(index.map(t => t.book))].sort((a, b) => a - b);
  const books = [...sorted.filter(b => b !== reserved), ...sorted.filter(b => b === reserved)];
  const tier = store ? tierOf(store, skill) : 0;
  const open = tierUnits(skill, tier);
  const unitWord = skill === 'listening' ? 'Part' : 'Passage';

  // Việc làm tiếp: bài đang làm dở (nếu có), không thì phần kế tiếp của lộ trình
  const next = store ? nextUnit(store, index, skill) : null;
  const draft = store
    ? Object.entries(store.drafts)
        .map(([key, d]) => ({ parts: key.split(':'), d }))
        .filter(x => x.parts.length === 3 && x.parts[1] === skill && Object.keys(x.d.answers).length > 0)
        .sort((a, b) => b.d.startedAt - a.d.startedAt)[0]
    : undefined;
  const draftTest = draft && index.find(t => t.id === draft.parts[0]);
  const draftUnits = draft ? draft.parts[2].split('').map(Number) : [];
  const resume = draftTest
    ? {
        label: 'Bài đang làm dở',
        title: `Cam ${draftTest.book} Test ${draftTest.test} · ${draftUnits.length === 1 ? `${unitWord} ${draftUnits[0]}` : 'cả bài'}`,
        detail: draftUnits.length === 1 ? (draftTest[skill].find(u => u.n === draftUnits[0])?.title ?? '') : `${Object.keys(draft!.d.answers).length} câu đã trả lời`,
        href: `/test/${draftTest.id}/${skill}?p=${draftUnits.join(',')}`,
        cta: 'Làm tiếp',
      }
    : next
      ? {
          label: 'Phần kế tiếp của lộ trình',
          title: `Cam ${next.book} Test ${next.test} · ${unitWord} ${next.unit.n}`,
          detail: next.unit.title,
          href: `/test/${next.testId}/${skill}?p=${next.unit.n}`,
          cta: 'Bắt đầu',
        }
      : null;

  // Mỗi cuốn gập lại được; mặc định chỉ mở cuốn đang học
  const currentBook = next?.book ?? books[0];
  const [toggled, setToggled] = useState<Record<number, boolean>>({});

  if (!index.length) {
    return (
      <div className="card p-8 text-center text-muted">
        Chưa có đề nào trong máy. Chạy công cụ nhập đề (<code>tools/assemble.py</code>) để thêm đề.
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Luyện đề</h1>
          <p className="mt-1 text-ink-2">
            {index.length} đề Cambridge · mỗi câu đều có dẫn chứng và giải thích tiếng Việt
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-line-strong bg-surface p-1">
          {(['listening', 'reading'] as const).map(s => (
            <button
              key={s}
              onClick={() => choose(s)}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                skill === s ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {s === 'listening' ? <Headphones size={15} /> : <BookOpen size={15} />}
              {s === 'listening' ? 'Listening' : 'Reading'}
            </button>
          ))}
        </div>
      </header>

      {resume && (
        <Link href={resume.href} className="card group mt-6 flex items-center gap-4 p-4 transition-colors hover:bg-sunk/50 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{resume.label}</p>
            <p className="mt-1 font-semibold">{resume.title}</p>
            <p className="truncate font-serif text-sm text-muted">{resume.detail}</p>
          </div>
          <span className="btn-primary shrink-0 whitespace-nowrap">
            {resume.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm">
        <span className="eyebrow">Lộ trình</span>
        <span className="flex items-center gap-1">
          {tierUnits(skill, 2).map(n => (
            <span
              key={n}
              className={`rounded px-2 py-0.5 text-[12px] font-semibold ${open.includes(n) ? 'bg-accent text-white' : 'bg-sunk text-muted'}`}
            >
              {unitWord} {n}
            </span>
          ))}
        </span>
        <span className="text-ink-2">
          {tier < 2
            ? `Đạt trung bình 70% ở ${unitWord} ${open[open.length - 1]} (3–5 lần gần nhất) để mở phần tiếp theo. Phần chưa mở vẫn làm được.`
            : 'Đã mở toàn bộ. Bắt đầu làm cả bài có bấm giờ.'}
        </span>
      </div>

      <div className="mt-6 space-y-2">
        {books.map(book => {
          const tests = index.filter(t => t.book === book);
          const all = tests.flatMap(t => t[skill].map(u => ({ t, u })));
          const done = store ? all.filter(x => unitScore(store, x.t.id, skill, x.u)).length : 0;
          const isOpen = toggled[book] ?? book === currentBook;
          return (
            <section key={book}>
              <button
                onClick={() => setToggled(v => ({ ...v, [book]: !isOpen }))}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-sunk/50"
              >
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                <h2 className="font-serif text-xl font-semibold">Cambridge {book}</h2>
                {book === reserved && (
                  <span className="rounded bg-ember-soft px-2 py-0.5 text-[11px] font-semibold text-ember">Để dành thi thử cuối kỳ</span>
                )}
                <span className="num ml-auto text-sm text-muted">
                  {done}/{all.length} {unitWord.toLowerCase()} đã làm
                </span>
              </button>
              {isOpen && (
                <div className="card mt-1 mb-4 divide-y divide-line">
                  {tests.map(t => (
                    <TestRow key={t.id} t={t} skill={skill} open={open} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  function TestRow({ t, skill, open }: { t: TestIndexEntry; skill: Skill; open: number[] }) {
    const units = t[skill];
    const scores = units.map(u => (store ? unitScore(store, t.id, skill, u) : null));
    const allDone = scores.every(Boolean);
    const total = scores.reduce((x, s) => x + (s?.score ?? 0), 0);
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="w-20 shrink-0">
          <div className="font-semibold">Test {t.test}</div>
          {allDone && (
            <div className="num text-xs text-muted">
              {total}/40 · {fmtBand(bandFor(skill, total))}
            </div>
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          {units.map((u, i) => (
            <UnitChip key={u.n} t={t} u={u} skill={skill} score={scores[i]} advanced={!open.includes(u.n)} />
          ))}
        </div>
        {units.some(u => u.audio === false) ? (
          <span className="btn-ghost shrink-0 cursor-not-allowed opacity-40 sm:ml-2" title="Còn phần chưa có audio">
            Cả bài
          </span>
        ) : (
          <Link href={`/test/${t.id}/${skill}`} className="btn-ghost shrink-0 sm:ml-2">
            Cả bài
          </Link>
        )}
      </div>
    );
  }
}

function UnitChip({
  t,
  u,
  skill,
  score,
  advanced,
}: {
  t: TestIndexEntry;
  u: UnitIndex;
  skill: Skill;
  score: { score: number; total: number; attemptId: string } | null;
  advanced: boolean;
}) {
  const pct = score ? score.score / score.total : null;
  const bar = pct === null ? 'bg-line' : pct >= 0.7 ? 'bg-good' : pct >= 0.4 ? 'bg-ember' : 'bg-bad';
  const href = score ? `/test/${t.id}/${skill}?p=${u.n}&attempt=${score.attemptId}` : `/test/${t.id}/${skill}?p=${u.n}`;
  if (u.audio === false) {
    return (
      <div title="Chưa có file audio cho phần này" className="relative overflow-hidden rounded-lg border border-dashed border-line-strong py-2 pr-2 pl-3.5 opacity-55">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold">Part {u.n}</span>
          <span className="text-[11px] text-muted">chưa có audio</span>
        </div>
        <div className="mt-0.5 truncate font-serif text-[12.5px] text-muted">{u.title}</div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      title={u.title}
      className={`group relative overflow-hidden rounded-lg border border-line bg-surface py-2 pr-2 pl-3.5 transition-colors hover:border-line-strong hover:bg-sunk/60 ${
        advanced && !score ? 'opacity-60' : ''
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">
          {skill === 'listening' ? 'Part' : 'Passage'} {u.n}
        </span>
        <span className="num text-[12px] font-semibold text-ink-2">{score ? `${score.score}/${score.total}` : ''}</span>
      </div>
      <div className="mt-0.5 truncate font-serif text-[12.5px] text-muted">{u.title}</div>
    </Link>
  );
}
