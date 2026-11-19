'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, RotateCcw } from 'lucide-react';
import type { Attempt, ListeningPart, Passage } from '@/lib/types';
import { bandFor, fmtBand } from '@/lib/band';
import { fmtDuration } from '@/lib/dates';
import { addWord, hasWord, useStore } from '@/lib/store';
import { sentenceAround } from '@/lib/markup';
import { lessonFor } from '@/lib/skills';
import { MascotBadge, SealMascot } from '../Mascots';

export default function ReviewSummary({
  attempt,
  units,
  testId,
  source,
}: {
  attempt: Attempt;
  units: (Passage | ListeningPart)[];
  testId: string;
  source: string;
}) {
  const store = useStore();
  const [added, setAdded] = useState<number | null>(null);
  const wrong = Object.entries(attempt.results)
    .filter(([, ok]) => !ok)
    .map(([n]) => Number(n));
  const blank = attempt.blank ?? [];
  const wrongAnswered = wrong.filter(n => !blank.includes(n));
  const full = attempt.total === 40 && !attempt.focus?.length && !attempt.incomplete;
  const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;

  // Accuracy by question type
  const byType = new Map<string, { ok: number; all: number }>();
  for (const [n, ok] of Object.entries(attempt.results)) {
    const t = attempt.types[Number(n)] ?? 'Other';
    const v = byType.get(t) ?? { ok: 0, all: 0 };
    v.all++;
    if (ok) v.ok++;
    byType.set(t, v);
  }

  const vocab = units.flatMap(u => (u.vocab ?? []).map(v => ({ v, u })));
  const newVocab = vocab.filter(({ v }) => !hasWord(store, v.word));
  const addAll = () => {
    let n = 0;
    for (const { v, u } of newVocab) {
      // Lấy câu chứa từ trong bài làm ngữ cảnh
      let context = '';
      const texts = 'paragraphs' in u ? u.paragraphs.map(p => p.text) : u.script.map(s => s.text);
      for (const text of texts) {
        const i = text.toLowerCase().indexOf(v.word.toLowerCase());
        if (i >= 0) {
          context = sentenceAround(text, i, i + v.word.length);
          break;
        }
      }
      if (addWord({ word: v.word, vi: v.vi, pos: v.pos, context, source: `${source} · ${'paragraphs' in u ? 'Reading' : 'Listening'} ${u.n}` })) n++;
    }
    setAdded(n);
  };

  return (
    <div className="card mb-8 overflow-hidden">
      {attempt.incomplete && (
        <p className="border-b border-line bg-ember-soft px-5 py-3 text-[13.5px] leading-snug text-ember sm:px-6">
          You answered only {attempt.total - blank.length}/{attempt.total} questions, so this attempt isn’t counted as completed. Blank answers aren’t added to your Mistake Log. Click “Try again” when you have enough time.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5 sm:p-6">
        <div>
          <p className="eyebrow">Score</p>
          <p className="mt-1 font-serif text-[44px] leading-none font-semibold">
            <span className="num">{attempt.score}</span>
            <span className="text-[24px] text-muted">/{attempt.total}</span>
          </p>
        </div>
        {full && (
          <div>
            <p className="eyebrow">Estimated band</p>
            <p className="mt-1 font-serif text-[44px] leading-none font-semibold text-accent">{fmtBand(bandFor(attempt.skill, attempt.score))}</p>
          </div>
        )}
        <div className="pb-1 text-sm text-ink-2">
          <div>
            {pct}% accuracy{blank.length > 0 && ` · ${blank.length} blank`}
          </div>
          <div className="text-muted">{fmtDuration(attempt.seconds)}</div>
        </div>
        <SealMascot pose={pct >= 70 ? 'celebrate' : 'encourage'} size={78} className="ml-auto hidden sm:block" />
      </div>

      <div className="border-t border-line px-5 py-4 sm:px-6">
        <p className="eyebrow mb-2">By question type</p>
        <ul className="space-y-1.5">
          {[...byType.entries()].map(([t, v]) => (
            <li key={t} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-3 text-[13.5px]">
              <span className="truncate text-ink-2">
                {t}
                {/* Question types under 60%: link to strategy lesson */}
                {v.ok / v.all < 0.6 && lessonFor(attempt.skill, t) && (
                  <Link href={`/skills/${lessonFor(attempt.skill, t)!.slug}`} className="ml-2 font-semibold text-accent hover:underline">
                    view strategy
                  </Link>
                )}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-sunk">
                <span className={`block h-full rounded-full ${v.ok / v.all >= 0.7 ? 'bg-good' : v.ok / v.all >= 0.4 ? 'bg-ember' : 'bg-bad'}`} style={{ width: `${(v.ok / v.all) * 100}%` }} />
              </span>
              <span className="num text-right font-semibold">
                {v.ok}/{v.all}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-5 py-3 sm:px-6">
        {wrong.length > 0 && !attempt.incomplete && (
          <Link href={`/test/${testId}/${attempt.skill}?p=${attempt.units.join(',')}&focus=${wrong.join(',')}`} className="btn-ghost">
            <RotateCcw size={15} /> Retry {wrong.length} missed
          </Link>
        )}
        {vocab.length > 0 &&
          (added !== null ? (
            <span className="inline-flex items-center gap-1.5 px-2 text-sm text-good">
              <MascotBadge character="hedgehog" variant="vocab" size={22} />
              Hedgehog saved {added} {added === 1 ? 'word' : 'words'} to your flashcard deck.
            </span>
          ) : newVocab.length > 0 ? (
            <button className="btn-ghost" onClick={addAll}>
              <MascotBadge character="hedgehog" variant="vocab" size={22} />
              <Layers size={15} /> Add {newVocab.length} {newVocab.length === 1 ? 'word' : 'words'} to flashcards
            </button>
          ) : (
            <span className="px-2 text-sm text-muted">All key words here are already in your deck.</span>
          ))}
        {attempt.drill && (
          <Link href="/skills" className="btn-ghost">
            Back to Skills
          </Link>
        )}
        {(!attempt.focus?.length || attempt.drill) && (attempt.incomplete ? wrongAnswered.length > 0 : wrong.length > 0) && (
          <span className="flex items-center gap-1.5 text-xs text-muted sm:ml-auto">
            <MascotBadge character="hedgehog" variant="mistakes" size={24} />
            {attempt.incomplete ? `${wrongAnswered.length} wrong ${wrongAnswered.length === 1 ? 'answer has' : 'answers have'}` : 'Missed questions have'} been added to your Mistake Log and will return in 1 day.
          </span>
        )}
      </div>
    </div>
  );
}
