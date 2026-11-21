import { describe, expect, it } from 'vitest';
import { bandFor, fmtBand, rawFor } from './band';
import type { Skill } from './types';

describe('bandFor', () => {
  it('maps Listening raw scores at the table boundaries', () => {
    expect(bandFor('listening', 40)).toBe(9);
    expect(bandFor('listening', 30)).toBe(7);
    expect(bandFor('listening', 29)).toBe(6.5);
    expect(bandFor('listening', 23)).toBe(6);
    expect(bandFor('listening', 22)).toBe(5.5);
  });

  it('uses the stricter Reading table', () => {
    expect(bandFor('listening', 32)).toBe(7.5);
    expect(bandFor('reading', 32)).toBe(7);
    expect(bandFor('reading', 33)).toBe(7.5);
    expect(bandFor('reading', 27)).toBe(6.5);
    expect(bandFor('reading', 26)).toBe(6);
  });

  it('gives 2 for any non-zero score below the table and 0 for nothing', () => {
    expect(bandFor('reading', 3)).toBe(2);
    expect(bandFor('reading', 1)).toBe(2);
    expect(bandFor('reading', 0)).toBe(0);
  });
});

describe('rawFor', () => {
  it('returns the minimum raw score for a target band', () => {
    expect(rawFor('listening', 7)).toBe(30);
    expect(rawFor('reading', 6.5)).toBe(27);
    expect(rawFor('reading', 9)).toBe(39);
  });

  it('is exactly the threshold: one less drops below the band', () => {
    for (const skill of ['listening', 'reading'] as Skill[]) {
      for (let b = 2.5; b <= 9; b += 0.5) {
        const raw = rawFor(skill, b);
        expect(bandFor(skill, raw)).toBeGreaterThanOrEqual(b);
        expect(bandFor(skill, raw - 1)).toBeLessThan(b);
      }
    }
  });

  it('asks for a perfect score when the band is out of reach', () => {
    expect(rawFor('listening', 9.5)).toBe(40);
  });
});

describe('fmtBand', () => {
  it('always shows one decimal', () => {
    expect(fmtBand(6)).toBe('6.0');
    expect(fmtBand(6.5)).toBe('6.5');
  });
});
