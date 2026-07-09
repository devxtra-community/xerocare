/**
 * Business timezone helpers.
 * All accounting date fields must use the business timezone — never raw UTC — so
 * an early-morning transaction (past midnight UTC but still "today" locally) lands
 * on the correct local calendar day.
 */

const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE ?? 'Asia/Qatar';

/**
 * Returns today's date string (YYYY-MM-DD) in the business timezone.
 */
export function todayInBusinessTz(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: BUSINESS_TZ });
}

/**
 * Converts any Date or ISO string to a YYYY-MM-DD date string in the business timezone.
 * Use this whenever deriving a calendar date from a UTC timestamp for cashbook/daybook/
 * period-range purposes.
 */
export function toBusinessDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-CA', { timeZone: BUSINESS_TZ });
}

/**
 * Returns { year, month0 } (month0 is 0-indexed like Date.getMonth()) for the
 * current moment in the business timezone. Use instead of new Date() for
 * period-boundary calculations.
 */
export function nowInBusinessTz(): { year: number; month0: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  return { year: parts[0], month0: parts[1] - 1, day: parts[2] };
}
