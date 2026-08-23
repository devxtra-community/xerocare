import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { computeProfitAndLoss, ALL_TIME_START } from '../utils/accountsShared';
import { AppError } from '../errors/appError';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { todayInBusinessTz } from '../utils/businessDate';

function branchSql(alias: string, branches: string[] | null): string {
  if (!branches || branches.length === 0) return '';
  if (branches.length === 1) return `AND ${alias}."branchId" = '${branches[0]}'`;
  return `AND ${alias}."branchId" IN (${branches.map((b) => `'${b}'`).join(',')})`;
}

function safeBranches(branchFilter: string[]): string[] | null {
  const uuidRe = /^[0-9a-f-]{36}$/i;
  const safe = branchFilter.filter((b) => uuidRe.test(b));
  return safe.length > 0 ? safe : null;
}

function applyDateAmountFilters<T extends { date: string; amount: number }>(
  rows: T[],
  q: Record<string, string | undefined>,
): T[] {
  let out = rows;
  if (q.dateFrom) out = out.filter((r) => r.date >= q.dateFrom!);
  if (q.dateTo) out = out.filter((r) => r.date <= q.dateTo!);
  if (q.amountMin) out = out.filter((r) => r.amount >= Number(q.amountMin));
  if (q.amountMax) out = out.filter((r) => r.amount <= Number(q.amountMax));
  return out;
}

function agingBucket(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  return '90+ days';
}

// 1003 Accounts Receivable — same population AND same per-invoice basis as
// computeBalanceSheet's invoiceAR query (status NOT IN excluded-list AND
// FINAL/active-PROFORMA, minus payments received), row-level. No dueDate
// field exists on Invoice — aging is computed from createdAt.
//
// RENT/LEASE basis must mirror computeBalanceSheet exactly: a Rent/Lease
// contract reuses one invoice for its whole life, so totalAmount is a running
// contract figure, not what the customer currently owes. Using totalAmount
// here (as this endpoint did previously) silently drifted from the Balance
// Sheet's AR total — e.g. hiding a contract's real outstanding balance behind
// a stale totalAmount that looked "overpaid", while another contract's
// totalAmount overstated what was actually billed. Same advance+billed basis
// as accountsShared.ts's invoiceARRows query — advance from the real,
// VAT-inclusive SalePaymentRequest amount (not the net invoice.advanceAmount),
// periodic from usage_records.totalCharge (VAT-inclusive and discount-netted,
// not the pre-VAT monthlyRent + exceededCharge, which understated every
// Rent/Lease receivable by its VAT amount).
export const getAccountsReceivableTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const q = req.query as Record<string, string | undefined>;

    const rows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        saleType: string;
        createdAt: string;
        currency_code: string | null;
        branchId: string;
        totalAmount: string;
        paid: string;
        isOpeningEntry: boolean;
      }[]
    >(`
      SELECT i.id, i."invoiceNumber", i.customer_name, i."saleType",
             TO_CHAR(i."createdAt", 'YYYY-MM-DD') AS "createdAt",
             i.currency_code, i."branchId",
             CASE
               WHEN i."saleType" IN ('RENT', 'LEASE')
                 THEN COALESCE(adv.amount, i."advanceAmount", 0) + COALESCE(ur.billed, 0)
               ELSE i."totalAmount"
             END AS "totalAmount",
             COALESCE(pt.paid, 0) AS paid,
             i.is_opening_entry AS "isOpeningEntry"
      FROM invoices i
      LEFT JOIN (
        SELECT DISTINCT ON ("invoiceId") "invoiceId", amount
        FROM sale_payment_requests
        WHERE "paymentContext" IN ('RENT_ADVANCE', 'LEASE_ADVANCE')
        ORDER BY "invoiceId", "createdAt" ASC
      ) adv ON adv."invoiceId" = i.id
      LEFT JOIN (
        SELECT "contractId", SUM(COALESCE("totalCharge", 0)) AS billed
        FROM usage_records
        WHERE "billType" IS DISTINCT FROM 'ADVANCE'
        GROUP BY "contractId"
      ) ur ON ur."contractId" = i.id
      LEFT JOIN (
        SELECT invoice_id, SUM(paid) AS paid FROM (
          SELECT "invoice_id" AS invoice_id, SUM(amount) AS paid
          FROM payment_transactions
          GROUP BY "invoice_id"
          UNION ALL
          SELECT "invoiceId" AS invoice_id, SUM("amountPaid") AS paid
          FROM payment_ledgers
          GROUP BY "invoiceId"
        ) u GROUP BY invoice_id
      ) pt ON pt.invoice_id = i.id
      WHERE i.status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (i.type = 'FINAL' OR (i.type = 'PROFORMA' AND i.status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')) OR i.type = 'OPENING')
        AND i."totalAmount" > 0
        AND i."deletedAt" IS NULL
        ${branchSql('i', bParam)}
    `);

    let mapped = rows.map((r) => {
      const totalAmount = Number(r.totalAmount);
      const paid = Number(r.paid);
      const outstanding = totalAmount - paid;
      const status = outstanding <= 0.004 ? 'PAID' : paid > 0.004 ? 'PARTIAL' : 'OUTSTANDING';
      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        customerName: r.customer_name ?? 'Unknown Customer',
        saleType: r.saleType,
        date: r.createdAt,
        amount: outstanding,
        totalAmount,
        paid,
        status,
        currencyCode: r.currency_code ?? 'AED',
        branchId: r.branchId,
        aging: agingBucket(r.createdAt),
        isOpeningEntry: r.isOpeningEntry === true,
      };
    });
    // Default: outstanding-only (matches the 1003 balance-sheet figure this endpoint
    // was originally built to reconcile with — the Chart of Accounts AR drill-down
    // relies on that). ?includeSettled=true widens it to every qualifying invoice
    // regardless of balance, for the Receivable page's full-history view.
    if (q.includeSettled !== 'true') {
      mapped = mapped.filter((r) => r.amount > 0.004); // matches round2-style epsilon used elsewhere
    }

    if (q.customerName) {
      const needle = q.customerName.toLowerCase();
      mapped = mapped.filter((r) => r.customerName.toLowerCase().includes(needle));
    }
    if (q.search) {
      const needle = q.search.toLowerCase();
      mapped = mapped.filter((r) => r.invoiceNumber.toLowerCase().includes(needle));
    }
    if (q.aging) {
      mapped = mapped.filter((r) => r.aging === q.aging);
    }
    mapped = applyDateAmountFilters(mapped, q);

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

