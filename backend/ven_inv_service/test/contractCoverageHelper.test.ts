import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractCoverage,
  coverageAllowsItem,
  coverageForServiceContext,
  inferCatalogPartCategory,
} from '../src/helpers/contractCoverageHelper';
import { selectPendingServiceEstimateQueue } from '../src/helpers/financeServiceEstimateQueue';

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

test('Finance queue includes zero and positive customer totals without requiring an invoice', () => {
  const ticket = {
    id: 'ticket-1',
    branchId: 'branch-1',
    status: 'WAITING_FINANCE_APPROVAL',
    serviceQuotationId: null,
  };
  const { estimates } = selectPendingServiceEstimateQueue(
    [
      {
        id: 'covered',
        ticketId: ticket.id,
        ticket,
        version: 1,
        created_at: '2026-10-03T10:00:00Z',
        status: 'WAITING_FINANCE_APPROVAL',
        totalCost: 0,
      },
      {
        id: 'chargeable',
        ticketId: 'ticket-2',
        ticket: { ...ticket, id: 'ticket-2' },
        version: 1,
        created_at: '2026-10-03T09:00:00Z',
        status: 'WAITING_FINANCE_APPROVAL',
        totalCost: 750,
      },
    ],
    [],
    { role: 'FINANCE', branchId: 'branch-1' },
  );

  assert.deepEqual(
    estimates.map((estimate) => estimate.id),
    ['covered', 'chargeable'],
  );
  assert.equal(estimates[0].totalCost, 0);
  assert.equal(estimates[1].totalCost, 750);
});

test('Finance queue excludes wrong status, linked quotations, and out-of-branch estimates', () => {
  const ticket = {
    id: 'ticket-1',
    branchId: 'branch-1',
    status: 'WAITING_FINANCE_APPROVAL',
    serviceQuotationId: null,
  };
  const candidates = [
    {
      id: 'wrong-status',
      ticketId: ticket.id,
      ticket,
      version: 1,
      created_at: '2026-10-03',
      status: 'DRAFT',
      totalCost: 0,
    },
    {
      id: 'linked',
      ticketId: 'ticket-2',
      ticket: { ...ticket, id: 'ticket-2', serviceQuotationId: 'invoice-1' },
      version: 1,
      created_at: '2026-10-03',
      status: 'WAITING_FINANCE_APPROVAL',
      totalCost: 10,
    },
    {
      id: 'wrong-branch',
      ticketId: 'ticket-3',
      ticket: { ...ticket, id: 'ticket-3', branchId: 'branch-2' },
      version: 1,
      created_at: '2026-10-03',
      status: 'WAITING_FINANCE_APPROVAL',
      totalCost: 10,
    },
  ];
  const result = selectPendingServiceEstimateQueue(candidates, [], {
    role: 'FINANCE',
    branchId: 'branch-1',
  });
  assert.deepEqual(result.estimates, []);
});

test('Finance queue returns only the newest pending estimate revision per ticket', () => {
  const ticket = {
    id: 'ticket-1',
    branchId: 'branch-1',
    status: 'WAITING_FINANCE_APPROVAL_2',
  };
  const result = selectPendingServiceEstimateQueue(
    [],
    [
      {
        id: 'rev-1',
        ticketId: ticket.id,
        ticket,
        version: 1,
        revisionNumber: 1,
        submittedAt: '2026-10-03T09:00:00Z',
        status: 'WAITING_ADDITIONAL_APPROVAL',
        financeDecision: null,
        invoiceId: null,
      },
      {
        id: 'rev-2',
        ticketId: ticket.id,
        ticket,
        version: 1,
        revisionNumber: 2,
        submittedAt: '2026-10-03T10:00:00Z',
        status: 'WAITING_ADDITIONAL_APPROVAL',
        financeDecision: null,
        invoiceId: null,
      },
    ],
    { role: 'FINANCE', branchId: 'branch-1' },
  );
  assert.deepEqual(
    result.revisions.map((revision) => revision.id),
    ['rev-2'],
  );
});
