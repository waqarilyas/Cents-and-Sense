/**
 * Period Calculation Utilities
 * Handles custom budget period calculations similar to YNAB
 */

export interface PeriodRange {
  start: number;
  end: number;
}

/**
 * Get the current budget period based on custom start day
 * @param startDay - Day of month when period starts (1-28)
 * @param referenceDate - Date to calculate period for (defaults to now)
 */
export function getCurrentPeriod(
  startDay: number = 1,
  referenceDate: Date = new Date(),
): PeriodRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let periodStart: Date;
  let periodEnd: Date;

  if (day >= startDay) {
    // We're in the current month's period
    periodStart = new Date(year, month, startDay, 0, 0, 0, 0);
    periodEnd = new Date(year, month + 1, startDay - 1, 23, 59, 59, 999);
  } else {
    // We're still in the previous month's period
    periodStart = new Date(year, month - 1, startDay, 0, 0, 0, 0);
    periodEnd = new Date(year, month, startDay - 1, 23, 59, 59, 999);
  }

  return {
    start: periodStart.getTime(),
    end: periodEnd.getTime(),
  };
}

/**
 * Get the previous budget period
 */
export function getPreviousPeriod(
  startDay: number = 1,
  referenceDate: Date = new Date(),
): PeriodRange {
  const current = getCurrentPeriod(startDay, referenceDate);
  const currentStart = new Date(current.start);

  // Go back one day to get into previous period
  const previousDate = new Date(currentStart);
  previousDate.setDate(previousDate.getDate() - 1);

  return getCurrentPeriod(startDay, previousDate);
}

/**
 * Get the next budget period
 */
export function getNextPeriod(
  startDay: number = 1,
  referenceDate: Date = new Date(),
): PeriodRange {
  const current = getCurrentPeriod(startDay, referenceDate);
  const currentEnd = new Date(current.end);

  // Go forward one day to get into next period
  const nextDate = new Date(currentEnd);
  nextDate.setDate(nextDate.getDate() + 1);

  return getCurrentPeriod(startDay, nextDate);
}

/**
 * Get N periods back from current
 */
export function getPeriodHistory(
  startDay: number = 1,
  count: number = 3,
  referenceDate: Date = new Date(),
): PeriodRange[] {
  const periods: PeriodRange[] = [];
  let currentDate = new Date(referenceDate);

  for (let i = 0; i < count; i++) {
    const period = getCurrentPeriod(startDay, currentDate);
    periods.push(period);

    // Go back one period
    const periodStart = new Date(period.start);
    currentDate = new Date(periodStart);
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return periods.reverse(); // Oldest first
}

/**
 * Check if a date falls within a period
 */
export function isDateInPeriod(date: number, period: PeriodRange): boolean {
  return date >= period.start && date <= period.end;
}

/**
 * Format period for display
 */
export function formatPeriod(period: PeriodRange): string {
  const start = new Date(period.start);
  const end = new Date(period.end);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

/**
 * Get period label (e.g., "Current Period", "Last Period")
 */
export function getPeriodLabel(
  period: PeriodRange,
  startDay: number = 1,
): string {
  const current = getCurrentPeriod(startDay);
  const previous = getPreviousPeriod(startDay);

  if (period.start === current.start && period.end === current.end) {
    return "Current Period";
  } else if (period.start === previous.start && period.end === previous.end) {
    return "Last Period";
  } else {
    return formatPeriod(period);
  }
}

/**
 * Calculate days remaining in current period
 */
export function getDaysRemainingInPeriod(
  startDay: number = 1,
  referenceDate: Date = new Date(),
): number {
  const period = getCurrentPeriod(startDay, referenceDate);
  const now = referenceDate.getTime();
  const msRemaining = period.end - now;
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
}

/**
 * Calculate percentage through period
 */
export function getPeriodProgress(
  startDay: number = 1,
  referenceDate: Date = new Date(),
): number {
  const period = getCurrentPeriod(startDay, referenceDate);
  const now = referenceDate.getTime();
  const totalDuration = period.end - period.start;
  const elapsed = now - period.start;
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
}

/**
 * Get period for a specific transaction date
 */
export function getPeriodForDate(
  date: number,
  startDay: number = 1,
): PeriodRange {
  return getCurrentPeriod(startDay, new Date(date));
}

/**
 * Check if period transition is needed (for snapshot creation)
 * Returns false if lastPeriodEnd is 0 (brand new budget, never had a period end)
 */
export function needsPeriodTransition(
  lastPeriodEnd: number,
  startDay: number = 1,
): boolean {
  if (lastPeriodEnd === 0) return false;
  const now = Date.now();
  return now > lastPeriodEnd;
}
