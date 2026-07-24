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
