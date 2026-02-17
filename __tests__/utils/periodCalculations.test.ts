/**
 * Period Calculation Utilities — Comprehensive Test Suite
 * Tests budget period calculations with various start days, edge cases,
 * month boundaries, and year transitions.
 */
import {
  getCurrentPeriod,
  getPreviousPeriod,
  getNextPeriod,
  getPeriodHistory,
  isDateInPeriod,
  formatPeriod,
  getPeriodLabel,
  getDaysRemainingInPeriod,
  getPeriodProgress,
  getPeriodForDate,
  needsPeriodTransition,
  PeriodRange,
} from '../../lib/utils/periodCalculations';

// ============================================================
// getCurrentPeriod
// ============================================================
describe('getCurrentPeriod', () => {
  describe('with default start day (1st)', () => {
    it('returns a period starting on the 1st when date is mid-month', () => {
      const ref = new Date(2025, 5, 15); // June 15, 2025
      const period = getCurrentPeriod(1, ref);
      const start = new Date(period.start);
      const end = new Date(period.end);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5); // June
      // End should be June 30 (or the last ms before July 1)
      expect(end.getMonth()).toBe(5);
    });

    it('returns correct period on the 1st of the month', () => {
      const ref = new Date(2025, 5, 1); // June 1
      const period = getCurrentPeriod(1, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5);
    });
  });

  describe('with custom start day (15th)', () => {
    it('when date >= 15, period starts on 15th of current month', () => {
      const ref = new Date(2025, 5, 20); // June 20
      const period = getCurrentPeriod(15, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(15);
      expect(start.getMonth()).toBe(5);
    });

    it('when date < 15, period starts on 15th of previous month', () => {
      const ref = new Date(2025, 5, 10); // June 10
      const period = getCurrentPeriod(15, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(15);
      expect(start.getMonth()).toBe(4); // May 15
    });

    it('when date = 15, period starts on 15th of current month', () => {
      const ref = new Date(2025, 5, 15); // June 15
      const period = getCurrentPeriod(15, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(15);
      expect(start.getMonth()).toBe(5);
    });
  });

  describe('start day clamping', () => {
    it('clamps start day to 1 if given 0', () => {
      const ref = new Date(2025, 5, 15);
      const period = getCurrentPeriod(0, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(1);
    });

    it('clamps start day to 28 if given 31', () => {
      const ref = new Date(2025, 5, 29);
      const period = getCurrentPeriod(31, ref);
      const start = new Date(period.start);
      expect(start.getDate()).toBe(28);
    });
  });

  describe('year transitions', () => {
    it('handles December with start day 1', () => {
      const ref = new Date(2025, 11, 15); // Dec 15
      const period = getCurrentPeriod(1, ref);
      const start = new Date(period.start);
      expect(start.getMonth()).toBe(11);
      expect(start.getFullYear()).toBe(2025);
    });

    it('handles January 5 with start day 15 — goes to previous year Dec 15', () => {
      const ref = new Date(2025, 0, 5); // Jan 5
      const period = getCurrentPeriod(15, ref);
      const start = new Date(period.start);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getFullYear()).toBe(2024);
    });
  });

  it('period end is always before the next period start', () => {
    const ref = new Date(2025, 5, 15);
    const period = getCurrentPeriod(1, ref);
    expect(period.end).toBeGreaterThan(period.start);
    // End should be 1ms before next period's start
    const nextStart = new Date(2025, 6, 1, 0, 0, 0, 0).getTime();
    expect(period.end).toBe(nextStart - 1);
  });
});

// ============================================================
// getPreviousPeriod
// ============================================================
describe('getPreviousPeriod', () => {
  it('returns the period before the current one', () => {
    const ref = new Date(2025, 5, 15); // June 15
    const prev = getPreviousPeriod(1, ref);
    const start = new Date(prev.start);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
  });

  it('handles year boundary (Jan → Dec)', () => {
    const ref = new Date(2025, 0, 15); // Jan 15
    const prev = getPreviousPeriod(1, ref);
    const start = new Date(prev.start);
    expect(start.getMonth()).toBe(11); // December
    expect(start.getFullYear()).toBe(2024);
  });

  it('previous period end is just before current period start', () => {
    const ref = new Date(2025, 5, 15);
    const current = getCurrentPeriod(1, ref);
    const prev = getPreviousPeriod(1, ref);
    expect(prev.end).toBe(current.start - 1);
  });
});

// ============================================================
// getNextPeriod
// ============================================================
describe('getNextPeriod', () => {
  it('returns the period after the current one', () => {
    const ref = new Date(2025, 5, 15); // June 15
    const next = getNextPeriod(1, ref);
    const start = new Date(next.start);
    expect(start.getMonth()).toBe(6); // July
    expect(start.getDate()).toBe(1);
  });

  it('handles year boundary (Dec → Jan)', () => {
    const ref = new Date(2025, 11, 15); // Dec 15
    const next = getNextPeriod(1, ref);
    const start = new Date(next.start);
    expect(start.getMonth()).toBe(0); // January
    expect(start.getFullYear()).toBe(2026);
  });
});

// ============================================================
// getPeriodHistory
// ============================================================
describe('getPeriodHistory', () => {
  it('returns requested number of periods', () => {
    const ref = new Date(2025, 5, 15);
    const history = getPeriodHistory(1, 5, ref);
    expect(history).toHaveLength(5);
  });

  it('returns periods in chronological order (oldest first)', () => {
    const ref = new Date(2025, 5, 15);
    const history = getPeriodHistory(1, 3, ref);
    for (let i = 1; i < history.length; i++) {
      expect(history[i].start).toBeGreaterThan(history[i - 1].start);
    }
  });

  it('includes the current period as the last entry', () => {
    const ref = new Date(2025, 5, 15);
    const current = getCurrentPeriod(1, ref);
    const history = getPeriodHistory(1, 3, ref);
    expect(history[history.length - 1].start).toBe(current.start);
  });

  it('default count is 3', () => {
    const ref = new Date(2025, 5, 15);
    const history = getPeriodHistory(1, 3, ref);
    expect(history).toHaveLength(3);
  });
});

// ============================================================
// isDateInPeriod
// ============================================================
describe('isDateInPeriod', () => {
  const period: PeriodRange = {
    start: new Date(2025, 5, 1).getTime(),
    end: new Date(2025, 6, 1).getTime() - 1,
  };

  it('returns true for a date within the period', () => {
    const mid = new Date(2025, 5, 15).getTime();
    expect(isDateInPeriod(mid, period)).toBe(true);
  });

  it('returns true for the period start', () => {
    expect(isDateInPeriod(period.start, period)).toBe(true);
  });

  it('returns true for the period end', () => {
    expect(isDateInPeriod(period.end, period)).toBe(true);
  });

  it('returns false for a date before the period', () => {
    const before = new Date(2025, 4, 31).getTime();
    expect(isDateInPeriod(before, period)).toBe(false);
  });

  it('returns false for a date after the period', () => {
    const after = new Date(2025, 6, 1).getTime();
    expect(isDateInPeriod(after, period)).toBe(false);
  });
});

// ============================================================
// formatPeriod
// ============================================================
describe('formatPeriod', () => {
  it('formats a same-month period', () => {
    const period = getCurrentPeriod(1, new Date(2025, 5, 15));
    const formatted = formatPeriod(period);
    expect(formatted).toContain('Jun');
    expect(formatted).toContain('2025');
  });

  it('formats a cross-month period', () => {
    const period = getCurrentPeriod(15, new Date(2025, 5, 10)); // May 15 - Jun 14
    const formatted = formatPeriod(period);
    expect(formatted).toContain('May');
    expect(formatted).toContain('Jun');
  });
});

// ============================================================
// getPeriodLabel
// ============================================================
describe('getPeriodLabel', () => {
  it('returns "Current Period" for the current period', () => {
    const current = getCurrentPeriod(1);
    expect(getPeriodLabel(current, 1)).toBe('Current Period');
  });

  it('returns "Last Period" for the previous period', () => {
    const prev = getPreviousPeriod(1);
    expect(getPeriodLabel(prev, 1)).toBe('Last Period');
  });

  it('returns formatted date for older periods', () => {
    const old: PeriodRange = {
      start: new Date(2024, 0, 1).getTime(),
      end: new Date(2024, 1, 1).getTime() - 1,
    };
    const label = getPeriodLabel(old, 1);
    expect(label).toContain('Jan');
    expect(label).toContain('2024');
  });
});

// ============================================================
// getDaysRemainingInPeriod
// ============================================================
describe('getDaysRemainingInPeriod', () => {
  it('returns positive days when mid-period', () => {
    const ref = new Date(2025, 5, 15); // June 15
    const days = getDaysRemainingInPeriod(1, ref);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('returns ~30 days at the start of a period', () => {
    const ref = new Date(2025, 5, 1); // June 1
    const days = getDaysRemainingInPeriod(1, ref);
    expect(days).toBeGreaterThanOrEqual(28);
    expect(days).toBeLessThanOrEqual(31);
  });
});

// ============================================================
// getPeriodProgress
// ============================================================
describe('getPeriodProgress', () => {
  it('returns 0-100 range', () => {
    const ref = new Date(2025, 5, 15);
    const progress = getPeriodProgress(1, ref);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('is approximately 50% at mid-month for start day 1', () => {
    const ref = new Date(2025, 5, 15);
    const progress = getPeriodProgress(1, ref);
    expect(progress).toBeGreaterThan(30);
    expect(progress).toBeLessThan(70);
  });

  it('is close to 0% at the start of period', () => {
    const ref = new Date(2025, 5, 1, 0, 0, 1);
    const progress = getPeriodProgress(1, ref);
    expect(progress).toBeLessThan(5);
  });
});

// ============================================================
// getPeriodForDate
// ============================================================
describe('getPeriodForDate', () => {
  it('returns the correct period for a given timestamp', () => {
    const date = new Date(2025, 5, 15).getTime();
    const period = getPeriodForDate(date, 1);
    const start = new Date(period.start);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(1);
  });

  it('works with custom start day', () => {
    const date = new Date(2025, 5, 10).getTime();
    const period = getPeriodForDate(date, 15);
    const start = new Date(period.start);
    expect(start.getDate()).toBe(15);
    expect(start.getMonth()).toBe(4); // May 15
  });
});

// ============================================================
// needsPeriodTransition
// ============================================================
describe('needsPeriodTransition', () => {
  it('returns false when lastPeriodEnd is 0 (brand new budget)', () => {
    expect(needsPeriodTransition(0)).toBe(false);
  });

  it('returns true when lastPeriodEnd is in the past', () => {
    const pastEnd = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago
    expect(needsPeriodTransition(pastEnd)).toBe(true);
  });

  it('returns false when lastPeriodEnd is in the future', () => {
    const futureEnd = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days from now
    expect(needsPeriodTransition(futureEnd)).toBe(false);
  });
});
