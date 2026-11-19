'use client';

// Floating corner buddy: switches between Seal (skills) and Hedgehog (personal tools) by route.
// Reads real learner state (streak, freezes, daily goal, due reviews, weak question types)
// to deliver timely, encouraging nudges; can be collapsed into a peeking badge.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { Store } from '@/lib/types';
import { addDays, dayKey, daysBetween } from '@/lib/dates';
import { dueGrammarMistakes, dueMistakes, todayVocabQueue, typeStats } from '@/lib/progress';
import { isActive, streakOf, useStore } from '@/lib/store';
import { HedgehogMascot, MascotBadge, SealMascot, type HedgehogPose, type SealPose } from './Mascots';

type Who =
  | { character: 'seal'; pose: SealPose; badge: 'listening' | 'reading' | 'writing' | 'speaking' | 'skills' }
  | { character: 'hedgehog'; pose: HedgehogPose; badge: 'journal' | 'mistakes' | 'vocab' };

const SEAL_TIPS = [
  'Read the questions first before skimming—you’ll stay focused!',
  'Every missed question teaches you a new trap. You’ve got this~',
  'Listen closely for contrast signals: but, however, actually!',
  'Unfamiliar word? Guess its meaning from surrounding context first.',
  'Take a 5-minute breather after a test—your brain locks in more.',
  'Seal believes in you—keep going! 🐾',
];

const AREA_TIPS: Record<string, string[]> = {
  writing: [
    'Keep one clear central idea per body paragraph, backed by an example.',
    'Never skip the Task 1 overview—examiners look for it first!',
    'Save 2 minutes at the end to proofread verb tenses and agreement.',
  ],
  speaking: [
    'Answer directly, then add a reason and a quick example.',
    'Speaking calmly and clearly beats rushing and stumbling~',
    'Forgot a word? Paraphrase around it—that’s actually a great skill!',
  ],
  skills: [
    'Learn one strategy, then drill it right away so it sticks.',
    'Spot a useful trick? Jot it down in Hedgehog’s journal!',
  ],
};

const HEDGE_TIPS = [
  'Reviewing flashcards right when due doubles long-term retention!',
  'Every mistake in your log is a stepping stone to a higher band.',
  'Even two lines in your journal counts as showing up~',
  'Try using each new word in a sentence of your own.',
  'Hedgehog keeps your notes safe—just keep coming back!',
];

const HIDE_KEY = 'deu:buddy-hidden';
const GREET_KEY = 'deu:buddy-greeted';

function whoFor(path: string, hour: number, goalDone: boolean): Who {
  if (path.startsWith('/writing')) return { character: 'seal', pose: 'writing', badge: 'writing' };
  if (path.startsWith('/speaking')) return { character: 'seal', pose: 'speaking', badge: 'speaking' };
  if (path.startsWith('/skills')) return { character: 'seal', pose: 'skills', badge: 'skills' };
  if (path.startsWith('/practice')) return { character: 'seal', pose: 'listening', badge: 'listening' };
  if (path.startsWith('/vocab')) return { character: 'hedgehog', pose: 'vocab', badge: 'vocab' };
  if (path.startsWith('/mistakes')) return { character: 'hedgehog', pose: 'mistakes', badge: 'mistakes' };
  if (path.startsWith('/journal')) return { character: 'hedgehog', pose: 'journal', badge: 'journal' };
  if (goalDone) return { character: 'hedgehog', pose: 'celebrate', badge: 'journal' };
  return { character: 'hedgehog', pose: hour >= 23 || hour < 5 ? 'sleepy' : 'goal', badge: 'journal' };
}

