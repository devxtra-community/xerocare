import { formatDistanceToNow } from 'date-fns';
import { getActiveCurrency } from './currency';

/**
 * Preview text for the auto-generated payment Reference Number, matching the exact
 * <MODE>-<YYYYMMDD>-<seq> format billing_service's generatePaymentReference produces
 * server-side (see billingHelpers.ts) — Cash/Bank Transfer/Credit Card only. Cheque
 * carries its own Cheque Number instead and isn't covered by this at all. The real
 * value (including the sequence number) is only known once the collection actually
 * saves — this is a "here's what it'll look like" hint for the collecting form, not a
 * live-reserved value.
 */
const REFERENCE_MODE_PREFIX: Record<string, string> = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK',
  CREDIT_CARD: 'CARD',
  ONLINE_PAYMENT: 'ONLINE',
};

export function autoReferencePreview(paymentMode: string | undefined): string | null {
  // Normalized so this works for both billing_service's UPPER_SNAKE mode values
  // (e.g. "BANK_TRANSFER") and Title-Case labels with spaces some forms use instead
  // (e.g. "Bank Transfer") — a no-op for strings that are already underscored.
  const normalized = (paymentMode || '').trim().toUpperCase().replace(/\s+/g, '_');
  const prefix = REFERENCE_MODE_PREFIX[normalized];
  if (!prefix) return null;
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${prefix}-${dateStr}-XXX`;
}

/**
 * Gulf ERP standard: "AED 1,000.00"
 * Always currency code + single space + comma-separated amount with 2 decimal places.
 * Never compact notation for monetary amounts.
 * When no currencyCode is passed, the logged-in user's branch currency is used.
 */
export function formatCurrency(amount: number | string, currencyCode?: string): string {
  currencyCode = currencyCode || getActiveCurrency();
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

/**
 * Relative time for notification feeds ("3 hours ago").
 * Missing or unparseable timestamps fall back to a label instead of "Invalid Date".
 */
export function formatNotificationTime(value?: string | null): string {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime())
    ? formatDistanceToNow(date, { addSuffix: true })
    : 'Unknown date';
}
