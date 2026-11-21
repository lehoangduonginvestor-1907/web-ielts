import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bandProblem, clearGradeCache, dedupeGrade, hashKey, missingBands } from './gradeGuard';
import { gradeStatusMessage, readGradeResponse } from './gradeClient';

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

  it('bandProblem describes what is missing', () => {
    expect(bandProblem({ task: { band: 5 } }, ['task', 'cc'])).toBe('missing band score for cc');
    expect(bandProblem({ task: { band: 5 } }, ['task'])).toBeNull();
  });
});

describe('dedupeGrade', () => {
  beforeEach(() => clearGradeCache());

  it('shares one model call between concurrent identical requests', async () => {
    let release!: (v: string) => void;
    const run = vi.fn(() => new Promise<string>(res => (release = res)));
    const a = dedupeGrade('k', run);
    const b = dedupeGrade('k', run);
    release('graded');
    expect(await a).toBe('graded');
    expect(await b).toBe('graded');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('reuses a finished result but never a failure', async () => {
    const ok = vi.fn(async () => 'graded');
    await dedupeGrade('ok', ok);
    await dedupeGrade('ok', ok);
    expect(ok).toHaveBeenCalledTimes(1);

    const bad = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce('second try');
    await expect(dedupeGrade('bad', bad)).rejects.toThrow('503');
    expect(await dedupeGrade('bad', bad)).toBe('second try');
    expect(bad).toHaveBeenCalledTimes(2);
  });

  it('forgets results after 30 minutes', async () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn(async () => 'graded');
      await dedupeGrade('old', run);
      vi.advanceTimersByTime(31 * 60_000);
      await dedupeGrade('old', run);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hashKey separates its parts', () => {
    expect(hashKey('ab', 'c')).not.toBe(hashKey('a', 'bc'));
    expect(hashKey('x', new Uint8Array([1, 2]))).toBe(hashKey('x', new Uint8Array([1, 2])));
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

  it('explains platform errors that are not JSON (timeout, too large)', async () => {
    await expect(readGradeResponse(new Response('<html>504</html>', { status: 504 }), 'x')).rejects.toThrow('took too long');
    await expect(readGradeResponse(new Response('Request Entity Too Large', { status: 413 }), 'x')).rejects.toThrow('too large');
    expect(gradeStatusMessage(401)).toMatch(/Sign in again/);
    expect(gradeStatusMessage(400)).toBeNull();
  });
});
