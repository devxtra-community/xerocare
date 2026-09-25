import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { SaleType } from '../entities/enums/saleType';
import { EmployeeRole } from '../constants/employeeRole';

/**
 * Real schema note (see project exploration): billing_service has no journal_entries /
 * chart_of_accounts debit=credit ledger. The actual invariant that plays the same role is
 * "sum of a real invoice's payment_transactions equals its invoice_ledger row" — that's
 * what checkLedgerConsistency below verifies, in place of the fictional checkDoubleEntry().
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = 'test-branch-billing';
// PaymentTransaction.recordedBy is a real `uuid` column (paymentTransactionEntity.ts) — a
// plain string like 'test-finance-user' fails the Postgres uuid type check.
const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

let uniqueCounter = 0;
function uniqueInvoiceNumber() {
  uniqueCounter += 1;
  return `TEST-INV-${Date.now()}-${uniqueCounter}`;
}

function signTestToken(role: string) {
  return jwt.sign(
    { userId: TEST_USER_ID, role, branchId: TEST_BRANCH_ID, email: 'finance@xerocare.test' },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

const financeToken = () => signTestToken(EmployeeRole.FINANCE);

async function createTestInvoice(totalAmount: number, overrides: Partial<Invoice> = {}) {
  const repo = Source.getRepository(Invoice);
  const invoice = repo.create({
    invoiceNumber: uniqueInvoiceNumber(),
    branchId: TEST_BRANCH_ID,
    createdBy: TEST_USER_ID,
    saleType: SaleType.SALE,
    status: InvoiceStatus.INVOICED,
    totalAmount,
    ...overrides,
  });
  return repo.save(invoice);
}

async function getLedger(invoiceId: string) {
  return Source.getRepository(InvoiceLedger).findOne({ where: { invoiceId } });
}

async function getPaymentSum(invoiceId: string) {
  const rows = await Source.getRepository(PaymentTransaction).find({ where: { invoiceId } });
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

/** Real analog of the task's checkDoubleEntry(): ledger.paidAmount must equal the sum
 * of that invoice's real PaymentTransaction rows, within the same 0.01 rounding tolerance. */
async function checkLedgerConsistency(invoiceId: string) {
  const ledger = await getLedger(invoiceId);
  const actualSum = await getPaymentSum(invoiceId);
  return { ledger, actualSum, diff: Math.abs((ledger?.paidAmount ?? 0) - actualSum) };
}

beforeAll(async () => {
  await connectWithRetry();
  // requireCashAccount() (src/services/cashbookService.ts) hard-requires a real, active
  // CASH account for the branch before any CASH/BANK payment is allowed to post — without
  // this fixture every payment in this file would 400 before reaching the logic under test.
  await Source.getRepository(CashBankAccount).save(
    Source.getRepository(CashBankAccount).create({
      name: 'Test Cash In Hand',
      type: 'CASH',
      branchId: TEST_BRANCH_ID,
      isActive: true,
    }),
  );
}, 60000);

afterAll(async () => {
  await Source.destroy();
});

describe('Payment recording (POST /payments/record)', () => {
  test('valid CASH payment creates a PaymentTransaction and updates the invoice ledger', async () => {
    const invoice = await createTestInvoice(10000);

    const res = await request(app)
      .post('/payments/record')
      .set('Authorization', `Bearer ${financeToken()}`)
      .send({
        invoiceId: invoice.id,
        amountPaid: 4000,
        paymentMode: 'CASH',
        paymentDate: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { ledger, diff } = await checkLedgerConsistency(invoice.id);
    expect(ledger?.paidAmount).toBe(4000);
    expect(ledger?.balanceAmount).toBe(6000);
    expect(diff).toBeLessThan(0.01);
  });

  test('paying the remaining balance marks the invoice PAID', async () => {
    const invoice = await createTestInvoice(5000);

    await request(app)
      .post('/payments/record')
      .set('Authorization', `Bearer ${financeToken()}`)
      .send({
        invoiceId: invoice.id,
        amountPaid: 5000,
        paymentMode: 'CASH',
        paymentDate: new Date().toISOString(),
      });

    const updated = await Source.getRepository(Invoice).findOne({ where: { id: invoice.id } });
    expect(updated?.status).toBe(InvoiceStatus.PAID);

    const { ledger, diff } = await checkLedgerConsistency(invoice.id);
    expect(ledger?.balanceAmount).toBe(0);
    expect(diff).toBeLessThan(0.01);
  });

  test('rejects a payment that exceeds the pending balance with 400, and posts nothing', async () => {
    const invoice = await createTestInvoice(1000);

    const res = await request(app)
      .post('/payments/record')
      .set('Authorization', `Bearer ${financeToken()}`)
      .send({
        invoiceId: invoice.id,
        amountPaid: 1500,
        paymentMode: 'CASH',
        paymentDate: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(await getPaymentSum(invoice.id)).toBe(0);
  });

  test('rejects a zero-amount payment with 400', async () => {
    const invoice = await createTestInvoice(1000);
    const res = await request(app)
      .post('/payments/record')
      .set('Authorization', `Bearer ${financeToken()}`)
      .send({
        invoiceId: invoice.id,
        amountPaid: 0,
        paymentMode: 'CASH',
        paymentDate: new Date().toISOString(),
      });
    // Controller-level required-field check treats amountPaid: 0 as falsy and 400s before
    // ever reaching billingService's own "must be greater than zero" guard — same status
    // either way, so this holds regardless of which layer catches it.
    expect(res.status).toBe(400);
  });

  test('EMPLOYEE role cannot record a payment (route requires FINANCE or ADMIN)', async () => {
    const invoice = await createTestInvoice(1000);
    const res = await request(app)
      .post('/payments/record')
      .set('Authorization', `Bearer ${signTestToken(EmployeeRole.EMPLOYEE)}`)
      .send({
        invoiceId: invoice.id,
        amountPaid: 500,
        paymentMode: 'CASH',
        paymentDate: new Date().toISOString(),
      });
    expect(res.status).toBe(403);
  });

  // Fixed gap (previously: billingService.recordPayment had no unique constraint or
  // idempotency key on PaymentTransaction, and its own comment stated outright that none
  // of its writes shared one transaction — a double-submitted request was indistinguishable
  // from two genuine payments and both got recorded). Now: the invoice row is locked
  // (SELECT ... FOR UPDATE) for the guard+insert+ledger-update, which serializes two
  // concurrent identical submissions rather than letting both read the same pre-payment
  // state; the loser then collides with uq_payment_idempotency
  // (invoice_id, amount, payment_mode, transaction_date) on insert and the controller
  // turns that Postgres 23505 into a 409. Both effects are deterministic here (not a race
  // that might not reproduce) — Postgres serializes the two transactions on the row lock,
  // and the unique constraint deterministically rejects the second identical row.
  test('duplicate payment submission returns 409, not a duplicate insert', async () => {
    const invoice = await createTestInvoice(10000);
    const payload = {
      invoiceId: invoice.id,
      amountPaid: 3000,
      paymentMode: 'CASH',
      paymentDate: new Date().toISOString(),
    };

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/payments/record')
        .set('Authorization', `Bearer ${financeToken()}`)
        .send(payload),
      request(app)
        .post('/payments/record')
        .set('Authorization', `Bearer ${financeToken()}`)
        .send(payload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const rows = await Source.getRepository(PaymentTransaction).find({
      where: { invoiceId: invoice.id },
    });
    expect(rows).toHaveLength(1);

    const { ledger } = await checkLedgerConsistency(invoice.id);
    expect(ledger?.paidAmount).toBe(3000);
  });
});
