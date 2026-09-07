import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CardProcessingFeeRule } from '../entities/cardProcessingFeeRuleEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { calculateCardProcessingFee } from '../services/cardProcessingFeeService';

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
    ]).orderBy('t.transaction_date', 'DESC');

    const rows = await qb.getRawMany();

    const totals = rows.reduce(
      (acc, r) => {
        acc.gross += Number(r.gross ?? 0);
        acc.commission += Number(r.commission ?? 0);
        acc.net += Number(r.net ?? r.gross ?? 0);
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
      cur.commission += Number(r.commission ?? 0);
      cur.net += Number(r.net ?? r.gross ?? 0);
      cur.count += 1;
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
