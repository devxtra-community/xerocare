import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { Invoice } from '../entities/invoiceEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';

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

async function generateSalePaymentRequestNo(): Promise<string> {
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

  const invoiceRepo = Source.getRepository(Invoice);
  const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

  // Auto-detect paymentContext when not explicitly provided
  let resolvedContext = params.paymentContext;
  if (!resolvedContext) {
    const saleType = (invoice.saleType || '').toUpperCase();
    if (saleType === 'RENT' || saleType === 'LEASE') {
      const existingCount = await Source.getRepository(SalePaymentRequest).count({
        where: { invoiceId },
      });
      if (saleType === 'RENT') {
        resolvedContext = existingCount === 0 ? 'RENT_ADVANCE' : 'RENT_PERIODIC';
      } else {
        resolvedContext = existingCount === 0 ? 'LEASE_ADVANCE' : 'LEASE_PERIODIC';
      }
    } else {
      resolvedContext = 'SALE';
    }
  }

  const [requestNo, employeeName] = await Promise.all([
    generateSalePaymentRequestNo(),
    fetchEmployeeName(userId),
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
    referenceNumber: params.referenceNumber,
    remarks: params.remarks,
    cashAccountId: paymentMode !== 'CHEQUE' ? params.cashAccountId : undefined,
    chequeNumber: params.chequeNumber,
    chequeBankName: params.chequeBankName,
    chequeDueDate: params.chequeDueDate,
    chequeDate: params.chequeDate,
    collectLater: Boolean(params.collectLater),
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
