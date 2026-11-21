'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Volume2, Zap } from 'lucide-react';
import type { Word } from '@/lib/types';
import { addWord, update, useStore } from '@/lib/store';
import { todayVocabQueue } from '@/lib/progress';
import { speak } from '@/lib/speech';
import { isNewCard } from '@/lib/srs';
import { dayKey, fmtDay } from '@/lib/dates';
import { useNow } from '@/lib/hooks';
import { HedgehogMascot, MascotLoading } from '../Mascots';

const stage = (w: Word) => (isNewCard(w.srs) ? 'new' : w.srs.interval >= 21 ? 'known' : 'learning');
const STAGE_LABEL = { new: 'New', learning: 'Learning', known: 'Mastered' } as const;
const STAGE_TONE = { new: 'bg-sunk text-ink-2', learning: 'bg-ember-soft text-ember', known: 'bg-good-soft text-good' } as const;

// In đậm từ trong câu ngữ cảnh
function Context({ text, word }: { text: string; word: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold text-ink not-italic">{text.slice(i, i + word.length)}</strong>
      {text.slice(i + word.length)}
    </>
  );
}

export default function VocabHome() {
  const store = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'learning' | 'known'>('all');
  const [word, setWord] = useState('');
  const [vi, setVi] = useState('');
  const [msg, setMsg] = useState('');

  const words = useMemo(() => store?.words ?? [], [store]);
  const now = useNow();
  const plan = useMemo(() => (store ? todayVocabQueue(store, now) : null), [store, now]);
  const due = plan?.queue ?? [];
  const counts = { new: 0, learning: 0, known: 0 };
  words.forEach(w => counts[stage(w)]++);
  const nextDue = words.filter(w => w.srs.due > now).sort((a, b) => a.srs.due - b.srs.due)[0];

  const shown = words.filter(
    w => (filter === 'all' || stage(w) === filter) && (!q || w.word.toLowerCase().includes(q.toLowerCase()) || w.vi.toLowerCase().includes(q.toLowerCase())),
  );

  const add = () => {
    if (!word.trim()) return;
    const ok = addWord({ word, vi, source: 'Added manually' });
    setMsg(ok ? `Added “${word.trim()}”.` : 'Already in your deck.');
    if (ok) {
      setWord('');
      setVi('');
    }
  };

  if (!store) return <MascotLoading character="hedgehog" label="Hedgehog is sorting your flashcards…" />;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Vocabulary</h1>
          <p className="mt-1 text-ink-2">Hedgehog keeps words saved from your practice, complete with original context — reviewed right before you forget.</p>
        </div>
        <HedgehogMascot pose="vocab" size={82} className="hidden sm:block" />
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Due today</p>
            <p className="mt-1 font-serif text-[40px] leading-none font-semibold">
              <span className="num">{due.length}</span> <span className="text-[17px] text-muted">{due.length === 1 ? 'card' : 'cards'}</span>
            </p>
            {due.length > 0 && plan && (
              <p className="mt-1.5 text-xs text-muted">
                {plan.dueReviewCount > 0 ? `${plan.dueReviewCount} review` : ''}
                {plan.dueReviewCount > 0 && plan.includedNewCount > 0 ? ' · ' : ''}
                {plan.includedNewCount > 0 ? `${plan.includedNewCount} new` : ''}
                {plan.deferredNewCount > 0 ? ` · ${plan.deferredNewCount} new paced for tomorrow` : ''}
              </p>
            )}
            {!due.length && (
              <p className="mt-2 text-sm text-muted">
                {plan && plan.deferredNewCount > 0
                  ? `Today’s pace complete · ${plan.deferredNewCount} new ${plan.deferredNewCount === 1 ? 'card' : 'cards'} paced for tomorrow.`
                  : nextDue
                    ? `Next review: ${dayKey(nextDue.srs.due) === dayKey() ? 'today' : fmtDay(dayKey(nextDue.srs.due))}`
                    : 'Save a few words from a passage to get started.'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {due.length > 12 && (
              <Link href="/vocab/review?quick=1" className="btn-ghost px-3.5 py-2.5 text-xs">
                <Zap size={14} className="text-ember" /> Quick 10 (~3m)
              </Link>
            )}
            {due.length > 0 ? (
              <Link href="/vocab/review" className="btn-primary px-6 py-3 text-[15px]">
                Review now
              </Link>
            ) : plan && plan.deferredNewCount > 0 ? (
              <Link href="/vocab/review?extra=1" className="btn-ghost px-4 py-2.5 text-sm">
                Learn +{Math.min(10, plan.deferredNewCount)} extra new
              </Link>
            ) : (
              <span className="btn-primary pointer-events-none px-6 py-3 text-[15px] opacity-40">Review now</span>
            )}
          </div>
        </div>
        <div className="card grid grid-cols-3 divide-x divide-line p-0">
          {(['new', 'learning', 'known'] as const).map(k => (
            <div key={k} className="p-4">
              <p className="text-xs text-muted">{STAGE_LABEL[k]}</p>
              <p className="num mt-1 font-serif text-[26px] font-semibold">{counts[k]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="field font-serif sm:max-w-56" placeholder="English word or phrase" value={word} onChange={e => setWord(e.target.value)} />
          <input className="field" placeholder="Meaning / definition" value={vi} onChange={e => setVi(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn-primary shrink-0" onClick={add} disabled={!word.trim()}>
            <Plus size={16} /> Add
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-ink-2">{msg}</p>}
        <p className="mt-2 text-xs text-muted">Tip: select any word in a passage or transcript and click “Save word” to keep its sentence context.</p>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder="Search words or meanings" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="inline-flex rounded-lg border border-line-strong bg-surface p-1 text-sm">
            {(['all', 'new', 'learning', 'known'] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-2.5 py-1 font-medium ${filter === k ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
              >
                {k === 'all' ? 'All' : STAGE_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        {shown.length ? (
          <ul className="card divide-y divide-line">
            {shown.map(w => (
              <li key={w.id} className="group flex gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-serif text-[17px] font-semibold">{w.word}</span>
                    {w.pos && <span className="text-xs text-muted italic">{w.pos}</span>}
                    <span className="text-[15px] text-ink-2">{w.vi || <span className="text-muted">— no definition yet</span>}</span>
                  </div>
                  {w.context && (
                    <p className="mt-1 line-clamp-2 font-serif text-[13.5px] text-muted italic">
                      <Context text={w.context} word={w.word} />
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    {w.source}
                    {!isNewCard(w.srs) && ` · next review ${fmtDay(dayKey(w.srs.due))}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STAGE_TONE[stage(w)]}`}>{STAGE_LABEL[stage(w)]}</span>
                  <button className="btn-quiet px-1.5 py-1" onClick={() => speak(w.word)} aria-label="Listen">
                    <Volume2 size={15} />
                  </button>
                  <button
                    className="btn-quiet px-1.5 py-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={() => update(s => void (s.words = s.words.filter(x => x.id !== w.id)))}
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
            <HedgehogMascot pose="sleepy" size={80} className="mx-auto mb-2" />
            {words.length ? 'No matching words.' : 'Your deck is empty. Finish a passage and click “Add words to flashcards” to build it.'}
          </div>
        )}
      </section>
    </div>
  );
}
