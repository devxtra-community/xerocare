export interface QuotationSlabRange {
  from: number;
  to: number;
  rate: number;
}

/** Omit empty ranges from copied quotation payloads; preserve configured slabs. */
export const normalizeCopiedSlabRanges = (
  ranges?: QuotationSlabRange[] | null,
): QuotationSlabRange[] | undefined => {
  if (!ranges?.length) return undefined;

  return ranges.map(({ from, to, rate }) => ({ from, to, rate }));
};
