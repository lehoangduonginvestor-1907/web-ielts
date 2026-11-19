'use client';

import { useEffect } from 'react';
import { dayKey } from '@/lib/dates';
import { dueGrammarMistakes, dueMistakes, todayVocabQueue } from '@/lib/progress';
import { markReminderSent, parseTimeHHMM, reminderSentToday, useReminderPref } from '@/lib/reminder';
import { isActive, streakOf, useStore } from '@/lib/store';

/**
 * Watches the learner's preferred daily reminder time while the app is open
 * and triggers a gentle browser Notification once per day if today isn't active yet.
 */
export default function ReminderManager() {
  const store = useStore();
  const { enabled, time } = useReminderPref();

  useEffect(() => {
    if (!enabled || !store?.profile) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const check = () => {
      const now = new Date();
      const today = dayKey(now);
      if (reminderSentToday(today)) return;
      if (isActive(store.days[today])) return;
      const { h, m } = parseTimeHHMM(time);
      if (now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)) return;

      const streak = streakOf(store, today);
      const vocabDue = todayVocabQueue(store, now.getTime()).queue.length;
      const mistakesDue = dueMistakes(store).length + dueGrammarMistakes(store).length;
      const parts: string[] = [];
      if (vocabDue > 0) parts.push(`${vocabDue} flashcards`);
      if (mistakesDue > 0) parts.push(`${mistakesDue} mistakes`);

      const title =
        streak > 0
          ? `Keep your ${streak}-day IELTS streak alive!`
          : 'Time for a quick 10-minute IELTS session';
      const body = parts.length
        ? `Waiting for you: ${parts.join(' & ')}. Just 10 cards or 10 minutes lights today’s flame.`
        : 'Start light—just 10 minutes of practice keeps your habit moving forward.';

      try {
        const n = new Notification(title, { body, tag: `sealielts-reminder-${today}` });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        markReminderSent(today);
      } catch {
        // Ignore browser notification errors
      }
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [enabled, time, store]);

  return null;
}
