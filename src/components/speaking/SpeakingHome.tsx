'use client';

import Link from 'next/link';
import { ArrowRight, Mic, Sparkles } from 'lucide-react';
import { SPEAKING_TOPICS } from '@/lib/speakingTopics';
import { speakingBandEstimate, speakingTierOf } from '@/lib/progress';
import { useStore } from '@/lib/store';
import { fmtBand } from '@/lib/band';
import { dayKey, fmtDay } from '@/lib/dates';
import { MascotLoading, SealMascot } from '../Mascots';

const TIERS = ['Part 1 & Part 2 (Warm-up)', 'Part 3 (In-Depth Discussion)', 'Full 3-Part Test (11–14 min)'];

export default function SpeakingHome() {
  const store = useStore();
  if (!store) return <MascotLoading character="seal" label="Seal is adjusting the mic…" />;

  const attempts = store.speakingAttempts ?? [];
  const tier = speakingTierOf(store);
  const band = speakingBandEstimate(store);

  const latestFor = (topicId: string) => attempts.findLast(a => a.topicId === topicId);
  const recent = [...attempts].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <SealMascot pose="speaking" size={76} className="hidden sm:block" />
          <div>
            <h1 className="font-serif text-[34px] leading-tight font-semibold">Speaking Practice</h1>
            <p className="mt-1 text-ink-2">
              Live mock interviews with the <span className="font-semibold text-ink">Gemini 3.8 Live Extended Thinking</span> Examiner · recordings saved for playback and review
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-line-strong bg-surface/50 px-4 py-3.5 text-sm">
          <span className="eyebrow">Speaking Path</span>
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
              ? 'New learners should complete 2 Part 1 or Part 2 sessions first to unlock Part 3.'
              : tier === 1
                ? 'Good speaking flow. Complete 2 more Part 3 sessions to unlock the Full 3-Part Test.'
                : 'All 3-Part Speaking mock test modes are unlocked.'}
          </p>
        </div>

        <div className="card flex items-center justify-between gap-4 p-4">
          <div>
            <p className="eyebrow">Estimated Speaking Band</p>
            {band ? (
              <>
                <p className="mt-1 font-serif text-[32px] leading-none font-semibold text-accent">{fmtBand(band.avg)}</p>
                <p className="mt-1 text-xs text-muted">Avg of {band.count} recent graded sessions</p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted">Complete 1 speaking session to receive a band score and feedback.</p>
            )}
          </div>
          <Sparkles size={24} className="shrink-0 text-accent/70" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {SPEAKING_TOPICS.map(t => {
          const last = latestFor(t.id);
          const score = last?.feedback?.scores.overall;
          const href = last ? `/speaking/${t.id}?attempt=${last.id}` : `/speaking/${t.id}`;
          return (
            <Link key={t.id} href={href} className="card group flex flex-col justify-between p-4 transition-colors hover:border-line-strong hover:bg-sunk/40 sm:p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-ember-soft px-2 py-0.5 font-semibold text-ember">
                    <Mic size={11} /> Part 1 · 2 · 3
                  </span>
                  {t.book && <span className="rounded bg-sunk px-2 py-0.5 font-medium text-ink-2">Cam {t.book} Test {t.test}</span>}
                  {score !== undefined && (
                    <span className="num ml-auto rounded bg-good-soft px-2 py-0.5 font-bold text-good">Band {fmtBand(score)}</span>
                  )}
                </div>
                <h3 className="mt-2.5 font-serif text-[18px] leading-snug font-semibold group-hover:text-accent">{t.title}</h3>
                <p className="mt-1 text-xs text-ink-2">{t.themeVi}</p>
                <p className="mt-2 line-clamp-2 font-serif text-sm text-muted italic">“{t.part2.cueCardTitle}”</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>{t.usefulVocab.length} useful expressions</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink-2 group-hover:text-accent">
                  {last ? 'Review / Practice again' : 'Enter exam room'} <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">Recent Speaking Sessions</h2>
          <ul className="card divide-y divide-line text-sm">
            {recent.map(a => {
              const top = SPEAKING_TOPICS.find(x => x.id === a.topicId);
              const sc = a.feedback?.scores;
              return (
                <li key={a.id}>
                  <Link href={`/speaking/${a.topicId}?attempt=${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-sunk/40">
                    <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                    <span className="min-w-44 flex-1 font-semibold">{top?.title ?? a.topicId}</span>
                    <span className="text-xs text-muted">{a.mode === 'full' ? 'Full 3 Parts' : a.mode.toUpperCase()}</span>
                    {sc ? (
                      <span className="num flex items-center gap-2">
                        <span className="hidden text-xs text-muted sm:inline">
                          FC:{fmtBand(sc.fc)} · LR:{fmtBand(sc.lr)} · GRA:{fmtBand(sc.gra)} · P:{fmtBand(sc.p)}
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
