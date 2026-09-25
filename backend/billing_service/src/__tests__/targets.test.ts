import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { EmployeeTarget } from '../entities/employeeTargetEntity';
import { EmployeeTargetAchievement } from '../entities/employeeTargetAchievementEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { SaleType } from '../entities/enums/saleType';
import { TargetService } from '../services/targetService';
import { EmployeeRole } from '../constants/employeeRole';

/**
 * Real employee-target / achievement / incentive-tier flow. Real-code facts that diverge
 * from a naive reading of the task:
 * - POST /targets does a real outbound `fetch()` to employee_service to resolve the
 *   employee's job/branch (targetType is DERIVED from job, never sent by the client) —
 *   mocked below via jest.spyOn(global, 'fetch').
 * - Achievement is NOT written by a background job for a normal read — `calculateAchievement`
 *   recomputes and upserts on every GET /targets/:id (and similar routes) until the
 *   achievement is finalized. There is no HTTP endpoint to finalize on demand — the real
 *   monthly cron only finalizes last month's targets — so this test calls
 *   `TargetService.finalizeTarget()` directly, exactly as the cron itself does per-target.
 * - There is no incentive push to employee_service/payroll anywhere in the code — it's a
 *   manual step (HR reads the incentive figure and enters it into payroll by hand).
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = 'e2222222-2222-4222-8222-222222222222';
const TEST_ADMIN_ID = 'e3333333-3333-4333-8333-333333333333';

const now = new Date();
const CURRENT_MONTH = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const nextMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
const NEXT_MONTH = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

let uniqueCounter = 0;
function uniqueInvoiceNumber() {
  uniqueCounter += 1;
  return `TARGET-TEST-${Date.now()}-${uniqueCounter}`;
}

function adminToken() {
  return jwt.sign(
    { userId: TEST_ADMIN_ID, role: EmployeeRole.ADMIN, branchId: TEST_BRANCH_ID },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

const TIERS = [
  { fromPercent: 0, toPercent: 50, incentivePercent: 1 },
  { fromPercent: 50, toPercent: 100, incentivePercent: 2 },
  { fromPercent: 100, toPercent: null, incentivePercent: 3 },
];

async function createRentLeaseInvoice(employeeId: string, totalAmount: number) {
  const repo = Source.getRepository(Invoice);
  return repo.save(
    repo.create({
      invoiceNumber: uniqueInvoiceNumber(),
      branchId: TEST_BRANCH_ID,
      createdBy: employeeId,
      saleType: SaleType.RENT,
      status: InvoiceStatus.ACTIVE_CONTRACT,
      totalAmount,
    }),
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
  // POST /targets resolves the employee's job+branch via a real fetch() to employee_service
  // (targetService.ts's resolveEmployeeJobAndBranch) — RENT_AND_LEASE maps to a RENT_LEASE
  // target per JOB_TARGET_TYPE_MAP. getBranchCurrencyInfo also calls out (to ven_inv_service)
  // but is wrapped safely and falls back to 'AED' regardless of what this mock returns.
  fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: { employee_job: 'RENT_AND_LEASE', branch_id: TEST_BRANCH_ID } }),
  } as Response);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('Target creation (POST /targets)', () => {
  test('creates a RENT_LEASE target, deriving targetType from the employee job, not the client', async () => {
    const res = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        employeeId: randomUUID(),
        targetMonth: CURRENT_MONTH,
        targetAmount: 10000,
        tiers: TIERS,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.targetType).toBe('RENT_LEASE');
    expect(res.body.data.branchId).toBe(TEST_BRANCH_ID); // from the mocked employee lookup, not the caller's token
  });

  // Fixed gap: EmployeeTarget now carries @Unique(['employeeId','targetMonth']), and
  // dataSource.ts backfills the same constraint (uniq_employee_month) onto any database
  // where synchronize() already created the table without it. createTarget's existing
  // try/catch on Postgres 23505 now actually fires.
  test('a second target for the same employee+month is rejected with 409', async () => {
    const token = adminToken();
    const employeeId = randomUUID();
    const body = { employeeId, targetMonth: CURRENT_MONTH, targetAmount: 5000, tiers: TIERS };
    const first = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(second.status).toBe(409);

    const rows = await Source.getRepository(EmployeeTarget).find({
      where: { employeeId, targetMonth: CURRENT_MONTH },
    });
    expect(rows).toHaveLength(1);
  });

  test('rejects a job the employee_service reports as not eligible for targets', async () => {
    // CRM is a real EmployeeJob value with no entry in JOB_TARGET_TYPE_MAP.
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { employee_job: 'CRM', branch_id: TEST_BRANCH_ID } }),
    } as Response);
    const res = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        employeeId: randomUUID(),
        targetMonth: CURRENT_MONTH,
        targetAmount: 5000,
        tiers: TIERS,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not eligible');
  });
});

describe('Achievement calculation and tiered incentive (GET /targets/:id)', () => {
  test('recomputes live from real RENT/LEASE invoices as they are added, applying the matching tier', async () => {
    // A fresh employeeId per achievement test — calculateAchievement sums ALL of an
    // employee's qualifying invoices for the month by employeeId, not by target row (and
    // real code allows more than one target per employee+month, per the KNOWN GAP test
    // above), so sharing an employeeId across tests would let invoices from one test bleed
    // into another's achievement sum.
    const employeeId = randomUUID();
    const createRes = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ employeeId, targetMonth: CURRENT_MONTH, targetAmount: 10000, tiers: TIERS });
    const targetId = createRes.body.data.id;

    await createRentLeaseInvoice(employeeId, 7500); // 75% of target -> tier [50,100) -> 2%

    const res = await request(app)
      .get(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.achievement.achievedAmount).toBe(7500);
    expect(res.body.data.achievement.achievementPercent).toBe(75);
    expect(res.body.data.achievement.appliedTierPercent).toBe(2);
    expect(res.body.data.achievement.incentiveAmount).toBe(150); // 7500 * 2%

    // Crossing into the open-ended top tier recomputes on the next read — not locked yet.
    await createRentLeaseInvoice(employeeId, 5000); // total 12500 -> 125%
    const res2 = await request(app)
      .get(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res2.body.data.achievement.achievedAmount).toBe(12500);
    expect(res2.body.data.achievement.appliedTierPercent).toBe(3);
    expect(res2.body.data.achievement.incentiveAmount).toBe(375); // 12500 * 3%
  });

  test('a DRAFT invoice (not PAID/ACTIVE_CONTRACT/INVOICED) does not count toward achievement', async () => {
    const employeeId = randomUUID();
    const createRes = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ employeeId, targetMonth: CURRENT_MONTH, targetAmount: 10000, tiers: TIERS });
    const targetId = createRes.body.data.id;

    const repo = Source.getRepository(Invoice);
    await repo.save(
      repo.create({
        invoiceNumber: uniqueInvoiceNumber(),
        branchId: TEST_BRANCH_ID,
        createdBy: employeeId,
        saleType: SaleType.RENT,
        status: InvoiceStatus.DRAFT,
        totalAmount: 9000,
      }),
    );

    const res = await request(app)
      .get(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.body.data.achievement.achievedAmount).toBe(0);
  });

  test('finalizing a target locks the achievement — later invoices no longer change it', async () => {
    const employeeId = randomUUID();
    const createRes = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ employeeId, targetMonth: CURRENT_MONTH, targetAmount: 10000, tiers: TIERS });
    const targetId = createRes.body.data.id;

    await createRentLeaseInvoice(employeeId, 3000); // 30% -> tier [0,50) -> 1%

    // No HTTP endpoint triggers finalization on demand (only the monthly cron does, and only
    // for last month's targets) — call the same method the cron calls per-target directly.
    const achievement = await new TargetService().finalizeTarget(targetId);
    expect(achievement.isFinalized).toBe(true);
    expect(achievement.achievedAmount).toBe(3000);
    expect(achievement.incentiveAmount).toBe(30); // 3000 * 1%

    await createRentLeaseInvoice(employeeId, 6000); // would push to 90% / tier 2% if not locked

    const res = await request(app)
      .get(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.body.data.achievement.isFinalized).toBe(true);
    expect(res.body.data.achievement.achievedAmount).toBe(3000); // unchanged — locked
    expect(res.body.data.achievement.incentiveAmount).toBe(30);

    const stored = await Source.getRepository(EmployeeTargetAchievement).findOne({
      where: { targetId },
    });
    expect(stored?.isFinalized).toBe(true);
  });
});

describe('Target cancellation', () => {
  test('cannot cancel a target once its month has started', async () => {
    const createRes = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        employeeId: randomUUID(),
        targetMonth: CURRENT_MONTH,
        targetAmount: 5000,
        tiers: TIERS,
      });
    const targetId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('can cancel a target for a month that has not started yet', async () => {
    const createRes = await request(app)
      .post('/targets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        employeeId: randomUUID(),
        targetMonth: NEXT_MONTH,
        targetAmount: 5000,
        tiers: TIERS,
      });
    const targetId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/targets/${targetId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);

    const stored = await Source.getRepository(EmployeeTarget).findOne({ where: { id: targetId } });
    expect(stored?.status).toBe('CANCELLED');
  });
});
