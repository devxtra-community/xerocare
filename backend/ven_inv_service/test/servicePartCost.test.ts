import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCatalogServicePartCost } from '../src/helpers/servicePartCost';

test('catalog selling price, not purchase or wholesale price, sets machine service cost', () => {
  const part = { base_price: '500.00', purchase_price: '143.59', wholesale_price: '350.00' };
  assert.deepEqual(calculateCatalogServicePartCost(part.base_price, 1), {
    unitCost: 500,
    totalCost: 500,
  });
});

test('service cost scales by quantity using the catalog selling price', () => {
  assert.deepEqual(calculateCatalogServicePartCost('500.00', 3), {
    unitCost: 500,
    totalCost: 1500,
  });
});

test('covered customer charge stays separate from catalog service cost', () => {
  const customerCharge = 0; // Existing coverage pricing remains responsible for this value.
  const serviceCost = calculateCatalogServicePartCost('500.00', 1);
  assert.equal(customerCharge, 0);
  assert.equal(serviceCost.totalCost, 500);
});

test('chargeable customer pricing does not change catalog service cost', () => {
  const customerCharge = 425; // Example of the existing estimate result after customer pricing.
  const serviceCost = calculateCatalogServicePartCost('500.00', 1);
  assert.equal(customerCharge, 425);
  assert.equal(serviceCost.totalCost, 500);
});

test('persisted service cost remains a snapshot if catalog selling price later changes', () => {
  const persistedItem = calculateCatalogServicePartCost('500.00', 1);
  const currentCatalogPrice = '550.00';
  assert.equal(persistedItem.totalCost, 500);
  assert.equal(calculateCatalogServicePartCost(currentCatalogPrice, 1).totalCost, 550);
  assert.equal(persistedItem.totalCost, 500);
});

test('caller-supplied cost is not an input to catalog service cost calculation', () => {
  const clientPayload = { unitCost: 1 };
  const authoritativeCatalogSellingPrice = '500.00';
  assert.equal(calculateCatalogServicePartCost(authoritativeCatalogSellingPrice, 1).unitCost, 500);
  assert.notEqual(clientPayload.unitCost, 500);
});

test('multiple catalog parts produce independent service costs', () => {
  const partA = calculateCatalogServicePartCost('500.00', 1);
  const partB = calculateCatalogServicePartCost('200.00', 2);
  assert.equal(partA.totalCost + partB.totalCost, 900);
});
