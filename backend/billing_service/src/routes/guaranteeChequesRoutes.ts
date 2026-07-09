import { Router } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import {
  GuaranteeCheque,
  GuaranteeChequeStatus,
  GuaranteeChequePurpose,
} from '../entities/guaranteeChequeEntity';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';

const router = Router();

// ── GET /stats — summary counts/amounts, branch-filtered ─────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const bf = req.branchFilter ?? [];
    const branchClause =
      bf.length === 0
        ? ''
        : bf.length === 1
          ? `AND gc.branch_id = '${bf[0]}'`
          : `AND gc.branch_id IN (${bf.map((b) => `'${b}'`).join(',')})`;

    const rows = await Source.query<
      {
        held_count: string;
        held_amount: string;
        returned_count: string;
        returned_amount: string;
        pending_return_count: string;
      }[]
    >(`
      SELECT
        COUNT(*) FILTER (WHERE gc.status = 'RECEIVED')                                      AS held_count,
        COALESCE(SUM(gc.amount) FILTER (WHERE gc.status = 'RECEIVED'), 0)                   AS held_amount,
        COUNT(*) FILTER (WHERE gc.status = 'RETURNED')                                      AS returned_count,
        COALESCE(SUM(gc.amount) FILTER (WHERE gc.status = 'RETURNED'), 0)                   AS returned_amount,
        COUNT(*) FILTER (
          WHERE gc.status = 'RECEIVED'
            AND gc.contract_invoice_id IS NOT NULL
            AND i.status IN ('EXPIRED', 'CANCELLED')
        )                                                                                    AS pending_return_count
      FROM guarantee_cheques gc
      LEFT JOIN invoices i ON i.id = gc.contract_invoice_id
      WHERE gc.deleted_at IS NULL
      ${branchClause}
    `);

    const r = rows[0];
    res.json({
      success: true,
      data: {
        heldCount: parseInt(r.held_count, 10),
        heldAmount: parseFloat(r.held_amount),
        returnedCount: parseInt(r.returned_count, 10),
        returnedAmount: parseFloat(r.returned_amount),
        pendingReturnCount: parseInt(r.pending_return_count, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /customer-contracts/:customerId — RENT/LEASE/PRODUCT_SALE invoices ───
router.get('/customer-contracts/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const bf = req.branchFilter ?? [];
    const branchClause =
      bf.length === 0
        ? ''
        : bf.length === 1
          ? `AND "branchId" = '${bf[0]}'`
          : `AND "branchId" IN (${bf.map((b) => `'${b}'`).join(',')})`;
    const rows = await Source.query<
      { id: string; invoiceNumber: string; saleType: string; status: string; totalAmount: string }[]
    >(
      `SELECT id, "invoiceNumber", "saleType", status, "totalAmount", "createdAt"
       FROM invoices
       WHERE "customerId" = $1
         AND "saleType" IN ('RENT', 'LEASE', 'PRODUCT_SALE')
         AND status != 'CANCELLED'
         AND "deletedAt" IS NULL
         ${branchClause}
       ORDER BY "createdAt" DESC
       LIMIT 100`,
      [customerId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET / — list guarantee cheques, branch-filtered ──────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status, purpose, customerId, dateFrom, dateTo, search } = req.query;

    const repo = Source.getRepository(GuaranteeCheque);
    const qb = repo
      .createQueryBuilder('gc')
      .where('gc.deletedAt IS NULL')
      .orderBy('gc.receivedDate', 'DESC');

    applyBranchQB(qb, 'gc', req.branchFilter ?? []);

    if (status && status !== 'ALL') qb.andWhere('gc.status = :status', { status });
    if (purpose && purpose !== 'ALL') qb.andWhere('gc.purpose = :purpose', { purpose });
    if (customerId) qb.andWhere('gc.customerId = :customerId', { customerId });
    if (dateFrom) qb.andWhere('gc.receivedDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('gc.receivedDate <= :dateTo', { dateTo });
    if (search) {
      qb.andWhere(
        '(gc.customerName ILIKE :s OR gc.chequeNumber ILIKE :s OR gc.bankName ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const cheques = await qb.getMany();
    res.json({ success: true, data: cheques });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single guarantee cheque ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const repo = Source.getRepository(GuaranteeCheque);
    const qb = repo
      .createQueryBuilder('gc')
      .where('gc.id = :id', { id: req.params.id })
      .andWhere('gc.deletedAt IS NULL');

    applyBranchQB(qb, 'gc', req.branchFilter ?? []);

    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Guarantee cheque not found', 404);
    res.json({ success: true, data: cheque });
  } catch (err) {
    next(err);
  }
});

// ── POST / — create guarantee cheque ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    const {
      customerId,
      customerName,
      contractInvoiceId,
      contractReference,
      chequeNumber,
      amount,
      currencyCode,
      bankName,
      receivedDate,
      purpose,
      notes,
    } = req.body;

    if (!customerId) throw new AppError('customerId is required', 400);
    if (!customerName) throw new AppError('customerName is required', 400);
    if (!chequeNumber) throw new AppError('chequeNumber is required', 400);
    if (!amount || Number(amount) <= 0) throw new AppError('amount must be > 0', 400);
    if (!bankName) throw new AppError('bankName is required', 400);
    if (!receivedDate) throw new AppError('receivedDate is required', 400);

    const repo = Source.getRepository(GuaranteeCheque);
    const cheque = repo.create({
      customerId,
      customerName,
      contractInvoiceId: contractInvoiceId || null,
      contractReference: contractReference || null,
      chequeNumber,
      amount: Number(amount),
      currencyCode: currencyCode || 'AED',
      bankName,
      receivedDate,
      purpose: purpose || GuaranteeChequePurpose.PERFORMANCE_SECURITY,
      status: GuaranteeChequeStatus.RECEIVED, // always starts RECEIVED — ignore client-sent status
      branchId: branchId!,
      createdBy: userId,
      notes: notes || null,
    });

    const saved = await repo.save(cheque);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id — edit correctable fields ───────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const repo = Source.getRepository(GuaranteeCheque);
    const qb = repo
      .createQueryBuilder('gc')
      .where('gc.id = :id', { id: req.params.id })
      .andWhere('gc.deletedAt IS NULL');
    applyBranchQB(qb, 'gc', req.branchFilter ?? []);

    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Guarantee cheque not found', 404);

    const {
      chequeNumber,
      amount,
      currencyCode,
      bankName,
      notes,
      contractInvoiceId,
      contractReference,
      receivedDate,
      purpose,
    } = req.body;

    if (chequeNumber !== undefined) cheque.chequeNumber = chequeNumber;
    if (amount !== undefined) cheque.amount = Number(amount);
    if (currencyCode !== undefined) cheque.currencyCode = currencyCode;
    if (bankName !== undefined) cheque.bankName = bankName;
    if (notes !== undefined) cheque.notes = notes;
    if (contractInvoiceId !== undefined) cheque.contractInvoiceId = contractInvoiceId || null;
    if (contractReference !== undefined) cheque.contractReference = contractReference || null;
    if (receivedDate !== undefined) cheque.receivedDate = receivedDate;
    if (purpose !== undefined) cheque.purpose = purpose;
    // Status is NOT editable via PUT — use the /return action endpoint

    const updated = await repo.save(cheque);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/return — RECEIVED → RETURNED (only valid transition) ────────────
router.post('/:id/return', async (req, res, next) => {
  try {
    const { returnedDate } = req.body;
    if (!returnedDate) throw new AppError('returnedDate is required', 400);

    const repo = Source.getRepository(GuaranteeCheque);
    const qb = repo
      .createQueryBuilder('gc')
      .where('gc.id = :id', { id: req.params.id })
      .andWhere('gc.deletedAt IS NULL');
    applyBranchQB(qb, 'gc', req.branchFilter ?? []);

    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Guarantee cheque not found', 404);
    if (cheque.status === GuaranteeChequeStatus.RETURNED) {
      throw new AppError('This guarantee cheque has already been returned', 400);
    }

    cheque.status = GuaranteeChequeStatus.RETURNED;
    cheque.returnedDate = returnedDate;
    const updated = await repo.save(cheque);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — soft-delete ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const repo = Source.getRepository(GuaranteeCheque);
    const qb = repo
      .createQueryBuilder('gc')
      .where('gc.id = :id', { id: req.params.id })
      .andWhere('gc.deletedAt IS NULL');
    applyBranchQB(qb, 'gc', req.branchFilter ?? []);

    const cheque = await qb.getOne();
    if (!cheque) throw new AppError('Guarantee cheque not found', 404);

    cheque.deletedAt = new Date();
    await repo.save(cheque);
    res.json({ success: true, message: 'Guarantee cheque deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
