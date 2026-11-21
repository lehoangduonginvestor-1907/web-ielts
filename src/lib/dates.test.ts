import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, dow, fmtClock, fmtDuration } from './dates';

describe('dayKey', () => {
  it('formats local dates with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 10, 21, 23, 59).getTime())).toBe('2026-11-21');
  });
});

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('round-trips with daysBetween', () => {
    expect(daysBetween('2026-11-21', addDays('2026-11-21', 45))).toBe(45);
    expect(daysBetween('2026-11-21', addDays('2026-11-21', -400))).toBe(-400);
  });
});

describe('daysBetween', () => {
  it('counts whole days regardless of order', () => {
    expect(daysBetween('2026-11-01', '2026-11-21')).toBe(20);
    expect(daysBetween('2026-11-21', '2026-11-01')).toBe(-20);
    expect(daysBetween('2026-11-21', '2026-11-21')).toBe(0);
  });
});

describe('dow', () => {
  it('returns the weekday of a day key (0 = Sunday)', () => {
    expect(dow('2026-11-21')).toBe(6); // Saturday
    expect(dow('2026-11-22')).toBe(0);
  });
});

describe('formatters', () => {
  it('fmtClock pads seconds and clamps negatives', () => {
    expect(fmtClock(0)).toBe('0:00');
    expect(fmtClock(65.9)).toBe('1:05');
    expect(fmtClock(-3)).toBe('0:00');
  });

  it('fmtDuration rounds to minutes and switches to hours', () => {
    expect(fmtDuration(29)).toBe('0 min');
    expect(fmtDuration(90)).toBe('2 min');
    expect(fmtDuration(3600)).toBe('1h');
    expect(fmtDuration(3600 + 25 * 60)).toBe('1h 25m');
  });
});
