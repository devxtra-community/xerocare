'use client';

import React, { useMemo } from 'react';
import { State, City } from 'country-state-city';
import { getCountryDataList } from 'countries-list';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Real cascading Country → State/Emirate → City filter, backed by the same
 * `country-state-city` dataset used for customer/vendor data entry
 * (CustomerFormDialog). Selecting a value here yields the exact string stored on
 * invoices/purchases (ISO2 country code, state name, city name), so the backend's
 * exact-match filter actually hits — no more free-typed, case-sensitive guessing.
 */

const ALL_COUNTRIES = getCountryDataList();

const isoToFlag = (iso2: string) =>
  iso2.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));

const COUNTRY_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'All Countries' },
  ...[...ALL_COUNTRIES]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      value: c.iso2,
      label: `${isoToFlag(c.iso2)} ${c.name} (${c.iso2})`,
    })),
];

function stateLabelFor(iso2?: string): string {
  if (!iso2) return 'State / Emirate';
  if (iso2 === 'AE') return 'Emirate';
  if (['US', 'IN', 'AU', 'MX', 'BR'].includes(iso2)) return 'State';
  if (iso2 === 'CA') return 'Province';
  return 'Region / Province';
}

export interface TaxLocationFilterValue {
  country?: string;
  stateProvince?: string;
  city?: string;
}

export function TaxLocationFilter({
  value,
  onChange,
}: {
  value: TaxLocationFilterValue;
  onChange: (delta: Partial<TaxLocationFilterValue>) => void;
}) {
  const country = value.country;
  const stateLabel = stateLabelFor(country);
  // Memoized, and never fetching a whole-country city list when the country
  // has states to narrow by first — `country-state-city` returns tens of
  // thousands of rows for large federal countries (India ~57k, US ~26k).
  // Unmemoized + an O(n²) dedup over that list (as this used to be) froze
  // the tab on every re-render once such a country was selected.
  const states = useMemo(() => (country ? State.getStatesOfCountry(country) : []), [country]);
  const selectedState = useMemo(
    () => states.find((s) => s.name === value.stateProvince),
    [states, value.stateProvince],
  );
  const cities = useMemo(() => {
    if (!country) return [];
    if (selectedState) return City.getCitiesOfState(country, selectedState.isoCode) ?? [];
    if (states.length > 0) return [];
    return City.getCitiesOfCountry(country) ?? [];
  }, [country, selectedState, states.length]);
  const uniqueCities = useMemo(() => {
    const seen = new Set<string>();
    return cities.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  }, [cities]);

  return (
    <>
      <SearchableSelect
        options={COUNTRY_OPTIONS}
        value={country ?? ''}
        onValueChange={(val) =>
          onChange({ country: val || undefined, stateProvince: undefined, city: undefined })
        }
        placeholder="All Countries"
        emptyText="No country found."
        className="w-48 h-10"
      />
      {country && (
        <Select
          value={value.stateProvince ?? 'ALL'}
          onValueChange={(val) =>
            onChange({ stateProvince: val === 'ALL' ? undefined : val, city: undefined })
          }
        >
          <SelectTrigger className="w-40 h-10 bg-white shadow-sm">
            <SelectValue placeholder={`All ${stateLabel}s`} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="ALL">All {stateLabel}s</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.isoCode} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {country && (
        <Select
          value={value.city ?? 'ALL'}
          onValueChange={(val) => onChange({ city: val === 'ALL' ? undefined : val })}
        >
          <SelectTrigger className="w-40 h-10 bg-white shadow-sm">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="ALL">All Cities</SelectItem>
            {uniqueCities.map((c, idx) => (
              <SelectItem key={`${c.stateCode ?? ''}-${c.name}-${idx}`} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}