// GET /accounts/line-items/customer-statement?customerName=...&periodFrom=...&periodTo=...
// Customer Statement of Account — same qualifying-invoice population as
// getAccountsReceivableTransactions (invoiceAR query), plus manual receivables
// not linked to an invoice (same double-count guard used on the Receivable
// page). Every invoice (debit) and payment (credit) for one customer, merged
// chronologically; events before periodFrom roll into a single Opening
// Balance so the running balance and Closing Balance stay correct regardless
// of how far back periodFrom is set.
export const getCustomerStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerName = ((req.query.customerName as string) || '').trim();
    if (!customerName) throw new AppError('customerName is required', 400);
    const periodFrom = (req.query.periodFrom as string) || '1970-01-01';
    const periodTo = (req.query.periodTo as string) || todayInBusinessTz();
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);

    const invoiceRows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        createdAt: string;
        totalAmount: string;
        currency_code: string | null;
      }[]
    >(
      `SELECT id, "invoiceNumber",
              TO_CHAR("createdAt" AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'Asia/Qatar', 'YYYY-MM-DD') AS "createdAt",
              "totalAmount", currency_code
       FROM invoices
       WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM($1))
         AND status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
         AND (type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))
         AND "totalAmount" > 0
         AND "deletedAt" IS NULL
         ${branchSql('invoices', bParam)}`,
      [customerName],
    );
    const invoiceIds = invoiceRows.map((r) => r.id);

    let paymentRows: {
      invoice_id: string;
      date: string;
      amount: string;
      reference: string | null;
    }[] = [];
    if (invoiceIds.length > 0) {
      paymentRows = await Source.query(
        `SELECT invoice_id,
                TO_CHAR(transaction_date AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'Asia/Qatar', 'YYYY-MM-DD') AS date,
                amount, reference_number AS reference
         FROM payment_transactions WHERE invoice_id = ANY($1::uuid[])
         UNION ALL
         SELECT "invoiceId" AS invoice_id, TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date,
                "amountPaid" AS amount, "referenceNumber" AS reference
         FROM payment_ledgers WHERE "invoiceId" = ANY($1::uuid[])`,
        [invoiceIds],
      );
    }

    const manualRows = await Source.query<
      { id: string; referenceNo: string; issueDate: string; amount: string; currency: string }[]
    >(
      `SELECT id, "referenceNo", TO_CHAR("issueDate", 'YYYY-MM-DD') AS "issueDate", amount, currency
       FROM manual_receivables
       WHERE LOWER(TRIM("customerName")) = LOWER(TRIM($1)) AND "linkedInvoiceId" IS NULL
         ${branchSql('manual_receivables', bParam)}`,
      [customerName],
    );
    const manualIds = manualRows.map((r) => r.id);

    let manualPaymentRows: {
      receivableId: string;
      date: string;
      amount: string;
      reference: string | null;
    }[] = [];
    if (manualIds.length > 0) {
      manualPaymentRows = await Source.query(
        `SELECT "receivableId", TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date, amount,
                "referenceNo" AS reference
         FROM receivable_payments WHERE "receivableId" = ANY($1::uuid[])`,
        [manualIds],
      );
    }

    interface StatementEvent {
      date: string;
      description: string;
      reference: string;
      debit?: number;
      credit?: number;
    }
    const events: StatementEvent[] = [];
    for (const inv of invoiceRows) {
      events.push({
        date: inv.createdAt,
        description: 'Invoice issued',
        reference: inv.invoiceNumber,
        debit: Number(inv.totalAmount),
      });
    }
    for (const p of paymentRows) {
      const inv = invoiceRows.find((i) => i.id === p.invoice_id);
      events.push({
        date: p.date,
        description: 'Payment received',
        reference: p.reference || inv?.invoiceNumber || '',
        credit: Number(p.amount),
      });
    }
    for (const m of manualRows) {
      events.push({
        date: m.issueDate,
        description: 'Manual receivable',
        reference: m.referenceNo,
        debit: Number(m.amount),
      });
    }
    for (const mp of manualPaymentRows) {
      const m = manualRows.find((r) => r.id === mp.receivableId);
      events.push({
        date: mp.date,
        description: 'Payment received',
        reference: mp.reference || m?.referenceNo || '',
        credit: Number(mp.amount),
      });
    }
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let openingBalance = 0;
    const periodRows: StatementEvent[] = [];
    for (const e of events) {
      if (e.date < periodFrom) {
        openingBalance += (e.debit ?? 0) - (e.credit ?? 0);
      } else if (e.date <= periodTo) {
        periodRows.push(e);
      }
    }
    const closingBalance = periodRows.reduce(
      (bal, e) => bal + (e.debit ?? 0) - (e.credit ?? 0),
      openingBalance,
    );
    const currency = invoiceRows[0]?.currency_code || manualRows[0]?.currency || 'AED';

    res.json({
      success: true,
      data: {
        customerName,
        periodFrom,
        periodTo,
        currency,
        openingBalance,
        closingBalance,
        rows: periodRows.map((e) => ({
          date: e.date,
          reference: e.reference,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /accounts/line-items/vendor-statement?vendorName=...&periodFrom=...&periodTo=...
// Vendor Statement of Account — mirrors getCustomerStatement exactly, but for
// Accounts Payable: manual payables not linked to a purchase (same double-count
// guard used on the Payable page) + their payments, plus cross-service purchases
// for this vendor (ven_inv_service, self-signed internal call — same pattern as
// getPayableRowDetail above) + each purchase's own nested payments. Merged
// chronologically with the same Opening/Closing Balance rollup as the customer
// statement.
export const getVendorStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorName = ((req.query.vendorName as string) || '').trim();
    if (!vendorName) throw new AppError('vendorName is required', 400);
    const periodFrom = (req.query.periodFrom as string) || '1970-01-01';
    const periodTo = (req.query.periodTo as string) || todayInBusinessTz();
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);

    const manualRows = await Source.query<
      { id: string; referenceNo: string; issueDate: string; amount: string; currency: string }[]
    >(
      `SELECT id, "referenceNo", TO_CHAR("issueDate", 'YYYY-MM-DD') AS "issueDate", amount, currency
       FROM manual_payables
       WHERE LOWER(TRIM("payableTo")) = LOWER(TRIM($1)) AND "linkedPurchaseId" IS NULL
         ${branchSql('manual_payables', bParam)}`,
      [vendorName],
    );
    const manualIds = manualRows.map((r) => r.id);

    let manualPaymentRows: {
      payableId: string;
      date: string;
      amount: string;
      reference: string | null;
    }[] = [];
    if (manualIds.length > 0) {
      manualPaymentRows = await Source.query(
        `SELECT "payableId", TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date, amount,
                "referenceNo" AS reference
         FROM payable_payments WHERE "payableId" = ANY($1::uuid[])`,
        [manualIds],
      );
    }

    interface StatementEvent {
      date: string;
      description: string;
      reference: string;
      debit?: number;
      credit?: number;
    }
    const events: StatementEvent[] = [];
    for (const m of manualRows) {
      events.push({
        date: m.issueDate,
        description: 'Bill / manual payable',
        reference: m.referenceNo,
        debit: Number(m.amount),
      });
    }
    for (const mp of manualPaymentRows) {
      const m = manualRows.find((r) => r.id === mp.payableId);
      events.push({
        date: mp.date,
        description: 'Payment made',
        reference: mp.reference || m?.referenceNo || '',
        credit: Number(mp.amount),
      });
    }

    let currency = manualRows[0]?.currency || 'AED';
    if (bParam) {
      const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      for (const branchId of bParam) {
        const purchases = await internalFetchJSON<{
          data: {
            id: string;
            totalAmount: number;
            currencyCode?: string;
            createdAt: string;
            vendor?: { name?: string };
            payments?: { amount: number; paymentDate: string; referenceNumber?: string }[];
          }[];
        }>(`${INV_URL}/purchases?branchId=${branchId}`);
        for (const p of purchases?.data ?? []) {
          // Vendor names can carry real trailing/leading whitespace from data entry
          // (confirmed live: "epson trading and distributers " — trailing space).
          // An exact (lowercased-only) match against the caller's trimmed vendorName
          // then never matches, silently excluding every one of that vendor's
          // purchases — which is also why currency below never got set from real
          // data and fell through to the AED default. Trim both sides.
          if ((p.vendor?.name ?? '').trim().toLowerCase() !== vendorName.trim().toLowerCase())
            continue;
          const purchaseRef = `PO-${p.id.slice(0, 8).toUpperCase()}`;
          events.push({
            date: p.createdAt.slice(0, 10),
            description: 'Purchase order',
            reference: purchaseRef,
            debit: Number(p.totalAmount),
          });
          currency = p.currencyCode || currency;
          for (const pay of p.payments ?? []) {
            events.push({
              date: pay.paymentDate.slice(0, 10),
              description: 'Payment made',
              reference: pay.referenceNumber || purchaseRef,
              credit: Number(pay.amount),
            });
          }
        }
      }
    }
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let openingBalance = 0;
    const periodRows: StatementEvent[] = [];
    for (const e of events) {
      if (e.date < periodFrom) {
        openingBalance += (e.debit ?? 0) - (e.credit ?? 0);
      } else if (e.date <= periodTo) {
        periodRows.push(e);
      }
    }
    const closingBalance = periodRows.reduce(
      (bal, e) => bal + (e.debit ?? 0) - (e.credit ?? 0),
      openingBalance,
    );

    res.json({
      success: true,
      data: {
        vendorName,
        periodFrom,
        periodTo,
        currency,
        openingBalance,
        closingBalance,
        rows: periodRows.map((e) => ({
          date: e.date,
          reference: e.reference,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /accounts/line-items/account-statement?accountId=...&periodFrom=...&periodTo=...
// Cash & Bank Statement — the traditional bank-statement shape for one specific
// cash/bank account: every real cashbook_entries row for that account (the
// canonical ledger every cash movement in this system posts to — invoice
// receipts, expense payments, cheque clears, manual entries all flow through
// postCashbookEntry into this same table), chronologically, with the account's
// own lifetime openingBalance rolled forward. When periodTo is today, Closing
// Balance reconciles exactly with the account's live currentBalance.
export const getAccountStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = (req.query.accountId as string) || '';
    if (!accountId) throw new AppError('accountId is required', 400);
    const periodFrom = (req.query.periodFrom as string) || '1970-01-01';
    const periodTo = (req.query.periodTo as string) || todayInBusinessTz();
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);

    const accountRows = await Source.query<
      {
        id: string;
        name: string;
        type: string;
        currency: string;
        openingBalance: string;
        currentBalance: string;
        branchId: string;
      }[]
    >(
      `SELECT id, name, type, currency, "openingBalance", "currentBalance", "branchId"
       FROM cash_bank_accounts WHERE id = $1 ${branchSql('cash_bank_accounts', bParam)}`,
      [accountId],
    );
    const account = accountRows[0];
    if (!account) throw new AppError('Account not found', 404);

    const entryRows = await Source.query<
      {
        id: string;
        referenceNo: string;
        date: string;
        entryType: string;
        amount: string;
        category: string;
        description: string | null;
        isReversed: boolean;
      }[]
    >(
      `SELECT id, "referenceNo", TO_CHAR(date, 'YYYY-MM-DD') AS date, "entryType", amount,
              category, description, "isReversed"
       FROM cashbook_entries
       WHERE "accountId" = $1 AND "isReversed" = false
       ORDER BY date ASC, "createdAt" ASC`,
      [accountId],
    );

    interface StatementEvent {
      date: string;
      description: string;
      reference: string;
      debit?: number;
      credit?: number;
    }
    const events: StatementEvent[] = entryRows.map((r) => ({
      date: r.date,
      description: r.description || r.category,
      reference: r.referenceNo,
      debit: r.entryType === 'RECEIPT' ? Number(r.amount) : undefined,
      credit: r.entryType === 'PAYMENT' ? Number(r.amount) : undefined,
    }));

    let openingBalance = Number(account.openingBalance);
    const periodRows: StatementEvent[] = [];
    for (const e of events) {
      if (e.date < periodFrom) {
        openingBalance += (e.debit ?? 0) - (e.credit ?? 0);
      } else if (e.date <= periodTo) {
        periodRows.push(e);
      }
    }
    const closingBalance = periodRows.reduce(
      (bal, e) => bal + (e.debit ?? 0) - (e.credit ?? 0),
      openingBalance,
    );

    res.json({
      success: true,
      data: {
        accountName: account.name,
        accountType: account.type,
        periodFrom,
        periodTo,
        currency: account.currency,
        openingBalance,
        closingBalance,
        currentBalance: Number(account.currentBalance),
        rows: periodRows.map((e) => ({
          date: e.date,
          reference: e.reference,
          description: e.description,
          debit: e.debit,
          credit: e.credit,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2003 VAT Payable — Output VAT collected. All-time balance (matches vatCollectedRows'
// own population in computeBalanceSheet — no date bound by default), invoices only;
// Input VAT credit and remittance rows are fetched separately by the frontend (from
// fetchPurchases() and the vat-remittances endpoint respectively) since those already
// have working, real endpoints — no need to duplicate them here.
export const getOutputVatTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const q = req.query as Record<string, string | undefined>;

    const rows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        createdAt: string;
        tax_amount: string;
        currency_code: string | null;
        branchId: string;
      }[]
    >(`
      SELECT id, "invoiceNumber", customer_name, TO_CHAR("createdAt", 'YYYY-MM-DD') AS "createdAt",
             tax_amount, currency_code, "branchId"
      FROM invoices i
      WHERE status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))
        AND tax_amount > 0
        AND "deletedAt" IS NULL
        ${branchSql('i', bParam)}
      ORDER BY "createdAt" DESC
    `);

    let mapped = rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customer_name ?? 'Unknown Customer',
      date: r.createdAt,
      amount: Number(r.tax_amount),
      currencyCode: r.currency_code ?? 'AED',
      branchId: r.branchId,
    }));

    if (q.customerName) {
      const needle = q.customerName.toLowerCase();
      mapped = mapped.filter((r) => r.customerName.toLowerCase().includes(needle));
    }
    if (q.search) {
      const needle = q.search.toLowerCase();
      mapped = mapped.filter((r) => r.invoiceNumber.toLowerCase().includes(needle));
    }
    mapped = applyDateAmountFilters(mapped, q);

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

// 2004 Security Deposits Received — same population as computeBalanceSheet's own query.
export const getSecurityDepositTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const q = req.query as Record<string, string | undefined>;

    const rows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        createdAt: string;
        securityDepositAmount: string;
        securityDepositMode: string | null;
        securityDepositReference: string | null;
        securityDepositDate: string | null;
        currency_code: string | null;
        branchId: string;
        saleType: string;
      }[]
    >(`
      SELECT id, "invoiceNumber", customer_name, TO_CHAR("createdAt", 'YYYY-MM-DD') AS "createdAt",
             "securityDepositAmount", "securityDepositMode", "securityDepositReference",
             TO_CHAR("securityDepositDate", 'YYYY-MM-DD') AS "securityDepositDate",
             currency_code, "branchId", "saleType"
      FROM invoices
      WHERE "securityDepositAmount" > 0
        AND "saleType" IN ('RENT', 'LEASE')
        AND status NOT IN ('CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
        AND "deletedAt" IS NULL
        ${branchSql('invoices', bParam)}
      ORDER BY "createdAt" DESC
    `);

    let mapped = rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customer_name ?? 'Unknown Customer',
      date: r.createdAt,
      amount: Number(r.securityDepositAmount),
      currencyCode: r.currency_code ?? 'AED',
      branchId: r.branchId,
      saleType: r.saleType,
      depositMode: r.securityDepositMode,
      depositReference: r.securityDepositReference,
      depositDate: r.securityDepositDate,
    }));

    if (q.customerName) {
      const needle = q.customerName.toLowerCase();
      mapped = mapped.filter((r) => r.customerName.toLowerCase().includes(needle));
    }
    if (q.search) {
      const needle = q.search.toLowerCase();
      mapped = mapped.filter((r) => r.invoiceNumber.toLowerCase().includes(needle));
    }
    mapped = applyDateAmountFilters(mapped, q);

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

// 2005 Deferred Revenue (memo) — same population as computeBalanceSheet's memo query.
export const getDeferredRevenueTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const q = req.query as Record<string, string | undefined>;

    const rows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        createdAt: string;
        advanceAmount: string;
        totalAdvanceAdjusted: string;
        currency_code: string | null;
        branchId: string;
        saleType: string;
      }[]
    >(`
      SELECT i.id, i."invoiceNumber", i.customer_name, TO_CHAR(i."createdAt", 'YYYY-MM-DD') AS "createdAt",
             COALESCE(i."advanceAmount", 0) AS "advanceAmount",
             COALESCE(adv."totalAdvanceAdjusted", 0) AS "totalAdvanceAdjusted",
             i.currency_code, i."branchId", i."saleType"
      FROM invoices i
      LEFT JOIN (
        SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
        FROM usage_records GROUP BY "contractId"
      ) adv ON adv."contractId" = i.id
      WHERE i."saleType" IN ('RENT', 'LEASE')
        AND i.status = 'ACTIVE_CONTRACT'
        AND i."deletedAt" IS NULL
        ${branchSql('i', bParam)}
      ORDER BY i."createdAt" DESC
    `);

    let mapped = rows
      .map((r) => {
        const unearned = Math.max(Number(r.advanceAmount) - Number(r.totalAdvanceAdjusted), 0);
        return {
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          customerName: r.customer_name ?? 'Unknown Customer',
          date: r.createdAt,
          amount: unearned,
          advanceAmount: Number(r.advanceAmount),
          advanceAdjustedSoFar: Number(r.totalAdvanceAdjusted),
          currencyCode: r.currency_code ?? 'AED',
          branchId: r.branchId,
          saleType: r.saleType,
        };
      })
      .filter((r) => r.amount > 0);

    if (q.customerName) {
      const needle = q.customerName.toLowerCase();
      mapped = mapped.filter((r) => r.customerName.toLowerCase().includes(needle));
    }
    if (q.search) {
      const needle = q.search.toLowerCase();
      mapped = mapped.filter((r) => r.invoiceNumber.toLowerCase().includes(needle));
    }
    mapped = applyDateAmountFilters(mapped, q);

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

// 4008 Other Income — income_entries (RECEIVED) not linked to a dedicated custom
// Chart of Accounts income line. Mirrors accountsShared.ts's own otherIncome
// catch-all exactly (same category-exclusion set), so this drill-down's line
// items always sum to the same total shown on the 4008 row / P&L revenueByType.OTHER.
export const getOtherIncomeTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const q = req.query as Record<string, string | undefined>;

    const rows = await Source.query<
      {
        id: string;
        incomeNo: string;
        category: string;
        subCategory: string | null;
        description: string;
        date: string;
        netAmount: string;
        currency: string | null;
        branchId: string;
        receivedMode: string | null;
      }[]
    >(`
      SELECT id, "incomeNo", category, "subCategory", description,
             TO_CHAR(date, 'YYYY-MM-DD') AS date, "netAmount", currency,
             "branchId", "receivedMode"
      FROM income_entries
      WHERE status = 'RECEIVED'
        AND category NOT IN (
          SELECT "categoryKey" FROM chart_of_accounts
          WHERE "isActive" = true AND "isSystemDefault" = false AND category = 'INCOME'
            AND "sourceType" = 'INCOME_CATEGORY_LINKED' AND "categoryKey" IS NOT NULL
        )
        ${branchSql('income_entries', bParam)}
      ORDER BY date DESC
    `);

    let mapped = rows.map((r) => ({
      id: r.id,
      incomeNo: r.incomeNo,
      category: r.category,
      subCategory: r.subCategory,
      description: r.description,
      date: r.date,
      amount: Number(r.netAmount),
      currencyCode: r.currency ?? 'AED',
      branchId: r.branchId,
      receivedMode: r.receivedMode,
    }));

    if (q.search) {
      const needle = q.search.toLowerCase();
      mapped = mapped.filter(
        (r) =>
          r.incomeNo.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle),
      );
    }
    mapped = applyDateAmountFilters(mapped, q);

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

// 3002 Retained Earnings — period-by-period P&L breakdown (there's no single "retained
// earnings entry" table; retained earnings is a computed cumulative figure). Reuses
// computeProfitAndLoss (the same function that produces the P&L page) per month.
export const getRetainedEarningsMonthly = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const branchF = req.branchFilter ?? [];
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const q = req.query as Record<string, string | undefined>;

    const monthsBack = Math.min(Math.max(Number(q.months) || 12, 1), 36);
    const now = new Date();
    const months: { year: number; month: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    let currency = 'AED';
    if (branchF.length === 1) {
      const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
      const info = await getBranchCurrencyInfo(branchF[0]);
      currency = info?.currencyCode ?? 'AED';
    }

    const monthBounds = months.map(({ year, month }) => {
      const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      return { dateFrom, dateTo };
    });

    // Opening balance for the window: all-time net income from before the first
    // shown month, so "cumulative" always reconciles to computeBalanceSheet's own
    // all-time Retained Earnings figure — not just to whatever fits in `months`.
    // Previously this assumed cumulative started at 0 at the edge of the window,
    // which only happened to look right while this deployment had under 12 months
    // of history; the same "monthsBack" default that made the drill-down usable
    // (nobody wants a since-day-one table) was silently truncating the total it
    // reported.
    const firstMonthStart = monthBounds[0].dateFrom;
    const dayBeforeWindow = new Date(firstMonthStart);
    dayBeforeWindow.setDate(dayBeforeWindow.getDate() - 1);
    const openingDateTo = dayBeforeWindow.toISOString().slice(0, 10);

    const [openingPl, ...plResults] = await Promise.all([
      computeProfitAndLoss(Source, branchF, ALL_TIME_START, openingDateTo, currency, INV_URL),
      ...monthBounds.map(({ dateFrom, dateTo }) =>
        computeProfitAndLoss(Source, branchF, dateFrom, dateTo, currency, INV_URL),
      ),
    ]);

    let cumulative = openingPl.totalRevenue - openingPl.totalExpenses;
    const rows = plResults.map((pl, i) => {
      const netIncome = pl.totalRevenue - pl.totalExpenses;
      cumulative += netIncome;
      return {
        month: monthBounds[i].dateFrom.slice(0, 7),
        revenue: +pl.totalRevenue.toFixed(2),
        expenses: +pl.totalExpenses.toFixed(2),
        netIncome: +netIncome.toFixed(2),
        cumulative: +cumulative.toFixed(2),
      };
    });

    res.json({ success: true, data: rows, currency });
  } catch (err) {
    next(err);
  }
};

// ─── Receivable / Payable page row-level "View" drill-down ───────────────────
// Full source traceability: customer/vendor full details, originating document,
// complete payment history (every partial payment, mode, and linked cheque status),
// and — for Payable POs — the Manager-approval chain. Mirrors the cross-service
// best-effort pattern already used above (internalFetchJSON / CRM enrichment).

async function internalFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// GET /accounts/line-items/receivable-detail?type=INVOICE|MANUAL&id=...
export const getReceivableRowDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.query as { type?: string; id?: string };
    if (!id || (type !== 'INVOICE' && type !== 'MANUAL')) {
      res
        .status(400)
        .json({ success: false, message: 'type (INVOICE|MANUAL) and id are required' });
      return;
    }

    if (type === 'INVOICE') {
      const invRows = await Source.query<
        {
          id: string;
          invoiceNumber: string;
          saleType: string;
          status: string;
          customerId: string | null;
          customer_name: string | null;
          customer_vat_number: string | null;
          customer_country: string | null;
          customer_state_province: string | null;
          customer_city: string | null;
          totalAmount: string;
          currency_code: string | null;
          createdAt: string;
          branchId: string;
          billingPeriodStart: string | null;
          billingPeriodEnd: string | null;
        }[]
      >(
        `SELECT id, "invoiceNumber", "saleType", status, "customerId",
                customer_name, customer_vat_number, customer_country,
                customer_state_province, customer_city, "totalAmount",
                currency_code, TO_CHAR("createdAt", 'YYYY-MM-DD') AS "createdAt", "branchId",
                TO_CHAR("billingPeriodStart", 'YYYY-MM-DD') AS "billingPeriodStart",
                TO_CHAR("billingPeriodEnd", 'YYYY-MM-DD') AS "billingPeriodEnd"
         FROM invoices WHERE id = $1`,
        [id],
      );
      const inv = invRows[0];
      if (!inv) throw new AppError('Invoice not found', 404);

      const [txRows, ledgerRows, cheques] = await Promise.all([
        Source.query<
          {
            id: string;
            date: string;
            amount: string;
            mode: string;
            referenceNumber: string | null;
          }[]
        >(
          `SELECT id, TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date, amount,
                  payment_mode AS mode, reference_number AS "referenceNumber"
           FROM payment_transactions WHERE invoice_id = $1 ORDER BY transaction_date ASC`,
          [id],
        ),
        Source.query<
          {
            id: string;
            date: string;
            amount: string;
            mode: string;
            referenceNumber: string | null;
          }[]
        >(
          `SELECT id, TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date, "amountPaid" AS amount,
                  "paymentMode" AS mode, "referenceNumber"
           FROM payment_ledgers WHERE "invoiceId" = $1 ORDER BY "paymentDate" ASC`,
          [id],
        ),
        Source.query<
          {
            id: string;
            chequeNo: string;
            bankName: string | null;
            amount: string;
            dueDate: string;
            status: string;
            type: string;
          }[]
        >(
          `SELECT id, cheque_no AS "chequeNo", bank_name AS "bankName", amount,
                  TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate", status, type
           FROM cheques WHERE source_type = 'INVOICE' AND source_reference_id = $1
           ORDER BY due_date ASC`,
          [id],
        ),
      ]);

      const paymentHistory = [
        ...txRows.map((r) => ({
          id: r.id,
          date: r.date,
          amount: Number(r.amount),
          mode: r.mode,
          referenceNumber: r.referenceNumber,
        })),
        ...ledgerRows.map((r) => ({
          id: r.id,
          date: r.date,
          amount: Number(r.amount),
          mode: r.mode,
          referenceNumber: r.referenceNumber,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date));

      const totalPaid = paymentHistory.reduce((s, p) => s + p.amount, 0);

      let customer: {
        phone: string | null;
        email: string | null;
      } = { phone: null, email: null };
      if (inv.customerId) {
        const CRM_URL = process.env.CRM_SERVICE_URL ?? 'http://localhost:3005';
        const resp = await internalFetchJSON<{ data: { phone?: string; email?: string } }>(
          `${CRM_URL}/customers/${inv.customerId}`,
        );
        if (resp?.data) {
          customer = { phone: resp.data.phone ?? null, email: resp.data.email ?? null };
        }
      }

      res.json({
        success: true,
        data: {
          source: 'INVOICE',
          id: inv.id,
          referenceNo: inv.invoiceNumber,
          saleType: inv.saleType,
          status: inv.status,
          issueDate: inv.createdAt,
          dueDate: null,
          billingPeriodStart: inv.billingPeriodStart,
          billingPeriodEnd: inv.billingPeriodEnd,
          totalAmount: Number(inv.totalAmount),
          paid: totalPaid,
          outstanding: Number(inv.totalAmount) - totalPaid,
          currencyCode: inv.currency_code ?? 'AED',
          branchId: inv.branchId,
          customer: {
            name: inv.customer_name,
            vatNumber: inv.customer_vat_number,
            country: inv.customer_country,
            stateProvince: inv.customer_state_province,
            city: inv.customer_city,
            phone: customer.phone,
            email: customer.email,
          },
          paymentHistory,
          cheques,
        },
      });
      return;
    }

    // MANUAL receivable
    const rcvRows = await Source.query<
      {
        id: string;
        referenceNo: string;
        type: string;
        customerId: string | null;
        customerName: string | null;
        amount: string;
        amountPaid: string;
        outstanding: string | null;
        currency: string;
        issueDate: string;
        dueDate: string;
        status: string;
        branchId: string;
      }[]
    >(
      `SELECT id, "referenceNo", type, "customerId", "customerName", amount, "amountPaid",
              outstanding, currency, TO_CHAR("issueDate", 'YYYY-MM-DD') AS "issueDate",
              TO_CHAR("dueDate", 'YYYY-MM-DD') AS "dueDate", status, "branchId"
       FROM manual_receivables WHERE id = $1`,
      [id],
    );
    const rcv = rcvRows[0];
    if (!rcv) throw new AppError('Receivable not found', 404);

    const [payments, cheques] = await Promise.all([
      Source.query<
        {
          id: string;
          date: string;
          amount: string;
          mode: string | null;
          referenceNumber: string | null;
        }[]
      >(
        `SELECT id, TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date, amount,
                "paymentMode" AS mode, "referenceNo" AS "referenceNumber"
         FROM receivable_payments WHERE "receivableId" = $1 ORDER BY "paymentDate" ASC`,
        [id],
      ),
      Source.query<
        {
          id: string;
          chequeNo: string;
          bankName: string | null;
          amount: string;
          dueDate: string;
          status: string;
          type: string;
        }[]
      >(
        `SELECT id, cheque_no AS "chequeNo", bank_name AS "bankName", amount,
                TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate", status, type
         FROM cheques WHERE source_type = 'RECEIVABLE' AND source_reference_id = $1
         ORDER BY due_date ASC`,
        [id],
      ),
    ]);

    res.json({
      success: true,
      data: {
        source: 'MANUAL',
        id: rcv.id,
        referenceNo: rcv.referenceNo,
        saleType: rcv.type,
        status: rcv.status,
        issueDate: rcv.issueDate,
        dueDate: rcv.dueDate,
        billingPeriodStart: null,
        billingPeriodEnd: null,
        totalAmount: Number(rcv.amount),
        paid: Number(rcv.amountPaid),
        outstanding: Number(rcv.outstanding ?? Number(rcv.amount) - Number(rcv.amountPaid)),
        currencyCode: rcv.currency,
        branchId: rcv.branchId,
        customer: {
          name: rcv.customerName,
          vatNumber: null,
          country: null,
          stateProvince: null,
          city: null,
          phone: null,
          email: null,
        },
        paymentHistory: payments.map((p) => ({
          id: p.id,
          date: p.date,
          amount: Number(p.amount),
          mode: p.mode,
          referenceNumber: p.referenceNumber,
        })),
        cheques,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /accounts/line-items/payable-detail?type=PO|MANUAL&id=...
export const getPayableRowDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.query as { type?: string; id?: string };
    if (!id || (type !== 'PO' && type !== 'MANUAL')) {
      res.status(400).json({ success: false, message: 'type (PO|MANUAL) and id are required' });
      return;
    }

    if (type === 'PO') {
      const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const purchase = await internalFetchJSON<{
        data: {
          id: string;
          totalAmount: number;
          paidAmount?: number;
          remainingAmount?: number;
          currencyCode?: string;
          createdAt: string;
          branchId: string;
          purchaseOrigin?: string | null;
          purchaseCategory?: string | null;
          lotId?: string;
          vendor?: {
            name: string;
            email?: string;
            phone?: string;
            contactPerson?: string;
            vatNumber?: string | null;
            countryName?: string | null;
            countryCode?: string | null;
            stateProvince?: string | null;
            city?: string | null;
            bankAccounts?: unknown[];
          };
          payments?: {
            id: string;
            amount: number;
            paymentDate: string;
            paymentMethod: string;
            referenceNumber?: string;
          }[];
        };
      }>(`${INV_URL}/purchases/${id}`);

      if (!purchase?.data) throw new AppError('Purchase not found', 404);
      const p = purchase.data;

      const [approvals, cheques] = await Promise.all([
        Source.getRepository(EmployeeExpenseRequest).find({
          where: { purchaseId: id, requestSource: 'MANAGER_PURCHASE' },
          order: { createdAt: 'ASC' },
        }),
        Source.query<
          {
            id: string;
            chequeNo: string;
            bankName: string | null;
            amount: string;
            dueDate: string;
            status: string;
            type: string;
          }[]
        >(
          `SELECT id, cheque_no AS "chequeNo", bank_name AS "bankName", amount,
                  TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate", status, type
           FROM cheques WHERE source_type = 'PURCHASE' AND source_reference_id = $1
           ORDER BY due_date ASC`,
          [id],
        ),
      ]);

      const paid = Number(p.paidAmount ?? 0);
      res.json({
        success: true,
        data: {
          source: 'PO',
          id: p.id,
          referenceNo: `PO-${(p.lotId ?? p.id).slice(0, 8)}`,
          category: p.purchaseCategory ?? null,
          origin: p.purchaseOrigin ?? null,
          issueDate: p.createdAt?.slice(0, 10),
          dueDate: null,
          totalAmount: Number(p.totalAmount),
          paid,
          outstanding: Number(p.remainingAmount ?? Number(p.totalAmount) - paid),
          currencyCode: p.currencyCode ?? 'AED',
          branchId: p.branchId,
          vendor: p.vendor
            ? {
                name: p.vendor.name,
                email: p.vendor.email ?? null,
                phone: p.vendor.phone ?? null,
                contactPerson: p.vendor.contactPerson ?? null,
                vatNumber: p.vendor.vatNumber ?? null,
                country: p.vendor.countryName ?? p.vendor.countryCode ?? null,
                stateProvince: p.vendor.stateProvince ?? null,
                city: p.vendor.city ?? null,
                bankAccounts: p.vendor.bankAccounts ?? [],
              }
            : null,
          paymentHistory: (p.payments ?? []).map((pay) => ({
            id: pay.id,
            date: pay.paymentDate?.slice(0, 10),
            amount: Number(pay.amount),
            mode: pay.paymentMethod,
            referenceNumber: pay.referenceNumber ?? null,
          })),
          cheques,
          approvals: approvals.map((a) => ({
            id: a.id,
            requestNo: a.requestNo,
            status: a.status,
            employeeName: a.employeeName,
            paymentMode: a.paymentMode,
            amount: Number(a.amount),
            submittedAt: a.submittedAt,
            reviewedBy: a.reviewedByName ?? a.reviewedBy ?? null,
            reviewedAt: a.reviewedAt,
            rejectionReason: a.rejectionReason,
          })),
        },
      });
      return;
    }

    // MANUAL payable
    const payRows = await Source.query<
      {
        id: string;
        referenceNo: string;
        type: string;
        payableTo: string;
        vendorId: string | null;
        amount: string;
        amountPaid: string;
        outstanding: string | null;
        currency: string;
        issueDate: string;
        dueDate: string;
        status: string;
        branchId: string;
      }[]
    >(
      `SELECT id, "referenceNo", type, "payableTo", "vendorId", amount, "amountPaid",
              outstanding, currency, TO_CHAR("issueDate", 'YYYY-MM-DD') AS "issueDate",
              TO_CHAR("dueDate", 'YYYY-MM-DD') AS "dueDate", status, "branchId"
       FROM manual_payables WHERE id = $1`,
      [id],
    );
    const pay = payRows[0];
    if (!pay) throw new AppError('Payable not found', 404);

    const [payments, cheques] = await Promise.all([
      Source.query<
        {
          id: string;
          date: string;
          amount: string;
          mode: string | null;
          referenceNumber: string | null;
        }[]
      >(
        `SELECT id, TO_CHAR("paymentDate", 'YYYY-MM-DD') AS date, amount,
                "paymentMode" AS mode, "referenceNo" AS "referenceNumber"
         FROM payable_payments WHERE "payableId" = $1 ORDER BY "paymentDate" ASC`,
        [id],
      ),
      Source.query<
        {
          id: string;
          chequeNo: string;
          bankName: string | null;
          amount: string;
          dueDate: string;
          status: string;
          type: string;
        }[]
      >(
        `SELECT id, cheque_no AS "chequeNo", bank_name AS "bankName", amount,
                TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate", status, type
         FROM cheques WHERE source_type = 'PAYABLE' AND source_reference_id = $1
         ORDER BY due_date ASC`,
        [id],
      ),
    ]);

    res.json({
      success: true,
      data: {
        source: 'MANUAL',
        id: pay.id,
        referenceNo: pay.referenceNo,
        category: pay.type,
        origin: null,
        issueDate: pay.issueDate,
        dueDate: pay.dueDate,
        totalAmount: Number(pay.amount),
        paid: Number(pay.amountPaid),
        outstanding: Number(pay.outstanding ?? Number(pay.amount) - Number(pay.amountPaid)),
        currencyCode: pay.currency,
        branchId: pay.branchId,
        vendor: {
          name: pay.payableTo,
          email: null,
          phone: null,
          contactPerson: null,
          vatNumber: null,
          country: null,
          stateProvince: null,
          city: null,
          bankAccounts: [],
        },
        paymentHistory: payments.map((p) => ({
          id: p.id,
          date: p.date,
          amount: Number(p.amount),
          mode: p.mode,
          referenceNumber: p.referenceNumber,
        })),
        cheques,
        approvals: [],
      },
    });
  } catch (err) {
    next(err);
  }
};
