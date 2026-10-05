import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCopiedSlabRanges } from '../lib/quotationCopy';

test('omits absent slabs from a copied FIXED_LIMIT RENT payload', () => {
  assert.equal(normalizeCopiedSlabRanges(), undefined);
  assert.equal(normalizeCopiedSlabRanges(null), undefined);
  assert.equal(normalizeCopiedSlabRanges([]), undefined);

  const payload = JSON.parse(
    JSON.stringify({
      saleType: 'RENT',
      rentType: 'FIXED_LIMIT',
      monthlyRent: 500,
      items: [
        {
          bwSlabRanges: normalizeCopiedSlabRanges([]),
          colorSlabRanges: normalizeCopiedSlabRanges(null),
          comboSlabRanges: normalizeCopiedSlabRanges(undefined),
        },
      ],
      pricingItems: [
        {
          bwSlabRanges: normalizeCopiedSlabRanges([]),
          colorSlabRanges: normalizeCopiedSlabRanges(null),
          comboSlabRanges: normalizeCopiedSlabRanges(undefined),
        },
      ],
    }),
  ) as {
    saleType: string;
    rentType: string;
    monthlyRent: number;
    items: Array<Record<string, unknown>>;
    pricingItems: Array<Record<string, unknown>>;
  };
  assert.deepEqual(payload, {
    saleType: 'RENT',
    rentType: 'FIXED_LIMIT',
    monthlyRent: 500,
    items: [{}],
    pricingItems: [{}],
  });
});

test('preserves configured slab ranges when copying slab-priced quotations', () => {
  const slabs = [
    { from: 0, to: 1000, rate: 0.1 },
    { from: 1001, to: 5000, rate: 0.08 },
  ];

  assert.deepEqual(normalizeCopiedSlabRanges(slabs), slabs);
});

test('keeps the fixed-limit pricing fields while omitting absent slabs', () => {
  const fixedLimitPricingItem = {
    saleType: 'RENT',
    rentType: 'FIXED_LIMIT',
    monthlyRent: 500,
    description: 'Machine',
    bwIncludedLimit: 1000,
    colorIncludedLimit: 1000,
    bwExcessRate: 0.1,
    colorExcessRate: 0.2,
    bwSlabRanges: normalizeCopiedSlabRanges([]),
    colorSlabRanges: normalizeCopiedSlabRanges(null),
    comboSlabRanges: normalizeCopiedSlabRanges(undefined),
  };

  const serialized = JSON.parse(JSON.stringify(fixedLimitPricingItem)) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    saleType: 'RENT',
    rentType: 'FIXED_LIMIT',
    monthlyRent: 500,
    description: 'Machine',
    bwIncludedLimit: 1000,
    colorIncludedLimit: 1000,
    bwExcessRate: 0.1,
    colorExcessRate: 0.2,
  });
});
