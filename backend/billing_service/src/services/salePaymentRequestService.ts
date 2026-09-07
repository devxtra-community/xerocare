import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { Invoice } from '../entities/invoiceEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { generatePaymentReference } from './billingHelpers';
import type { calculateCardProcessingFee } from './cardProcessingFeeService';

async function fetchEmployeeName(employeeId: string): Promise<string> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const res = await fetch(`${empUrl}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return 'Employee';
    const data = await res.json();
    const emp = data.data ?? data;
    const first = emp.first_name || emp.firstName || '';
    const last = emp.last_name || emp.lastName || '';
    return `${first} ${last}`.trim() || emp.email || 'Employee';
  } catch {
    return 'Employee';
  }
}

export async function generateSalePaymentRequestNo(): Promise<string> {
  const repo = Source.getRepository(SalePaymentRequest);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('r')
    .where(`EXTRACT(YEAR FROM r."createdAt") = :year`, { year })
    .getCount();
  const seq = String(count + 1).padStart(4, '0');
  return `SPAY-${year}-${seq}`;
}

export interface CreateSalePaymentRequestParams {
  invoiceId: string;
  branchId: string;
  userId: string;
  amount: number;
  paymentMode: string;
  paymentDate: Date;
  referenceNumber?: string;
  remarks?: string;
  cashAccountId?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: Date;
  chequeDate?: Date;
  collectLater?: boolean;
  paymentContext?: string;
  usageRecordId?: string;
  /** Identifies this payment as a refundable security deposit — separates it from
   *  normal rent/sale revenue in Accounts so deposits are never treated as income. */
  isSecurityDeposit?: boolean;

  // ─── ONLINE_PAYMENT only ────────────────────────────────────────────────────
  // The card facts the salesperson captured. Note what is absent: no PAN, no CVV.
  // The client sends the last four digits it derived locally and nothing more, so the
  // full number never crosses the network or reaches a log.
  cardType?: string;
  cardNetwork?: string;
  issuerCountry?: string;
  issuerBank?: string;
  cardLast4?: string;
  cardHolderName?: string;
  gatewayToken?: string;
  paymentGateway?: string;
  transactionChannel?: string;
  transactionReference?: string;
}

/** Payment modes this system accepts. CREDIT_CARD is legacy-read-only; see below. */
export const SUPPORTED_PAYMENT_MODES = [
  'CASH',
  'BANK_TRANSFER',
  'CHEQUE',
  'ONLINE_PAYMENT',
] as const;

const CARD_TYPES = ['DEBIT', 'CREDIT'];
const CARD_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'UNIONPAY', 'MADA', 'KNET', 'OTHER'];
const ISSUER_COUNTRIES = ['AE', 'SA', 'QA', 'KW', 'OM', 'BH'];

/**
 * Validates the card half of an ONLINE_PAYMENT and returns the normalized values.
 *
 * Deliberately rejects anything that looks like a full card number arriving in a field
 * that should only ever hold four digits — a client bug that posted the PAN there would
 * otherwise persist it, and the whole point of this design is that the PAN never lands
 * in the database at all.
 */
function validateCardDetails(params: CreateSalePaymentRequestParams) {
  const cardType = (params.cardType || '').toUpperCase();
  const cardNetwork = (params.cardNetwork || '').toUpperCase();
  const issuerCountry = (params.issuerCountry || '').toUpperCase();
  const issuerBank = (params.issuerBank || '').trim();
  const cardLast4 = (params.cardLast4 || '').trim();
  const cardHolderName = (params.cardHolderName || '').trim();

  if (!CARD_TYPES.includes(cardType)) {
    throw new AppError('Select whether this is a Debit Card or a Credit Card', 400);
  }
  if (!ISSUER_COUNTRIES.includes(issuerCountry)) {
    throw new AppError('Select the country that issued the card', 400);
  }
  if (!issuerBank) {
    throw new AppError('Select the issuing bank / card', 400);
  }
  if (!CARD_NETWORKS.includes(cardNetwork)) {
    throw new AppError('Select the card network (Visa, Mastercard, Amex, UnionPay…)', 400);
  }
  if (!cardHolderName) {
    throw new AppError("Enter the card holder's name", 400);
  }
  if (!/^[0-9]{4}$/.test(cardLast4)) {
    throw new AppError(
      'Card details are invalid. Only the last four digits of the card are accepted — ' +
        'the full card number must never be sent to or stored by this system.',
      400,
    );
  }
  return { cardType, cardNetwork, issuerCountry, issuerBank, cardLast4, cardHolderName };
}

/**
 * Creates a PENDING SalePaymentRequest — the one and only path that should ever be
 * used to record money collected against an invoice, since it's the sole thing the
 * Accounts Receipts approval queue and receipt generation both key off. A payment
 * collected any other way (e.g. a direct call to billingService.recordPayment()) is
 * structurally invisible to both.
 *
 * Extracted from what was previously recordSalePayment()'s inline body so that
 * usageService's periodic-collection path can create the exact same kind of request
 * instead of bypassing the approval gate entirely (the bug this was extracted to fix).
 */
export async function createSalePaymentRequest(
  params: CreateSalePaymentRequestParams,
): Promise<SalePaymentRequest> {
  const { invoiceId, branchId, userId, amount, paymentMode, paymentDate } = params;

  if (!amount || amount <= 0 || !paymentMode || !paymentDate) {
    throw new AppError('amount, paymentMode, and paymentDate are required', 400);
  }
  if (paymentMode === 'CHEQUE' && !params.chequeNumber) {
    throw new AppError('chequeNumber is required for CHEQUE payment', 400);
  }
  if (!SUPPORTED_PAYMENT_MODES.includes(paymentMode as (typeof SUPPORTED_PAYMENT_MODES)[number])) {
    // CREDIT_CARD is intentionally not accepted for NEW payments: it is the legacy
    // stored value for what is now ONLINE_PAYMENT + cardType CREDIT. Old rows keep it.
    throw new AppError(
      `Unsupported payment mode "${paymentMode}". Use one of: ${SUPPORTED_PAYMENT_MODES.join(', ')}.`,
      400,
    );
  }

  const invoiceRepo = Source.getRepository(Invoice);
  const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

  // Auto-detect paymentContext when not explicitly provided
  let resolvedContext = params.paymentContext;
  if (!resolvedContext) {
    const saleType = (invoice.saleType || '').toUpperCase();
    if (saleType === 'RENT' || saleType === 'LEASE') {
      if (params.isSecurityDeposit) {
        // A deposit is never the "advance" — must be checked before the
        // existingCount-based advance-vs-periodic split below, which has no other way
        // to tell a deposit apart from a real advance/periodic collection.
        resolvedContext = saleType === 'RENT' ? 'RENT_SECURITY_DEPOSIT' : 'LEASE_SECURITY_DEPOSIT';
      } else {
        // Excludes security-deposit rows from the count: a deposit recorded before the
        // real advance must not make this — the actual first non-deposit payment —
        // look like a PERIODIC collection instead of the ADVANCE it is.
        const existingCount = await Source.getRepository(SalePaymentRequest).count({
          where: { invoiceId, isSecurityDeposit: false },
        });
        if (saleType === 'RENT') {
          resolvedContext = existingCount === 0 ? 'RENT_ADVANCE' : 'RENT_PERIODIC';
        } else {
          resolvedContext = existingCount === 0 ? 'LEASE_ADVANCE' : 'LEASE_PERIODIC';
        }
      }
    } else {
      resolvedContext = 'SALE';
    }
  }

  // ─── ONLINE_PAYMENT: validate the card, then recompute the fee server-side ───
  //
  // Whatever commission the client displayed is ignored. The rate is looked up from the
  // merchant's configured agreement here, on the server, and it is THIS result that is
  // stored — so a request posting commissionRate: 0 cannot make the merchant's
  // processing cost disappear. The applied rate and the rule version are snapshotted on
  // the row so re-negotiating the agreement tomorrow never rewrites today's receipt.
  let card: ReturnType<typeof validateCardDetails> | null = null;
  let fee: Awaited<ReturnType<typeof calculateCardProcessingFee>> | null = null;

  if (paymentMode === 'ONLINE_PAYMENT') {
    card = validateCardDetails(params);
    // Price the card if the rate is already on file, but never block the collection on
    // it. The salesperson takes the money at the counter and has no way of knowing what
    // the acquirer charges — the commission is Accounts' business, settled when Finance
    // approves the receipt. Refusing here stranded a real payment that had already been
    // swiped, which is worse than carrying the fee as "not yet priced" for a few hours.
    // The fee is recomputed at approval, so a rate added in between is picked up then,
    // and approval will not post without one.
    const { findApplicableRule, applyRule } = await import('./cardProcessingFeeService');
    const rule = await findApplicableRule({
      branchId,
      issuerCountry: card.issuerCountry,
      issuerBank: card.issuerBank,
      cardType: card.cardType,
      cardNetwork: card.cardNetwork,
      paymentGateway: params.paymentGateway,
      transactionChannel: params.transactionChannel,
      currency: invoice.currencyCode || 'AED',
      grossAmount: Number(amount),
      onDate: new Date(paymentDate).toISOString().split('T')[0],
    });
    fee = rule ? applyRule(rule, Number(amount), invoice.currencyCode || 'AED') : null;
  }

  const [requestNo, employeeName, autoReferenceNumber] = await Promise.all([
    generateSalePaymentRequestNo(),
    fetchEmployeeName(userId),
    generatePaymentReference(paymentMode, paymentDate),
  ]);

  // RENT_ADVANCE/LEASE_ADVANCE: the entered amount is the pre-tax advance (consistent
  // with monthlyRent/advanceAmount being tax-exclusive everywhere else on the contract)
  // — gross it up by the contract's own snapshotted taxPercent so the money actually
  // collected, and everywhere that figure appears (Contract Agreement, receipt, Accounts
  // Receipts), is VAT-inclusive. Periodic collections skip this: their VAT is already
  // layered into UsageRecord.totalCharge upstream in usageService.ts, so `amount` there
  // is already correct as entered — grossing up again here would double-tax it. Sale
  // payments are untouched too — a Sale invoice's totalAmount is already tax-inclusive
  // as one lump sum from creation, and collections here are a slice of that fixed total.
  let finalAmount = Number(amount);
  let taxableAmount: number | undefined;
  let taxAmountComputed: number | undefined;
  let taxPercentApplied: number | undefined;
  if (resolvedContext === 'RENT_ADVANCE' || resolvedContext === 'LEASE_ADVANCE') {
    const taxPercent = Number(invoice.taxPercent || 0);
    taxableAmount = finalAmount;
    taxAmountComputed = taxPercent > 0 ? Math.round(taxableAmount * taxPercent) / 100 : 0;
    taxPercentApplied = taxPercent || undefined;
    finalAmount = taxableAmount + taxAmountComputed;
  }

  const repo = Source.getRepository(SalePaymentRequest);
  const request = repo.create({
    requestNo,
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    branchId,
    recordedByEmployeeId: userId,
    recordedByEmployeeName: employeeName,
    customerName: invoice.customerName || 'Customer',
    amount: finalAmount,
    currency: invoice.currencyCode || 'AED',
    paymentMode,
    paymentDate,
    // Auto-generated for Cash/Bank/Card (CASH-20260828-014 style) — always wins over
    // whatever the caller passed, per the "no manual override" decision: a real bank
    // UTR/transaction ID belongs in `remarks` instead. Cheque is untouched (its Cheque
    // Number field below already is its reference) — generatePaymentReference returns
    // undefined for it, so this falls back to whatever the caller sent (normally
    // nothing, for Cheque).
    referenceNumber: autoReferenceNumber ?? params.referenceNumber,
    remarks: params.remarks,
    cashAccountId: paymentMode !== 'CHEQUE' ? params.cashAccountId : undefined,
    chequeNumber: params.chequeNumber,
    chequeBankName: params.chequeBankName,
    chequeDueDate: params.chequeDueDate,
    chequeDate: params.chequeDate,
    collectLater: Boolean(params.collectLater),
    isSecurityDeposit: Boolean(params.isSecurityDeposit),
    ...(card ? { ...card, gatewayToken: params.gatewayToken } : {}),
    ...(fee
      ? {
          transactionReference: params.transactionReference,
          paymentGateway: params.paymentGateway,
          commissionRateApplied: fee.ratePercentApplied,
          commissionFixedApplied: fee.fixedFeeApplied,
          commissionAmount: fee.commissionAmount,
          netSettlementAmount: fee.netSettlementAmount,
          commissionRuleId: fee.ruleId,
          commissionRuleVersion: fee.ruleVersion,
        }
      : {}),
    paymentContext: resolvedContext,
    usageRecordId: params.usageRecordId,
    taxableAmount,
    taxAmount: taxAmountComputed,
    taxPercent: taxPercentApplied,
    status: 'PENDING',
  });

  await repo.save(request);
  return request;
}
