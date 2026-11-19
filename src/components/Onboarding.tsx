'use client';

import { useState } from 'react';
import { saveProfile } from '@/lib/store';
import type { Profile } from '@/lib/types';
import { Logo } from './Nav';
import { MascotBadge, MascotDuo } from './Mascots';

const BANDS = [5.5, 6, 6.5, 7, 7.5];
const MINUTES = [20, 30, 45, 60];

export default function Onboarding({ initial, onDone }: { initial?: Profile; onDone?: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [examDate, setExamDate] = useState(initial?.examDate ?? '');
  const [target, setTarget] = useState(initial?.target ?? 6.5);
  const [goal, setGoal] = useState(initial?.goalMinutes ?? 30);

  const save = () => {
    saveProfile({ name: name.trim() || 'friend', examDate: examDate || undefined, target, goalMinutes: goal, createdAt: initial?.createdAt ?? Date.now() });
    onDone?.();
  };

  return (
    <div className={initial ? '' : 'mx-auto max-w-xl pt-4 sm:pt-12'}>
      {!initial && (
        <>
          <div className="flex items-center justify-between gap-4">
            <Logo className="text-[40px]" />
            <MascotDuo size={126} mood="welcome" />
          </div>
          <h1 className="mt-5 font-serif text-[30px] leading-tight font-semibold">Show up every day, and your band will follow.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            A bit of Listening, a bit of Reading, a few flashcards—plus AI Writing &amp; Speaking practice. Every missed question comes with clear explanations and returns until it sticks. Answer four quick questions to set up SealIELTS.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-2">
              <MascotBadge character="seal" variant="listening" size={34} />
              <span>
                <strong className="text-ink">Seal</strong> guides your 4 skills &amp; practice tests.
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-2">
              <MascotBadge character="hedgehog" variant="journal" size={34} />
              <span>
                <strong className="text-ink">Hedgehog</strong> tracks your vocab, mistakes &amp; journal.
              </span>
            </div>
          </div>
        </>
      )}

      <div className={`${initial ? '' : 'card mt-8 p-6'} space-y-6`}>
        <label className="block">
          <span className="text-sm font-semibold">What should we call you?</span>
          <input className="field mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Your name for daily greetings" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Target exam date</span>
          <input type="date" className="field mt-1.5" value={examDate} onChange={e => setExamDate(e.target.value)} />
          <span className="mt-1 block text-xs text-muted">Not booked yet? Pick an estimate 3–6 months from now.</span>
        </label>

        <div>
          <span className="text-sm font-semibold">Target Band</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BANDS.map(b => (
              <button
                key={b}
                onClick={() => setTarget(b)}
                className={`num rounded-lg border px-3.5 py-1.5 text-sm font-semibold ${target === b ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'}`}
              >
                {b.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold">Daily study goal</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MINUTES.map(m => (
              <button
                key={m}
                onClick={() => setGoal(m)}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold ${goal === m ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'}`}
              >
                {m} min
              </button>
            ))}
          </div>
          <span className="mt-1.5 block text-xs text-muted">Consistency beats cramming. 30 minutes a day outperforms 3 hours once a week.</span>
        </div>

        <button className="btn-primary w-full py-2.5" onClick={save}>
          {initial ? 'Save changes' : 'Start studying'}
        </button>
      </div>
    </div>
  );
}
