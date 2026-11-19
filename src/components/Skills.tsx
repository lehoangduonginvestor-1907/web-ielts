'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, Clock } from 'lucide-react';
import { drillHref, drillsOf, GROUP_LABEL, LESSONS, type DrillGroup, type LessonGroup } from '@/lib/skills';
import { drillSummary, typeStats } from '@/lib/progress';
import { useStore } from '@/lib/store';
import { MascotBadge, SealMascot } from './Mascots';

const GROUPS: LessonGroup[] = ['foundation', 'listening', 'reading', 'writing', 'speaking'];
const INTRO: Record<LessonGroup, string> = {
  foundation: 'Four core habits for every question type. Start here first.',
  listening: 'Step-by-step strategies for every Listening question type.',
  reading: 'Step-by-step strategies for every Reading question type.',
  writing: 'Clear Task 1 and Task 2 structures aligned with official band descriptors.',
  speaking: 'Natural fluency and idea expansion across all 3 Speaking parts.',
};

export default function Skills({ written, drills }: { written: string[]; drills: DrillGroup[] }) {
  const store = useStore();
  const stats = store ? typeStats(store) : [];
  const doneCount = store ? LESSONS.filter(l => store.lessons[l.slug]?.done).length : 0;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Skills</h1>
          <p className="mt-1 text-ink-2">
            Learn with Seal across {LESSONS.length} short strategy lessons paired with real Cambridge drills. Completed {doneCount}/{LESSONS.length}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {[
              { pose: 'listening' as const, label: 'Listening', active: true },
              { pose: 'reading' as const, label: 'Reading', active: true },
              { pose: 'writing' as const, label: 'Writing', active: false },
              { pose: 'speaking' as const, label: 'Speaking', active: false },
            ].map(s => (
              <span
                key={s.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${
                  s.active ? 'border-line-strong bg-surface text-ink' : 'border-dashed border-line text-muted'
                }`}
              >
                <SealMascot pose={s.pose} size={22} animate={false} />
                {s.label}
                {!s.active && <span className="text-[10px]">(drills soon)</span>}
              </span>
            ))}
          </div>
        </div>
        <SealMascot pose="skills" size={84} className="hidden sm:block" />
      </header>

      <div className="mt-7 space-y-9">
        {GROUPS.map(group => (
          <section key={group}>
            <div className="flex items-center gap-2.5">
              <MascotBadge character="seal" variant={group === 'foundation' ? 'skills' : group} size={30} />
              <h2 className="font-serif text-xl font-semibold">{GROUP_LABEL[group]}</h2>
            </div>
            <p className="mt-0.5 text-sm text-muted">{INTRO[group]}</p>
            <ul className="card mt-3 divide-y divide-line">
              {LESSONS.filter(l => l.group === group).map(l => {
                const state = store?.lessons[l.slug];
                const own = drillsOf(drills, l);
                const sum = store && own.length ? drillSummary(store, own) : null;
                // Accuracy across question types covered by this lesson (last 60 days)
                const mine = stats.filter(s => s.skill === l.skill && l.types?.includes(s.type));
                const all = mine.reduce((n, s) => n + s.all, 0);
                const ok = mine.reduce((n, s) => n + s.ok, 0);
                const pct = all >= 5 ? Math.round((ok / all) * 100) : null;
                return (
                  <li key={l.slug} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                    <Link href={`/skills/${l.slug}`} className="group flex min-w-0 flex-1 items-start gap-3">
                      {state?.done ? <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-good" /> : <Circle size={19} className="mt-0.5 shrink-0 text-line-strong" />}
                      <span className="min-w-0">
                        <span className="font-semibold group-hover:underline">{l.title}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-muted">{l.summary}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> {l.minutes} min
                          </span>
                          {!written.includes(l.slug) && <span>coming soon</span>}
                          {pct !== null && (
                            <span className={`num font-semibold ${pct >= 70 ? 'text-good' : pct >= 40 ? 'text-ember' : 'text-bad'}`}>
                              {pct}% accuracy ({ok}/{all})
                            </span>
                          )}
                          {sum && (
                            <span className="num">
                              {sum.done}/{own.length} drill sets done
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                    {sum?.next && (
                      <Link href={drillHref(sum.next)} className="btn-ghost shrink-0 whitespace-nowrap" title={`Cam ${sum.next.book} Test ${sum.next.test} · Q${sum.next.from}–${sum.next.to}`}>
                        Drill {sum.next.to - sum.next.from + 1} Qs <ArrowRight size={15} />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
