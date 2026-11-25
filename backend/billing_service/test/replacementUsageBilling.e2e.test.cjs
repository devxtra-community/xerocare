const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Exercise the real UsageService from replacement readings through its persisted bill
// totals and per-machine bill rows. Persistence and inventory side effects are isolated
// in memory so this regression suite runs without production services or a database.
const meterSync = require('../src/utils/meterReadingSync');
meterSync.pushMeterReadings = async () => undefined;

const { UsageService } = require('../src/services/usageService');
const { UsageRecordItem } = require('../src/entities/usageRecordItemEntity');
const { ProductAllocation, AllocationStatus } = require('../src/entities/productAllocationEntity');
const { InvoiceType } = require('../src/entities/enums/invoiceType');
const { SaleType } = require('../src/entities/enums/saleType');

const readings = (allocationId, value) => ({
  allocationId,
  endBwA4: value.bwA4,
  endBwA3: value.bwA3,
  endColorA4: value.colorA4,
  endColorA3: value.colorA3,
});

const makeUsageItem = (usageRecordId, allocationId, start, end, allocation) => ({
  usageRecordId,
  allocationId,
  allocation,
  periodStart: new Date('2026-11-24T00:00:00.000Z'),
  periodEnd: new Date('2026-12-23T00:00:00.000Z'),
  startBwA4: start.bwA4,
  endBwA4: end.bwA4,
  deltaBwA4: end.bwA4 - start.bwA4,
  startBwA3: start.bwA3,
  endBwA3: end.bwA3,
  deltaBwA3: end.bwA3 - start.bwA3,
  startColorA4: start.colorA4,
  endColorA4: end.colorA4,
  deltaColorA4: end.colorA4 - start.colorA4,
  startColorA3: start.colorA3,
  endColorA3: end.colorA3,
  deltaColorA3: end.colorA3 - start.colorA3,
});

