import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CardProcessingFeeRule } from '../entities/cardProcessingFeeRuleEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { Invoice } from '../entities/invoiceEntity';
import { calculateCardProcessingFee } from '../services/cardProcessingFeeService';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { requireCashAccount } from '../services/cashbookService';
import { toMinor, fromMinor, percentOfMinor } from '../utils/money';

/**
 * Quote the processing fee for a card the salesperson is about to charge.
 *
 * This exists so the figure shown on screen is the same figure that will be posted:
 * the form does not compute a rate of its own, it asks the same engine the approval
 * path uses. The quote is not binding — createSalePaymentRequest recomputes on save —
 * but because both go through calculateCardProcessingFee they agree by construction.
 */
export const previewCardProcessingFee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const {
      issuerCountry,
      issuerBank,
      cardType,
      cardNetwork,
      paymentGateway,
      transactionChannel,
      currency,
      grossAmount,
      onDate,
    } = req.body;

    if (!issuerCountry || !cardType) {
      throw new AppError('Card country and card type are required to quote a fee', 400);
    }
    const gross = Number(grossAmount);
    if (!Number.isFinite(gross) || gross <= 0) {
      throw new AppError('Enter the amount being charged before quoting a fee', 400);
    }

    const fee = await calculateCardProcessingFee({
      branchId,
      issuerCountry: String(issuerCountry).toUpperCase(),
      issuerBank,
      cardType: String(cardType).toUpperCase(),
      cardNetwork: cardNetwork ? String(cardNetwork).toUpperCase() : undefined,
      paymentGateway,
      transactionChannel,
      currency: currency || 'AED',
      grossAmount: gross,
      onDate,
    });

    res.json({ success: true, data: fee });
  } catch (err) {
    next(err);
  }
};

/** Admin: list the configured merchant agreements. */
export const listCardProcessingFeeRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rules = await Source.getRepository(CardProcessingFeeRule).find({
      order: { isActive: 'DESC', priority: 'DESC', effectiveFrom: 'DESC' },
    });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE', 'FINANCE_MANAGER'];

/** Admin: create a rule. Rates are never inferred — somebody has to enter the agreement. */
export const createCardProcessingFeeRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, role } = req.user!;
    if (!ADMIN_ROLES.includes(String(role).toUpperCase())) {
      throw new AppError('Only Admin or Finance can configure card processing fees', 403);
    }
    const repo = Source.getRepository(CardProcessingFeeRule);
    const body = req.body ?? {};

    if (!body.issuerCountry) throw new AppError('Issuer country is required', 400);
    if (body.ratePercent == null && body.fixedFee == null) {
      throw new AppError('Enter a rate percent, a fixed fee, or both', 400);
    }
    const rate = Number(body.ratePercent ?? 0);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new AppError('Rate percent must be between 0 and 100', 400);
    }

    const rule = repo.create({
      branchId: body.branchId || null,
      issuerCountry: String(body.issuerCountry).toUpperCase(),
      issuerBank: body.issuerBank || null,
      cardType: body.cardType ? String(body.cardType).toUpperCase() : null,
      cardNetwork: body.cardNetwork ? String(body.cardNetwork).toUpperCase() : null,
      paymentGateway: body.paymentGateway || null,
      transactionChannel: body.transactionChannel || null,
      ratePercent: rate,
      fixedFee: Number(body.fixedFee ?? 0),
      minimumFee: body.minimumFee != null ? Number(body.minimumFee) : null,
      maximumFee: body.maximumFee != null ? Number(body.maximumFee) : null,
      currency: body.currency || 'AED',
      effectiveFrom: body.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: body.effectiveTo || null,
      isActive: body.isActive !== false,
      priority: Number(body.priority ?? 0),
      notes: body.notes || null,
      createdBy: userId,
    } as Partial<CardProcessingFeeRule>);

    const saved = await repo.save(rule);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: amend a rule.
 *
 * Every edit bumps `version`. Transactions snapshot the version they were charged
 * under, so re-reading an old receipt shows the rate that was actually applied rather
 * than today's rate.
 */
