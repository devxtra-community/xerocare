import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { requireCashAccount } from '../services/cashbookService';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { sign } from 'jsonwebtoken';
import { Cheque } from '../entities/chequeEntity';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeServiceToken() {
  return sign({ userId: 'billing_service', role: 'ADMIN' }, process.env.ACCESS_SECRET as string, {
    expiresIn: '1m',
  });
}

async function fetchEmployeeInfo(
  employeeId: string,
): Promise<{ name: string; branchId: string; branchName: string } | null> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = makeServiceToken();
    const res = await fetch(`${empUrl}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const emp = data.data ?? data;
    const firstName = emp.first_name || emp.firstName || '';
    const lastName = emp.last_name || emp.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || emp.email || 'Employee';
    const branchId = emp.branch_id || emp.branchId || '';
    const branchName = emp.branch?.name || emp.branchName || 'Unknown Branch';
    return { name, branchId, branchName };
  } catch {
    return null;
  }
}

async function findFinanceManagersOfBranch(branchId: string): Promise<string[]> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = makeServiceToken();
    const res = await fetch(
      `${empUrl}/employee?branchId=${branchId}&financeJob=FINANCE_MANAGER&status=ACTIVE`,
      {
        headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list: Array<{ id: string }> = data.data ?? data ?? [];
    return list.map((e) => e.id);
  } catch {
    return [];
  }
}

// Branch visibility for the branch Manager — used so Managers see their own
// branch's employee expense-request activity (submission + approve/reject
// outcome), not just their own MANAGER_PURCHASE requests.
async function findBranchManager(branchId: string): Promise<string | null> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = makeServiceToken();
    const res = await fetch(`${empUrl}/employee?branchId=${branchId}&role=MANAGER&status=ACTIVE`, {
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list: Array<{ id: string }> = data.data?.employees ?? data.data ?? data ?? [];
    return list[0]?.id ?? null;
  } catch {
    return null;
  }
}

// Cross-branch visibility for Admins — same delivery mechanism (direct HTTP
// call to employee_service's own internal endpoint), broadcast to every
// active Admin.
async function findAllAdmins(): Promise<string[]> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = makeServiceToken();
    // Admin accounts live in employee_service's own separate `admin` table, not
    // as Employee rows with role='ADMIN' — GET /employee?role=ADMIN always
    // returns nothing. /admin/list is the real source.
    const res = await fetch(`${empUrl}/admin/list`, {
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Array<{ id: string }> = data.data ?? [];
    return list.map((e) => e.id);
  } catch {
    return [];
  }
}

async function sendNotification(
  employeeId: string,
  title: string,
  message: string,
  type = 'EXPENSE_REQUEST',
  link?: string,
) {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = makeServiceToken();
    await fetch(`${empUrl}/notifications/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-internal-service': 'billing',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        title,
        message,
        type,
        data: link ? { link } : null,
      }),
    });
  } catch (err) {
    logger.warn('[ExpenseRequest] Notification failed (non-critical):', err);
  }
}

async function generateRequestNo(): Promise<string> {
  const repo = Source.getRepository(EmployeeExpenseRequest);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('r')
    .where(`EXTRACT(YEAR FROM r."createdAt") = :year`, { year })
    .getCount();
  const seq = String(count + 1).padStart(4, '0');
  return `EXP-REQ-${year}-${seq}`;
}

