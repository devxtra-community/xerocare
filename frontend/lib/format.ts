/**
 * Formats a number into a compact string representation (e.g., 1.5k, 1.2M).
 * Uses Intl.NumberFormat for robust, localized formatting.
 */
export function formatCompactNumber(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (typeof value !== 'number' || isNaN(value)) return '0';

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formats a number as a currency string with QAR symbol.
 * Uses compact formatting for large numbers.
 */
export function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof value !== 'number' || isNaN(value)) return 'QAR 0';

  // For small numbers, show regular currency format
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
    })
      .format(value)
      .replace('QAR', 'QAR ');
  }

  // For large numbers, use compact notation
  const compactValue = formatCompactNumber(value);
  return `QAR ${compactValue}`;
}
