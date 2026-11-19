'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, PenTool, Sparkles } from 'lucide-react';
import type { WritingPrompt, WritingTaskType } from '@/lib/types';
import { WRITING_PROMPTS } from '@/lib/writingPrompts';
import { writingBandEstimate, writingTierOf } from '@/lib/progress';
import { useStore } from '@/lib/store';
import { usePref } from '@/lib/hooks';
import { fmtBand } from '@/lib/band';
import { dayKey, fmtDay } from '@/lib/dates';
import { MascotLoading, SealMascot } from '../Mascots';

const TASK_KEY = 'ielts.writing.task';

const TIERS = ['Guided Paragraphs (Scaffold)', 'Full Essay (Freeform)', 'Timed Mock Exam'];

export default function WritingHome() {
  const store = useStore();
  const [taskPref, choose] = usePref<WritingTaskType>(TASK_KEY, 'task2');
  const task: WritingTaskType = taskPref === 'task1' ? 'task1' : 'task2';
  const [cat, setCat] = useState<string>('all');

  if (!store) return <MascotLoading character="seal" label="Seal is sharpening the pencil…" />;

  const attempts = store.writingAttempts ?? [];
  const drafts = store.writingDrafts ?? {};
  const tier = writingTierOf(store);
  const band = writingBandEstimate(store);

  const prompts = WRITING_PROMPTS.filter(p => p.task === task && (cat === 'all' || p.category === cat));
  const categories = Array.from(
    new Map(WRITING_PROMPTS.filter(p => p.task === task).map(p => [p.category, p.categoryLabel])).entries(),
  );

  const latestDraft = Object.values(drafts)
    .filter(d => d.text.trim().length > 0 || d.stepTexts.some(x => x.trim().length > 0))
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  const draftPrompt = latestDraft ? WRITING_PROMPTS.find(p => p.id === latestDraft.promptId) : undefined;

  const latestFor = (promptId: string) => attempts.findLast(a => a.promptId === promptId);
  const recent = [...attempts].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <SealMascot pose="writing" size={76} className="hidden sm:block" />
          <div>
            <h1 className="font-serif text-[34px] leading-tight font-semibold">Writing Practice</h1>
            <p className="mt-1 text-ink-2">
              Graded across all 4 criteria by an <span className="font-semibold text-ink">AI Examiner</span> using IELTS band descriptors · sentence-by-sentence upgrades to the next band
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-line-strong bg-surface p-1">
          {(['task1', 'task2'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                choose(t);
                setCat('all');
              }}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                task === t ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {t === 'task1' ? <FileText size={15} /> : <PenTool size={15} />}
              {t === 'task1' ? 'Task 1 (Charts / Maps)' : 'Task 2 (Essays)'}
            </button>
          ))}
        </div>
      </header>

      {draftPrompt && latestDraft && (
        <Link href={`/writing/${draftPrompt.id}`} className="card group flex items-center gap-4 p-4 transition-colors hover:bg-sunk/50 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-ember">Draft in progress</p>
            <p className="mt-1 font-semibold">{draftPrompt.title}</p>
            <p className="truncate font-serif text-sm text-muted">
              {draftPrompt.task === 'task1' ? 'Task 1' : 'Task 2'} · {draftPrompt.categoryLabel}
            </p>
          </div>
          <span className="btn-primary shrink-0 whitespace-nowrap">
            Continue writing <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Progressive writing path & Band */}
      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-line-strong bg-surface/50 px-4 py-3.5 text-sm">
          <span className="eyebrow">Writing Path</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {TIERS.map((label, i) => (
              <span
                key={label}
                className={`rounded px-2 py-0.5 text-[12px] font-semibold ${i <= tier ? 'bg-accent text-white' : 'bg-sunk text-muted'}`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
          <p className="w-full text-xs text-ink-2">
            {tier === 0
              ? 'New learners should complete 2 essays in Guided Paragraphs mode (with scaffold hints) to unlock Full Essay mode.'
              : tier === 1
                ? 'Solid essay structure. Complete 2 more full essays to unlock Timed Mock Exam mode (20/40 min).'
                : 'All modes unlocked. You can still choose any mode whenever you like.'}
          </p>
        </div>

        <div className="card flex items-center justify-between gap-4 p-4">
          <div>
            <p className="eyebrow">Estimated Writing Band</p>
            {band ? (
              <>
                <p className="mt-1 font-serif text-[32px] leading-none font-semibold text-accent">{fmtBand(band.avg)}</p>
                <p className="mt-1 text-xs text-muted">Avg of {band.count} recent graded essays</p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted">Submit 1 essay to get an AI Examiner band score.</p>
            )}
          </div>
          <Sparkles size={24} className="shrink-0 text-accent/70" />
        </div>
      </section>

      {/* Filter by prompt type */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCat('all')}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === 'all' ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunk'}`}
          >
            All types ({WRITING_PROMPTS.filter(p => p.task === task).length})
          </button>
          {categories.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === k ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunk'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {prompts.map((p: WritingPrompt) => {
            const last = latestFor(p.id);
            const score = last?.feedback?.scores.overall;
            const href = last ? `/writing/${p.id}?attempt=${last.id}` : `/writing/${p.id}`;
            return (
              <Link key={p.id} href={href} className="card group flex flex-col justify-between p-4 transition-colors hover:border-line-strong hover:bg-sunk/40 sm:p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-accent-soft px-2 py-0.5 font-semibold text-accent-2">{p.categoryLabel}</span>
                    {p.book && <span className="rounded bg-sunk px-2 py-0.5 font-medium text-ink-2">Cam {p.book} Test {p.test}</span>}
                    {score !== undefined && (
                      <span className="num ml-auto rounded bg-good-soft px-2 py-0.5 font-bold text-good">Band {fmtBand(score)}</span>
                    )}
                  </div>
                  <h3 className="mt-2.5 font-serif text-[18px] leading-snug font-semibold group-hover:text-accent">{p.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{p.prompt}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span>Min {p.minWords} words · ~{p.recommendedMinutes} min</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-ink-2 group-hover:text-accent">
                    {last ? 'Review / Rewrite' : 'Start writing'} <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">Recently Graded Essays</h2>
          <ul className="card divide-y divide-line text-sm">
            {recent.map(a => {
              const p = WRITING_PROMPTS.find(x => x.id === a.promptId);
              const sc = a.feedback?.scores;
              return (
                <li key={a.id}>
                  <Link href={`/writing/${a.promptId}?attempt=${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-sunk/40">
                    <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                    <span className="min-w-44 flex-1 font-semibold">{p?.title ?? a.promptId}</span>
                    <span className="num text-xs text-muted">{a.wordCount} words</span>
                    {sc ? (
                      <span className="num flex items-center gap-2">
                        <span className="hidden text-xs text-muted sm:inline">
                          T:{fmtBand(sc.task)} · C:{fmtBand(sc.cc)} · L:{fmtBand(sc.lr)} · G:{fmtBand(sc.gra)}
                        </span>
                        <span className="rounded bg-accent-soft px-2 py-0.5 font-bold text-accent-2">{fmtBand(sc.overall)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Ungraded</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