async function generateExpenseNo(): Promise<string> {
  const repo = Source.getRepository(ExpenseEntry);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('e')
    .where(`EXTRACT(YEAR FROM e."createdAt") = :year`, { year })
    .getCount();
  const seq = String(count + 1).padStart(4, '0');
  return `EXP-${year}-${seq}`;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const createExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId } = req.user!;
    const { date, category, sub_category, description, amount, currency, receipt_url, notes } =
      req.body;

    if (!date || !category || !description || !amount) {
      throw new AppError('date, category, description and amount are required', 400);
    }

    const empInfo = await fetchEmployeeInfo(userId);
    const employeeName = empInfo?.name || 'Employee';
    const empBranchId = empInfo?.branchId || branchId || '';
    const branchName = empInfo?.branchName || 'Unknown Branch';

    const requestNo = await generateRequestNo();

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = repo.create({
      requestNo,
      employeeId: userId,
      employeeName,
      employeeRole: role,
      branchId: empBranchId,
      branchName,
      date,
      category,
      subCategory: sub_category,
      description,
      amount: parseFloat(amount),
      currency: currency || 'AED',
      receiptUrl: receipt_url,
      notes,
      status: 'PENDING',
    });

    const saved = await repo.save(request);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const getExpenseRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId, financeJob } = req.user!;
    const {
      status,
      category,
      from,
      to,
      employeeId: filterEmployeeId,
    } = req.query as Record<string, string>;

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const qb = repo.createQueryBuilder('r');

    const isFinanceManager = role === 'FINANCE' && financeJob === 'FINANCE_MANAGER';
    const isBranchManager = role === 'MANAGER';
    const isAdmin = role === 'ADMIN';

    if (isAdmin) {
      if (req.query.branchId) qb.andWhere('r."branchId" = :bid', { bid: req.query.branchId });
    } else if (isFinanceManager || isBranchManager) {
      qb.andWhere('r."branchId" = :bid', { bid: branchId });
    } else {
      // Employee, HR — own requests only
      qb.andWhere('r."employeeId" = :uid', { uid: userId });
    }

    if (isAdmin && filterEmployeeId) {
      qb.andWhere('r."employeeId" = :feid', { feid: filterEmployeeId });
    }
    if (status && status !== 'ALL') qb.andWhere('r.status = :status', { status });
    if (category && category !== 'ALL') qb.andWhere('r.category = :cat', { cat: category });
    if (from) qb.andWhere('r.date >= :from', { from });
    if (to) qb.andWhere('r.date <= :to', { to });

    qb.orderBy('r."createdAt"', 'DESC');

    const data = await qb.getMany();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExpenseRequestSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, branchId, financeJob } = req.user!;
    const isFinanceManager = role === 'FINANCE' && financeJob === 'FINANCE_MANAGER';
    const isBranchManager = role === 'MANAGER';
    const isAdmin = role === 'ADMIN';

    if (!isFinanceManager && !isBranchManager && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const qb = repo.createQueryBuilder('r');
    if (!isAdmin) {
      qb.andWhere('r."branchId" = :bid', { bid: branchId });
    } else if (req.query.branchIds) {
      const bids = (req.query.branchIds as string).split(',').filter(Boolean);
      if (bids.length) qb.andWhere('r."branchId" IN (:...bids)', { bids });
    }
    if (req.query.from) qb.andWhere('r.date >= :from', { from: req.query.from });
    if (req.query.to) qb.andWhere('r.date <= :to', { to: req.query.to });

    const all = await qb.getMany();

    const nowISO = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonth = all.filter((r) => String(r.date).slice(0, 7) === nowISO);

    const summarize = (list: EmployeeExpenseRequest[]) => ({
      count: list.length,
      total_amount: list.reduce((s, r) => s + Number(r.amount), 0),
    });

    const byCategory: Record<string, { total: number; count: number }> = {};
    const byEmployee: Record<string, { total: number; count: number; name: string }> = {};
    all.forEach((r) => {
      if (!byCategory[r.category]) byCategory[r.category] = { total: 0, count: 0 };
      byCategory[r.category].total += Number(r.amount);
      byCategory[r.category].count += 1;
      if (!byEmployee[r.employeeId])
        byEmployee[r.employeeId] = { total: 0, count: 0, name: r.employeeName };
      byEmployee[r.employeeId].total += Number(r.amount);
      byEmployee[r.employeeId].count += 1;
    });

    res.json({
      success: true,
      data: {
        pending: summarize(all.filter((r) => r.status === 'PENDING')),
        submitted: summarize(all.filter((r) => r.status === 'SUBMITTED')),
        approved: summarize(all.filter((r) => r.status === 'APPROVED')),
        rejected: summarize(all.filter((r) => r.status === 'REJECTED')),
        paid: summarize(all.filter((r) => r.status === 'PAID')),
        by_category: Object.entries(byCategory).map(([category, v]) => ({ category, ...v })),
        by_employee: Object.values(byEmployee).map((v) => ({
          employee_name: v.name,
          total: v.total,
          count: v.count,
        })),
        this_month_total: thisMonth.reduce((s, r) => s + Number(r.amount), 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getExpenseRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId, financeJob } = req.user!;
    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);

    const isFinanceManager = role === 'FINANCE' && financeJob === 'FINANCE_MANAGER';
    const isBranchManager = role === 'MANAGER';
    const isAdmin = role === 'ADMIN';
    const isOwner = request.employeeId === userId;

    if (!isOwner && !isFinanceManager && !isBranchManager && !isAdmin) {
      throw new AppError('Access denied', 403);
    }
    if ((isFinanceManager || isBranchManager) && request.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const updateExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.employeeId !== userId) throw new AppError('Access denied', 403);
    if (request.status !== 'PENDING')
      throw new AppError('Cannot edit a submitted expense request', 400);

    if (req.body.date !== undefined) request.date = req.body.date;
    if (req.body.category !== undefined) request.category = req.body.category;
    if (req.body.subCategory !== undefined) request.subCategory = req.body.subCategory;
    if (req.body.description !== undefined) request.description = req.body.description;
    if (req.body.amount !== undefined) request.amount = parseFloat(req.body.amount);
    if (req.body.currency !== undefined) request.currency = req.body.currency;
    if (req.body.receiptUrl !== undefined) request.receiptUrl = req.body.receiptUrl;
    if (req.body.notes !== undefined) request.notes = req.body.notes;
    if (req.body.sub_category !== undefined) request.subCategory = req.body.sub_category;
    if (req.body.receipt_url !== undefined) request.receiptUrl = req.body.receipt_url;

    const saved = await repo.save(request);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.employeeId !== userId) throw new AppError('Access denied', 403);
    if (request.status !== 'PENDING')
      throw new AppError('Cannot delete a submitted expense request', 400);
    await repo.remove(request);
    res.json({ success: true, message: 'Expense request deleted' });
  } catch (err) {
    next(err);
  }
};

