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
export function formatCurrency(amount: number | string, currency: string = 'QAR'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof value !== 'number' || isNaN(value)) return `${currency} 0`;

  // For small numbers, show regular currency format
  if (Math.abs(value) < 1000) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
      })
        .format(value)
        .replace(currency, `${currency} `);
    } catch {
      // Fallback if currency code is invalid or not supported
      return `${currency} ${value.toLocaleString()}`;
    }
  }

  // For large numbers, use compact notation
  const compactValue = formatCompactNumber(value);
  return `${currency} ${compactValue}`;
}
