'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Eye, RotateCcw } from 'lucide-react';
import type { GrammarMistake, Group, MistakeReason, MistakeState, Test } from '@/lib/types';
import { logSeconds, reviewGrammarMistake, useStore } from '@/lib/store';
import { dayKey, fmtDay } from '@/lib/dates';
import { correctDisplay, shownAnswer } from '@/lib/scoring';
import { REASONS } from '@/lib/reasons';
import { playSfx } from '@/lib/sfx';
import ReasonChips from './ReasonChips';
import { useNow, useStudyTimer } from '@/lib/hooks';
import { HedgehogMascot, MascotLoading } from './Mascots';


interface Item {
  key: string;
  testId: string;
  skill: 'listening' | 'reading';
  n: number;
  m: MistakeState;
}

function parseKey(key: string, m: MistakeState): Item {
  const [testId, s, n] = key.split(':');
  return { key, testId, skill: s === 'L' ? 'listening' : 'reading', n: Number(n), m };
}

// Locate the question group, unit, and prompt for question n in a test
function locate(t: Test | undefined, skill: Item['skill'], n: number) {
  if (!t) return null;
  for (const u of skill === 'reading' ? t.reading : t.listening) {
    for (const g of u.groups) {
      const q = g.questions.find(x => x.n === n);
      if (!q) continue;
      let prompt = q.prompt ?? g.prompt ?? '';
      if (!prompt && g.template) {
        const line = g.template.split('\n').find(l => l.includes(`{{${n}}}`)) ?? '';
        prompt = line.replace(/^[#\-*\s]+|\*\*/g, '').replace(`{{${n}}}`, '_____').replace(/\{\{\d+\}\}/g, '…');
      }
      return { unit: u.n, unitTitle: u.title, g: g as Group, prompt };
    }
  }
  return null;
}

export default function Mistakes() {
  const store = useStore();
  const [tests, setTests] = useState<Record<string, Test>>({});
  const [pickedTab, setTab] = useState<'due' | 'all' | 'grammar' | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [gmInputs, setGmInputs] = useState<Record<string, string>>({});
  const [gmShown, setGmShown] = useState<Record<string, boolean>>({});

  const items = useMemo(() => (store ? Object.entries(store.mistakes).map(([k, m]) => parseKey(k, m)) : []), [store]);
  const open = items.filter(i => !i.m.resolved);
  const now = useNow();
  const due = open.filter(i => i.m.due <= now);
  const resolved = items.length - open.length;
  const allGMistakes = store?.grammarMistakes ?? [];
  const gMistakes = allGMistakes.filter(m => !m.resolved);
  const gDue = gMistakes.filter(m => m.due <= now);
  const gResolved = allGMistakes.length - gMistakes.length;
  const tab: 'due' | 'all' | 'grammar' = pickedTab ?? (due.length === 0 && gDue.length > 0 ? 'grammar' : 'due');

  // Ghi nhận thời gian khi luyện sửa lỗi Writing/Speaking
  useStudyTimer(tab === 'grammar' && gMistakes.length > 0, logSeconds);

  useEffect(() => {
    const ids = [...new Set(items.map(i => i.testId))].filter(id => !tests[id]);
    ids.forEach(id =>
      fetch(`/api/tests/${id}`)
        .then(r => (r.ok ? r.json() : null))
        .then((t: Test | null) => t && setTests(x => ({ ...x, [id]: t }))),
    );
  }, [items, tests]);

  const list = tab === 'due' ? due : open;

  // Group due mistakes by unit so they can be retried in one batch
  const batches = new Map<string, { testId: string; skill: Item['skill']; unit: number; title: string; ns: number[]; book?: number; test?: number }>();
  for (const i of due) {
    const loc = locate(tests[i.testId], i.skill, i.n);
    if (!loc) continue;
    const k = `${i.testId}:${i.skill}:${loc.unit}`;
    const b = batches.get(k) ?? { testId: i.testId, skill: i.skill, unit: loc.unit, title: loc.unitTitle, ns: [], book: tests[i.testId]?.book, test: tests[i.testId]?.test };
    b.ns.push(i.n);
    batches.set(k, b);
  }

  const reasonCount = new Map<MistakeReason, number>();
  items.forEach(i => i.m.reason && reasonCount.set(i.m.reason, (reasonCount.get(i.m.reason) ?? 0) + 1));
  const tagged = [...reasonCount.values()].reduce((a, b) => a + b, 0);

  if (!store) return <MascotLoading character="hedgehog" label="Hedgehog is opening your mistake log…" />;

  return (
    <div>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Mistake Log</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            Hedgehog saves missed questions and brings them back after 1, 3, and 7 days. Get a question right 3 times in a row when due to clear it. Retrying early is fine for practice, but won’t advance the schedule. Tag why you missed it to spot patterns.
          </p>
        </div>
        <HedgehogMascot pose="mistakes" size={82} className="hidden sm:block" />
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Due for retry', due.length + gDue.length, 'text-ember', due.length && gDue.length ? `${due.length} R/L · ${gDue.length} W/S` : ''],
          ['Tracking', open.length + gMistakes.length, 'text-ink', open.length && gMistakes.length ? `${open.length} R/L · ${gMistakes.length} W/S` : ''],
          ['Resolved', resolved + gResolved, 'text-good', resolved && gResolved ? `${resolved} R/L · ${gResolved} W/S` : ''],
        ].map(([label, n, tone, sub]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className={`num mt-1 font-serif text-[30px] leading-none font-semibold ${tone}`}>{n}</p>
            {sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
          </div>
        ))}
      </section>

      {batches.size > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-serif text-lg font-semibold">Retry Today</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...batches.values()].map(b => (
              <Link
                key={`${b.testId}${b.skill}${b.unit}`}
                href={`/test/${b.testId}/${b.skill}?p=${b.unit}&focus=${b.ns.sort((x, y) => x - y).join(',')}`}
                className="card flex items-center gap-3 p-4 transition-colors hover:bg-sunk/50"
              >
                <RotateCcw size={18} className="shrink-0 text-ember" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {b.ns.length} {b.ns.length === 1 ? 'question' : 'questions'} · {b.skill === 'listening' ? `Part ${b.unit}` : `Passage ${b.unit}`}
                  </p>
                  <p className="truncate text-sm text-muted">
                    Cam {b.book} Test {b.test} · {b.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tagged > 0 && (
        <section className="card mt-6 p-5">
          <p className="eyebrow">Top Mistake Reasons</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full">
            {REASONS.filter(r => reasonCount.get(r.k)).map((r, i) => (
              <div
                key={r.k}
                title={r.label}
                style={{ width: `${((reasonCount.get(r.k) ?? 0) / tagged) * 100}%`, background: ['#1f5e4f', '#e0561b', '#b83a2e', '#c9a227', '#6b6a63', '#3b7ea8'][i % 6] }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {REASONS.filter(r => reasonCount.get(r.k))
              .sort((a, b) => (reasonCount.get(b.k) ?? 0) - (reasonCount.get(a.k) ?? 0))
              .map(r => (
                <li key={r.k}>
                  <span className="font-semibold">{reasonCount.get(r.k)}</span> <span className="text-ink-2">{r.label}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 inline-flex flex-wrap rounded-lg border border-line-strong bg-surface p-1 text-sm">
          {(['due', 'all', 'grammar'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1 font-medium ${tab === k ? 'bg-ink text-paper' : 'text-ink-2'}`}>
              {k === 'due'
                ? `Due (${due.length})`
                : k === 'all'
                  ? `All Reading/Listening (${open.length})`
                  : `Writing & Speaking fixes (${gDue.length}/${gMistakes.length})`}
            </button>
          ))}
        </div>

        {tab === 'grammar' ? (
          <GrammarMistakeList
            items={gMistakes}
            now={now}
            inputs={gmInputs}
            setInputs={setGmInputs}
            shown={gmShown}
            setShown={setGmShown}
          />
        ) : list.length ? (
          <ul className="space-y-3">
            {list
              .sort((a, b) => a.m.due - b.m.due)
              .map(i => {
                const t = tests[i.testId];
                const loc = locate(t, i.skill, i.n);
                // Learner's most recent wrong answer for this question
                const lastWrong = store.attempts.findLast(a => a.testId === i.testId && a.skill === i.skill && a.results[i.n] === false);
                const mine = loc && lastWrong ? shownAnswer(loc.g, i.n, lastWrong.answers) : '';
                return (
                  <li key={i.key} className="card p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="qnum">{i.n}</span>
                      <span>
                        Cam {t?.book} Test {t?.test} · {i.skill === 'listening' ? `Part ${loc?.unit ?? ''}` : `Passage ${loc?.unit ?? ''}`}
                      </span>
                      {loc && <span>· {loc.g.type}</span>}
                      <span className="ml-auto">
                        {i.m.due <= now ? 'Due now' : `Retry ${fmtDay(dayKey(i.m.due))}`} · {i.m.step}/3 streak
                      </span>
                    </div>
                    {loc ? (
                      <>
                        <p className="mt-2 text-[15px]">{loc.prompt}</p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                          <span className="text-muted">
                            Last attempt: <span className="font-medium text-bad line-through decoration-1">{mine || 'blank'}</span>
                          </span>
                          {/* Hide the answer so retries test real recall instead of copying */}
                          {revealed[i.key] ? (
                            <span>
                              Answer: <span className="font-semibold text-good">{correctDisplay(loc.g, i.n)}</span>
                            </span>
                          ) : (
                            <button className="text-xs font-semibold text-accent hover:underline" onClick={() => setRevealed(r => ({ ...r, [i.key]: true }))}>
                              Show answer
                            </button>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Loading question…</p>
                    )}
                    <ReasonChips mistakeKey={i.key} />
                  </li>
                );
              })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
            <HedgehogMascot pose="sleepy" size={84} className="mx-auto mb-2" />
            {open.length ? 'No questions due today. Check back tomorrow!' : 'Your mistake log is empty. Missed questions from practice tests will appear here automatically.'}
          </div>
        )}
      </section>
    </div>
  );
}

function GrammarMistakeList({
  items,
  now,
  inputs,
  setInputs,
  shown,
  setShown,
}: {
  items: GrammarMistake[];
  now: number;
  inputs: Record<string, string>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  shown: Record<string, boolean>;
  setShown: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
        <HedgehogMascot pose="sleepy" size={84} className="mx-auto mb-2" />
        No Writing or Speaking fixes saved yet. After AI grading, click “Save mistakes to Mistake Log” to review them here.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {[...items]
        .sort((a, b) => a.due - b.due)
        .map(m => {
          const isDue = m.due <= now;
          const isShown = !!shown[m.id];
          return (
            <li key={m.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded bg-sunk px-2 py-0.5 font-bold text-ink uppercase">
                  {m.skill === 'writing' ? 'Writing' : 'Speaking'} · {m.criterion}
                </span>
                {m.errorPattern && <span className="rounded bg-ember-soft px-2 py-0.5 font-medium text-ember">{m.errorPattern}</span>}
                <span className="ml-auto">
                  {isDue ? 'Due now' : `Review ${fmtDay(dayKey(m.due))}`} · {m.step}/3 streak
                </span>
              </div>
              <p className="mt-2.5 font-serif text-[15px] text-bad line-through decoration-1">{m.original}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">Hint: {m.reasonVi}</p>

              <div className="mt-3 space-y-2">
                <input
                  className="field font-serif text-sm"
                  placeholder="Try rewriting it more accurately or naturally before revealing the model…"
                  value={inputs[m.id] ?? ''}
                  onChange={e => setInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                />
                {isShown ? (
                  <div className="rounded-lg bg-good-soft/60 p-3">
                    <p className="text-xs font-bold text-good">Improved version:</p>
                    <p className="mt-1 font-serif text-[15px] font-medium text-ink">{m.improved}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn-primary px-3 py-1 text-xs"
                        onClick={() => {
                          playSfx('tick');
                          reviewGrammarMistake(m.id, true);
                          setShown(s => ({ ...s, [m.id]: false }));
                          setInputs(p => ({ ...p, [m.id]: '' }));
                        }}
                      >
                        <Check size={13} /> Nailed it ({isDue ? '+1 streak' : 'early review'})
                      </button>
                      <button
                        className="btn-ghost px-3 py-1 text-xs"
                        onClick={() => {
                          reviewGrammarMistake(m.id, false);
                          setShown(s => ({ ...s, [m.id]: false }));
                        }}
                      >
                        Review again tomorrow
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setShown(s => ({ ...s, [m.id]: true }))}>
                    <Eye size={13} /> Compare with model
                  </button>
                )}
              </div>
            </li>
          );
        })}
    </ul>
  );
}