export const updateCardProcessingFeeRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { role } = req.user!;
    if (!ADMIN_ROLES.includes(String(role).toUpperCase())) {
      throw new AppError('Only Admin or Finance can configure card processing fees', 403);
    }
    const repo = Source.getRepository(CardProcessingFeeRule);
    const rule = await repo.findOne({ where: { id: req.params.id as string } });
    if (!rule) throw new AppError('Fee rule not found', 404);

    const body = req.body ?? {};
    const assignable = [
      'issuerBank',
      'cardType',
      'cardNetwork',
      'paymentGateway',
      'transactionChannel',
      'currency',
      'effectiveTo',
      'notes',
    ] as const;
    for (const k of assignable) {
      if (body[k] !== undefined) (rule as unknown as Record<string, unknown>)[k] = body[k] || null;
    }
    if (body.ratePercent !== undefined) rule.ratePercent = Number(body.ratePercent);
    if (body.fixedFee !== undefined) rule.fixedFee = Number(body.fixedFee);
    if (body.minimumFee !== undefined)
      rule.minimumFee = body.minimumFee == null ? undefined : Number(body.minimumFee);
    if (body.maximumFee !== undefined)
      rule.maximumFee = body.maximumFee == null ? undefined : Number(body.maximumFee);
    if (body.priority !== undefined) rule.priority = Number(body.priority);
    if (body.isActive !== undefined) rule.isActive = !!body.isActive;
    if (body.effectiveFrom !== undefined) rule.effectiveFrom = body.effectiveFrom;

    rule.version = Number(rule.version ?? 1) + 1;
    const saved = await repo.save(rule);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

/** Admin: retire a rule. Never hard-deleted — historical transactions reference it. */
export const deactivateCardProcessingFeeRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { role } = req.user!;
    if (!ADMIN_ROLES.includes(String(role).toUpperCase())) {
      throw new AppError('Only Admin or Finance can configure card processing fees', 403);
    }
    const repo = Source.getRepository(CardProcessingFeeRule);
    const rule = await repo.findOne({ where: { id: req.params.id as string } });
    if (!rule) throw new AppError('Fee rule not found', 404);
    rule.isActive = false;
    rule.version = Number(rule.version ?? 1) + 1;
    await repo.save(rule);
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

/**
 * Card settlement report — what was charged, what the fee took, what the bank should
 * have received.
 *
 * This is the reconciliation view: the acquirer deposits a batch and Finance needs to
 * tie that deposit back to the individual card receipts behind it. Grouping by
 * settlement date and issuer is what makes a bank statement line explainable, so the
 * filters mirror the facts we store separately on each transaction rather than forcing
 * a text search over a display label.
 */
