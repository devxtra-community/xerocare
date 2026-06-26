/**
 * Gulf ERP standard: "AED 1,000.00"
 * Always currency code + single space + comma-separated amount with 2 decimal places.
 * Never compact notation for monetary amounts.
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'AED'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof value !== 'number' || isNaN(value)) return `${currencyCode} 0.00`;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${currencyCode} ${formatted}`;
}

/**
 * Compact number display for non-monetary contexts (e.g. count badges).
 */
export function formatCompactNumber(num: number | string): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (typeof value !== 'number' || isNaN(value)) return '0';

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
