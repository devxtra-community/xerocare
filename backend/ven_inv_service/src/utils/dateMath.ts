/**
 * Adds `months` calendar months to `date`, clamping the day-of-month to the
 * last valid day of the target month (e.g. Jan 31 + 1 month → Feb 28/29, not
 * an overflowed Mar 3). Used for FSMA monthly billing cycles, which must
 * stay pinned to the same day-of-month every cycle.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

/**
 * First FSMA billing date for a contract starting on `startDate`: one day
 * before the monthly anniversary of the start date, in the following month.
 * E.g. start 2026-07-23 → first billing date 2026-08-22.
 */
export function firstFsmaBillingDate(startDate: Date): Date {
  const anniversary = addMonthsClamped(startDate, 1);
  anniversary.setDate(anniversary.getDate() - 1);
  return anniversary;
}