export const getCardSettlements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;
    const { dateFrom, dateTo, cardType, cardNetwork, issuerBank, issuerCountry, search } =
      req.query as Record<string, string | undefined>;

    const qb = Source.getRepository(PaymentTransaction)
      .createQueryBuilder('t')
      .innerJoin(Invoice, 'i', 'i.id = t.invoice_id')
      .where("t.payment_mode = 'ONLINE_PAYMENT'");

    // Admins see every branch; everyone else is scoped to their own, same as the rest
    // of Accounts.
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role).toUpperCase())) {
      qb.andWhere('i."branchId" = :branchId', { branchId });
    }
    if (dateFrom) qb.andWhere('t.transaction_date >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('t.transaction_date <= :dateTo', { dateTo: `${dateTo} 23:59:59` });
    if (cardType) qb.andWhere('t.card_type = :cardType', { cardType: cardType.toUpperCase() });
    if (cardNetwork)
      qb.andWhere('t.card_network = :cardNetwork', { cardNetwork: cardNetwork.toUpperCase() });
    if (issuerBank) qb.andWhere('t.issuer_bank = :issuerBank', { issuerBank });
    if (issuerCountry)
      qb.andWhere('t.issuer_country = :issuerCountry', {
        issuerCountry: issuerCountry.toUpperCase(),
      });
    // Free text spans the issuer, the network, the approval reference, the invoice and
    // the last four — never the PAN, which does not exist to be searched.
    if (search) {
      qb.andWhere(
        `(t.issuer_bank ILIKE :q OR t.card_network ILIKE :q OR t.transaction_reference ILIKE :q
          OR t.card_last4 ILIKE :q OR i."invoiceNumber" ILIKE :q OR t.card_holder_name ILIKE :q)`,
        { q: `%${search}%` },
      );
    }

    qb.select([
      't.id AS id',
      't.transaction_date AS "transactionDate"',
      't.amount AS gross',
      't.commission_amount AS commission',
      't.commission_rate_applied AS "ratePercent"',
      't.net_settlement_amount AS net',
      't.card_type AS "cardType"',
      't.card_network AS "cardNetwork"',
      't.issuer_country AS "issuerCountry"',
      't.issuer_bank AS "issuerBank"',
      't.card_last4 AS "cardLast4"',
      't.card_holder_name AS "cardHolderName"',
      't.transaction_reference AS "transactionReference"',
      't.currency_code AS currency',
      'i."invoiceNumber" AS "invoiceNumber"',
      'i."isDirectSale" AS "isDirectSale"',
    ]).orderBy('t.transaction_date', 'DESC');

    const rows = await qb.getRawMany();

    const totals = rows.reduce(
      (acc, r) => {
        acc.gross += Number(r.gross ?? 0);
        if (r.commission != null) {
          acc.commission += Number(r.commission);
          acc.net += Number(r.net ?? r.gross ?? 0);
        }
        return acc;
      },
      { gross: 0, commission: 0, net: 0 },
    );

    // Grouped the way an acquirer settles — one deposit per day per issuer — so a bank
    // statement line can be matched to the batch that produced it.
    const byDay = new Map<
      string,
      { date: string; gross: number; commission: number; net: number; count: number }
    >();
    for (const r of rows) {
      const day = new Date(r.transactionDate).toISOString().slice(0, 10);
      const cur = byDay.get(day) ?? { date: day, gross: 0, commission: 0, net: 0, count: 0 };
      cur.gross += Number(r.gross ?? 0);
      cur.count += 1;
      if (r.commission != null) {
        cur.commission += Number(r.commission);
        cur.net += Number(r.net ?? r.gross ?? 0);
      }
      byDay.set(day, cur);
    }

    res.json({
      success: true,
      data: {
        transactions: rows,
        totals: {
          gross: +totals.gross.toFixed(3),
          commission: +totals.commission.toFixed(3),
          net: +totals.net.toFixed(3),
          count: rows.length,
        },
        bySettlementDate: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Settle an approved Direct Sale card receipt. The transaction row is locked and the
 * cashbook source link is the idempotency key, so retries cannot post twice. */
export const processDirectSaleCardSettlement = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const runner = Source.createQueryRunner();
  try {
    const { userId, branchId, role } = req.user!;
    if (!['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Only Finance can process card settlements', 403);
    }
    const { transactionId, cashAccountId, commissionRatePercent, commissionAmount } =
      req.body ?? {};
    if (!transactionId || !cashAccountId) throw new AppError('Select a bank account', 400);
    if (commissionRatePercent != null && commissionAmount != null) {
      throw new AppError('Enter either a commission percentage or a commission amount', 400);
    }
    const rateOverride = commissionRatePercent == null ? undefined : Number(commissionRatePercent);
    const amountOverride = commissionAmount == null ? undefined : Number(commissionAmount);
    if (
      rateOverride !== undefined &&
      (!Number.isFinite(rateOverride) || rateOverride < 0 || rateOverride > 100)
    ) {
      throw new AppError('Commission rate must be between 0 and 100', 400);
    }
    await runner.connect();
    await runner.startTransaction();
    const txn = await runner.manager.findOne(PaymentTransaction, {
      where: { id: transactionId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!txn || txn.paymentMode !== 'ONLINE_PAYMENT')
      throw new AppError('Card transaction not found', 404);
    const invoice = await runner.manager.findOne(Invoice, { where: { id: txn.invoiceId } });
    if (!invoice?.isDirectSale)
      throw new AppError('Only Direct Sale card receipts can be processed here', 400);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && invoice.branchId !== branchId)
      throw new AppError('Access denied', 403);
    const prior = await runner.manager.findOne(CashbookEntry, {
      where: { sourceType: 'DIRECT_SALE_CARD_SETTLEMENT', sourceId: txn.id },
    });
    if (prior) {
      await runner.commitTransaction();
      res.json({ success: true, data: { transactionId: txn.id, alreadyProcessed: true } });
      return;
    }
    const account = await requireCashAccount(runner.manager, {
      branchId: invoice.branchId,
      explicitAccountId: cashAccountId,
      requiredType: 'BANK',
      actionLabel: 'processing a card settlement',
    });
    const currency = txn.currencyCode || 'AED';
    const gross = Number(txn.amount);
    if (
      amountOverride !== undefined &&
      (!Number.isFinite(amountOverride) || amountOverride < 0 || amountOverride > gross)
    ) {
      throw new AppError('Commission amount must be between 0 and the gross payment', 400);
    }
    let commission: number;
    let rate: number;
    let fixedFee = 0;
    let ruleId: string | undefined;
    let ruleVersion: number | undefined;
    if (amountOverride !== undefined) {
      const grossMinor = toMinor(gross, currency);
      const commissionMinor = toMinor(amountOverride, currency);
      if (commissionMinor > grossMinor) {
        throw new AppError('Commission amount cannot exceed the gross payment', 400);
      }
      commission = fromMinor(commissionMinor, currency);
      fixedFee = commission;
      rate = grossMinor > 0 ? (commissionMinor / grossMinor) * 100 : 0;
    } else if (rateOverride !== undefined) {
      rate = rateOverride;
      commission = fromMinor(
        Math.min(percentOfMinor(toMinor(gross, currency), rate), toMinor(gross, currency)),
        currency,
      );
    } else {
      const { findApplicableRule, applyRule } =
        await import('../services/cardProcessingFeeService');
      const rule = await findApplicableRule({
        branchId: invoice.branchId,
        issuerCountry: txn.issuerCountry || '',
        issuerBank: txn.issuerBank,
        cardType: txn.cardType || '',
        cardNetwork: txn.cardNetwork,
        paymentGateway: undefined,
        currency,
        grossAmount: gross,
        onDate: new Date(txn.transactionDate).toISOString().slice(0, 10),
      });
      if (!rule)
        throw new AppError(
          'No commission rule is configured; enter the agreed rate to settle this payment',
          400,
        );
      const priced = applyRule(rule, gross, currency);
      rate = priced.ratePercentApplied;
      fixedFee = priced.fixedFeeApplied;
      commission = priced.commissionAmount;
      ruleId = priced.ruleId;
      ruleVersion = priced.ruleVersion;
    }
    const net = Math.max(0, gross - commission);
    txn.commissionRateApplied = rate;
    txn.commissionRuleId = ruleId;
    txn.commissionAmount = commission;
    txn.netSettlementAmount = net;
    await runner.manager.save(PaymentTransaction, txn);
    const request = await runner.manager.findOne(SalePaymentRequest, {
      where: { paymentTransactionId: txn.id },
    });
    if (request) {
      request.commissionRateApplied = rate;
      request.commissionFixedApplied = fixedFee;
      request.commissionAmount = commission;
      request.netSettlementAmount = net;
      request.commissionRuleId = ruleId;
      request.commissionRuleVersion = ruleVersion;
      await runner.manager.save(SalePaymentRequest, request);
    }
    const entry = runner.manager.create(CashbookEntry, {
      referenceNo: `CSET-${txn.id}`,
      date: new Date(),
      accountId: account.id,
      entryType: 'RECEIPT',
      amount: net,
      category: 'SALE_COLLECTION',
      description: `Direct Sale card settlement — ${invoice.invoiceNumber} — gross ${gross}, fee ${commission}`,
      linkedInvoiceId: invoice.id,
      paymentMode: 'ONLINE_PAYMENT',
      createdBy: userId,
      branchId: invoice.branchId,
      sourceType: 'DIRECT_SALE_CARD_SETTLEMENT',
      sourceId: txn.id,
    });
    await runner.manager.save(CashbookEntry, entry);
    account.currentBalance = Number(account.currentBalance) + net;
    await runner.manager.save(CashBankAccount, account);
    if (commission > 0) {
      const feeExpense = runner.manager.create(ExpenseEntry, {
        expenseNo: `CPF-${txn.id}`,
        date: new Date(),
        category: 'CARD_PROCESSING_FEE',
        description: `Card processing fee — Direct Sale ${invoice.invoiceNumber}`,
        branchId: invoice.branchId,
        amount: commission,
        vatAmount: 0,
        netAmount: commission,
        currency,
        status: 'APPROVED',
        referenceNo: txn.transactionReference,
        approvedBy: userId,
        createdBy: userId,
      });
      await runner.manager.save(ExpenseEntry, feeExpense);
    }
    await runner.commitTransaction();
    res.json({ success: true, data: { transactionId: txn.id, gross, commission, net } });
  } catch (err) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    next(err);
  } finally {
    await runner.release();
  }
};
