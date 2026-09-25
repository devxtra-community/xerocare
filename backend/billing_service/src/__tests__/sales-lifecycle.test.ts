import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { ContractStatus } from '../entities/enums/contractStatus';
import { SaleType } from '../entities/enums/saleType';
import { RentType } from '../entities/enums/rentType';
import { RentPeriod } from '../entities/enums/rentPeriod';
import { LeaseType } from '../entities/enums/leaseType';
import { EmployeeRole } from '../constants/employeeRole';

/**
 * Real quotation -> employee-approve -> finance-approve -> convert-to-transaction ->
 * allocate-machines -> activate-contract chain, for both RENT and LEASE, against actual
 * routes (invoiceRoutes.ts) and billingService.ts. Key real-code facts that don't match a
 * naive reading of the task:
 * - "Contract" is not a separate object — it's the same Invoice row. `contractStatus`
 *   (PENDING_CONFIRMATION -> ACTIVE) is a DIFFERENT field from `status`
 *   (DRAFT -> ... -> ACTIVE_CONTRACT), and `contractStatus` is ONLY ever set to
 *   PENDING_CONFIRMATION inside allocate-machines — there is no way to reach an active
 *   contract without that step for RENT/LEASE.
 * - allocate-machines makes a real outbound `fetch()` (bare Node fetch, not axios) to
 *   INVENTORY_SERVICE_URL to validate each allocated product — mocked below via
 *   jest.spyOn(global, 'fetch').
 * - convert-to-transaction sets `status` back to DRAFT (not some "approved" status) and
 *   only renames QTN-... to INV-....
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = '99999999-9999-4999-8999-999999999999';
const TEST_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEST_CUSTOMER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEST_MODEL_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

let uniqueCounter = 0;
function uniqueProductId() {
  uniqueCounter += 1;
  return `dddddddd-dddd-4ddd-8ddd-${String(uniqueCounter).padStart(12, '0')}`;
}

function salesToken() {
  // requireJob only applies to role EMPLOYEE — RENT_AND_LEASE is the job createQuotation
  // requires for RENT/LEASE quotations.
  return jwt.sign(
    {
      userId: TEST_USER_ID,
      role: EmployeeRole.EMPLOYEE,
      employeeJob: 'RENT_AND_LEASE',
      branchId: TEST_BRANCH_ID,
      email: 'sales@xerocare.test',
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

function adminToken() {
  // ADMIN bypasses every role/job gate for the rest of the chain.
  return jwt.sign(
    {
      userId: TEST_USER_ID,
      role: EmployeeRole.ADMIN,
      branchId: TEST_BRANCH_ID,
      email: 'admin@xerocare.test',
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

beforeAll(async () => {
  await connectWithRetry();
}, 60000);

afterAll(async () => {
  await Source.destroy();
});

beforeEach(() => {
  fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    statusText: 'OK',
    json: async () => ({ data: { serial_no: 'SN-TEST-001', print_colour: 'COLOUR' } }),
  } as Response);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

/** Walks one quotation from creation through an ACTIVE contract. Returns the final invoice. */
async function walkToActiveContract(quotationBody: Record<string, unknown>) {
  const createRes = await request(app)
    .post('/invoices/quotation')
    .set('Authorization', `Bearer ${salesToken()}`)
    .send(quotationBody);
  expect(createRes.status).toBe(201);
  const invoiceId = createRes.body.data.id;
  expect(createRes.body.data.status).toBe(InvoiceStatus.DRAFT);

  const employeeApproveRes = await request(app)
    .post(`/invoices/${invoiceId}/employee-approve`)
    .set('Authorization', `Bearer ${adminToken()}`)
    .send();
  expect(employeeApproveRes.status).toBe(200);
  expect(employeeApproveRes.body.data.status).toBe(InvoiceStatus.EMPLOYEE_APPROVED);

  const financeApproveRes = await request(app)
    .post(`/invoices/${invoiceId}/finance-approve-quotation`)
    .set('Authorization', `Bearer ${adminToken()}`)
    .send();
  expect(financeApproveRes.status).toBe(200);
  expect(financeApproveRes.body.data.status).toBe(InvoiceStatus.FINANCE_APPROVED);

  const convertRes = await request(app)
    .post(`/invoices/${invoiceId}/convert-to-transaction`)
    .set('Authorization', `Bearer ${adminToken()}`)
    .send();
  expect(convertRes.status).toBe(200);
  // Real behavior: converting resets status to DRAFT — it is not an "approved" status.
  expect(convertRes.body.data.status).toBe(InvoiceStatus.DRAFT);
  expect(convertRes.body.data.invoiceNumber).toMatch(/^INV-/);

  const machineItem = convertRes.body.data.items.find(
    (item: { modelId?: string }) => item.modelId === TEST_MODEL_ID,
  );
  expect(machineItem).toBeDefined();

  const allocateRes = await request(app)
    .post(`/invoices/${invoiceId}/allocate-machines`)
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ itemUpdates: [{ id: machineItem.id, productId: uniqueProductId() }] });
  expect(allocateRes.status).toBe(200);
  expect(allocateRes.body.data.contractStatus).toBe(ContractStatus.PENDING_CONFIRMATION);

  const activateRes = await request(app)
    .post(`/invoices/${invoiceId}/activate-contract`)
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({});
  expect(activateRes.status).toBe(200);
  expect(activateRes.body.data.contractStatus).toBe(ContractStatus.ACTIVE);
  expect(activateRes.body.data.status).toBe(InvoiceStatus.ACTIVE_CONTRACT);

  return activateRes.body.data;
}

