'use client';

import { useEffect, useRef, useState } from 'react';
import { Award, Bell, Check, Download, KeyRound, Settings2, Snowflake, Sparkles, Upload, Volume2, VolumeX } from 'lucide-react';
import type { Store } from '@/lib/types';
import { exportData, importData, isActive, longestStreak, streakOf, update, useStore } from '@/lib/store';
import { addDays, dayKey, dow, fmtDay, weekdayName } from '@/lib/dates';
import { getGeminiKey, setGeminiKey } from '@/lib/geminiKey';
import { computeMilestones } from '@/lib/milestones';
import { playSfx, useSfxPref } from '@/lib/sfx';
import { useReminderPref } from '@/lib/reminder';
import { Flame } from './Flame';
import { ChromeSkillsTip } from './GeminiContextPanel';
import { HedgehogMascot, HedgehogMood, MascotLoading } from './Mascots';
import Onboarding from './Onboarding';

const MOODS = [
  { v: 1 as const, label: 'Drained' },
  { v: 2 as const, label: 'Okay' },
  { v: 3 as const, label: 'Good' },
  { v: 4 as const, label: 'Great' },
];

function summary(s: Store, key: string) {
  const d = s.days[key];
  const atts = s.attempts.filter(a => dayKey(a.finishedAt) === key && !a.incomplete);
  return {
    minutes: Math.round((d?.seconds ?? 0) / 60),
    cards: d?.cards ?? 0,
    atts,
  };
}

const heat = (m: number) => (m <= 0 ? 'bg-sunk' : m < 15 ? 'bg-ember/25' : m < 30 ? 'bg-ember/50' : m < 60 ? 'bg-ember/75' : 'bg-ember');

