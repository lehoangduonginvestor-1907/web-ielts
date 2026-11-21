import { describe, expect, it } from 'vitest';
import { expandFocus, gradeGroup, gradeGroups, normalizeAnswer, overLimit, shownAnswer, wordLimit } from './scoring';
import type { Group } from './types';

const gap = (from: number, answers: string[][]): Group => ({
  from,
  to: from + answers.length - 1,
  kind: 'gap',
  type: 'Note completion',
  instructions: 'Write ONE WORD AND/OR A NUMBER for each answer.',
  questions: answers.map((answer, i) => ({ n: from + i, answer })),
});

const multi = (from: number, key: string[]): Group => ({
  from,
  to: from + 1,
  kind: 'multi',
  type: 'Multiple choice (two answers)',
  instructions: 'Choose TWO letters, A-E.',
  questions: [
    { n: from, answer: key },
    { n: from + 1, answer: key },
  ],
});

describe('normalizeAnswer', () => {
  it('ignores case, extra spaces, edge punctuation and currency', () => {
    expect(normalizeAnswer('  The   Library. ')).toBe('the library');
    expect(normalizeAnswer('£45')).toBe('45');
    expect(normalizeAnswer('"bicycle"')).toBe('bicycle');
    expect(normalizeAnswer('children’s')).toBe("children's");
  });

  it('keeps punctuation inside the answer', () => {
    expect(normalizeAnswer('9.30')).toBe('9.30');
    expect(normalizeAnswer('PE9 7QT')).toBe('pe9 7qt');
  });
});

describe('wordLimit / overLimit', () => {
  it('reads the limit from the instructions', () => {
    expect(wordLimit('Write ONE WORD ONLY')).toEqual({ words: 1, number: false });
    expect(wordLimit('NO MORE THAN TWO WORDS AND/OR A NUMBER')).toEqual({ words: 2, number: true });
    expect(wordLimit('Choose the correct letter')).toBeNull();
  });

  it('counts hyphenated words as one and lets numbers ride free when allowed', () => {
    const one = { words: 1, number: false };
    const oneAndNumber = { words: 1, number: true };
    expect(overLimit('well-known', one)).toBe(false);
    expect(overLimit('two words', one)).toBe(true);
    expect(overLimit('PE9 7QT', oneAndNumber)).toBe(false);
    expect(overLimit('car 45', oneAndNumber)).toBe(false);
    expect(overLimit('red car 45', oneAndNumber)).toBe(true);
    expect(overLimit('', one)).toBe(false);
  });
});

describe('gradeGroup', () => {
  it('accepts any listed variant of a gap answer', () => {
    const g = gap(1, [['colour', 'color'], ['45']]);
    expect(gradeGroup(g, { 1: 'Color', 2: '£45' })).toEqual({ 1: true, 2: true });
    expect(gradeGroup(g, { 1: 'colors', 2: '' })).toEqual({ 1: false, 2: false });
  });

  it('scores "choose TWO" one point per correct letter, in any order', () => {
    const g = multi(21, ['B', 'D']);
    expect(gradeGroup(g, { 21: ['D', 'B'] })).toEqual({ 21: true, 22: true });
    expect(gradeGroup(g, { 21: ['A', 'D'] })).toEqual({ 21: true, 22: false });
    expect(gradeGroup(g, { 21: ['A', 'C'] })).toEqual({ 21: false, 22: false });
    expect(gradeGroup(g, {})).toEqual({ 21: false, 22: false });
  });

  it('does not double-count a letter picked twice', () => {
    expect(gradeGroup(multi(21, ['B', 'D']), { 21: ['B', 'B'] })).toEqual({ 21: true, 22: false });
  });
});

describe('expandFocus / gradeGroups', () => {
  const groups = [gap(1, [['a'], ['b']]), multi(3, ['B', 'D'])];

  it('always grades a "choose TWO" pair together', () => {
    expect(expandFocus(groups, [4])).toEqual([3, 4]);
    expect(expandFocus(groups, [2])).toEqual([2]);
    expect(expandFocus(groups, undefined)).toBeUndefined();
  });

  it('grades everything without a focus', () => {
    const r = gradeGroups(groups, { 1: 'a', 2: 'x', 3: ['B', 'D'] });
    expect(r.score).toBe(3);
    expect(r.total).toBe(4);
    expect(r.types[3]).toBe('Multiple choice (two answers)');
  });

  it('only keeps the focused questions when re-doing mistakes', () => {
    const r = gradeGroups(groups, { 2: 'b', 3: ['B', 'A'] }, [2, 4]);
    expect(Object.keys(r.results).map(Number)).toEqual([2, 3, 4]);
    expect(r.score).toBe(2);
    expect(r.total).toBe(3);
  });
});

describe('shownAnswer', () => {
  it('lines up correct picks first for "choose TWO"', () => {
    const g = multi(21, ['B', 'D']);
    const answers = { 21: ['A', 'D'] };
    expect(shownAnswer(g, 21, answers)).toBe('D');
    expect(shownAnswer(g, 22, answers)).toBe('A');
  });
});
