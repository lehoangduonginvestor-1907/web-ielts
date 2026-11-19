'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock } from 'lucide-react';
import type { Block } from '@/lib/learnParse';
import { drillHref, GROUP_LABEL, LESSONS, type DrillGroup, type LessonDef } from '@/lib/skills';
import { drillSummary } from '@/lib/progress';
import { logSeconds, updateLesson, useStore } from '@/lib/store';
import { useStudyTimer } from '@/lib/hooks';
import { SealMascot } from '../Mascots';
import { Blocks } from './Blocks';

export default function LessonView({ lesson, blocks, drills }: { lesson: LessonDef; blocks: Block[] | null; drills: DrillGroup[] }) {
  const store = useStore();
  // Cộng thời gian đọc bài kỹ năng vào Daily Goal
  useStudyTimer(!!blocks, logSeconds);
  const state = store?.lessons[lesson.slug];
  const i = LESSONS.findIndex(l => l.slug === lesson.slug);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  const sum = store ? drillSummary(store, drills) : null;

  // Only record the first attempt for each quick-check question
  const onCheck = (n: number, correct: boolean) => updateLesson(lesson.slug, p => (p.checks && n in p.checks ? p : { ...p, checks: { ...p.checks, [n]: correct } }));

  return (
    <div className="mx-auto max-w-[46rem]">
      <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Skills
      </Link>

      <article className="card mt-4 px-5 py-7 sm:px-10 sm:py-9">
        <p className="eyebrow text-accent">
          {GROUP_LABEL[lesson.group]} · Lesson {i + 1}/{LESSONS.length}
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold sm:text-[34px]">{lesson.title}</h1>
        <p className="mt-2 text-[16px] text-ink-2">{lesson.summary}</p>
        <p className="mt-3 flex items-center gap-1.5 border-b border-line pb-5 text-[13px] text-muted">
          <Clock size={14} /> ~{lesson.minutes} min read
          {state?.done && (
            <span className="ml-3 inline-flex items-center gap-1 text-good">
              <CheckCircle2 size={14} /> Completed
            </span>
          )}
        </p>
        {blocks ? (
          <div className="lesson">
            <Blocks blocks={blocks} onCheck={onCheck} />
          </div>
        ) : (
          <p className="mt-6 text-muted">This lesson is being written. In the meantime, you can practice this question type with the drills below.</p>
        )}
      </article>

      {drills.length > 0 && (
        <section className="card mt-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">Practice with real questions</h2>
              <p className="mt-1 text-[14.5px] text-ink-2">
                {drills.length} Cambridge drill {drills.length === 1 ? 'set' : 'sets'} ({drills.reduce((n, g) => n + g.to - g.from + 1, 0)} questions total). Practice one set at a time with full explanations.
              </p>
            </div>
            <SealMascot pose={lesson.skill === 'listening' ? 'listening' : 'reading'} size={64} className="hidden sm:block" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {sum && sum.done > 0 ? `Completed ${sum.done}/${drills.length} sets · ${sum.ok}/${sum.all} correct` : 'No sets completed yet'}
            </span>
            {sum?.next ? (
              <Link href={drillHref(sum.next)} className="btn-primary">
                Drill: Cam {sum.next.book} Test {sum.next.test} · Q{sum.next.from}–{sum.next.to} <ArrowRight size={15} />
              </Link>
            ) : (
              sum && <span className="text-sm font-semibold text-good">All drill sets completed!</span>
            )}
          </div>
          {lesson.skill === 'listening' && (
            <p className="mt-3 text-xs text-muted">Audio is cued right before this question group—press play when you’re ready.</p>
          )}
        </section>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {blocks &&
          (state?.done ? (
            <button type="button" className="btn-ghost" onClick={() => updateLesson(lesson.slug, p => ({ ...p, done: false }))}>
              <CheckCircle2 size={16} className="text-good" /> Completed
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => updateLesson(lesson.slug, p => ({ ...p, done: true }))}>
              <Check size={16} /> Mark as completed
            </button>
          ))}
        <div className="ml-auto flex gap-2">
          {prev && (
            <Link href={`/skills/${prev.slug}`} className="btn-ghost" title={prev.title}>
              <ArrowLeft size={15} /> Previous
            </Link>
          )}
          {next && (
            <Link href={`/skills/${next.slug}`} className="btn-ghost" title={next.title}>
              Next <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
