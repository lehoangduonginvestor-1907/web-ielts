import type { Store } from './types';
import { LESSONS } from './skills';
import { isActive, longestStreak } from './store';
import { bandEstimate, speakingBandEstimate, writingBandEstimate } from './progress';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  tier: number; // 0 = chưa đạt mốc đầu, 1..tiers.length = cấp đã đạt
  maxTier: number;
  unit: string;
  done: boolean;
}

function tiered(
  id: string,
  title: string,
  description: string,
  current: number,
  tiers: number[],
  unit: string,
): Milestone {
  let tier = 0;
  for (const t of tiers) {
    if (current >= t) tier++;
  }
  const nextTarget = tiers[Math.min(tier, tiers.length - 1)];
  return {
    id,
    title,
    description,
    current,
    target: nextTarget,
    tier,
    maxTier: tiers.length,
    unit,
    done: tier >= tiers.length,
  };
}

/** Tính các cột mốc thành tựu IELTS thực chất trực tiếp từ dữ liệu học (không cần schema riêng). */
export function computeMilestones(s: Store): Milestone[] {
  const studiedDays = Object.values(s.days).filter(d => isActive(d)).length;
  const bestStreak = longestStreak(s);
  const totalWords = s.words.length;
  const masteredWords = s.words.filter(w => w.srs.interval >= 21).length;
  const clearedRL = Object.values(s.mistakes).filter(m => m.resolved).length;
  const clearedWS = (s.grammarMistakes ?? []).filter(m => m.resolved).length;
  const clearedMistakes = clearedRL + clearedWS;
  const lessonsDone = LESSONS.filter(l => s.lessons[l.slug]?.done).length;

  const hasL = s.attempts.some(a => !a.incomplete && a.skill === 'listening');
  const hasR = s.attempts.some(a => !a.incomplete && a.skill === 'reading');
  const hasW = (s.writingAttempts?.length ?? 0) > 0;
  const hasS = (s.speakingAttempts?.length ?? 0) > 0;
  const skillsPracticed = [hasL, hasR, hasW, hasS].filter(Boolean).length;

  const targetBand = s.profile?.target ?? 6.5;
  const bands = [
    bandEstimate(s, 'listening')?.avg,
    bandEstimate(s, 'reading')?.avg,
    writingBandEstimate(s)?.avg,
    speakingBandEstimate(s)?.avg,
  ].filter((b): b is number => b !== undefined);
  const hitTargetCount = bands.filter(b => b >= targetBand).length;

  return [
    tiered('first_flame', 'First Flame', 'Show up and light your first active study day', studiedDays, [1, 10, 30], 'days'),
    tiered('habit_streak', 'Steady Habit', 'Build consecutive days of consistent practice', bestStreak, [7, 14, 30], 'day streak'),
    tiered('vocab_deck', 'Context Collector', 'Save vocabulary with real sentences from passages', totalWords, [25, 100, 300], 'words'),
    tiered('long_term_memory', 'Long-Term Recall', 'Push flashcards past a 21-day spaced interval', masteredWords, [10, 50, 150], 'mastered'),
    tiered('trap_buster', 'Trap Buster', 'Permanently clear mistakes across the 1–3–7 day cycle', clearedMistakes, [5, 25, 75], 'cleared'),
    tiered('strategy_scholar', 'Strategy Scholar', 'Complete IELTS question-type strategy lessons', lessonsDone, [4, 12, LESSONS.length], 'lessons'),
    tiered('four_skills', '4-Skill Explorer', 'Complete sessions in Listening, Reading, Writing & Speaking', skillsPracticed, [4], 'skills'),
    tiered(
      'target_band',
      `Band ${targetBand.toFixed(1)} Hit`,
      'Reach your target Band in fresh mocks or AI-graded skills',
      hitTargetCount,
      [1, 2, 4],
      'skills on target',
    ),
  ];
}
