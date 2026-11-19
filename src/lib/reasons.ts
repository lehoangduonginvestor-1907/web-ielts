import type { MistakeReason } from './types';

// Mistake reasons: used on the review/explanation view, Mistakes log, and Coach dashboard
export const REASONS: { k: MistakeReason; label: string; hint: string }[] = [
  { k: 'vocab', label: 'Unknown vocabulary', hint: 'Unfamiliar keyword in the passage or question' },
  { k: 'paraphrase', label: 'Missed paraphrase', hint: 'Same idea expressed with different wording' },
  { k: 'locate', label: 'Couldn’t locate it', hint: 'Lost track while skimming, scanning, or listening' },
  { k: 'missed', label: 'Missed in audio', hint: 'Spoken too fast or caught off guard' },
  { k: 'careless', label: 'Careless slip', hint: 'Spelling, singular/plural, or word-limit slip' },
  { k: 'time', label: 'Ran out of time', hint: 'Did not have enough time to finish' },
];