describe('RENT quotation -> active contract', () => {
  test('walks a full RENT quotation to an ACTIVE contract', async () => {
    const invoice = await walkToActiveContract({
      customerId: TEST_CUSTOMER_ID,
      saleType: SaleType.RENT,
      rentType: RentType.FIXED_LIMIT,
      rentPeriod: RentPeriod.MONTHLY,
      monthlyRent: 1000,
      effectiveFrom: '2026-01-01',
      items: [
        {
          description: 'Rented machine',
          quantity: 1,
          unitPrice: 0,
          itemType: 'PRODUCT',
          modelId: TEST_MODEL_ID,
        },
      ],
      pricingItems: [{ description: 'Base plan', bwIncludedLimit: 1000, bwExcessRate: 0.5 }],
    });

    const stored = await Source.getRepository(Invoice).findOne({ where: { id: invoice.id } });
    expect(stored?.saleType).toBe(SaleType.RENT);
    expect(stored?.effectiveTo).not.toBeNull(); // setEffectiveDates() fills this on activation
  });

  test('rejects a RENT quotation missing pricingItems/rentType', async () => {
    const res = await request(app)
      .post('/invoices/quotation')
      .set('Authorization', `Bearer ${salesToken()}`)
      .send({ customerId: TEST_CUSTOMER_ID, saleType: SaleType.RENT });
    expect(res.status).toBe(400);
  });

  test('a FIXED_LIMIT rent model cannot use slab ranges', async () => {
    const res = await request(app)
      .post('/invoices/quotation')
      .set('Authorization', `Bearer ${salesToken()}`)
      .send({
        customerId: TEST_CUSTOMER_ID,
        saleType: SaleType.RENT,
        rentType: RentType.FIXED_LIMIT,
        rentPeriod: RentPeriod.MONTHLY,
        effectiveFrom: '2026-01-01',
        pricingItems: [{ description: 'Base plan', bwSlabRanges: [{ from: 0, to: 100, rate: 1 }] }],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Slab Ranges');
  });
});

describe('LEASE quotation -> active contract', () => {
  test('walks a full LEASE quotation to an ACTIVE contract', async () => {
    const invoice = await walkToActiveContract({
      customerId: TEST_CUSTOMER_ID,
      saleType: SaleType.LEASE,
      leaseType: LeaseType.EMI,
      leaseTenureMonths: 12,
      effectiveFrom: '2026-01-01',
      items: [
        {
          description: 'Leased machine',
          quantity: 1,
          unitPrice: 0,
          itemType: 'PRODUCT',
          modelId: TEST_MODEL_ID,
        },
      ],
    });

    const stored = await Source.getRepository(Invoice).findOne({ where: { id: invoice.id } });
    expect(stored?.saleType).toBe(SaleType.LEASE);
    expect(stored?.leaseType).toBe(LeaseType.EMI);
  });

  test('rejects a LEASE quotation missing leaseType/leaseTenureMonths', async () => {
    const res = await request(app)
      .post('/invoices/quotation')
      .set('Authorization', `Bearer ${salesToken()}`)
      .send({ customerId: TEST_CUSTOMER_ID, saleType: SaleType.LEASE });
    expect(res.status).toBe(400);
  });
});

describe('Contract activation guards', () => {
  test('cannot activate before machines are allocated (contractStatus never reaches PENDING_CONFIRMATION)', async () => {
    const createRes = await request(app)
      .post('/invoices/quotation')
      .set('Authorization', `Bearer ${salesToken()}`)
      .send({
        customerId: TEST_CUSTOMER_ID,
        saleType: SaleType.LEASE,
        leaseType: LeaseType.EMI,
        leaseTenureMonths: 12,
        effectiveFrom: '2026-01-01',
        items: [
          {
            description: 'Leased machine',
            quantity: 1,
            unitPrice: 0,
            itemType: 'PRODUCT',
            modelId: TEST_MODEL_ID,
          },
        ],
      });
    const invoiceId = createRes.body.data.id;

    const activateRes = await request(app)
      .post(`/invoices/${invoiceId}/activate-contract`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(activateRes.status).toBe(400);
    expect(activateRes.body.message).toContain('pending confirmation');
  });

  test('an EMPLOYEE whose job is neither SALES nor RENT_AND_LEASE cannot create any quotation', async () => {
    // requireJob(SALES, RENT_AND_LEASE) on POST /invoices/quotation (invoiceRoutes.ts) gates
    // on job alone, not on the request body's saleType — a SALES-job employee can create a
    // RENT quotation too (confirmed by the RENT test above using a SALES-eligible token).
    // CRM is a real EmployeeJob value that is neither, so it's the one that's actually blocked.
    const wrongJobToken = jwt.sign(
      {
        userId: TEST_USER_ID,
        role: EmployeeRole.EMPLOYEE,
        employeeJob: 'CRM',
        branchId: TEST_BRANCH_ID,
      },
      ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    const res = await request(app)
      .post('/invoices/quotation')
      .set('Authorization', `Bearer ${wrongJobToken}`)
      .send({
        customerId: TEST_CUSTOMER_ID,
        saleType: SaleType.RENT,
        rentType: RentType.FIXED_LIMIT,
        rentPeriod: RentPeriod.MONTHLY,
        effectiveFrom: '2026-01-01',
        pricingItems: [{ description: 'Base plan', bwIncludedLimit: 1000, bwExcessRate: 0.5 }],
      });
    expect(res.status).toBe(403);
  });
});
