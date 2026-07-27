import { getCountryDataList } from 'countries-list';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';

export const ALL_COUNTRIES = getCountryDataList();

export const isoToFlag = (iso2: string) =>
  iso2.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));

export const COUNTRY_OPTIONS: SearchableSelectOption[] = [...ALL_COUNTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => ({
    value: c.iso2,
    label: `${isoToFlag(c.iso2)} ${c.name} (${c.iso2})`,
  }));

export interface CountryPhoneOption extends SearchableSelectOption {
  dialCode: string;
}

/**
 * Countries that have an international dialling code, for phone-number entry.
 * The code sits in `description` as well as `dialCode` so the searchable select
 * matches on it — typing "971", "AE" or "Emirates" all find the same row.
 */
export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [...ALL_COUNTRIES]
  .filter((c) => c.phone.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => ({
    value: c.iso2,
    label: `${isoToFlag(c.iso2)} ${c.name}`,
    description: `+${c.phone[0]}`,
    dialCode: `+${c.phone[0]}`,
  }));

export const dialCodeFor = (iso2: string | null | undefined): string =>
  COUNTRY_PHONE_OPTIONS.find((c) => c.value === iso2)?.dialCode ?? '';

// Longest match first: +1 must not win over +1242 for a Bahamian number.
const DIAL_CODES_BY_LENGTH = [...new Set(COUNTRY_PHONE_OPTIONS.map((c) => c.dialCode))].sort(
  (a, b) => b.length - a.length,
);

/** The dialling code a number already starts with, or '' when it has none. */
export const dialCodeFromPhone = (phone: string): string => {
  const compact = (phone ?? '').replace(/[\s()-]/g, '');
  return DIAL_CODES_BY_LENGTH.find((code) => compact.startsWith(code)) ?? '';
};

/**
 * Best-guess country for an existing number, used to preselect the picker when
 * editing a lead. Shared codes (+1 spans the whole NANP) resolve to the first
 * country alphabetically — unavoidable without storing the country itself,
 * which is why new leads persist it in `metadata.country`.
 */
export const countryFromPhone = (phone: string): string => {
  const code = dialCodeFromPhone(phone);
  return code ? (COUNTRY_PHONE_OPTIONS.find((c) => c.dialCode === code)?.value ?? '') : '';
};

/**
 * Re-prefixes a number with `dialCode`, replacing whatever code it carried
 * before so switching country twice does not stack codes.
 */
export const applyDialCode = (phone: string, dialCode: string): string => {
  const trimmed = (phone ?? '').trim();
  const existing = dialCodeFromPhone(trimmed);

  let rest = trimmed;
  if (existing) {
    // Strip the code from the raw string, which may hold spaces the compact
    // form used for matching does not (e.g. "+971 50 …" vs "+97150…").
    let seen = 0;
    let cut = 0;
    while (cut < trimmed.length && seen < existing.length) {
      if (!/[\s()-]/.test(trimmed[cut])) seen++;
      cut++;
    }
    rest = trimmed.slice(cut);
  } else if (rest.startsWith('+')) {
    rest = rest.slice(1);
  }

  rest = rest.trim();
  return rest ? `${dialCode} ${rest}` : `${dialCode} `;
};
