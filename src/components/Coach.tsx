'use client';

import type { MistakeReason, Store, TestIndexEntry } from '@/lib/types';
import { bandEstimate, countsForBand, fullAttempts, speakingBandEstimate, typeStats, writingBandEstimate } from '@/lib/progress';
import { isActive, longestStreak, streakOf } from '@/lib/store';
import { addDays, dayKey, daysBetween, fmtDay, fmtDuration, weekdayName } from '@/lib/dates';
import { bandFor, fmtBand } from '@/lib/band';
import { LESSONS } from '@/lib/skills';
import { WRITING_PROMPTS } from '@/lib/writingPrompts';
import { SPEAKING_TOPICS } from '@/lib/speakingTopics';
import { CoachNoteEditor } from './CoachNote';
import { HedgehogMood, MascotDuo } from './Mascots';

const REASON: Record<MistakeReason, string> = {
  vocab: 'Unknown vocabulary',
  paraphrase: 'Missed paraphrase',
  locate: 'Couldn’t locate evidence',
  missed: 'Missed in audio / too fast',
  careless: 'Careless / misread prompt',
  time: 'Ran out of time',
};

const MOOD = ['', 'drained', 'low', 'good', 'great'];

// Read-only coach dashboard: weekly consistency, band trajectory, and weak areas.
export default function Coach({ store, index }: { store: Store | null; index: TestIndexEntry[] }) {
  const logout = async () => {
    await fetch('/api/login', { method: 'DELETE' });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login'; // full reload to clear any cached data
  };

  if (!store?.profile) {
    return (
      <Shell onLogout={logout}>
        <p className="card p-6 text-muted">No data yet. The learner hasn’t opened the app yet, or progress hasn’t synced to the server.</p>
        <CoachNoteEditor />
      </Shell>
    );
  }

  const p = store.profile;
  const today = dayKey();
  const real = store.attempts.filter(a => !a.incomplete);
  const lastSync = store.updatedAt ? new Date(store.updatedAt) : null;

  // Last four 7-day windows counting backwards from today
  const weeks = [0, 1, 2, 3].map(w => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(w * 7 + i)));
    const logs = days.map(d => store.days[d]);
    const atts = real.filter(a => days.includes(dayKey(a.finishedAt)));
    const ok = atts.reduce((n, a) => n + a.score, 0);
    const all = atts.reduce((n, a) => n + a.total, 0);
    return {
      label: w === 0 ? 'Last 7 days' : `${fmtDay(days[6])} – ${fmtDay(days[0])}`,
      active: logs.filter(l => isActive(l)).length,
      seconds: logs.reduce((n, l) => n + (l?.seconds ?? 0), 0),
      // Count completed units (full Listening = 4 parts); retries & drills counted separately
      units: atts.filter(a => !a.focus?.length).reduce((n, a) => n + a.units.length, 0),
      drills: atts.filter(a => a.focus?.length).length,
      cards: logs.reduce((n, l) => n + (l?.cards ?? 0), 0),
      acc: all ? Math.round((ok / all) * 100) : null,
    };
  });
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  const mocks = (['listening', 'reading'] as const).flatMap(skill => fullAttempts(store, skill)).sort((a, b) => b.finishedAt - a.finishedAt);
  const weak = typeStats(store).filter(t => t.all >= 5).slice(0, 6);
  const open = Object.values(store.mistakes).filter(m => !m.resolved);
  const reasons = new Map<MistakeReason, number>();
  open.forEach(m => m.reason && reasons.set(m.reason, (reasons.get(m.reason) ?? 0) + 1));
  const lessonsDone = LESSONS.filter(l => store.lessons?.[l.slug]?.done);
  const notes = Object.entries(store.journal)
    .filter(([, j]) => j.note || j.mood)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 10);
  const recent = [...real].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 12);
  const testName = (id: string) => {
    const t = index.find(x => x.id === id);
    return t ? `Cam ${t.book} Test ${t.test}` : id;
  };
  const idle = lastActiveGap(store, today);

  return (
    <Shell onLogout={logout}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] leading-tight font-semibold">{p.name}</h1>
          <p className="mt-1 text-ink-2">
            Target Band {fmtBand(p.target)} · {p.goalMinutes} min/day
            {p.examDate && ` · exam on ${p.examDate} (${Math.max(0, daysBetween(today, p.examDate))} days left)`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {lastSync ? `Last synced ${lastSync.toLocaleString('en-US')}` : 'Last sync unknown'}
            {idle !== null && idle >= 2 && <span className="ml-2 font-semibold text-ember">· inactive for {idle} days</span>}
          </p>
        </div>
        <MascotDuo size={102} mood="study" />
      </header>

      <CoachNoteEditor />

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Streak" value={`${streakOf(store)}`} note={`best ${longestStreak(store)}`} />
        <Stat label="Last 7 days" value={fmtDuration(weeks[0].seconds)} note={`${weeks[0].active}/7 active days`} />
        {(['listening', 'reading'] as const).map(skill => {
          const b = bandEstimate(store, skill);
          return <Stat key={skill} label={`${skill === 'listening' ? 'Listening' : 'Reading'} Band`} value={b ? fmtBand(b.avg) : '–'} note={b ? `avg of ${b.count} fresh` : 'not enough data'} />;
        })}
        {(() => {
          const bw = writingBandEstimate(store);
          const bs = speakingBandEstimate(store);
          return (
            <>
              <Stat label="Writing Band" value={bw ? fmtBand(bw.avg) : '–'} note={bw ? `avg of ${bw.count} graded` : 'no essays yet'} />
              <Stat label="Speaking Band" value={bs ? fmtBand(bs.avg) : '–'} note={bs ? `avg of ${bs.count} sessions` : 'no sessions yet'} />
            </>
          );
        })()}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Last 14 Days</h2>
        <div className="card flex items-end gap-1.5 p-4">
          {last14.map(d => {
            const m = Math.round((store.days[d]?.seconds ?? 0) / 60);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${weekdayName(d)} ${fmtDay(d)}: ${m} min`}>
                <span className="num text-[11px] text-muted">{m || ''}</span>
                <div className="flex h-24 w-full items-end rounded bg-sunk">
                  <div className={`w-full rounded ${m >= p.goalMinutes ? 'bg-good' : 'bg-ember'}`} style={{ height: `${Math.min(100, (m / Math.max(p.goalMinutes, 1)) * 100)}%` }} />
                </div>
                <span className={`text-[10px] ${d === today ? 'font-bold text-ink' : 'text-muted'}`}>{fmtDay(d)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">Green bar: met {p.goalMinutes}-min daily goal. Numbers above bars show minutes studied.</p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Weekly Breakdown</h2>
        <div className="card scroll-thin overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                {['Week', 'Active Days', 'Study Time', 'Parts/Passages', 'Retries & Drills', 'Cards Reviewed', 'Accuracy'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="num divide-y divide-line">
              {weeks.map(w => (
                <tr key={w.label}>
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{w.label}</td>
                  <td className="px-4 py-2.5">{w.active}/7</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{fmtDuration(w.seconds)}</td>
                  <td className="px-4 py-2.5">{w.units}</td>
                  <td className="px-4 py-2.5">{w.drills}</td>
                  <td className="px-4 py-2.5">{w.cards}</td>
                  <td className="px-4 py-2.5">{w.acc === null ? '–' : `${w.acc}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="eyebrow">Weakest Question Types (60 Days)</p>
          {weak.length ? (
            <ul className="mt-3 space-y-2.5">
              {weak.map(w => (
                <li key={`${w.skill}${w.type}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {w.type} <span className="text-muted">· {w.skill === 'listening' ? 'L' : 'R'}</span>
                    </span>
                    <span className="num font-semibold">
                      {Math.round((w.ok / w.all) * 100)}% <span className="font-normal text-muted">({w.ok}/{w.all})</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-sunk">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${(w.ok / w.all) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Not enough data yet (needs at least 5 questions per type).</p>
          )}
        </div>
        <div className="card p-5">
          <p className="eyebrow">Mistake Log</p>
          <p className="mt-2 text-sm">
            <span className="num font-serif text-[26px] font-semibold">{open.length}</span> open to retry ·{' '}
            {Object.values(store.mistakes).filter(m => m.resolved).length} resolved
          </p>
          {reasons.size > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {[...reasons.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-ink-2">{REASON[k]}</span>
                    <span className="num font-semibold">{n}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No mistake reasons tagged yet.</p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-sm text-ink-2">
            Flashcards: <span className="num font-semibold">{store.words.length}</span> · Lessons completed:{' '}
            <span className="num font-semibold">
              {lessonsDone.length}/{LESSONS.length}
            </span>
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Full 40-Question Tests</h2>
        <p className="-mt-2 mb-3 text-xs text-muted">Only timed mock exams on fresh tests count toward the band estimate. Practice sessions and retakes are shown for reference.</p>
        {mocks.length ? (
          <ul className="card divide-y divide-line text-sm">
            {mocks.slice(0, 10).map(a => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                <span className="flex-1 font-semibold">
                  {testName(a.testId)} · {a.skill === 'listening' ? 'Listening' : 'Reading'}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {countsForBand(store, a) ? 'mock · counts for band' : a.mode === 'exam' ? 'mock · seen test' : 'practice'}
                  </span>
                </span>
                <span className="num">{a.score}/40</span>
                <span className={`num font-serif text-lg font-semibold ${countsForBand(store, a) ? 'text-accent' : 'text-muted'}`}>{fmtBand(bandFor(a.skill, a.score))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">No full 40-question tests completed yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Recent Practice</h2>
        {recent.length ? (
          <ul className="card divide-y divide-line text-sm">
            {recent.map(a => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                <span className="flex-1">
                  {testName(a.testId)} · {a.skill === 'listening' ? 'Listening' : 'Reading'}{' '}
                  {a.units.length === 1 ? `${a.skill === 'listening' ? 'Part' : 'Passage'} ${a.units[0]}` : 'Full test'}
                  {a.drill ? <span className="ml-2 text-xs text-muted">drill</span> : a.focus?.length ? <span className="ml-2 text-xs text-muted">mistake retry</span> : null}
                </span>
                <span className="num text-muted">{fmtDuration(a.seconds)}</span>
                <span className="num w-12 text-right font-semibold">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">No practice sessions yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Recent Writing &amp; Speaking</h2>
        {(store.writingAttempts?.length || store.speakingAttempts?.length) ? (
          <ul className="card divide-y divide-line text-sm">
            {[
              ...(store.writingAttempts ?? []).map(w => ({
                id: w.id,
                at: w.finishedAt,
                label: `Writing ${w.task === 'task1' ? 'T1' : 'T2'} · ${WRITING_PROMPTS.find(p => p.id === w.promptId)?.title ?? w.promptId}`,
                meta: `${w.wordCount} words${w.feedback?.gradedBy ? ` · ${w.feedback.gradedBy}` : ''}`,
                band: w.feedback?.scores.overall,
              })),
              ...(store.speakingAttempts ?? []).map(s => ({
                id: s.id,
                at: s.finishedAt,
                label: `Speaking (${s.mode}) · ${SPEAKING_TOPICS.find(t => t.id === s.topicId)?.title ?? s.topicId}`,
                meta: `${s.transcript.filter(x => x.role === 'candidate').length} turns${s.feedback?.gradedBy ? ` · ${s.feedback.gradedBy}` : ''}`,
                band: s.feedback?.scores.overall,
              })),
            ]
              .sort((a, b) => b.at - a.at)
              .slice(0, 10)
              .map(item => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="num w-14 text-muted">{fmtDay(dayKey(item.at))}</span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-xs text-muted">{item.meta}</span>
                  <span className="num font-serif font-semibold text-accent">{item.band !== undefined ? fmtBand(item.band) : '–'}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">No Writing or Speaking sessions yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Learner Journal</h2>
        {notes.length ? (
          <ul className="card divide-y divide-line text-sm">
            {notes.map(([d, j]) => (
              <li key={d} className="px-4 py-3">
                <span className="num text-muted">
                  {weekdayName(d)} {fmtDay(d)}
                </span>
                {j.mood ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-ink-2">
                    · <HedgehogMood mood={j.mood as 1 | 2 | 3 | 4} size={17} /> {MOOD[j.mood]}
                  </span>
                ) : null}
                {j.note && <p className="mt-1 font-serif text-[15px] whitespace-pre-line">{j.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">No journal entries yet.</p>
        )}
      </section>
    </Shell>
  );
}

// Days since last active study day (0 = studied today); null if never active
function lastActiveGap(store: Store, today: string): number | null {
  const days = Object.keys(store.days).filter(k => isActive(store.days[k])).sort();
  return days.length ? daysBetween(days[days.length - 1], today) : null;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 font-serif text-[26px] leading-tight font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>
  );
}

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between">
        <span className="eyebrow">SealIELTS · Coach View</span>
        <button className="btn-quiet" onClick={onLogout}>
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
