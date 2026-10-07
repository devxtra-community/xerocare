export interface QuotationSlabRange {
  from: number;
  to: number;
  rate: number;
}

/** Keep absent nullable pricing rates absent while preserving configured values. */
export const normalizeCopiedRate = (rate: number | null | undefined): string | undefined =>
  rate == null ? undefined : String(rate);

/** Omit empty ranges from copied quotation payloads; preserve configured slabs. */
export const normalizeCopiedSlabRanges = (
  ranges?: QuotationSlabRange[] | null,
): QuotationSlabRange[] | undefined => {
  if (!ranges?.length) return undefined;

  return ranges.map(({ from, to, rate }) => ({ from, to, rate }));
};
