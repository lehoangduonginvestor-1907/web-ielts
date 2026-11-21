import { describe, expect, it } from 'vitest';
import { extractJson, missingBands } from './gradeGuard';
import { gradeStatusMessage, readGradeResponse } from './gradeClient';
import { looksLikeGradeJson } from '@/components/GeminiGradeGuide';

const KEYS = ['task', 'cc', 'lr', 'gra'] as const;

describe('missingBands', () => {
  it('accepts whole and numeric-string bands from 0 to 9', () => {
    expect(missingBands({ task: { band: 6 }, cc: { band: '7' }, lr: { band: 0 }, gra: { band: 9 } }, KEYS)).toEqual([]);
  });

  it('flags missing, empty, non-numeric and out-of-range bands', () => {
    const a = { task: { band: 6 }, cc: {}, lr: { band: '' }, gra: { band: 12 } };
    expect(missingBands(a, KEYS)).toEqual(['cc', 'lr', 'gra']);
    expect(missingBands({ task: { band: 'six' } }, ['task'])).toEqual(['task']);
    expect(missingBands(undefined, KEYS)).toEqual([...KEYS]);
  });
});

describe('extractJson', () => {
  it('pulls the JSON out of a code fence and surrounding chatter', () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```\nGood luck!')).toBe('{"a":1}');
    expect(extractJson('<think>hmm</think>{"a":{"b":2}}')).toBe('{"a":{"b":2}}');
  });
});

describe('looksLikeGradeJson', () => {
  it('recognises a pasted grading result, and nothing else', () => {
    expect(looksLikeGradeJson('{\n  "assessment": { "task": { "band": 6 } }')).toBe(true);
    expect(looksLikeGradeJson('You are a senior, certified IELTS examiner…')).toBe(false);
  });
});

describe('readGradeResponse', () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('returns the feedback on success', async () => {
    const data = await readGradeResponse<{ feedback?: { band: number }; error?: string }>(json(200, { feedback: { band: 6 } }), 'x');
    expect(data.feedback.band).toBe(6);
  });

  it('prefers the app’s own error message', async () => {
    await expect(readGradeResponse(json(400, { error: 'Missing prompt or essay text.' }), 'x')).rejects.toThrow('Missing prompt');
  });

  it('explains platform errors that are not JSON', async () => {
    await expect(readGradeResponse(new Response('<html>502</html>', { status: 502 }), 'x')).rejects.toThrow(/server had a problem/);
    expect(gradeStatusMessage(401)).toMatch(/Sign in again/);
    expect(gradeStatusMessage(400)).toBeNull();
  });
});
