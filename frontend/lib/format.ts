/**
 * This tool shortens long numbers into a "human-friendly" format to save space.
 * For example, it turns "1500" into "1.5k" and "1,200,000" into "1.2M".
 * This makes it much easier to read large amounts of stock or money at a glance.
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
 * This tool formats any number into a Currency format (Defaulting to QAR).
 * It also uses the "Shortening" tool above for very large amounts of money.
 */
export function formatCurrency(amount: number | string, currency: string = 'QAR'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof value !== 'number' || isNaN(value)) return `${currency} 0`;

  // For smaller amounts, we show the full number with its currency symbol.
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
      return `${currency} ${value.toLocaleString()}`;
    }
  }

  // For very large amounts, we use the shortening tool (e.g., QAR 2.5M).
  const compactValue = formatCompactNumber(value);
  return `${currency} ${compactValue}`;
}
