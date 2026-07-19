import { countries } from 'countries-list';

/**
 * Shared ISO 4217 currency list for any "what currency is this amount/account in"
 * selector — not scoped to a single foreign currency, since a customer or vendor may
 * hold/pay in any currency regardless of the branch's local one.
 */
export interface CurrencyOption {
  code: string;
  name: string;
}

export const CURRENCY_LIST: CurrencyOption[] = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' },
];

export function currencyOptions(): { value: string; label: string }[] {
  return CURRENCY_LIST.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
}

/**
 * Currency a bank account should default to based on the bank's own country —
 * e.g. selecting an Indian bank defaults to INR even if the customer's own
 * residence country is Saudi Arabia. Sourced from countries-list (already a
 * project dependency for the Country/State/City selectors), which covers
 * every country, not just the ones with curated bank-name data. Always
 * overridable by the user — this is only a default.
 */
export function getDefaultCurrencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const entry = countries[countryCode.toUpperCase() as keyof typeof countries] as
    | { currency?: string[] }
    | undefined;
  return entry?.currency?.[0] ?? '';
}
