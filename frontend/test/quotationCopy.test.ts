import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCopiedRate, normalizeCopiedSlabRanges } from '../lib/quotationCopy';

test('omits null optional rates and preserves configured numeric rates', () => {
  assert.equal(normalizeCopiedRate(null), undefined);
  assert.equal(normalizeCopiedRate(undefined), undefined);
  assert.equal(normalizeCopiedRate(0.25), '0.25');

  const payload = JSON.parse(
    JSON.stringify({
      bwA3ExcessRate: normalizeCopiedRate(null),
      colorA3ExcessRate: normalizeCopiedRate(null),
      combinedExcessRate: normalizeCopiedRate(null),
      configuredA3Rate: normalizeCopiedRate(0.25),
    }),
  ) as Record<string, unknown>;
  assert.deepEqual(payload, { configuredA3Rate: '0.25' });
});

test('FIXED_LIMIT RENT assignment keeps valid rates and omits absent rates and slabs', () => {
  const assignmentItem = {
    bwExcessRate: normalizeCopiedRate(0.1),
    colorExcessRate: normalizeCopiedRate(0.2),
    bwA3ExcessRate: normalizeCopiedRate(null),
    colorA3ExcessRate: normalizeCopiedRate(null),
    combinedExcessRate: normalizeCopiedRate(null),
    bwIncludedLimit: 1000,
    colorIncludedLimit: 1000,
    bwSlabRanges: normalizeCopiedSlabRanges([]),
    colorSlabRanges: normalizeCopiedSlabRanges(null),
    comboSlabRanges: normalizeCopiedSlabRanges(undefined),
  };
  const serialized = JSON.parse(JSON.stringify(assignmentItem)) as Record<string, unknown>;
  assert.deepEqual(serialized, {
    bwExcessRate: '0.1',
    colorExcessRate: '0.2',
    bwIncludedLimit: 1000,
    colorIncludedLimit: 1000,
  });
  assert.equal(JSON.stringify(serialized).includes('"null"'), false);
});

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