export default function Journal() {
  const store = useStore();
  const today = dayKey();
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState(false);
  const [msg, setMsg] = useState('');
  const [apiKey, setApiKey] = useState(() => getGeminiKey());
  const [keySaved, setKeySaved] = useState(false);
  const [sfxOn, setSfxOn] = useSfxPref();
  const reminder = useReminderPref();
  const [notifMsg, setNotifMsg] = useState('');
  const loaded = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store && !loaded.current) {
      setNote(store.journal[today]?.note ?? '');
      loaded.current = true;
    }
  }, [store, today]);

  // Auto-save journal note
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      update(s => {
        s.journal[today] = { ...s.journal[today], note };
      });
    }, 500);
    return () => clearTimeout(t);
  }, [note, today]);

  if (!store) return <MascotLoading character="hedgehog" label="Hedgehog is opening your journal…" />;

  const streak = streakOf(store);
  const best = longestStreak(store);
  const studied = Object.keys(store.days).filter(k => isActive(store.days[k])).length;
  const totalHours = Object.values(store.days).reduce((a, d) => a + d.seconds, 0) / 3600;
  const goal = store.profile?.goalMinutes ?? 30;

  // 18-week activity heatmap, columns start on Monday
  const WEEKS = 18;
  const offset = (dow(today) + 6) % 7; // days since Monday
  const start = addDays(today, -offset - (WEEKS - 1) * 7);
  const cols = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const maxMin = Math.max(goal, ...last14.map(k => (store.days[k]?.seconds ?? 0) / 60));

  const t = summary(store, today);
  const mood = store.journal[today]?.mood;
  const past = [...new Set([...Object.keys(store.days), ...Object.keys(store.journal)])]
    .filter(k => k < today && (isActive(store.days[k]) || store.journal[k]?.note))
    .sort()
    .reverse()
    .slice(0, 30);

  const doImport = async (f: File) => {
    try {
      importData(await f.text());
      setMsg('Data restored successfully.');
    } catch (e) {
      setMsg(`Could not read file: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <HedgehogMascot pose="journal" size={76} className="hidden sm:block" />
          <div>
            <h1 className="font-serif text-[34px] leading-tight font-semibold">Journal</h1>
            <p className="mt-1 text-ink-2">One quick note a day with Hedgehog—looking back shows how far you’ve come.</p>
          </div>
        </div>
        <button className="btn-ghost shrink-0" onClick={() => setSettings(s => !s)}>
          <Settings2 size={16} /> Settings
        </button>
      </header>

      {settings && (
        <section className="card p-5 sm:p-6">
          <Onboarding initial={store.profile} onDone={() => setSettings(false)} />
          <div className="mt-6 border-t border-line pt-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Bell size={15} className="text-accent" /> Study Habits &amp; Gentle Reminders
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper/60 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">Celebration &amp; review chimes</p>
                  <p className="text-xs text-muted">Soft storybook chimes for milestones, streaks, and correct recalls.</p>
                </div>
                <button
                  type="button"
                  className={sfxOn ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'}
                  onClick={() => {
                    const next = !sfxOn;
                    setSfxOn(next);
                    if (next) setTimeout(() => playSfx('resolve'), 30);
                  }}
                >
                  {sfxOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {sfxOn ? 'Sounds on' : 'Sounds muted'}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper/60 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">Daily streak reminder (browser notification)</p>
                  <p className="text-xs text-muted">Nudges you once after your chosen time if today’s flame isn’t lit yet.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    className="field w-auto py-1 text-sm"
                    value={reminder.time}
                    onChange={e => reminder.setTime(e.target.value || '20:00')}
                    aria-label="Daily reminder time"
                  />
                  <button
                    type="button"
                    className={reminder.enabled ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'}
                    onClick={async () => {
                      if (reminder.enabled) {
                        reminder.setEnabled(false);
                        setNotifMsg('Daily browser reminder turned off.');
                        return;
                      }
                      if (typeof window === 'undefined' || !('Notification' in window)) {
                        setNotifMsg('This browser does not support desktop notifications.');
                        return;
                      }
                      let perm = Notification.permission;
                      if (perm === 'default') perm = await Notification.requestPermission();
                      if (perm === 'granted') {
                        reminder.setEnabled(true);
                        setNotifMsg(`Reminder active at ${reminder.time} daily.`);
                        new Notification('SealIELTS reminder enabled!', {
                          body: `We’ll nudge you after ${reminder.time} if today’s flame isn’t lit yet.`,
                        });
                      } else {
                        setNotifMsg('Notification permission was blocked. Enable it in your browser site settings.');
                      }
                    }}
                  >
                    {reminder.enabled ? 'Reminder on' : 'Enable reminder'}
                  </button>
                </div>
              </div>
              {notifMsg && <p className="text-xs text-ink-2">{notifMsg}</p>}
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <KeyRound size={15} className="text-accent" /> Gemini API Key (for Writing &amp; Speaking)
            </p>
            <p className="mt-1 text-sm text-muted">
              Use this if <code>GEMINI_API_KEY</code> isn’t set on your server. Stored locally in your browser to power Gemini Live (Speaking Examiner) and audio-based Speaking/Writing grading.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="password"
                className="field min-w-60 flex-1"
                placeholder="AIza..."
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  setKeySaved(false);
                }}
              />
              <button
                className="btn-primary"
                onClick={() => {
                  setGeminiKey(apiKey);
                  setKeySaved(true);
                }}
              >
                Save Key
              </button>
              {apiKey && (
                <button
                  className="btn-quiet"
                  onClick={() => {
                    setApiKey('');
                    setGeminiKey('');
                    setKeySaved(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {keySaved && <p className="mt-1.5 text-xs text-good">Gemini API Key saved in this browser.</p>}
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles size={15} className="text-accent" /> Using the Chrome Gemini Side Panel (AI Pro)
            </p>
            <div className="mt-2 space-y-2 rounded-lg border border-line bg-paper/60 p-3.5 text-xs leading-relaxed text-ink-2">
              <p>
                <strong className="text-ink">When you need an API Key:</strong> Only required for real-time voice interviews in{' '}
                <strong>Speaking Live</strong> (or one-click automatic grading via the API).
              </p>
              <p>
                <strong className="text-ink">When to use Chrome’s Ask Gemini side panel (uses zero API quota):</strong>
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <strong>Grade Writing &amp; Speaking recordings:</strong> Open <em>“Grade with my Gemini”</em>, copy the prompt to{' '}
                  <strong>Gemini</strong> in your side panel (for Speaking, download your recording and click <code>+ → Upload files</code>), then paste the returned{' '}
                  <code>json</code> block back into <code>SealIELTS</code> to apply IELTS scoring rules and save mistakes to your notebook.
                </li>
                <li>
                  <strong>Socratic hints while writing:</strong> Click <em>“Ask Gemini for paragraph feedback (no rewriting)”</em> in Practice mode (disabled in Exam mode).
                </li>
                <li>
                  <strong>Deep-dive Reading &amp; Listening:</strong> Use the quick chips under any explanation card to break down evidence grammar, distractor traps, or paraphrases.
                </li>
              </ul>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-ink">Optional 3 Chrome <code>/skills</code> shortcuts</p>
              <ChromeSkillsTip collapsible={false} />
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-semibold">Backup &amp; Restore</p>
            <p className="mt-1 text-sm text-muted">Your study progress lives in this browser. Export a backup to move to another device or keep a safe copy.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  const blob = new Blob([exportData()], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `sealielts-${today}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <Download size={15} /> Export backup
              </button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> Restore from file
              </button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
            </div>
            {msg && <p className="mt-2 text-sm text-ink-2">{msg}</p>}
          </div>
        </section>
      )}

      {/* Streak & totals */}
      <section className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0 sm:grid-cols-4">
        <div className="flex items-center gap-3 bg-surface p-5">
          <Flame lit={isActive(store.days[today])} frozen={store.frozenDays.includes(today)} size={36} />
          <div>
            <p className="num font-serif text-[30px] leading-none font-semibold">{streak}</p>
            <p className="mt-1 text-xs text-muted">day streak</p>
          </div>
        </div>
        {[
          [best, 'longest streak'],
          [studied, 'days studied'],
          [totalHours < 10 ? totalHours.toFixed(1) : Math.round(totalHours), 'total hours'],
        ].map(([v, l]) => (
          <div key={l as string} className="bg-surface p-5">
            <p className="num font-serif text-[30px] leading-none font-semibold">{v}</p>
            <p className="mt-1 text-xs text-muted">{l}</p>
          </div>
        ))}
      </section>

      {/* IELTS Mastery Milestones */}
      {(() => {
        const milestones = computeMilestones(store);
        const unlocked = milestones.filter(m => m.tier > 0).length;
        return (
          <section className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-ember" />
                <p className="eyebrow">IELTS Mastery Milestones</p>
              </div>
              <span className="num text-xs font-medium text-muted">
                {unlocked}/{milestones.length} unlocked
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {milestones.map(m => {
                const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      m.done
                        ? 'border-good/40 bg-good-soft/35'
                        : m.tier > 0
                          ? 'border-accent/35 bg-accent-soft/25'
                          : 'border-line bg-paper/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${m.tier > 0 ? 'text-ink' : 'text-ink-2'}`}>{m.title}</p>
                      <span className="flex items-center gap-0.5" aria-label={`Tier ${m.tier} of ${m.maxTier}`}>
                        {m.done ? (
                          <span className="inline-flex size-4 items-center justify-center rounded-full bg-good text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        ) : (
                          Array.from({ length: m.maxTier }, (_, idx) => (
                            <span
                              key={idx}
                              className={`size-2 rounded-full ${idx < m.tier ? 'bg-accent' : 'bg-line-strong'}`}
                            />
                          ))
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-muted">{m.description}</p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sunk">
                      <div
                        className={`h-full rounded-full ${m.done ? 'bg-good' : m.tier > 0 ? 'bg-accent' : 'bg-ember/70'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="num mt-1.5 text-[11px] font-medium text-ink-2">
                      {m.done ? `Completed · ${m.current} ${m.unit}` : `${m.current}/${m.target} ${m.unit}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Heatmap */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Last 18 Weeks</p>
          {store.freezes > 0 && (
            <p className="flex items-center gap-1 text-xs text-[#3b7ea8]">
              <Snowflake size={12} /> {store.freezes} {store.freezes === 1 ? 'streak freeze' : 'streak freezes'}: auto-applied if you miss a day
            </p>
          )}
        </div>
        <div className="scroll-thin mt-4 overflow-x-auto pb-1">
          <div className="flex gap-[3px]">
            <div className="mr-1 flex flex-col gap-[3px] text-[10px] leading-[13px] text-muted">
              {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((l, i) => (
                <span key={i} className="h-[13px]">
                  {l}
                </span>
              ))}
            </div>
            {cols.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map(k => {
                  const m = Math.round((store.days[k]?.seconds ?? 0) / 60);
                  const frozen = store.frozenDays.includes(k);
                  const future = k > today;
                  return (
                    <span
                      key={k}
                      title={future ? '' : `${weekdayName(k)} ${fmtDay(k)}: ${frozen ? 'streak freeze used' : `${m} min`}`}
                      className={`size-[13px] rounded-[3px] ${future ? 'bg-transparent' : frozen ? 'bg-[#bcdcef]' : heat(m)} ${k === today ? 'ring-1 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          Less
          {[0, 10, 20, 45, 60].map(m => (
            <span key={m} className={`size-[11px] rounded-[2px] ${heat(m)}`} />
          ))}
          More
        </div>
      </section>

      {/* Last 14 days */}
      <section className="card p-5">
        <p className="eyebrow">Study Minutes · Last 14 Days</p>
        <div className="relative mt-4 flex h-32 items-end gap-1.5">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/60" style={{ bottom: `${(goal / maxMin) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-accent">goal {goal}m</span>
          </div>
          {last14.map(k => {
            const m = (store.days[k]?.seconds ?? 0) / 60;
            return (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${fmtDay(k)}: ${Math.round(m)} min`}>
                <div className={`w-full rounded-t-[3px] ${m >= goal ? 'bg-accent' : m > 0 ? 'bg-accent/45' : 'bg-sunk'}`} style={{ height: `${Math.max(2, (m / maxMin) * 100)}%` }} />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5 text-center text-[10px] text-muted">
          {last14.map(k => (
            <span key={k} className={`flex-1 ${k === today ? 'font-bold text-ink' : ''}`}>
              {Number(k.slice(8))}
            </span>
          ))}
        </div>
      </section>

      {/* Today */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold">Today · {weekdayName(today)} {fmtDay(today)}</h2>
          <p className="text-sm text-muted">
            {t.minutes} min · {t.atts.length} {t.atts.length === 1 ? 'session' : 'sessions'} · {t.cards} {t.cards === 1 ? 'card' : 'cards'}
          </p>
        </div>
        {t.atts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {t.atts.map(a => (
              <li key={a.id} className="rounded-md bg-sunk px-2 py-1 text-[12px] text-ink-2">
                {a.skill === 'listening' ? 'L' : 'R'} {a.testId.replace(/^c(\d+)t(\d+)$/, 'C$1T$2')} {a.focus?.length ? 'retry' : (a.skill === 'listening' ? 'P' : 'R') + a.units.join('')} ·{' '}
                <span className="num font-semibold text-ink">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <p className="text-sm font-semibold">How are you feeling today?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button
                key={m.v}
                onClick={() => update(s => void (s.journal[today] = { ...s.journal[today], mood: mood === m.v ? undefined : m.v }))}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  mood === m.v ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:bg-sunk'
                }`}
              >
                <HedgehogMood mood={m.v} size={22} /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="field mt-4 min-h-28 resize-y font-serif text-[15.5px] leading-relaxed"
          placeholder="What did you learn today? Where did you get stuck? (e.g., fell for a NOT GIVEN trap, missed a phone number…)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">Auto-saved.</p>
      </section>

      {/* Past entries */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">Past Entries</h2>
          <ol className="relative space-y-4 border-l border-line pl-6">
            {past.map(k => {
              const s = summary(store, k);
              const j = store.journal[k];
              const md = MOODS.find(m => m.v === j?.mood);
              return (
                <li key={k} className="relative">
                  <span className={`absolute top-1.5 -left-[29px] size-2.5 rounded-full ${isActive(store.days[k]) ? 'bg-ember' : 'bg-line-strong'}`} />
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">
                      {weekdayName(k)} {fmtDay(k)}
                    </span>
                    <span className="text-sm text-muted">
                      {s.minutes} min · {s.atts.length} {s.atts.length === 1 ? 'session' : 'sessions'} · {s.cards} {s.cards === 1 ? 'card' : 'cards'}
                    </span>
                    {md && (
                      <span className="flex items-center gap-1.5 text-sm text-ink-2">
                        <HedgehogMood mood={md.v} size={18} /> {md.label}
                      </span>
                    )}
                  </div>
                  {j?.note && <p className="mt-1 font-serif text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{j.note}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
