import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractCoverage,
  coverageAllowsItem,
  coverageForServiceContext,
  inferCatalogPartCategory,
} from '../src/helpers/contractCoverageHelper';

const itemCovered = (context: string, category: string, name = 'Catalog item'): boolean =>
  coverageAllowsItem(coverageForServiceContext(context), {
    partCategory: category,
    partName: name,
  });

test('service contexts apply the required part and consumable matrix', () => {
  const cases: Array<[string, boolean, boolean, boolean, boolean]> = [
    ['RENT', true, true, true, true],
    ['LEASE_CPC', true, true, true, true],
    ['FSMA', true, true, true, true],
    ['LEASE_UNDER_WARRANTY', true, false, true, true],
    ['WARRANTY', true, false, true, true],
    ['SMA', true, false, true, true],
    ['AMC', false, false, true, true],
    ['CHARGEABLE', false, false, false, false],
    ['LEASE_EXPIRED', false, false, false, false],
    ['EXTERNAL_MACHINE', false, false, false, false],
  ];

  for (const [context, sparePartCovered, consumableCovered, labourCovered, visitCovered] of cases) {
    const coverage = coverageForServiceContext(context);
    assert.equal(coverage.labour, labourCovered, `${context} labour`);
    assert.equal(coverage.travel, visitCovered, `${context} service visit`);
    assert.equal(itemCovered(context, 'SPARE_PART'), sparePartCovered, `${context} spare part`);
    assert.equal(itemCovered(context, 'CONSUMABLE'), consumableCovered, `${context} consumable`);
  }
});

test('consumable catalog categories include toner, ink, drum, fuser and roller parts', () => {
  for (const category of [
    'TONER',
    'INK',
    'DRUM',
    'FUSER',
    'TRANSFER_BELT',
    'PAPER_FEED_ROLLER',
    'CONSUMABLE',
  ]) {
    assert.equal(itemCovered('SMA', category), false, `SMA should charge ${category}`);
    assert.equal(itemCovered('RENT', category), true, `RENT should cover ${category}`);
  }
});

test('explicit catalog category takes precedence over a conflicting part name', () => {
  const sma = coverageForServiceContext('SMA');
  assert.equal(
    coverageAllowsItem(sma, { partCategory: 'SPARE_PART', partName: 'Drum assembly' }),
    true,
  );
  assert.equal(coverageAllowsItem(sma, { partName: 'Drum assembly' }), false);
});

test('catalog category inference identifies named consumables and ordinary spare parts', () => {
  assert.equal(inferCatalogPartCategory('Fuser Assembly'), 'CONSUMABLE');
  assert.equal(inferCatalogPartCategory('Paper Feed Roller'), 'CONSUMABLE');
  assert.equal(inferCatalogPartCategory('Pickup assembly', 'Paper feed roller'), 'CONSUMABLE');
  assert.equal(inferCatalogPartCategory('Transfer Gear'), 'SPARE_PART');
});

test('resolved contract coverage overrides context defaults', () => {
  const customCoverage: ContractCoverage = {
    labour: false,
    spareParts: false,
    toner: true,
    travel: false,
  };
  assert.deepEqual(coverageForServiceContext('RENT', customCoverage), customCoverage);
});