function buildDynamicTips(store: Store | null, hour: number): string[] {
  if (!store?.profile) return [];
  const today = dayKey();
  const log = store.days[today];
  const active = isActive(log);
  const streak = streakOf(store, today);
  const minutes = Math.round((log?.seconds ?? 0) / 60);
  const goalMin = store.profile.goalMinutes;
  const vocabDue = todayVocabQueue(store).queue.length;
  const mistakesDue = dueMistakes(store).length + dueGrammarMistakes(store).length;
  const weak = typeStats(store).find(t => t.all >= 5);
  const daysLeft = store.profile.examDate ? daysBetween(today, store.profile.examDate) : null;

  const out: string[] = [];

  if (!active && streak > 0) {
    const cardsLeft = Math.max(0, 10 - (log?.cards ?? 0));
    const minsLeft = Math.max(0, 10 - minutes);
    if (log && log.cards > 0 && cardsLeft > 0) {
      out.push(`Only ${cardsLeft} more ${cardsLeft === 1 ? 'flashcard' : 'flashcards'} to light your Day ${streak + 1} flame!`);
    } else if (minutes > 0 && minsLeft > 0) {
      out.push(`Just ${minsLeft} more ${minsLeft === 1 ? 'minute' : 'minutes'} to keep your ${streak}-day streak burning!`);
    } else if (hour >= 19) {
      out.push(`Your ${streak}-day streak is waiting—10 flashcards (~3 min) keeps it safe tonight.`);
    }
  }

  if (vocabDue > 0 && mistakesDue > 0) {
    out.push(`${vocabDue} flashcards and ${mistakesDue} mistakes are due today—knock them out while they’re fresh!`);
  } else if (vocabDue > 0) {
    out.push(`You have ${vocabDue} ${vocabDue === 1 ? 'card' : 'cards'} due in Vocab—reviewing right on time locks memory in.`);
  } else if (mistakesDue > 0) {
    out.push(`${mistakesDue} ${mistakesDue === 1 ? 'mistake is' : 'mistakes are'} due for a 1–3–7 day retry in your Mistake Log!`);
  }

  if (weak && weak.ok / weak.all < 0.7) {
    const pct = Math.round((weak.ok / weak.all) * 100);
    out.push(`Trickiest type lately: ${weak.type} (${pct}%). Reviewing its Skills lesson before your next set helps a lot!`);
  }

  if (active && minutes < goalMin) {
    out.push(`Flame is lit! ${goalMin - minutes} min left to complete today’s ${goalMin}-min goal.`);
  } else if (streak > 0 && store.freezes < 2) {
    const toFreeze = 7 - (streak % 7);
    out.push(`${toFreeze} more active ${toFreeze === 1 ? 'day' : 'days'} to earn another Streak Freeze ❄️`);
  }

  if (daysLeft !== null && daysLeft > 0 && daysLeft <= 90) {
    out.push(`${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} until your exam—steady daily sessions beat last-minute cramming.`);
  }

  return out;
}

function smartGreeting(store: Store | null, hour: number): string {
  const name = store?.profile?.name;
  const who = name ? `, ${name}` : '';
  if (store?.profile) {
    const today = dayKey();
    const yesterday = addDays(today, -1);
    const log = store.days[today];
    const active = isActive(log);
    const streak = streakOf(store, today);
    const minutes = Math.round((log?.seconds ?? 0) / 60);
    const goalDone = minutes >= store.profile.goalMinutes;

    if (store.frozenDays.includes(yesterday) && !active && streak > 0) {
      return `Welcome back${who}! Hedgehog used a Streak Freeze yesterday—your ${streak}-day streak is safe ❄️`;
    }
    if (goalDone) {
      return `You already hit your ${store.profile.goalMinutes}-min goal today${who}! Rest up or take a bonus drill ✨`;
    }
    if (!active && streak > 0 && hour >= 19) {
      return `Evening${who}! Your ${streak}-day streak isn’t lit yet—10 quick flashcards keeps it alive 🔥`;
    }
    const vocabDue = todayVocabQueue(store).queue.length;
    const mistakesDue = dueMistakes(store).length + dueGrammarMistakes(store).length;
    if (!active && vocabDue + mistakesDue > 0) {
      return `Ready to warm up${who}? ${vocabDue ? `${vocabDue} cards` : ''}${vocabDue && mistakesDue ? ' & ' : ''}${mistakesDue ? `${mistakesDue} mistakes` : ''} are due today!`;
    }
  }
  if (hour < 5) return `Burning the midnight oil${who}? Study a little, then get some rest 🌙`;
  if (hour < 12) return `Good morning${who}! What are we practicing today? ☀️`;
  if (hour < 14) return `Happy midday${who}! Ready for a quick session before a break?`;
  if (hour < 18) return `Good afternoon${who}—steady pace wins the band~`;
  return `Good evening${who}! A light review is plenty for tonight 🌷`;
}

function tipsFor(path: string, who: Who, store: Store | null, hour: number): string[] {
  const dynamic = buildDynamicTips(store, hour);
  if (who.character === 'hedgehog') return [...dynamic, ...HEDGE_TIPS];
  const area = Object.keys(AREA_TIPS).find((k) => path.startsWith('/' + k));
  const staticTips = area ? [...AREA_TIPS[area], ...SEAL_TIPS] : SEAL_TIPS;
  return [...dynamic, ...staticTips];
}

