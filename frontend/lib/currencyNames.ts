import { getActiveCurrency } from './currency';

/**
 * Full display name (plural, major unit) for every currency this business's
 * branches actually use. Single canonical source — quotation/invoice documents
 * must resolve the currency name from here (keyed by the same currency_code
 * driving the amount figures), never hardcode a currency name string.
 */
export const CURRENCY_FULL_NAMES: Record<string, string> = {
  QAR: 'Qatari Riyals',
  AED: 'UAE Dirhams',
  INR: 'Indian Rupees',
  PKR: 'Pakistani Rupees',
  SAR: 'Saudi Riyals',
  USD: 'US Dollars',
  EUR: 'Euros',
  GBP: 'British Pounds',
};

/** Minor/subunit name (plural) used in "amount in words" text, e.g. "X Riyals and Y Dirhams". */
export const CURRENCY_MINOR_UNIT_NAMES: Record<string, string> = {
  QAR: 'Dirhams',
  AED: 'Fils',
  INR: 'Paise',
  PKR: 'Paisa',
  SAR: 'Halalas',
  USD: 'Cents',
  EUR: 'Cents',
  GBP: 'Pence',
};

/** Resolves the full currency name for a code; falls back to the active branch currency, then the code itself. */
export function getCurrencyFullName(code?: string): string {
  const resolved = (code || getActiveCurrency()).toUpperCase();
  return CURRENCY_FULL_NAMES[resolved] || resolved;
}

/** Resolves the minor-unit name for a code; falls back to the active branch currency, then 'Cents'. */
export function getCurrencyMinorUnitName(code?: string): string {
  const resolved = (code || getActiveCurrency()).toUpperCase();
  return CURRENCY_MINOR_UNIT_NAMES[resolved] || 'Cents';
}
