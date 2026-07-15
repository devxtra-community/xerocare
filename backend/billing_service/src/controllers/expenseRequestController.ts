import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
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

    const { paid_from_account, payment_reference, notes } = req.body ?? {};
    const payImmediately = !!paid_from_account;

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
        paymentMode: payImmediately ? 'Cash' : undefined,
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
        const accountRepo = manager.getRepository(CashBankAccount);
        const account = await accountRepo.findOne({ where: { id: paid_from_account } });
        if (account) {
          account.currentBalance = Number(account.currentBalance) - Number(request.amount);
          await manager.save(CashBankAccount, account);
        }

        const cbEntry = manager.create(CashbookEntry, {
          referenceNo: cbRefNo,
          date: new Date(),
          accountId: paid_from_account,
          entryType: 'PAYMENT',
          amount: request.amount,
          category: 'Expense',
          description: `Employee expense: ${request.employeeName} - ${request.category}`,
          linkedExpenseId: savedEntry.id,
          paymentMode: 'Cash',
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

    await sendNotification(
      request.employeeId,
      'Expense Rejected ❌',
      `Your ${request.category} expense was rejected. Reason: ${rejection_reason}. You can resubmit after corrections.`,
      'EXPENSE_REJECTED',
    );

    res.json({ success: true, data: saved });
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
      // Cheque path: mark paid, create PENDING ISSUED cheque — no balance movement until CLEARED
      await Source.transaction(async (manager) => {
        request.status = 'PAID';
        request.paidAt = new Date();
        request.paidFromAccount = undefined;
        request.paymentReference = cheque_number;
        await manager.save(EmployeeExpenseRequest, request);

        if (request.expenseEntryId) {
          await manager.update(ExpenseEntry, request.expenseEntryId, {
            status: 'PAID',
            paymentMode: 'Cheque',
            paymentDate: new Date(),
            referenceNo: cheque_number,
          });
        }
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

        const accountRepo = manager.getRepository(CashBankAccount);
        const account = await accountRepo.findOne({ where: { id: paid_from_account } });
        if (account) {
          account.currentBalance = Number(account.currentBalance) - Number(request.amount);
          await manager.save(CashBankAccount, account);
        } else {
          logger.warn(
            `[payExpenseRequest] Account ${paid_from_account} not found — balance not deducted`,
          );
        }

        const cbEntry = manager.create(CashbookEntry, {
          referenceNo: cbRefNo,
          date: new Date(),
          accountId: paid_from_account,
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
