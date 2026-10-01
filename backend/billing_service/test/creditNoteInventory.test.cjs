const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getReturnedProductStatus,
  isReturnedMachineDisposition,
  requiresReturnedMachineDisposition,
} = require('../src/utils/creditNoteInventory');

test('Finance must select a destination for product replacement and credit exchange', () => {
  assert.equal(requiresReturnedMachineDisposition({ itemCategory: 'PRODUCT', type: 'REPLACEMENT' }), true);
  assert.equal(requiresReturnedMachineDisposition({ itemCategory: 'PRODUCT', type: 'CREDIT_EXCHANGE' }), true);
  assert.equal(requiresReturnedMachineDisposition({ itemCategory: 'PRODUCT', type: 'DIRECT_REFUND' }), false);
  assert.equal(requiresReturnedMachineDisposition({ itemCategory: 'SPARE_PART', type: 'REPLACEMENT' }), false);
});

test('only the three supported Finance dispositions are accepted', () => {
  for (const choice of ['STOCK', 'WORKING_STOCK', 'DAMAGED']) {
    assert.equal(isReturnedMachineDisposition(choice), true);
  }
  for (const choice of [undefined, null, '', 'AVAILABLE', 'GWR']) {
    assert.equal(isReturnedMachineDisposition(choice), false);
  }
});

test('Finance disposition maps to the intended inventory product status', () => {
  assert.equal(getReturnedProductStatus('STOCK'), 'RETURNED');
  assert.equal(getReturnedProductStatus('WORKING_STOCK'), 'AVAILABLE');
  assert.equal(getReturnedProductStatus('DAMAGED'), 'DAMAGED');
});

test('credit notes without the new field keep the legacy damage reason behavior', () => {
  assert.equal(getReturnedProductStatus(undefined, 'Damaged Product'), 'DAMAGED');
  assert.equal(getReturnedProductStatus(undefined, 'Wrong Item Delivered'), 'RETURNED');
});
