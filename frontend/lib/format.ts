/**
 * Formats a number into a compact string representation (e.g., 1.5k, 1.2M).
 * @param num The number to format.
 * @returns The formatted string.
 */
export function formatCompactNumber(num: number): string {
  if (num === undefined || num === null) return '0';

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absNum >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absNum >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString('en-US'); // Regular formatting for < 1000
}

/**
 * Formats a number as a currency string with QAR symbol.
 * Uses compact formatting for large numbers.
 * @param amount The amount to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number): string {
  return `QAR ${formatCompactNumber(amount)}`;
}
