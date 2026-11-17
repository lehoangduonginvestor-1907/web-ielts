'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock } from 'lucide-react';
import type { Block } from '@/lib/learnParse';
import { drillHref, GROUP_LABEL, LESSONS, type DrillGroup, type LessonDef } from '@/lib/skills';
import { drillSummary } from '@/lib/progress';
import { updateLesson, useStore } from '@/lib/store';
import { SealMascot } from '../Mascots';
import { Blocks } from './Blocks';

export default function LessonView({ lesson, blocks, drills }: { lesson: LessonDef; blocks: Block[] | null; drills: DrillGroup[] }) {
  const store = useStore();
  const state = store?.lessons[lesson.slug];
  const i = LESSONS.findIndex(l => l.slug === lesson.slug);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  const sum = store ? drillSummary(store, drills) : null;

  // Chỉ ghi kết quả lần trả lời đầu tiên của mỗi câu thử nhanh
  const onCheck = (n: number, correct: boolean) => updateLesson(lesson.slug, p => (p.checks && n in p.checks ? p : { ...p, checks: { ...p.checks, [n]: correct } }));

  return (
    <div className="mx-auto max-w-[46rem]">
      <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Kỹ năng
      </Link>

      <article className="card mt-4 px-5 py-7 sm:px-10 sm:py-9">
        <p className="eyebrow text-accent">
          {GROUP_LABEL[lesson.group]} · bài {i + 1}/{LESSONS.length}
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold sm:text-[34px]">{lesson.title}</h1>
        <p className="mt-2 text-[16px] text-ink-2">{lesson.summary}</p>
        <p className="mt-3 flex items-center gap-1.5 border-b border-line pb-5 text-[13px] text-muted">
          <Clock size={14} /> khoảng {lesson.minutes} phút
          {state?.done && (
            <span className="ml-3 inline-flex items-center gap-1 text-good">
              <CheckCircle2 size={14} /> đã học
            </span>
          )}
        </p>
        {blocks ? (
          <div className="lesson">
            <Blocks blocks={blocks} onCheck={onCheck} />
          </div>
        ) : (
          <p className="mt-6 text-muted">Bài này đang được soạn. Trong lúc chờ, bạn vẫn luyện dạng này ở bên dưới được.</p>
        )}
      </article>

      {drills.length > 0 && (
        <section className="card mt-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">Luyện với câu thật</h2>
              <p className="mt-1 text-[14.5px] text-ink-2">
                Kho luyện có {drills.length} nhóm câu dạng này ({drills.reduce((n, g) => n + g.to - g.from + 1, 0)} câu), lấy từ đề Cambridge. Mỗi lần làm một nhóm, có lời giải
                từng câu.
              </p>
            </div>
            <SealMascot pose={lesson.skill === 'listening' ? 'listening' : 'reading'} size={64} className="hidden sm:block" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {sum && sum.done > 0 ? `Đã luyện ${sum.done}/${drills.length} nhóm · đúng ${sum.ok}/${sum.all} câu` : 'Chưa luyện nhóm nào'}
            </span>
            {sum?.next ? (
              <Link href={drillHref(sum.next)} className="btn-primary">
                Luyện: Cam {sum.next.book} Test {sum.next.test} · câu {sum.next.from}–{sum.next.to} <ArrowRight size={15} />
              </Link>
            ) : (
              sum && <span className="text-sm font-semibold text-good">Đã luyện hết kho dạng này</span>
            )}
          </div>
          {lesson.skill === 'listening' && (
            <p className="mt-3 text-xs text-muted">Audio được tua sẵn tới ngay trước đoạn của nhóm câu này; bấm phát khi sẵn sàng.</p>
          )}
        </section>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {blocks &&
          (state?.done ? (
            <button type="button" className="btn-ghost" onClick={() => updateLesson(lesson.slug, p => ({ ...p, done: false }))}>
              <CheckCircle2 size={16} className="text-good" /> Đã học
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => updateLesson(lesson.slug, p => ({ ...p, done: true }))}>
              <Check size={16} /> Đánh dấu đã học
            </button>
          ))}
        <div className="ml-auto flex gap-2">
          {prev && (
            <Link href={`/skills/${prev.slug}`} className="btn-ghost" title={prev.title}>
              <ArrowLeft size={15} /> Bài trước
            </Link>
          )}
          {next && (
            <Link href={`/skills/${next.slug}`} className="btn-ghost" title={next.title}>
              Bài sau <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