function readFlag(storage: 'local' | 'session', key: string) {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(storage: 'local' | 'session', key: string, on: boolean) {
  try {
    const s = storage === 'local' ? localStorage : sessionStorage;
    if (on) s.setItem(key, '1');
    else s.removeItem(key);
  } catch {
    /* ignore when storage is blocked */
  }
}

const hideListeners = new Set<() => void>();
function subscribeHidden(cb: () => void) {
  hideListeners.add(cb);
  return () => {
    hideListeners.delete(cb);
  };
}
function setHiddenFlag(on: boolean) {
  writeFlag('local', HIDE_KEY, on);
  hideListeners.forEach((f) => f());
}
const noopSubscribe = () => () => {};

export default function MascotBuddy() {
  const path = usePathname();
  const store = useStore();
  const hidden = useSyncExternalStore(subscribeHidden, () => readFlag('local', HIDE_KEY), () => false);
  const hour = useSyncExternalStore(noopSubscribe, () => new Date().getHours(), () => 12);
  const [bubble, setBubbleState] = useState<{ text: string; path: string } | null>(null);
  const [hop, setHop] = useState(0);
  const tipIdx = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef(path);
  const storeRef = useRef(store);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const today = dayKey();
  const goalDone =
    !!store?.profile && Math.round((store.days[today]?.seconds ?? 0) / 60) >= store.profile.goalMinutes;
  const eveningNudge =
    !!store?.profile && streakOf(store, today) > 0 && !isActive(store.days[today]) && hour >= 19;

  const who = useMemo(() => whoFor(path, hour, goalDone), [path, hour, goalDone]);
  // Bubble only belongs to the route where it was triggered—hide on route change
  const bubbleText = bubble && bubble.path === path ? bubble.text : null;

  const say = useCallback((text: string, ms = 6500) => {
    setBubbleState({ text, path: pathRef.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBubbleState(null), ms);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Greet once per session once the learner profile is available
  const hasProfile = !!store?.profile;
  useEffect(() => {
    if (hidden || !hasProfile || readFlag('session', GREET_KEY)) return;
    writeFlag('session', GREET_KEY, true);
    const t = setTimeout(() => {
      say(smartGreeting(storeRef.current, new Date().getHours()), 6000);
      setHop((h) => h + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [hidden, hasProfile, say]);

  if (!hasProfile) return null;

  const pokeBuddy = () => {
    const tips = tipsFor(path, who, store, hour);
    tipIdx.current = (tipIdx.current + 1) % tips.length;
    say(tips[tipIdx.current]);
    setHop((h) => h + 1);
  };

  const hide = () => {
    setBubbleState(null);
    setHiddenFlag(true);
  };
  const show = () => {
    setHiddenFlag(false);
    say(who.character === 'seal' ? 'Seal is back! 🐾' : 'Hedgehog is here! 🌰', 3500);
  };

  return (
    <div className="pointer-events-none fixed right-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-end sm:right-5 lg:bottom-5">
      {hidden ? (
        <button
          type="button"
          onClick={show}
          className="buddy-peek pointer-events-auto relative rounded-full shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
          aria-label="Bring study buddy back"
          title="Bring study buddy back"
        >
          <MascotBadge character={who.character} variant={who.badge} size={40} />
          {eveningNudge && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-ember ring-2 ring-surface" />}
        </button>
      ) : (
        <>
          {bubbleText && (
            <div
              role="status"
              className="buddy-bubble pointer-events-auto relative mb-1 max-w-[16rem] rounded-2xl border border-line-strong bg-surface px-3.5 py-2.5 pr-7 text-[13.5px] leading-snug text-ink shadow-[var(--shadow-pop)]"
            >
              {bubbleText}
              <button
                type="button"
                onClick={() => setBubbleState(null)}
                className="absolute top-1.5 right-1.5 rounded-full p-0.5 text-muted hover:bg-sunk hover:text-ink"
                aria-label="Dismiss tip"
              >
                <X size={13} />
              </button>
              <span className="absolute -bottom-[7px] right-9 size-3 rotate-45 border-r border-b border-line-strong bg-surface" />
            </div>
          )}
          <div className="group pointer-events-auto relative">
            <button
              key={hop}
              type="button"
              onClick={pokeBuddy}
              className={`relative block cursor-pointer ${hop ? 'm-hop' : ''}`}
              aria-label={who.character === 'seal' ? 'Seal: get a study tip' : 'Hedgehog: get a study note'}
              title="Click for a personalized study tip"
            >
              {who.character === 'seal' ? (
                <SealMascot pose={who.pose} size={72} className="drop-shadow-sm sm:size-[84px]" />
              ) : (
                <HedgehogMascot pose={who.pose} size={72} className="drop-shadow-sm sm:size-[84px]" />
              )}
              {eveningNudge && !bubbleText && (
                <span
                  className="absolute top-1 right-1 size-3 rounded-full bg-ember ring-2 ring-surface animate-pulse"
                  aria-hidden="true"
                />
              )}
            </button>
            <button
              type="button"
              onClick={hide}
              className={`absolute -top-1 -left-1 rounded-full border border-line-strong bg-surface p-0.5 text-muted shadow-sm hover:text-ink focus-visible:block ${bubbleText ? 'block' : 'hidden group-hover:block'}`}
              aria-label="Hide study buddy"
              title="Hide study buddy"
            >
              <X size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
