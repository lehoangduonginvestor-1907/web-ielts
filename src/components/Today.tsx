'use client';

import { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, Headphones, Layers, Mic, NotebookPen, PenLine, PenTool, Snowflake, Zap } from 'lucide-react';
import type { Skill, Store, TestIndexEntry } from '@/lib/types';
import { applyFreezes, isActive, longestStreak, streakOf, useStore } from '@/lib/store';
import {
  bandEstimate,
  dueGrammarMistakes,
  dueMistakes,
  nextSpeakingTopic,
  nextUnit,
  nextWritingPrompt,
  speakingBandEstimate,
  tierProgress,
  todayVocabQueue,
  typeStats,
  weeklyPulse,
  writingBandEstimate,
  type Suggestion,
} from '@/lib/progress';
import { WRITING_PROMPTS } from '@/lib/writingPrompts';
import { SPEAKING_TOPICS } from '@/lib/speakingTopics';
import { CoachNoteCard } from './CoachNote';
import { addDays, daysBetween, dayKey, dow } from '@/lib/dates';
import { fmtBand } from '@/lib/band';
import { LESSONS, lessonFor } from '@/lib/skills';
import { Flame } from './Flame';
import { HedgehogMascot, MascotBadge, MascotDuo, MascotLoading } from './Mascots';
import Onboarding from './Onboarding';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Today({ index }: { index: TestIndexEntry[] }) {
  const store = useStore();
  useEffect(() => {
    if (store) applyFreezes();
    // Run once when store data is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!store]);

  if (!store) return <MascotLoading character="hedgehog" label="Planning your day…" />;
  if (!store.profile) return <Onboarding />;

  const p = store.profile;
  const today = dayKey();
  const log = store.days[today] ?? { seconds: 0, units: 0, cards: 0 };
  const minutes = Math.round(log.seconds / 60);
  const goalPct = Math.min(1, minutes / p.goalMinutes);
  const streak = streakOf(store);
  const best = longestStreak(store);
  const daysLeft = p.examDate ? daysBetween(today, p.examDate) : null;

  // Completed attempts today (excluding mistake retries and incomplete sessions)
  const todayAttempts = store.attempts.filter(a => dayKey(a.finishedAt) === today && !a.focus?.length && !a.incomplete);
  const doneToday = (s: Skill) => todayAttempts.findLast(a => a.skill === s);
  const vocabPlan = todayVocabQueue(store);
  const words = vocabPlan.queue;
  const mistakes = dueMistakes(store);
  const gMistakes = dueGrammarMistakes(store);
  const nextL = nextUnit(store, index, 'listening');
  const nextR = nextUnit(store, index, 'reading');
  const nextLesson = LESSONS.find(l => !store.lessons[l.slug]?.done) ?? null;

  // Smart Writing & Speaking recommendations (balance Task 1/2, prioritize unseen types or lowest band)
  const writingPick = nextWritingPrompt(store);
  const nextW = writingPick.prompt;
  const writingDoneToday = (store.writingAttempts ?? []).findLast(a => dayKey(a.finishedAt) === today);

  const speakingPick = nextSpeakingTopic(store);
  const nextS = speakingPick.topic;
  const speakingDoneToday = (store.speakingAttempts ?? []).findLast(a => dayKey(a.finishedAt) === today);
  const weekPulse = weeklyPulse(store, today);

  type Task = { key: string; icon: typeof Layers; title: string; detail: string; href: string; done: boolean; mins: number };
  const tasks: Task[] = [];
  if (store.words.length) {
    tasks.push({
      key: 'vocab',
      icon: Layers,
      title: words.length ? `Review ${words.length} due flashcards` : 'Today’s flashcards',
      detail: words.length
        ? `${vocabPlan.dueReviewCount ? `${vocabPlan.dueReviewCount} review` : ''}${vocabPlan.dueReviewCount && vocabPlan.includedNewCount ? ' · ' : ''}${vocabPlan.includedNewCount ? `${vocabPlan.includedNewCount} new` : ''}${vocabPlan.deferredNewCount ? ` (${vocabPlan.deferredNewCount} new saved for later)` : ''}`
        : vocabPlan.deferredNewCount
          ? `Today’s batch done · ${vocabPlan.deferredNewCount} new cards paced for tomorrow`
          : 'All due cards reviewed',
      href: '/vocab/review',
      done: words.length === 0,
      mins: Math.max(3, Math.ceil(words.length / 6)),
    });
  }
  const skillName = (skill: Skill) => (skill === 'listening' ? 'Listening' : 'Reading');
  const unitWord = (skill: Skill) => (skill === 'listening' ? 'Part' : 'Passage');
  const unitTask = (skill: Skill, s: Suggestion | null): Task | null => {
    const base = { key: skill, icon: skill === 'listening' ? Headphones : BookOpen, mins: skill === 'listening' ? 10 : 20 };
    const a = doneToday(skill);
    if (a) {
      // Completed today: show what was finished (not the next unit) and link to its explanation
      const t = index.find(x => x.id === a.testId);
      const one = a.units.length === 1 ? t?.[skill].find(u => u.n === a.units[0]) : undefined;
      return {
        ...base,
        title: `${skillName(skill)} · ${a.units.length === 1 ? `${unitWord(skill)} ${a.units[0]}` : 'Full test'}`,
        detail: `${t ? `Cam ${t.book} Test ${t.test}` : a.testId}${one ? ` · ${one.title}` : ''} · ${a.score}/${a.total} correct`,
        href: `/test/${a.testId}/${skill}?p=${a.units.join(',')}&attempt=${a.id}`,
        done: true,
      };
    }
    if (!s) return null;
    return {
      ...base,
      title: `${skillName(skill)} · ${unitWord(skill)} ${s.unit.n}`,
      detail: `Cam ${s.book} Test ${s.test} · ${s.unit.title}`,
      href: `/test/${s.testId}/${skill}?p=${s.unit.n}`,
      done: false,
    };
  };
  const tl = unitTask('listening', nextL);
  const tr = unitTask('reading', nextR);
  if (tl) tasks.push(tl);
  if (tr) tasks.push(tr);

  // Alternate Writing and Speaking cleanly across month boundaries (or show both if done today)
  const showWritingToday = !!writingDoneToday || Math.abs(daysBetween('2025-01-01', today)) % 2 === 0;
  if (writingDoneToday) {
    const pDone = WRITING_PROMPTS.find(x => x.id === writingDoneToday.promptId);
    tasks.push({
      key: 'writing',
      icon: PenTool,
      title: `Writing · ${pDone?.task === 'task1' ? 'Task 1' : 'Task 2'}`,
      detail: `${pDone?.title ?? writingDoneToday.promptId}${writingDoneToday.feedback ? ` · Band ${fmtBand(writingDoneToday.feedback.scores.overall)}` : ''}`,
      href: `/writing/${writingDoneToday.promptId}?attempt=${writingDoneToday.id}`,
      done: true,
      mins: 20,
    });
  } else if (showWritingToday) {
    tasks.push({
      key: 'writing',
      icon: PenTool,
      title: `Writing · ${nextW.task === 'task1' ? 'Task 1' : 'Task 2'}`,
      detail: `${nextW.title} (${nextW.categoryLabel}) · ${writingPick.reason}`,
      href: `/writing/${nextW.id}`,
      done: false,
      mins: 20,
    });
  }

  if (speakingDoneToday) {
    const tDone = SPEAKING_TOPICS.find(x => x.id === speakingDoneToday.topicId);
    tasks.push({
      key: 'speaking',
      icon: Mic,
      title: 'Speaking · Live Examiner',
      detail: `${tDone?.title ?? speakingDoneToday.topicId}${speakingDoneToday.feedback ? ` · Band ${fmtBand(speakingDoneToday.feedback.scores.overall)}` : ''}`,
      href: `/speaking/${speakingDoneToday.topicId}?attempt=${speakingDoneToday.id}`,
      done: true,
      mins: 10,
    });
  } else if (!showWritingToday) {
    tasks.push({
      key: 'speaking',
      icon: Mic,
      title: 'Speaking · 1-on-1 Practice',
      detail: `${nextS.title} · ${speakingPick.reason}`,
      href: `/speaking/${nextS.id}`,
      done: false,
      mins: 10,
    });
  }

  const totalMistakes = mistakes.length + gMistakes.length;
  if (totalMistakes) {
    tasks.push({
      key: 'mistakes',
      icon: NotebookPen,
      title: `Retry ${totalMistakes} ${totalMistakes === 1 ? 'mistake' : 'mistakes'}`,
      detail: 'Missed questions & writing/speaking fixes return on a 1–3–7 day cycle',
      href: '/mistakes',
      done: false,
      mins: Math.max(3, totalMistakes * 2),
    });
  }
  const doneCount = tasks.filter(t => t.done).length;
  // Finished today's plan with energy to spare: suggest the next unit
  const extra = ([nextL, nextR] as const).filter((s): s is Suggestion => !!s && !!doneToday(s.skill));

  const bandL = bandEstimate(store, 'listening');
  const bandR = bandEstimate(store, 'reading');
  const bandW = writingBandEstimate(store);
  const bandS = speakingBandEstimate(store);
  const weak = typeStats(store).filter(t => t.all >= 5).slice(0, 3);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const duoMood = doneCount === tasks.length && tasks.length > 0 ? 'done' : minutes === 0 ? 'welcome' : 'study';

  return (
    <div className="space-y-8">
      <header className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {greeting()}, {p.name}.
          </p>
          <h1 className="mt-1 font-serif text-[32px] leading-tight font-semibold sm:text-[38px]">
            {doneCount === tasks.length && tasks.length > 0
              ? 'You’re all done for today.'
              : minutes === 0
                ? 'Start light—just 10 minutes first.'
                : `You’ve studied ${minutes} min today.`}
          </h1>
          {daysLeft !== null && daysLeft >= 0 && (
            <p className="mt-2 text-ink-2">
              <span className="num font-semibold text-ink">{daysLeft}</span> {daysLeft === 1 ? 'day' : 'days'} until your exam · target{' '}
              <span className="font-semibold text-ink">Band {fmtBand(p.target)}</span>
            </p>
          )}
        </div>
        <MascotDuo size={130} mood={duoMood} />
      </header>

      <CoachNoteCard />

      {/* Daily goal + streak */}
      <section className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div className="card flex items-center gap-4 p-5">
          <Ring pct={goalPct} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Daily Goal</p>
            <p className="mt-1 font-serif text-[26px] leading-none font-semibold">
              <span className="num">{minutes}</span>
              <span className="text-[17px] text-muted">/{p.goalMinutes} min</span>
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {goalPct >= 1 ? 'Goal reached! Anything extra is a bonus.' : `${p.goalMinutes - minutes} min left to go.`}
            </p>
          </div>
          <HedgehogMascot pose={goalPct >= 1 ? 'celebrate' : 'goal'} size={62} className="hidden sm:block" />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Flame lit={isActive(log)} frozen={store.frozenDays.includes(today)} size={36} />
            <div>
              <p className="font-serif text-[26px] leading-none font-semibold">
                <span className="num">{streak}</span> <span className="text-[16px] text-muted">day streak</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Best: {best} {best === 1 ? 'day' : 'days'}
                {store.freezes > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[#3b7ea8]">
                    · <Snowflake size={11} /> {store.freezes} {store.freezes === 1 ? 'freeze' : 'freezes'}
                  </span>
                )}
              </p>
            </div>
          </div>
          {!isActive(log) && (
            <div className="mt-3 rounded-lg bg-sunk/70 px-3 py-2.5 text-[13px] leading-snug text-ink-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <Zap size={13} className="text-ember" /> Quick 3-min start to light today’s flame
                </span>
                {(log.cards > 0 || minutes > 0) && (
                  <span className="num text-[11.5px] font-medium text-muted">
                    {log.cards > 0 ? `${log.cards}/10 cards` : `${minutes}/10 min`}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {words.length > 0 && (
                  <Link
                    href="/vocab/review?quick=1"
                    className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-accent hover:border-accent"
                  >
                    10-card warm-up (~3m) <ArrowRight size={12} />
                  </Link>
                )}
                {totalMistakes > 0 && (
                  <Link
                    href="/mistakes"
                    className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ember hover:border-ember"
                  >
                    Retry {Math.min(3, totalMistakes)} {totalMistakes === 1 ? 'mistake' : 'mistakes'} <ArrowRight size={12} />
                  </Link>
                )}
                {!words.length && !totalMistakes && nextLesson && (
                  <Link
                    href={`/skills/${nextLesson.slug}`}
                    className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-accent hover:border-accent"
                  >
                    1 short lesson (~{nextLesson.minutes}m) <ArrowRight size={12} />
                  </Link>
                )}
                {!words.length && !totalMistakes && !nextLesson && (
                  <span className="text-xs text-muted">Finish 1 practice unit or study 10 minutes to keep your streak alive.</span>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {week.map(k => {
              const on = isActive(store.days[k]);
              const frozen = store.frozenDays.includes(k);
              const label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow(k)];
              return (
                <div key={k} className="flex flex-col items-center gap-1">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-[11px] ${
                      on ? 'bg-ember text-white' : frozen ? 'bg-[#d6ebf7] text-[#3b7ea8]' : k === today ? 'border-2 border-dashed border-line-strong' : 'bg-sunk'
                    }`}
                  >
                    {on ? <Check size={13} strokeWidth={3} /> : frozen ? <Snowflake size={12} /> : ''}
                  </span>
                  <span className={`text-[10px] ${k === today ? 'font-bold text-ink' : 'text-muted'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold">Today’s Plan</h2>
          <span className="num text-sm text-muted">
            {doneCount}/{tasks.length} done
          </span>
        </div>
        <ol className="card divide-y divide-line">
          {tasks.map((t, i) => {
            const isPersonal = t.key === 'vocab' || t.key === 'mistakes';
            const badgeVariant =
              t.key === 'vocab'
                ? 'vocab'
                : t.key === 'mistakes'
                  ? 'mistakes'
                  : t.key === 'listening'
                    ? 'listening'
                    : t.key === 'writing'
                      ? 'writing'
                      : t.key === 'speaking'
                        ? 'speaking'
                        : 'reading';
            return (
              <li key={t.key}>
                <Link href={t.href} className="group flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-sunk/50 sm:px-5">
                  <span
                    className={`num flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      t.done ? 'bg-good text-white' : 'border border-line-strong text-ink-2'
                    }`}
                  >
                    {t.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <MascotBadge character={isPersonal ? 'hedgehog' : 'seal'} variant={badgeVariant} size={36} className="hidden sm:inline-flex" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${t.done ? 'text-muted line-through decoration-1' : ''}`}>{t.title}</p>
                    <p className="truncate text-sm text-muted">{t.detail}</p>
                  </div>
                  <span className="hidden text-xs text-muted sm:block">~{t.mins} min</span>
                  <ArrowRight size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
          {!tasks.length && <li className="px-5 py-6 text-sm text-muted">No practice tests loaded yet to schedule tasks.</li>}
        </ol>
        {extra.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Up for more? Try:{' '}
            {extra.map((s, i) => (
              <Fragment key={s.skill}>
                {i > 0 && ' · '}
                <Link href={`/test/${s.testId}/${s.skill}?p=${s.unit.n}`} className="font-semibold text-accent hover:underline">
                  {skillName(s.skill)} {unitWord(s.skill)} {s.unit.n} (Cam {s.book} Test {s.test})
                </Link>
              </Fragment>
            ))}
          </p>
        )}
        {isActive(log) && !store.journal[today]?.note && (
          <Link href="/journal" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            <PenLine size={15} /> Jot a quick journal note: what tripped you up today?
          </Link>
        )}
      </section>

      {/* Band estimates & weak areas */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <MascotBadge character="seal" variant="reading" size={28} />
            <p className="eyebrow">Estimated Band (4 Skills)</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {([['Listening', bandL], ['Reading', bandR]] as const).map(([name, b]) => (
              <div key={name}>
                <p className="text-sm text-ink-2">{name}</p>
                {b ? (
                  <>
                    <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(b.avg)}</p>
                    <p className="mt-1 text-xs text-muted">
                      Avg of {b.count} mock {b.count === 1 ? 'test' : 'tests'} · {b.avg >= p.target ? 'on target' : `${(p.target - b.avg).toFixed(1)} to go`}
                    </p>
                  </>
                ) : (
                  <TierMeter store={store} index={index} skill={name === 'Listening' ? 'listening' : 'reading'} />
                )}
              </div>
            ))}
            <div>
              <p className="text-sm text-ink-2">Writing</p>
              {bandW ? (
                <>
                  <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(bandW.avg)}</p>
                  <p className="mt-1 text-xs text-muted">Avg of {bandW.count} AI-graded {bandW.count === 1 ? 'essay' : 'essays'}</p>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-snug text-muted">
                  <Link href="/writing" className="font-semibold text-accent hover:underline">
                    Write 1 essay
                  </Link>{' '}
                  for an AI examiner band estimate.
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-ink-2">Speaking</p>
              {bandS ? (
                <>
                  <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(bandS.avg)}</p>
                  <p className="mt-1 text-xs text-muted">Avg of {bandS.count} AI {bandS.count === 1 ? 'session' : 'sessions'}</p>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-snug text-muted">
                  <Link href="/speaking" className="font-semibold text-accent hover:underline">
                    Try 1 session
                  </Link>{' '}
                  with Live Examiner.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <MascotBadge character="hedgehog" variant="mistakes" size={28} />
            <p className="eyebrow">Tricky Question Types</p>
          </div>
          {weak.length ? (
            <ul className="mt-3 space-y-2.5">
              {weak.map(w => {
                const lesson = lessonFor(w.skill, w.type);
                return (
                  <li key={`${w.skill}${w.type}`}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">
                        {lesson ? (
                          <Link href={`/skills/${lesson.slug}`} className="font-medium hover:text-accent hover:underline" title="View strategy lesson & drills">
                            {w.type}
                          </Link>
                        ) : (
                          w.type
                        )}{' '}
                        <span className="text-muted">· {w.skill === 'listening' ? 'L' : 'R'}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-2">
                        {lesson && (
                          <Link href={`/skills/${lesson.slug}`} className="text-xs font-semibold text-accent hover:underline">
                            Drill →
                          </Link>
                        )}
                        <span className="num font-semibold">{Math.round((w.ok / w.all) * 100)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-sunk">
                      <div className="h-full rounded-full bg-ember" style={{ width: `${(w.ok / w.all) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-snug text-muted">Complete at least 5 questions per type to spot weak areas—this updates automatically.</p>
          )}
        </div>
      </section>

      {/* Weekly Momentum */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MascotBadge character="hedgehog" variant="journal" size={28} />
            <p className="eyebrow">Weekly Momentum (Last 7 Days)</p>
          </div>
          <Link href="/journal" className="text-xs font-semibold text-accent hover:underline">
            View milestones &amp; heatmap →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-ink">
                {weekPulse.activeDays >= weekPulse.targetDays
                  ? 'Weekly consistency goal hit!'
                  : `${weekPulse.activeDays}/${weekPulse.targetDays} active days target`}
              </span>
              <span className="num text-xs text-muted">
                {weekPulse.minutes}/{weekPulse.targetMinutes} min
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk">
              <div
                className={`h-full rounded-full transition-all ${weekPulse.minutes >= weekPulse.targetMinutes ? 'bg-good' : 'bg-accent'}`}
                style={{ width: `${Math.min(100, Math.round((weekPulse.minutes / Math.max(1, weekPulse.targetMinutes)) * 100))}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="num font-serif text-lg leading-none font-semibold text-ink">{weekPulse.units}</p>
              <p className="mt-1 text-[11px] text-muted">parts done</p>
            </div>
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="num font-serif text-lg leading-none font-semibold text-ink">{weekPulse.cards}</p>
              <p className="mt-1 text-[11px] text-muted">cards</p>
            </div>
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="num font-serif text-lg leading-none font-semibold text-ink">{weekPulse.drills + weekPulse.lessons}</p>
              <p className="mt-1 text-[11px] text-muted">drills &amp; lessons</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0" aria-hidden="true">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-sunk)" strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke={pct >= 1 ? 'var(--color-good)' : 'var(--color-accent)'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      {pct >= 1 && <path d="M28 38.5l7 7 13-14" fill="none" stroke="var(--color-good)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// Before any full mock test: show progress toward unlocking the next tier in the learning path
function TierMeter({ store, index, skill }: { store: Store; index: TestIndexEntry[]; skill: Skill }) {
  const tp = tierProgress(store, skill, index);
  if (!tp)
    return (
      <p className="mt-2 text-sm leading-snug text-muted">
        All parts unlocked! Take a full 40-question timed mock on a fresh test to calculate your band (practice mode and repeated tests don’t count).
      </p>
    );
  const word = skill === 'listening' ? 'Part' : 'Passage';
  const pct = tp.acc === null ? 0 : Math.round(tp.acc * 100);
  return (
    <div className="mt-2">
      <p className="text-sm leading-snug text-ink-2">
        Unlock {word} {tp.next}: average 70% on {word} {tp.unit} across {tp.need} different tests
      </p>
      <div className="relative mt-2 h-2 rounded-full bg-sunk">
        <div className={`h-full rounded-full ${pct >= 70 ? 'bg-good' : 'bg-accent'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        <span className="absolute -top-1 h-4 w-0.5 bg-ink-2" style={{ left: '70%' }} aria-hidden="true" />
      </div>
      <p className="num mt-1 text-xs text-muted">
        {tp.count === 0
          ? `No ${word} ${tp.unit} completed yet`
          : `${pct}% · last ${tp.count} first-try ${tp.count === 1 ? 'test' : 'tests'}${tp.count < tp.need ? ` · ${tp.need - tp.count} more needed` : ''}`}
      </p>
    </div>
  );
}
