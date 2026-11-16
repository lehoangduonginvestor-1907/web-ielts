'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, Clock } from 'lucide-react';
import { drillHref, drillsOf, GROUP_LABEL, LESSONS, type DrillGroup, type LessonGroup } from '@/lib/skills';
import { drillSummary, typeStats } from '@/lib/progress';
import { useStore } from '@/lib/store';

const GROUPS: LessonGroup[] = ['foundation', 'listening', 'reading'];
const INTRO: Record<LessonGroup, string> = {
  foundation: 'Bốn thói quen dùng cho mọi dạng câu. Nên đọc trước tiên.',
  listening: 'Cách làm từng dạng câu của bài nghe.',
  reading: 'Cách làm từng dạng câu của bài đọc.',
};

export default function Skills({ written, drills }: { written: string[]; drills: DrillGroup[] }) {
  const store = useStore();
  const stats = store ? typeStats(store) : [];
  const doneCount = store ? LESSONS.filter(l => store.lessons[l.slug]?.done).length : 0;

  return (
    <div>
      <header>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Kỹ năng</h1>
        <p className="mt-1 text-ink-2">
          {LESSONS.length} bài ngắn về cách làm từng dạng câu, kèm luyện tập bằng câu thật. Đã học {doneCount}/{LESSONS.length}.
        </p>
      </header>

      <div className="mt-7 space-y-9">
        {GROUPS.map(group => (
          <section key={group}>
            <h2 className="font-serif text-xl font-semibold">{GROUP_LABEL[group]}</h2>
            <p className="mt-0.5 text-sm text-muted">{INTRO[group]}</p>
            <ul className="card mt-3 divide-y divide-line">
              {LESSONS.filter(l => l.group === group).map(l => {
                const state = store?.lessons[l.slug];
                const own = drillsOf(drills, l);
                const sum = store && own.length ? drillSummary(store, own) : null;
                // Độ chính xác của các dạng câu thuộc bài này (60 ngày gần nhất)
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
                            <Clock size={12} /> {l.minutes} phút
                          </span>
                          {!written.includes(l.slug) && <span>đang soạn</span>}
                          {pct !== null && (
                            <span className={`num font-semibold ${pct >= 70 ? 'text-good' : pct >= 40 ? 'text-ember' : 'text-bad'}`}>
                              đúng {pct}% ({ok}/{all} câu)
                            </span>
                          )}
                          {sum && (
                            <span className="num">
                              đã luyện {sum.done}/{own.length} nhóm
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                    {sum?.next && (
                      <Link href={drillHref(sum.next)} className="btn-ghost shrink-0 whitespace-nowrap" title={`Cam ${sum.next.book} Test ${sum.next.test} · câu ${sum.next.from}–${sum.next.to}`}>
                        Luyện {sum.next.to - sum.next.from + 1} câu <ArrowRight size={15} />
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