function makeScenario(saleType, { legacyBill = false } = {}) {
  const contractId = randomUUID();
  const oldAllocationId = randomUUID();
  const newAllocationId = randomUUID();
  const previousUsageId = randomUUID();
  const usageId = randomUUID();

  const oldAllocation = {
    id: oldAllocationId,
    contractId,
    serialNumber: 'DAMAGED-UNIT-001',
    modelId: randomUUID(),
    productId: randomUUID(),
    itemType: 'PRODUCT',
    status: AllocationStatus.REPLACED,
    startTimestamp: new Date('2026-08-01T00:00:00.000Z'),
    endTimestamp: new Date('2026-10-24T12:00:00.000Z'),
    initialBwA4: 400,
    initialBwA3: 400,
    initialColorA4: 400,
    initialColorA3: 400,
    currentBwA4: 600,
    currentBwA3: 600,
    currentColorA4: 600,
    currentColorA3: 600,
  };
  const newAllocation = {
    id: newAllocationId,
    contractId,
    serialNumber: 'REPLACEMENT-UNIT-002',
    modelId: randomUUID(),
    productId: randomUUID(),
    itemType: 'PRODUCT',
    status: AllocationStatus.ALLOCATED,
    startTimestamp: new Date('2026-10-24T12:00:00.000Z'),
    initialBwA4: 10,
    initialBwA3: 10,
    initialColorA4: 10,
    initialColorA3: 10,
    currentBwA4: 10,
    currentBwA3: 10,
    currentColorA4: 10,
    currentColorA3: 10,
  };
  const allocations = [oldAllocation, newAllocation];

  const previousRecord = {
    id: previousUsageId,
    billingPeriodStart: new Date('2026-10-24T00:00:00.000Z'),
    billingPeriodEnd: new Date('2026-11-23T00:00:00.000Z'),
    bwA4Count: 410,
    bwA3Count: 410,
    colorA4Count: 410,
    colorA3Count: 410,
  };
  const previousItems = [
    makeUsageItem(previousUsageId, oldAllocationId,
      { bwA4: 200, bwA3: 200, colorA4: 200, colorA3: 200 },
      { bwA4: 400, bwA3: 400, colorA4: 400, colorA3: 400 }, oldAllocation),
    makeUsageItem(previousUsageId, newAllocationId,
      { bwA4: 10, bwA3: 10, colorA4: 10, colorA3: 10 },
      { bwA4: 10, bwA3: 10, colorA4: 10, colorA3: 10 }, newAllocation),
  ];

  const contract = {
    id: contractId,
    invoiceNumber: `INV-${saleType}-${contractId.slice(0, 8)}`,
    type: InvoiceType.PROFORMA,
    saleType,
    leaseType: saleType === SaleType.LEASE ? 'FSM' : undefined,
    contractStatus: 'ACTIVE',
    rentType: 'FIXED_LIMIT',
    effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
    effectiveTo: new Date('2027-08-01T00:00:00.000Z'),
    billingCycleInDays: 30,
    monthlyRent: 100,
    monthlyLeaseAmount: 100,
    taxPercent: 5,
    totalAmount: 1000,
    taxAmount: 0,
    items: [{
      itemType: 'PRICING_RULE',
      description: 'Black & White and Color pricing',
      bwIncludedLimit: 500,
      colorIncludedLimit: 500,
      bwExcessRate: 0.1,
      colorExcessRate: 0.5,
    }],
  };

  const currentItems = legacyBill
    ? [makeUsageItem(usageId, newAllocationId,
        { bwA4: 10, bwA3: 10, colorA4: 10, colorA3: 10 },
        { bwA4: 600, bwA3: 400, colorA4: 400, colorA3: 400 }, newAllocation)]
    : [];
  const usage = legacyBill
    ? {
        id: usageId,
        contractId,
        billingPeriodStart: new Date('2026-11-24T00:00:00.000Z'),
        billingPeriodEnd: new Date('2026-12-23T00:00:00.000Z'),
        readingTakenDate: new Date('2026-10-24T00:00:00.000Z'),
        bwA4Count: 600,
        bwA3Count: 400,
        colorA4Count: 400,
        colorA3Count: 400,
        bwA4Delta: 590,
        bwA3Delta: 390,
        colorA4Delta: 390,
        colorA3Delta: 390,
        exceededTotal: 2040,
        exceededCharge: 422,
        monthlyRent: 100,
        advanceAdjusted: 0,
        totalCharge: 548.1,
        taxableAmount: 522,
        taxAmount: 26.1,
        taxPercent: 5,
        billStatus: 'PENDING_APPROVAL',
      }
    : null;

  const itemsByUsageId = new Map([
    [previousUsageId, previousItems],
    ...(legacyBill ? [[usageId, currentItems]] : []),
  ]);
  const manager = {
    createQueryBuilder() {
      const builder = {
        select() { return builder; },
        where() { return builder; },
        setParameter() { return builder; },
        async getRawOne() { return { max: null }; },
      };
      return builder;
    },
    async find(entity, options) {
      if (entity === ProductAllocation) return allocations;
      if (entity === UsageRecordItem) {
        const usageRecordId = options.where.usageRecordId;
        return (itemsByUsageId.get(usageRecordId) || []).map((item) => ({
          ...item,
          allocation: allocations.find((allocation) => allocation.id === item.allocationId),
        }));
      }
      throw new Error(`Unexpected find entity: ${entity.name}`);
    },
    create(_entity, data) { return { ...data }; },
    async save(entity, value) {
      const saved = Array.isArray(value) ? value : [value];
      if (entity === UsageRecordItem) {
        for (const item of saved) {
          const id = item.usageRecordId || item.usageRecord?.id;
          item.usageRecordId = id;
          item.allocationId = item.allocationId || item.allocation?.id;
          item.allocation = allocations.find((allocation) => allocation.id === item.allocationId);
          const existing = itemsByUsageId.get(id) || [];
          const index = existing.findIndex((candidate) => candidate.allocationId === item.allocationId);
          if (index >= 0) existing[index] = item;
          else existing.push(item);
          itemsByUsageId.set(id, existing);
        }
      }
      return Array.isArray(value) ? saved : value;
    },
    async count() { return 0; },
  };
  const usageRepo = {
    async getUsageHistory() {
      return legacyBill ? [usage, previousRecord] : [previousRecord];
    },
    async findById(id) { return id === usageId ? usage : null; },
    create(data) { return { id: usageId, ...data }; },
    async save(record) { Object.assign(record, { id: usageId }); return record; },
  };
  const invoiceRepo = {
    manager,
    async findById() { return contract; },
    async saveInvoice(record) { return record; },
  };
  const service = new UsageService();
  service.usageRepo = usageRepo;
  service.invoiceRepo = invoiceRepo;

  return {
    service,
    contract,
    allocations,
    oldAllocation,
    newAllocation,
    previousRecord,
    previousItems,
    usage,
    currentItems,
    itemsByUsageId,
    usageId,
    oldAllocationId,
    newAllocationId,
  };
}