export const submitExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.employeeId !== userId) throw new AppError('Access denied', 403);
    if (request.status !== 'PENDING')
      throw new AppError('Only PENDING requests can be submitted', 400);

    request.status = 'SUBMITTED';
    request.submittedAt = new Date();
    const saved = await repo.save(request);

    // Notify finance managers
    const fmIds = await findFinanceManagersOfBranch(request.branchId);
    for (const fmId of fmIds) {
      await sendNotification(
        fmId,
        'New Expense Request',
        `${request.employeeName} submitted ${request.currency} ${Number(request.amount).toFixed(2)} for ${request.category}`,
        'EXPENSE_REQUEST',
        '/finance/accounts/expenses?tab=requests',
      );
    }

    // Notify the branch Manager (branch-wide visibility) and all Admins
    // (cross-branch visibility) — same event, different audiences.
    const managerId = await findBranchManager(request.branchId);
    if (managerId) {
      await sendNotification(
        managerId,
        'Expense Request Submitted',
        `${request.employeeName} submitted a ${request.currency} ${Number(request.amount).toFixed(2)} expense request for ${request.category}.`,
        'EXPENSE_REQUEST',
        '/manager/expenses',
      );
    }
    const adminIds = await findAllAdmins();
    for (const adminId of adminIds) {
      await sendNotification(
        adminId,
        'Expense Request Submitted',
        `${request.employeeName} (branch ${request.branchName}) submitted a ${request.currency} ${Number(request.amount).toFixed(2)} expense request for ${request.category}.`,
        'EXPENSE_REQUEST',
      );
    }

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const approveExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId, financeJob } = req.user!;
    if (role !== 'FINANCE' || financeJob !== 'FINANCE_MANAGER') {
      throw new AppError('Only Finance Managers can approve expense requests', 403);
    }

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.branchId !== branchId) throw new AppError('Access denied: different branch', 403);
    if (request.status !== 'SUBMITTED')
      throw new AppError('Only SUBMITTED requests can be approved', 400);

    // ── MANAGER_PURCHASE approval path ─────────────────────────────────────────
    if (request.requestSource === 'MANAGER_PURCHASE') {
      const { notes } = req.body ?? {};
      const isCheque = (request.paymentMode ?? '').trim().toLowerCase() === 'cheque';

      if (isCheque) {
        // Cheque path: create the ISSUED cheque record (PENDING), no cash deduction yet.
        // PurchasePayment was already recorded at submission. Cash moves when Finance
        // marks the cheque Cleared in the Cheques module.
        await Source.transaction(async (manager) => {
          request.status = 'PAID';
          request.reviewedBy = userId;
          request.reviewedAt = new Date();
          request.paidAt = new Date();
          if (notes) request.notes = notes;
          await manager.save(EmployeeExpenseRequest, request);
        });

        // Create ISSUED cheque record (non-fatal if it fails)
        if (request.chequeNumber) {
          try {
            const chequeRepo = Source.getRepository(Cheque);
            const existing = await chequeRepo.findOne({
              where: { chequeNo: request.chequeNumber, branchId: request.branchId },
            });
            if (!existing) {
              const c = chequeRepo.create({
                chequeNo: request.chequeNumber,
                bankName: request.chequeBankName || undefined,
                partyName: request.vendorName || request.employeeName,
                amount: Number(request.amount),
                dueDate: request.chequeDueDate ? new Date(request.chequeDueDate) : new Date(),
                chequeDate: request.chequeDueDate ? new Date(request.chequeDueDate) : new Date(),
                issueDate: new Date(),
                type: 'ISSUED',
                status: 'PENDING',
                description: `Vendor purchase: ${request.purchaseRef || request.requestNo} — ${request.vendorName || 'vendor'}`,
                branchId: request.branchId,
                sourceType: 'PURCHASE',
                sourceReferenceId: request.purchaseId || undefined,
                sourceLabel: request.purchaseRef
                  ? `Purchase ${request.purchaseRef}`
                  : 'Purchase Order',
                createdBy: userId,
              });
              await chequeRepo.save(c);
            }
          } catch (err) {
            logger.error(
              '[approveExpenseRequest] Failed to create ISSUED cheque for MANAGER_PURCHASE',
              err,
            );
          }
        }
      } else {
        // Cash / Bank Transfer path: deduct from the Manager-selected account now.
        const accountId = request.paidFromAccountId;
        if (!accountId) {
          throw new AppError('No payment account stored on this request', 400);
        }

        // Generate cashbook ref BEFORE transaction (pool max=1)
        const cbYear = new Date().getFullYear();
        const cbCount = await Source.getRepository(CashbookEntry)
          .createQueryBuilder('c')
          .where(`EXTRACT(YEAR FROM c."createdAt") = :year`, { year: cbYear })
          .getCount();
        const cbRefNo = `CBK-${cbYear}-${String(cbCount + 1).padStart(5, '0')}`;

        await Source.transaction(async (manager) => {
          request.status = 'PAID';
          request.reviewedBy = userId;
          request.reviewedAt = new Date();
          request.paidAt = new Date();
          request.paidFromAccount = accountId;
          if (notes) request.notes = notes;
          await manager.save(EmployeeExpenseRequest, request);

          // Also verifies the account belongs to this branch — the previous plain
          // findOne({ id }) would accept an id from a different branch too.
          const account = await requireCashAccount(manager, {
            branchId: request.branchId,
            paymentMode: request.paymentMode,
            explicitAccountId: accountId,
            amountToDeduct: Number(request.amount),
          });
          account.currentBalance = Number(account.currentBalance) - Number(request.amount);
          await manager.save(CashBankAccount, account);

          const cbEntry = manager.create(CashbookEntry, {
            referenceNo: cbRefNo,
            date: new Date(),
            accountId,
            entryType: 'PAYMENT',
            amount: request.amount,
            category: 'Vendor Purchase',
            description: `Vendor payment: ${request.vendorName || 'vendor'} (${request.purchaseRef || request.requestNo})`,
            paymentMode: request.paymentMode || 'Cash',
            notes: notes || request.notes,
            createdBy: userId,
            branchId: request.branchId,
          });
          await manager.save(CashbookEntry, cbEntry);
        });

        // Record the PurchasePayment now — this is the moment cash actually left the
        // account, which is also the moment the purchase's Outstanding should actually
        // drop. Best-effort by design: the cash movement above is already committed and
        // must not roll back over a cross-service call; a failure here is logged and
        // leaves the purchase's own ledger correctable via ven_inv_service directly,
        // rather than silently under-recording what Finance just paid.
        if (request.purchaseId) {
          try {
            const venInvUrl = process.env.VEN_INV_SERVICE_URL || 'http://localhost:3003';
            const serviceToken = makeServiceToken();
            const venInvRes = await fetch(`${venInvUrl}/purchases/internal/record-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceToken}`,
                'x-internal-service': 'billing',
              },
              body: JSON.stringify({
                purchaseId: request.purchaseId,
                branchId: request.branchId,
                amount: Number(request.amount),
                paymentMethod: request.paymentMode,
                description: `Vendor payment — ${request.vendorName || 'vendor'} (${request.purchaseRef || request.requestNo})`,
                paymentDate: new Date().toISOString().split('T')[0],
                createdBy: userId,
                attachmentUrl: request.receiptUrl,
              }),
            });
            if (venInvRes.ok) {
              const venInvData = await venInvRes.json();
              request.purchasePaymentId = venInvData.data?.id;
              await Source.getRepository(EmployeeExpenseRequest).save(request);
            } else {
              const errText = await venInvRes.text();
              logger.error(
                '[approveExpenseRequest] Failed to record PurchasePayment after approval — cash was deducted but the purchase Outstanding was not reduced',
                {
                  requestId: request.id,
                  purchaseId: request.purchaseId,
                  status: venInvRes.status,
                  errText,
                },
              );
            }
          } catch (err) {
            logger.error(
              '[approveExpenseRequest] Failed to record PurchasePayment after approval — cash was deducted but the purchase Outstanding was not reduced',
              { requestId: request.id, purchaseId: request.purchaseId, err },
            );
          }
        }
      }

      // Notify the Manager
      await sendNotification(
        request.employeeId,
        'Purchase Payment Approved ✅',
        isCheque
          ? `Your ${request.currency} ${Number(request.amount).toFixed(2)} cheque payment to ${request.vendorName || 'vendor'} has been approved. Cheque is now ISSUED (PENDING clearance).`
          : `Your ${request.currency} ${Number(request.amount).toFixed(2)} payment to ${request.vendorName || 'vendor'} has been approved and funds deducted.`,
        'EXPENSE_APPROVED',
      );

      const updated = await repo.findOne({ where: { id: String(req.params.id) } });
      return res.json({ success: true, data: updated });
    }

    // ── EMPLOYEE_EXPENSE approval path ──────────────────────────────────────────
    const { paid_from_account, payment_reference, payment_mode, notes } = req.body ?? {};
    const payImmediately = !!paid_from_account;
    // Payment mode was never accepted from the client here — the account resolution
    // below then defaulted to requiring a BANK account regardless of what the caller
    // actually picked (accountTypeForMode(undefined) → 'BANK'), and the ExpenseEntry's
    // own paymentMode was hardcoded 'Cash' — so a Cash-mode payment failed with "a Bank
    // account is required" while a genuinely-paid Cash entry still displayed as Bank
    // nowhere reflecting what account was actually used. 'Bank Transfer' matches this
    // path's pre-existing default requirement when the caller omits it.
    const resolvedPaymentMode: string = payment_mode || 'Bank Transfer';

    // Fail before writing anything: validate the account's type/branch (and, since
    // this deducts money, that the account can actually cover it) up front.
    if (payImmediately) {
      await requireCashAccount(Source, {
        branchId: request.branchId,
        paymentMode: resolvedPaymentMode,
        explicitAccountId: paid_from_account,
        amountToDeduct: Number(request.amount),
      });
    }

    // Generate reference numbers BEFORE the transaction to avoid pool deadlock
    // (pool max=1 — calling Source.getRepository inside a transaction blocks the only connection)
    const expenseNo = await generateExpenseNo();
    let cbRefNo = '';
    if (payImmediately) {
      const cbRepo = Source.getRepository(CashbookEntry);
      const year = new Date().getFullYear();
      const cbCount = await cbRepo
        .createQueryBuilder('c')
        .where(`EXTRACT(YEAR FROM c."createdAt") = :year`, { year })
        .getCount();
      cbRefNo = `CBK-${year}-${String(cbCount + 1).padStart(5, '0')}`;
    }

    await Source.transaction(async (manager) => {
      // 1. Update request status
      request.status = payImmediately ? 'PAID' : 'APPROVED';
      request.reviewedBy = userId;
      request.reviewedAt = new Date();
      if (notes) request.notes = notes;
      if (payImmediately) {
        request.paidAt = new Date();
        request.paidFromAccount = paid_from_account;
        request.paymentReference = payment_reference;
      }
      await manager.save(EmployeeExpenseRequest, request);

      // 2. Create expense_entry
      const entry = manager.create(ExpenseEntry, {
        expenseNo,
        date: request.date,
        category: request.category,
        subCategory: request.subCategory,
        description: `[Employee: ${request.employeeName}] ${request.description}`,
        branchId: request.branchId,
        amount: request.amount,
        vatAmount: 0,
        netAmount: request.amount,
        currency: request.currency,
        status: payImmediately ? 'PAID' : 'APPROVED',
        approvedBy: userId,
        paidFrom: payImmediately ? paid_from_account : undefined,
        paymentMode: payImmediately ? resolvedPaymentMode : undefined,
        paymentDate: payImmediately ? new Date() : undefined,
        referenceNo: payment_reference || undefined,
        receiptUrl: request.receiptUrl,
        notes: request.notes,
        createdBy: userId,
      });
      const savedEntry = await manager.save(ExpenseEntry, entry);

      // 3. Link expense entry back to request
      request.expenseEntryId = savedEntry.id;
      await manager.save(EmployeeExpenseRequest, request);

      // 4. If paying immediately: deduct from account + create cashbook entry
      if (payImmediately) {
        // Type/branch/balance were already validated above; re-resolve through this
        // transaction's manager so the deduction below rolls back with everything else.
        const account = await requireCashAccount(manager, {
          branchId: request.branchId,
          paymentMode: resolvedPaymentMode,
          explicitAccountId: paid_from_account,
        });
        account.currentBalance = Number(account.currentBalance) - Number(request.amount);
        await manager.save(CashBankAccount, account);

        const cbEntry = manager.create(CashbookEntry, {
          referenceNo: cbRefNo,
          date: new Date(),
          accountId: paid_from_account,
          entryType: 'PAYMENT',
          amount: request.amount,
          category: 'Expense',
          description: `Employee expense: ${request.employeeName} - ${request.category}`,
          linkedExpenseId: savedEntry.id,
          paymentMode: resolvedPaymentMode,
          chequeNo: payment_reference || undefined,
          notes,
          createdBy: userId,
          branchId: request.branchId,
        });
        await manager.save(CashbookEntry, cbEntry);
      }
    });

    // Notify employee
    const wasPaid = !!paid_from_account;
    await sendNotification(
      request.employeeId,
      wasPaid ? 'Expense Approved & Paid ✅' : 'Expense Approved ✅',
      wasPaid
        ? `Your expense of ${request.currency} ${Number(request.amount).toFixed(2)} for ${request.category} has been approved and paid`
        : `Your expense of ${request.currency} ${Number(request.amount).toFixed(2)} for ${request.category} has been approved`,
      'EXPENSE_APPROVED',
    );

    // Notify the branch Manager and all Admins of the outcome too.
    const managerId = await findBranchManager(request.branchId);
    if (managerId) {
      await sendNotification(
        managerId,
        'Expense Request Approved',
        `${request.employeeName}'s ${request.currency} ${Number(request.amount).toFixed(2)} expense for ${request.category} was approved.`,
        'EXPENSE_APPROVED',
        '/manager/expenses',
      );
    }
    for (const adminId of await findAllAdmins()) {
      await sendNotification(
        adminId,
        'Expense Request Approved',
        `${request.employeeName}'s (branch ${request.branchName}) ${request.currency} ${Number(request.amount).toFixed(2)} expense for ${request.category} was approved.`,
        'EXPENSE_APPROVED',
      );
    }

    const updated = await repo.findOne({ where: { id: String(req.params.id) } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const rejectExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId, financeJob } = req.user!;
    if (role !== 'FINANCE' || financeJob !== 'FINANCE_MANAGER') {
      throw new AppError('Only Finance Managers can reject expense requests', 403);
    }

    const { rejection_reason } = req.body;
    if (!rejection_reason || rejection_reason.trim().length < 5) {
      throw new AppError('rejection_reason is required (min 5 chars)', 400);
    }

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.branchId !== branchId) throw new AppError('Access denied: different branch', 403);
    if (request.status !== 'SUBMITTED')
      throw new AppError('Only SUBMITTED requests can be rejected', 400);

    request.status = 'REJECTED';
    request.reviewedBy = userId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejection_reason.trim();
    const saved = await repo.save(request);

    if (request.requestSource === 'MANAGER_PURCHASE') {
      // No PurchasePayment to reverse: it's now only ever recorded when Finance
      // approves (Cash/Bank) or when the resulting cheque clears — a SUBMITTED
      // request being rejected here never had one to begin with, so the purchase's
      // Outstanding was never touched and needs no restoring.
      await sendNotification(
        request.employeeId,
        'Purchase Payment Rejected ❌',
        `Your ${request.currency} ${Number(request.amount).toFixed(2)} payment request to ${request.vendorName || 'vendor'} was rejected. Reason: ${rejection_reason}. No cash was moved and the purchase's outstanding balance is unchanged.`,
        'EXPENSE_REJECTED',
      );
    } else {
      await sendNotification(
        request.employeeId,
        'Expense Rejected ❌',
        `Your ${request.category} expense was rejected. Reason: ${rejection_reason}. You can resubmit after corrections.`,
        'EXPENSE_REJECTED',
      );

      // Notify the branch Manager and all Admins of the outcome too.
      const managerId = await findBranchManager(request.branchId);
      if (managerId) {
        await sendNotification(
          managerId,
          'Expense Request Rejected',
          `${request.employeeName}'s ${request.currency} ${Number(request.amount).toFixed(2)} expense for ${request.category} was rejected. Reason: ${rejection_reason}.`,
          'EXPENSE_REJECTED',
          '/manager/expenses',
        );
      }
      for (const adminId of await findAllAdmins()) {
        await sendNotification(
          adminId,
          'Expense Request Rejected',
          `${request.employeeName}'s (branch ${request.branchName}) ${request.currency} ${Number(request.amount).toFixed(2)} expense for ${request.category} was rejected. Reason: ${rejection_reason}.`,
          'EXPENSE_REJECTED',
        );
      }
    }

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── Manager Purchase Payment Request ─────────────────────────────────────────
// Called directly by the Manager's AddPaymentModal (JWT-authenticated).
// Records the PurchasePayment in ven_inv immediately (outstanding reduces) but
// holds the cash movement until Finance approves.

export const createManagerPurchasePaymentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, role, branchId } = req.user!;
    if (role !== 'MANAGER') {
      throw new AppError('Only Branch Managers can submit purchase payment requests', 403);
    }

    const {
      purchaseId,
      purchaseRef,
      vendorName,
      amount,
      paymentMethod,
      paidFromAccountId,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
      description,
      referenceNumber,
      paymentDate,
      currency,
    } = req.body;

    if (!purchaseId || !amount || !paymentMethod) {
      throw new AppError('purchaseId, amount, and paymentMethod are required', 400);
    }

    const empInfo = await fetchEmployeeInfo(userId);
    const managerName = empInfo?.name || 'Branch Manager';
    const empBranchId = empInfo?.branchId || branchId || '';
    const branchName = empInfo?.branchName || 'Unknown Branch';

    // Block before writing anything: cash doesn't move until Finance approves (that
    // step already validates the account), but a Manager could otherwise submit a
    // request naming no real account for a branch with none configured. Cheque
    // doesn't need this — it never enters the approval queue at all (see below).
    if (paymentMethod !== 'Cheque') {
      // Balance is checked again (authoritatively) at Finance's approval, since it can
      // move between now and then — this is early feedback, not the only gate.
      await requireCashAccount(Source, {
        branchId: empBranchId,
        paymentMode: paymentMethod,
        explicitAccountId: paidFromAccountId,
        amountToDeduct: Number(amount),
      });
    }

    // Payment proof uploaded by the Manager (multipart `proof` field → R2).
    const proofFile = req.file as { key?: string } | undefined;
    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';
    const proofUrl = proofFile?.key ? `${R2_BASE_URL}/${proofFile.key}` : undefined;

    // The PurchasePayment (which is what actually reduces the vendor's outstanding
    // balance) is deliberately NOT recorded here. It used to be created immediately on
    // submission — before Finance had approved anything and before any real cash had
    // moved — so a purchase's Outstanding on the Payable page dropped (or, for a fully-
    // covering request, disappeared entirely) the instant a Manager merely *asked* to
    // pay it. A request Finance goes on to reject left that reduction in place until an
    // explicit void-payment call reversed it — a window where the books were wrong by
    // construction. Recording it only happens now at the point cash genuinely moves:
    // Finance's approval for Cash/Bank (approveExpenseRequest), or the cheque actually
    // clearing (chequesRoutes /:id/clear) for Cheque — see purchaseOrigin lookup below,
    // which no longer depends on record-payment's response.
    let purchaseOrigin: string | undefined;
    try {
      const venInvUrl = process.env.VEN_INV_SERVICE_URL || 'http://localhost:3003';
      const serviceToken = makeServiceToken();
      const purchaseRes = await fetch(`${venInvUrl}/purchases/${purchaseId}`, {
        headers: { Authorization: `Bearer ${serviceToken}`, 'x-internal-service': 'billing' },
      });
      if (purchaseRes.ok) {
        const purchaseData = await purchaseRes.json();
        purchaseOrigin = (purchaseData.data ?? purchaseData)?.purchaseOrigin;
      }
    } catch {
      /* origin enrichment is best-effort, same as the old record-payment response path */
    }

    // Step 2: Route by paymentMethod.
    // Cheque → bypass approval queue; create ISSUED cheque directly (Cheques-to-Vendors page).
    // Cash / Bank → go through Finance approval queue (existing flow).
    // Case-insensitive on purpose. This was an exact `=== 'Cheque'` match, so a caller
    // sending 'CHEQUE' or 'cheque' — which ven_inv_service does, since it passes through
    // whatever the client supplied — fell straight through to the Cash/Bank branch below.
    // The result was that a vendor paid by cheque got NO cheque record at all (invisible in
    // the register, no dates, no reminder, no clear/bounce lifecycle) AND had the bank
    // debited immediately, before the cheque had cleared. The cheque-handling code here was
    // correct all along; it simply never ran.
    if (
      String(paymentMethod ?? '')
        .trim()
        .toUpperCase() === 'CHEQUE'
    ) {
      const chequeRepo = Source.getRepository(Cheque);
      const chequeNo = chequeNumber || referenceNumber || `CHQ-${Date.now()}`;
      const existing = await chequeRepo.findOne({ where: { chequeNo, branchId: empBranchId } });
      if (!existing) {
        const cheque = chequeRepo.create({
          chequeNo,
          bankName: chequeBankName || undefined,
          partyName: vendorName || 'Vendor',
          amount: parseFloat(String(amount)),
          dueDate: chequeDueDate ? new Date(chequeDueDate) : new Date(),
          chequeDate: chequeDueDate ? new Date(chequeDueDate) : new Date(),
          issueDate: paymentDate ? new Date(paymentDate) : new Date(),
          type: 'ISSUED',
          status: 'PENDING',
          description:
            description || `Vendor payment — ${vendorName || 'vendor'} (${purchaseRef || 'N/A'})`,
          branchId: empBranchId,
          sourceType: 'PURCHASE',
          sourceReferenceId: purchaseId,
          sourceLabel: purchaseRef ? `Purchase ${purchaseRef}` : 'Purchase Order',
          createdBy: userId,
        });
        await chequeRepo.save(cheque);
      }
      logger.info('[ManagerPurchaseReq] Cheque created directly (no approval queue)', {
        chequeNo,
        purchaseId,
        amount,
      });
      return res.status(201).json({
        success: true,
        data: {
          chequeNo,
          message:
            'PENDING cheque created. Go to Accounts → Cheques to issue when handed to vendor.',
        },
      });
    }

    // Cash / Bank: create approval-queue request and hold funds until Finance approves.
    const requestNo = await generateRequestNo();
    const repo = Source.getRepository(EmployeeExpenseRequest);

    const request = repo.create({
      requestNo,
      employeeId: userId,
      employeeName: managerName,
      employeeRole: 'MANAGER',
      branchId: empBranchId,
      branchName,
      date: paymentDate ? new Date(paymentDate) : new Date(),
      category: 'Vendor Purchase',
      subCategory: paymentMethod,
      description:
        description || `Vendor payment — ${vendorName || 'vendor'} (${purchaseRef || 'N/A'})`,
      amount: parseFloat(String(amount)),
      currency: currency || 'AED',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      requestSource: 'MANAGER_PURCHASE',
      purchaseId,
      purchaseRef: purchaseRef || undefined,
      vendorName: vendorName || undefined,
      purchaseOrigin: purchaseOrigin || undefined,
      receiptUrl: proofUrl,
      paymentMode: paymentMethod,
      paidFromAccountId: paidFromAccountId || undefined,
      chequeNumber: chequeNumber || undefined,
      chequeBankName: chequeBankName || undefined,
      chequeDueDate: chequeDueDate ? new Date(chequeDueDate) : undefined,
      notes: `Manager purchase payment request. Outstanding on the purchase stays unchanged and no cash has moved yet — both happen together when Finance approves this request.`,
    });

    const saved = await repo.save(request);

    // Notify Finance Managers to review.
    const fmIds = await findFinanceManagersOfBranch(empBranchId);
    for (const fmId of fmIds) {
      await sendNotification(
        fmId,
        'Purchase Payment — Approval Required',
        `${managerName} requests ${currency || 'AED'} ${parseFloat(String(amount)).toFixed(2)} payment to ${vendorName || 'vendor'} via ${paymentMethod}. Cash held until you approve.`,
        'EXPENSE_REQUEST',
        '/finance/accounts/expenses?tab=requests',
      );
    }

    logger.info('[ManagerPurchaseReq] Created successfully', {
      requestNo,
      purchaseId,
      amount,
      paymentMethod,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── Internal endpoint (called by ven_inv_service after purchase payment) ─────

export const createExpenseRequestFromPurchasePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.headers['x-internal-service'] !== 'ven-inv') {
      throw new AppError('Unauthorized', 401);
    }

    const {
      employeeId,
      branchId,
      amount,
      paymentMethod,
      currency,
      vendorName,
      purchaseRef,
      purchaseId,
      purchaseOrigin,
      description,
      attachmentUrl,
      date,
      paidFromAccountId,
    } = req.body;

    if (!employeeId || !branchId || !amount) {
      throw new AppError('employeeId, branchId and amount are required', 400);
    }

    const empInfo = await fetchEmployeeInfo(employeeId);
    const employeeName = empInfo?.name || 'Branch Manager';
    const branchName = empInfo?.branchName || 'Unknown Branch';

    // CHQ4 (docs/production-readiness-audit-2026-08-13.md): this handler used to treat
    // the payment as already-spent — deduct cash immediately, file the request as
    // EMPLOYEE_EXPENSE for Finance's awareness only, no real approval gate — and never
    // handled Cheque at all (an exact-case check meant 'CHEQUE'/'cheque' fell through
    // to the cash branch, debiting the bank before the cheque had even cleared, with no
    // Cheque record created anywhere). Now mirrors createManagerPurchasePaymentRequest
    // exactly: Cheque creates a real ISSUED cheque and stops there (money moves at
    // Clear); Cash/Bank goes into the same MANAGER_PURCHASE approval queue, and cash
    // only actually moves — together with the PurchasePayment that reduces this
    // purchase's Outstanding — when Finance approves it (approveExpenseRequest).
    if (
      String(paymentMethod ?? '')
        .trim()
        .toUpperCase() === 'CHEQUE'
    ) {
      const chequeRepo = Source.getRepository(Cheque);
      const chequeNo = `CHQ-${Date.now()}`;
      const cheque = chequeRepo.create({
        chequeNo,
        partyName: vendorName || 'Vendor',
        amount: parseFloat(String(amount)),
        dueDate: date ? new Date(date) : new Date(),
        chequeDate: date ? new Date(date) : new Date(),
        issueDate: date ? new Date(date) : new Date(),
        type: 'ISSUED',
        status: 'PENDING',
        description:
          description || `Vendor payment — ${vendorName || 'vendor'} (${purchaseRef || 'N/A'})`,
        branchId,
        sourceType: 'PURCHASE',
        sourceReferenceId: purchaseId,
        sourceLabel: purchaseRef ? `Purchase ${purchaseRef}` : 'Purchase Order',
        createdBy: employeeId,
      });
      await chequeRepo.save(cheque);

      logger.info('[ExpenseRequest] Cheque created for purchase payment (no cash deducted)', {
        chequeNo,
        purchaseId,
        amount,
      });

      const fmIdsChq = await findFinanceManagersOfBranch(branchId);
      for (const fmId of fmIdsChq) {
        await sendNotification(
          fmId,
          'Vendor Cheque Issued',
          `${employeeName} issued a ${currency || 'AED'} ${Number(amount).toFixed(2)} cheque to ${vendorName || 'vendor'} (${purchaseRef || 'N/A'}). Go to Accounts → Cheques to track it through to clearance.`,
          'EXPENSE_REQUEST',
          '/finance/accounts/cheques',
        );
      }

      return res.status(201).json({
        success: true,
        data: { chequeNo, message: 'PENDING cheque created — no cash moves until it clears.' },
      });
    }

    // Cash / Bank: same early feedback as createManagerPurchasePaymentRequest — check
    // now, authoritatively re-check at Finance's approval, since balance can move
    // between now and then.
    await requireCashAccount(Source, {
      branchId,
      paymentMode: paymentMethod,
      explicitAccountId: paidFromAccountId,
      actionLabel: 'recording a vendor purchase payment',
      amountToDeduct: parseFloat(String(amount)),
    });

    const requestNo = await generateRequestNo();
    const repo = Source.getRepository(EmployeeExpenseRequest);

    const request = repo.create({
      requestNo,
      employeeId,
      employeeName,
      employeeRole: 'MANAGER',
      branchId,
      branchName,
      date: date ? new Date(date) : new Date(),
      category: 'Vendor Purchase',
      subCategory: paymentMethod || 'Cash',
      description: description || `Purchase payment to ${vendorName || 'vendor'}`,
      amount: parseFloat(String(amount)),
      currency: currency || 'AED',
      receiptUrl: attachmentUrl || undefined,
      requestSource: 'MANAGER_PURCHASE',
      purchaseId: purchaseId || undefined,
      purchaseRef: purchaseRef || undefined,
      vendorName: vendorName || undefined,
      purchaseOrigin: purchaseOrigin || undefined,
      paymentMode: paymentMethod || undefined,
      paidFromAccountId: paidFromAccountId || undefined,
      notes: `Purchase payment request. Outstanding on the purchase stays unchanged and no cash has moved yet — both happen together when Finance approves this request.`,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    const saved = await repo.save(request);

    const fmIds = await findFinanceManagersOfBranch(branchId);
    for (const fmId of fmIds) {
      await sendNotification(
        fmId,
        'Purchase Payment — Approval Required',
        `${employeeName} requests ${currency || 'AED'} ${Number(amount).toFixed(2)} payment to ${vendorName || 'vendor'} (${purchaseRef || 'N/A'}) via ${paymentMethod || 'Cash'}. Cash held until you approve.`,
        'EXPENSE_REQUEST',
        '/finance/accounts/expenses?tab=requests',
      );
    }

    logger.info('[ExpenseRequest] Auto-created from purchase payment', {
      requestNo,
      employeeId,
      branchId,
      amount,
      purchaseRef,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const payExpenseRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, branchId, financeJob } = req.user!;
    if (role !== 'FINANCE' || financeJob !== 'FINANCE_MANAGER') {
      throw new AppError('Only Finance Managers can record payments', 403);
    }

    const {
      paid_from_account,
      payment_reference,
      payment_mode,
      cheque_number,
      cheque_bank_name,
      cheque_due_date,
      notes,
    } = req.body;
    const isCheque = (payment_mode ?? '').trim().toLowerCase() === 'cheque';

    if (!isCheque && !paid_from_account) {
      throw new AppError('paid_from_account is required for Cash/Bank payments', 400);
    }
    if (isCheque && (!cheque_number || !cheque_due_date)) {
      throw new AppError('cheque_number and cheque_due_date are required for Cheque payments', 400);
    }

    const repo = Source.getRepository(EmployeeExpenseRequest);
    const request = await repo.findOne({ where: { id: String(req.params.id) } });
    if (!request) throw new AppError('Expense request not found', 404);
    if (request.branchId !== branchId) throw new AppError('Access denied: different branch', 403);
    if (request.status !== 'APPROVED')
      throw new AppError('Only APPROVED requests can be paid', 400);

    if (isCheque) {
      // Cheque path: mark the REQUEST paid (Finance has done its part — chosen and
      // issued a settlement) but deliberately leave the linked ExpenseEntry at
      // 'APPROVED', not 'PAID'. The Payable page's Outstanding comes from
      // fetchExpenseEntries({status: 'APPROVED'}) — flipping it to PAID here (as this
      // used to) made the expense vanish from Outstanding the instant a cheque was
      // merely issued, while the cheque itself sat PENDING and no cash had actually
      // moved. It only genuinely becomes PAID when the cheque clears — see the
      // sourceType === 'EXPENSE' branch in chequesRoutes.ts's /:id/clear handler,
      // which flips it then instead.
      await Source.transaction(async (manager) => {
        request.status = 'PAID';
        request.paidAt = new Date();
        request.paidFromAccount = undefined;
        request.paymentReference = cheque_number;
        await manager.save(EmployeeExpenseRequest, request);
      });

      // Create PENDING ISSUED cheque record (non-fatal if it fails)
      try {
        const chequeRepo = Source.getRepository(Cheque);
        const existing = await chequeRepo.findOne({
          where: { chequeNo: cheque_number, branchId: request.branchId },
        });
        if (!existing) {
          const c = chequeRepo.create({
            chequeNo: cheque_number,
            bankName: cheque_bank_name || undefined,
            partyName: request.employeeName,
            amount: Number(request.amount),
            dueDate: new Date(cheque_due_date),
            chequeDate: new Date(cheque_due_date),
            issueDate: new Date(),
            type: 'ISSUED',
            status: 'PENDING',
            description: `Employee expense: ${request.requestNo} — ${request.category}`,
            branchId: request.branchId,
            sourceType: 'EXPENSE',
            sourceReferenceId: request.id,
            sourceLabel: `Expense ${request.requestNo}`,
            createdBy: userId,
          });
          await chequeRepo.save(c);
        }
      } catch (err) {
        logger.error('[payExpenseRequest] Failed to create ISSUED cheque record', err);
      }
    } else {
      // Cash / Bank Transfer path: move balance immediately
      // Generate cashbook ref BEFORE the transaction (pool max=1 — calling Source.getRepository inside a transaction blocks the only connection)
      const cbYear = new Date().getFullYear();
      const cbCount = await Source.getRepository(CashbookEntry)
        .createQueryBuilder('c')
        .where(`EXTRACT(YEAR FROM c."createdAt") = :year`, { year: cbYear })
        .getCount();
      const cbRefNo = `CBK-${cbYear}-${String(cbCount + 1).padStart(5, '0')}`;

      await Source.transaction(async (manager) => {
        request.status = 'PAID';
        request.paidAt = new Date();
        request.paidFromAccount = paid_from_account;
        request.paymentReference = payment_reference;
        await manager.save(EmployeeExpenseRequest, request);

        if (request.expenseEntryId) {
          await manager.update(ExpenseEntry, request.expenseEntryId, {
            status: 'PAID',
            paidFrom: paid_from_account,
            paymentMode: payment_mode ?? 'Bank Transfer',
            paymentDate: new Date(),
            referenceNo: payment_reference,
          });
        }

        // Used to skip the deduction and still mark the request/entry PAID when the
        // account wasn't found — now blocks the whole payment instead.
        const account = await requireCashAccount(manager, {
          branchId: request.branchId,
          paymentMode: payment_mode,
          explicitAccountId: paid_from_account,
          amountToDeduct: Number(request.amount),
        });
        account.currentBalance = Number(account.currentBalance) - Number(request.amount);
        await manager.save(CashBankAccount, account);

        const cbEntry = manager.create(CashbookEntry, {
          referenceNo: cbRefNo,
          date: new Date(),
          accountId: account.id,
          entryType: 'PAYMENT',
          amount: request.amount,
          category: 'Expense',
          description: `Employee expense: ${request.employeeName} - ${request.category}`,
          linkedExpenseId: request.expenseEntryId,
          paymentMode: payment_mode ?? 'Bank Transfer',
          chequeNo: payment_reference,
          notes,
          createdBy: userId,
          branchId: request.branchId,
        });
        await manager.save(CashbookEntry, cbEntry);
      });
    }

    await sendNotification(
      request.employeeId,
      'Expense Paid 💰',
      `${request.currency} ${Number(request.amount).toFixed(2)} for ${request.category} has been paid. Reference: ${payment_reference || 'N/A'}`,
      'EXPENSE_PAID',
    );

    const updated = await repo.findOne({ where: { id: String(req.params.id) } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