const replacementPayload = (scenario) => ({
  contractId: scenario.contract.id,
  billingPeriodStart: '2026-11-24',
  billingPeriodEnd: '2026-12-23',
  readingTakenDate: '2026-10-24',
  bwA4Count: 600,
  bwA3Count: 400,
  colorA4Count: 400,
  colorA3Count: 400,
  items: [
    readings(scenario.oldAllocationId, { bwA4: 600, bwA3: 600, colorA4: 600, colorA3: 600 }),
    readings(scenario.newAllocationId, { bwA4: 600, bwA3: 400, colorA4: 400, colorA3: 400 }),
  ],
});

for (const saleType of [SaleType.RENT, SaleType.LEASE]) {
  test(`${saleType}: replacement readings are carried into the saved monthly bill once`, async (t) => {
    await t.test('new usage submission stores both machines and the combined AED 926.10 total', async () => {
      const scenario = makeScenario(saleType);
      const result = await scenario.service.recordUsage(replacementPayload(scenario));
      const bill = result.usage;
      const billItems = scenario.itemsByUsageId.get(bill.id);

      assert.equal(Number(bill.totalCharge), 926.1);
      assert.equal(Number(bill.exceededCharge), 782);
      assert.equal(Number(bill.exceededTotal), 2740);
      assert.equal(billItems.length, 2);
      assert.deepEqual(
        billItems.map((item) => [item.allocationId, item.deltaBwA4, item.deltaBwA3, item.deltaColorA4, item.deltaColorA3]),
        [
          [scenario.oldAllocationId, 200, 200, 200, 200],
          [scenario.newAllocationId, 590, 390, 390, 390],
        ],
      );
      assert.equal(Number(scenario.contract.totalAmount), 1926.1);
    });

    await t.test('editing a legacy new-machine-only bill adds missed outgoing usage and recalculates it', async () => {
      const scenario = makeScenario(saleType, { legacyBill: true });
      await scenario.service.updateUsageRecord(scenario.usageId, replacementPayload(scenario));

      const billItems = scenario.itemsByUsageId.get(scenario.usageId);
      assert.equal(Number(scenario.usage.totalCharge), 926.1);
      assert.equal(Number(scenario.usage.exceededCharge), 782);
      assert.equal(Number(scenario.usage.exceededTotal), 2740);
      assert.equal(billItems.length, 2);
      assert.deepEqual(
        billItems.map((item) => [item.allocationId, item.deltaBwA4, item.deltaBwA3, item.deltaColorA4, item.deltaColorA3]),
        [
          [scenario.newAllocationId, 590, 390, 390, 390],
          [scenario.oldAllocationId, 200, 200, 200, 200],
        ],
      );
      assert.equal(Number(scenario.contract.totalAmount), 1378);
    });
  });
}
