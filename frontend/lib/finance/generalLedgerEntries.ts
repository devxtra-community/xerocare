/**
 * General Ledger row construction — shared by the Finance and Admin General
 * Ledger pages so the (fairly involved) double-entry modeling logic lives in
 * exactly one place instead of being duplicated per page.
 *
 * Historically this GL only covered 4 sources (AR Invoices, customer Payments,
 * Purchase Orders, Payroll) and had no way to attribute a row to a specific
 * customer/vendor or a granular income/expense type. This adds three more
 * genuinely-missing sources — Vendor Payments, cleared Cheques, and general
 * Expense entries — that already exist elsewhere in the app (Payable page,
 * Cheques page, Expenses page) but were never surfaced here. Adding them
 * required tracing exactly how each posts money to avoid double-counting
 * against the cashbook-derived `payments` rows — see the inline notes below.
 */
import type { InvoiceSummary, PaymentRecord, PurchaseOrder, PayrollRecord } from './accounts';
import type { Cheque, ExpenseEntry } from './accountsApi';
import { RENT_PLAN_TYPES, RENT_PLAN_TYPE_LABELS } from './accountsApi';
import type { ExpenseRequest } from '../employeeExpenses';

export interface GLEntry {
  date: string;
  account: string;
  /** Explicit 4-digit CoA code — always set, independent of `account`'s display string. */
  accountCode: string;
  description: string;
  source: string;
  /** ID of the originating record — together with `source` this groups every line
   * of the same double-entry transaction and is what makes the View action possible. */
  sourceId: string;
  debit: number;
  credit: number;
  currency: string;
  /** Set on rows attributable to a specific customer (AR Invoice, customer Payment, RECEIVED Cheque). */
  customerName?: string;
  /** Set on rows attributable to a specific vendor (Purchase Order, Vendor Payment, vendor-linked ISSUED Cheque). */
  vendorName?: string;
  /** Granular income sub-type key for AR Invoice rows — see classifyIncomeSubType(). */
  incomeSubType?: string;
  /** Set on Purchase-Order-driven rows (Purchase Order / Vendor Payment / vendor ISSUED Cheque). */
  purchaseOrigin?: 'DOMESTIC' | 'INTERNATIONAL';
  /** Lowercased blob of every field the universal search bar matches against —
   * description, account, customer/vendor name, income/expense type labels.
   * Precomputed once here (not per-keystroke) so the single search input can do
   * a genuine OR-match across all of them without duplicating this list of
   * fields at every call site. See matchesSearch(). */
  searchBlob: string;
}

export const SOURCE_COLORS: Record<string, string> = {
  'AR Invoice': 'bg-blue-100 text-blue-700',
  Payment: 'bg-emerald-100 text-emerald-700',
  'Purchase Order': 'bg-orange-100 text-orange-700',
  Payroll: 'bg-purple-100 text-purple-700',
  'Vendor Payment': 'bg-amber-100 text-amber-700',
  Cheque: 'bg-cyan-100 text-cyan-700',
  Expense: 'bg-rose-100 text-rose-700',
};

// ─── Income sub-type classification (mirrors revenueBreakdown.ts's subCategoryOf,
// applied client-side since GET /invoices already returns rentType/leaseType —
// see backend/billing_service/src/utils/revenueBreakdown.ts for the canonical logic
// this must stay consistent with) ────────────────────────────────────────────────

export function classifyIncomeSubType(
  inv: Pick<InvoiceSummary, 'saleType' | 'rentType' | 'leaseType'>,
): string {
  const st = inv.saleType;
  if (st === 'SALE' || st === 'PRODUCT_SALE') return 'PRODUCT_SALE';
  if (st === 'SPAREPART_SALE') return 'SPAREPART_SALE';
  if (st === 'SERVICE') return 'SERVICE';
  if (st === 'RENT') return inv.rentType ?? 'RENT_UNKNOWN';
  if (st === 'LEASE') {
    if (inv.leaseType === 'EMI') return 'EMI';
    if (inv.leaseType === 'FSM') return `FSM_${inv.rentType ?? 'UNKNOWN'}`;
    return 'LEASE_UNKNOWN';
  }
  return 'UNKNOWN';
}

export function incomeTopCategory(
  subType: string,
): 'SALE' | 'RENT' | 'LEASE' | 'SERVICE' | 'UNKNOWN' {
  if (subType === 'PRODUCT_SALE' || subType === 'SPAREPART_SALE') return 'SALE';
  if (subType === 'SERVICE') return 'SERVICE';
  if (subType === 'EMI' || subType.startsWith('FSM_')) return 'LEASE';
  if ((RENT_PLAN_TYPES as readonly string[]).includes(subType)) return 'RENT';
  return 'UNKNOWN';
}

export const INCOME_SUBTYPE_LABELS: Record<string, string> = {
  PRODUCT_SALE: 'Product Sale',
  SPAREPART_SALE: 'Spare Part Sale',
  SERVICE: 'Service',
  EMI: 'Lease — EMI',
  ...Object.fromEntries(RENT_PLAN_TYPES.map((pt) => [pt, `Rent — ${RENT_PLAN_TYPE_LABELS[pt]}`])),
  ...Object.fromEntries(
    RENT_PLAN_TYPES.map((pt) => [`FSM_${pt}`, `Lease — FSM (${RENT_PLAN_TYPE_LABELS[pt]})`]),
  ),
};

export const INCOME_TOP_CATEGORY_LABELS: Record<string, string> = {
  SALE: 'Sale (all)',
  RENT: 'Rent (all)',
  LEASE: 'Lease (all)',
  SERVICE: 'Service',
};

// ─── Expense category → Chart of Accounts mapping (expense_entries.category is a
// free string, not a strict DB enum — see backend/billing_service/src/entities/
// expenseEntryEntity.ts) ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORY_ACCOUNT: Record<string, { code: string; name: string }> = {
  SALARY: { code: '5006', name: 'Employee Salary Expense' },
  TRAVEL: { code: '5009', name: 'Travel Expense' },
  RENT: { code: '5010', name: 'Premises Rent Expense' },
  UTILITIES: { code: '5011', name: 'Utilities Expense' },
  SPARE_PARTS: { code: '5001', name: 'Cost of Goods Sold' },
  LABOUR: { code: '5002', name: 'Technician Labour Cost' },
  VENDOR_PURCHASE: { code: '5004', name: 'Vendor Purchase Cost' },
  MARKETING: { code: '5012', name: 'Marketing Expense' },
  MAINTENANCE: { code: '5007', name: 'Maintenance & Repair Expense' },
  INSURANCE: { code: '5013', name: 'Insurance Expense' },
  DEPRECIATION: { code: '5003', name: 'Depreciation Expense' },
  OTHER: { code: '5008', name: 'Office & Admin Expense' },
};
const DEFAULT_EXPENSE_ACCOUNT = { code: '5008', name: 'Office & Admin Expense' };

export interface GLSources {
  invoices: InvoiceSummary[];
  payments: PaymentRecord[];
  purchases: PurchaseOrder[];
  payroll: PayrollRecord[];
  /** Full expense-request list (any status/source) — filtered internally to the
   * Manager Purchase Approval Gate's paid, non-cheque rows. */
  vendorPaymentRequests: ExpenseRequest[];
  cheques: Cheque[];
  /** Full expense-entry list (any status) — filtered internally to paid, non-cheque rows. */
  expenseEntries: ExpenseEntry[];
  currency: string;
}

function isCash(mode: string | undefined): boolean {
  return (mode ?? '').trim().toLowerCase() === 'cash';
}
function isCheque(mode: string | undefined): boolean {
  return (mode ?? '').trim().toLowerCase() === 'cheque';
}

// searchBlob is derived from every other field, so it's computed once in a final
// pass (see the end of buildGlEntries) rather than at each individual push below.
type GLEntryDraft = Omit<GLEntry, 'searchBlob'>;

export function buildGlEntries(src: GLSources): GLEntry[] {
  const rows: GLEntryDraft[] = [];
  const {
    invoices,
    payments,
    purchases,
    payroll,
    vendorPaymentRequests,
    cheques,
    expenseEntries,
    currency,
  } = src;

  // ── AR Invoice ──────────────────────────────────────────────────────────────
  invoices.forEach((inv) => {
    const subType = classifyIncomeSubType(inv);
    const revenueAcc =
      inv.saleType === 'RENT'
        ? '4001 Rental Revenue'
        : inv.saleType === 'LEASE'
          ? '4002 Lease Revenue'
          : inv.saleType === 'SERVICE'
            ? '4004 Service Revenue'
            : inv.saleType === 'SPAREPART_SALE'
              ? '4007 Spare Parts Sales Revenue'
              : '4003 Sales Revenue';
    const dateStr = inv.createdAt?.slice(0, 10) ?? '';
    const invTotal = Number(inv.totalAmount || 0);
    const invTax = Number(inv.taxAmount || 0);

    rows.push({
      date: dateStr,
      account: '1003 Accounts Receivable',
      accountCode: '1003',
      description: `Invoice ${inv.invoiceNumber} — ${inv.customerName}`,
      source: 'AR Invoice',
      sourceId: inv.id,
      debit: invTotal,
      credit: 0,
      currency: inv.currency,
      customerName: inv.customerName,
      incomeSubType: subType,
    });
    rows.push({
      date: dateStr,
      account: revenueAcc,
      accountCode: revenueAcc.slice(0, 4),
      description: `Invoice ${inv.invoiceNumber} — ${inv.customerName}`,
      source: 'AR Invoice',
      sourceId: inv.id,
      debit: 0,
      credit: invTotal - invTax,
      currency: inv.currency,
      customerName: inv.customerName,
      incomeSubType: subType,
    });
    if (invTax > 0)
      rows.push({
        date: dateStr,
        account: '2003 VAT / Tax Payable',
        accountCode: '2003',
        description: `VAT on Invoice ${inv.invoiceNumber}`,
        source: 'AR Invoice',
        sourceId: inv.id,
        debit: 0,
        credit: invTax,
        currency: inv.currency,
        customerName: inv.customerName,
        incomeSubType: subType,
      });
  });

  // ── Payment (customer receipts) — cheque-clear receipts are now sourced from
  // the Cheque list below instead (same underlying cash event); skip here to
  // avoid representing the same clearance twice. A RECEIPT with sourceType
  // 'INCOME' (e.g. scrap sale) isn't reducing any Accounts Receivable — crediting
  // 1003 for it would be wrong, so it routes to 4008 Other Income instead. ─────
  payments.forEach((p) => {
    if (p.sourceType === 'CHEQUE_CLEAR') return;
    const isOtherIncome = p.sourceType === 'INCOME';
    const cashAcc = p.method === 'CASH' ? '1001 Cash in Hand' : '1002 Cash at Bank';
    const matchedInvoice = isOtherIncome ? undefined : invoices.find((i) => i.id === p.invoiceId);
    const customerName = matchedInvoice?.customerName;
    // So an Income Type filter (e.g. "Lease — EMI") also surfaces the payment that
    // settled that invoice, not just its original revenue-recognition rows.
    const incomeSubType = matchedInvoice ? classifyIncomeSubType(matchedInvoice) : undefined;
    const dateStr = p.paymentDate?.slice(0, 10) ?? '';
    const pAmt = Number(p.amount || 0);

    rows.push({
      date: dateStr,
      account: cashAcc,
      accountCode: p.method === 'CASH' ? '1001' : '1002',
      description: `Payment received — ${p.method}`,
      source: 'Payment',
      sourceId: p.id,
      debit: pAmt,
      credit: 0,
      currency: p.currency,
      customerName,
      incomeSubType,
    });
    rows.push({
      date: dateStr,
      account: isOtherIncome ? '4008 Other Income' : '1003 Accounts Receivable',
      accountCode: isOtherIncome ? '4008' : '1003',
      description: isOtherIncome ? (p.description ?? 'Other income received') : 'Payment received',
      source: 'Payment',
      sourceId: p.id,
      debit: 0,
      credit: pAmt,
      currency: p.currency,
      customerName,
      incomeSubType,
    });
  });

  // ── Purchase Order (AP creation) ────────────────────────────────────────────
  purchases.forEach((p) => {
    // Four non-overlapping cost buckets that sum to exactly p.totalAmount (which already
    // includes shipping/handling/transport/groundfield/labour internally — see
    // purchaseRepository.ts) plus customsDuty, which is tracked separately and never part
    // of totalAmount. Posting totalAmount as 5004 AND shipping/handling again as 5005 would
    // double-count; this split avoids that.
    const vendorPurchaseCost = Number(p.purchaseAmount ?? 0) + Number(p.documentationFee ?? 0);
    const shippingHandling =
      Number(p.shippingCost ?? 0) +
      Number(p.handlingFee ?? 0) +
      Number(p.transportationCost ?? 0) +
      Number(p.groundfieldCost ?? 0);
    const importLabour = Number(p.labourCost ?? 0);
    const customsDuty = Number(p.customsDuty ?? 0);
    const dateStr = p.createdAt?.slice(0, 10) ?? '';
    const vendorName = p.vendor?.name ?? '';
    const cur = p.currencyCode ?? currency;
    const origin = p.purchaseOrigin as 'DOMESTIC' | 'INTERNATIONAL' | undefined;
    const pTotal = Number(p.totalAmount ?? 0);

    rows.push({
      date: dateStr,
      account: '5004 Vendor Purchase Cost',
      accountCode: '5004',
      description: `Purchase from ${vendorName}`,
      source: 'Purchase Order',
      sourceId: p.id,
      debit: vendorPurchaseCost,
      credit: 0,
      currency: cur,
      vendorName,
      purchaseOrigin: origin,
    });
    rows.push({
      date: dateStr,
      account: '2001 Accounts Payable',
      accountCode: '2001',
      description: `Purchase from ${vendorName}`,
      source: 'Purchase Order',
      sourceId: p.id,
      debit: 0,
      credit: pTotal,
      currency: cur,
      vendorName,
      purchaseOrigin: origin,
    });
    if (shippingHandling > 0)
      rows.push({
        date: dateStr,
        account: '5005 Shipping & Handling',
        accountCode: '5005',
        description: `Freight on PO from ${vendorName}`,
        source: 'Purchase Order',
        sourceId: p.id,
        debit: shippingHandling,
        credit: 0,
        currency: cur,
        vendorName,
        purchaseOrigin: origin,
      });
    if (importLabour > 0)
      rows.push({
        date: dateStr,
        account: '5014 Import / Purchase Labour Cost',
        accountCode: '5014',
        description: `Import labour on PO from ${vendorName}`,
        source: 'Purchase Order',
        sourceId: p.id,
        debit: importLabour,
        credit: 0,
        currency: cur,
        vendorName,
        purchaseOrigin: origin,
      });
    if (customsDuty > 0) {
      // Customs duty is owed to the customs authority, not the vendor — it never adds to
      // Accounts Payable (2001). Modeled as paid at clearance, matching how other direct
      // expenses (e.g. payroll below) credit Cash at Bank rather than a payable.
      rows.push({
        date: dateStr,
        account: '5015 Customs Duty',
        accountCode: '5015',
        description: `Customs duty on PO from ${vendorName}`,
        source: 'Purchase Order',
        sourceId: p.id,
        debit: customsDuty,
        credit: 0,
        currency: cur,
        vendorName,
        purchaseOrigin: origin,
      });
      rows.push({
        date: dateStr,
        account: '1002 Cash at Bank',
        accountCode: '1002',
        description: `Customs duty paid on PO from ${vendorName}`,
        source: 'Purchase Order',
        sourceId: p.id,
        debit: 0,
        credit: customsDuty,
        currency: cur,
        vendorName,
        purchaseOrigin: origin,
      });
    }
  });

  // ── Payroll ──────────────────────────────────────────────────────────────────
  payroll.forEach((p) => {
    const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-28`;
    const pSalary = Number(p.netSalary || 0);

    rows.push({
      date: dateStr,
      account: '5006 Employee Salary Expense',
      accountCode: '5006',
      description: `Payroll ${p.year}-${String(p.month).padStart(2, '0')}`,
      source: 'Payroll',
      sourceId: p.id,
      debit: pSalary,
      credit: 0,
      currency,
    });
    rows.push({
      date: dateStr,
      account: '1002 Cash at Bank',
      accountCode: '1002',
      description: `Payroll disbursement ${p.year}-${String(p.month).padStart(2, '0')}`,
      source: 'Payroll',
      sourceId: p.id,
      debit: 0,
      credit: pSalary,
      currency,
    });
  });

  // ── Vendor Payment — Manager Purchase Approval Gate, cash/bank mode only.
  // Cheque-mode vendor payments settle later via a CLEARED Cheque row below (the
  // request is marked PAID immediately on approval even for cheques, but the cash
  // doesn't actually move until the cheque clears — including it here too would
  // both misdate it and double-count it against the eventual Cheque row). ───────
  vendorPaymentRequests
    .filter(
      (r) =>
        r.requestSource === 'MANAGER_PURCHASE' && r.status === 'PAID' && !isCheque(r.paymentMode),
    )
    .forEach((r) => {
      const dateStr = (r.paidAt ?? r.date)?.slice(0, 10) ?? '';
      const vendorName = r.vendorName ?? '';
      const desc = `Vendor payment — ${vendorName}${r.purchaseRef ? ` (${r.purchaseRef})` : ''}`;
      const origin = r.purchaseOrigin as 'DOMESTIC' | 'INTERNATIONAL' | undefined;
      const cashCode = isCash(r.paymentMode) ? '1001' : '1002';
      const rAmt = Number(r.amount || 0);

      rows.push({
        date: dateStr,
        account: '2001 Accounts Payable',
        accountCode: '2001',
        description: desc,
        source: 'Vendor Payment',
        sourceId: r.id,
        debit: rAmt,
        credit: 0,
        currency: r.currency,
        vendorName,
        purchaseOrigin: origin,
      });
      rows.push({
        date: dateStr,
        account: cashCode === '1001' ? '1001 Cash in Hand' : '1002 Cash at Bank',
        accountCode: cashCode,
        description: desc,
        source: 'Vendor Payment',
        sourceId: r.id,
        debit: 0,
        credit: rAmt,
        currency: r.currency,
        vendorName,
        purchaseOrigin: origin,
      });
    });

  // ── Cheques — CLEARED only. PENDING/DEPOSITED/ISSUED cheques haven't moved
  // cash yet (cashbookEntryId is null until Clear), so including them as debit/
  // credit rows would misrepresent money that hasn't actually moved. ───────────
  cheques
    .filter((c) => c.status === 'CLEARED')
    .forEach((c) => {
      const dateStr = (c.clearedDate ?? c.depositDate ?? c.dueDate ?? '').slice(0, 10);
      const desc = `Cheque ${c.chequeNo} cleared — ${c.partyName}`;
      const cAmt = Number(c.amount || 0);

      if (c.type === 'RECEIVED') {
        rows.push({
          date: dateStr,
          account: '1002 Cash at Bank',
          accountCode: '1002',
          description: desc,
          source: 'Cheque',
          sourceId: c.id,
          debit: cAmt,
          credit: 0,
          currency,
          customerName: c.partyName,
        });
        rows.push({
          date: dateStr,
          account: '1003 Accounts Receivable',
          accountCode: '1003',
          description: desc,
          source: 'Cheque',
          sourceId: c.id,
          debit: 0,
          credit: cAmt,
          currency,
          customerName: c.partyName,
        });
        return;
      }
      // ISSUED — either settling a vendor Purchase Order/payable, or a cheque-mode
      // Expense entry (Cheque.sourceType === 'EXPENSE', a different field than
      // CashbookEntry.sourceType) — these debit different accounts, so branch on it
      // rather than assuming every issued cheque is a vendor payable settlement.
      const linkedExpense =
        c.sourceType === 'EXPENSE' && c.sourceReferenceId
          ? expenseEntries.find((e) => e.id === c.sourceReferenceId)
          : undefined;
      const debitAcc = linkedExpense
        ? (EXPENSE_CATEGORY_ACCOUNT[linkedExpense.category] ?? DEFAULT_EXPENSE_ACCOUNT)
        : { code: '2001', name: 'Accounts Payable' };
      rows.push({
        date: dateStr,
        account: `${debitAcc.code} ${debitAcc.name}`,
        accountCode: debitAcc.code,
        description: desc,
        source: 'Cheque',
        sourceId: c.id,
        debit: cAmt,
        credit: 0,
        currency,
        vendorName: linkedExpense ? undefined : c.partyName,
      });
      rows.push({
        date: dateStr,
        account: '1002 Cash at Bank',
        accountCode: '1002',
        description: desc,
        source: 'Cheque',
        sourceId: c.id,
        debit: 0,
        credit: cAmt,
        currency,
        vendorName: linkedExpense ? undefined : c.partyName,
      });
    });

  // ── Expense entries — paid, non-cheque only (cheque-mode expenses settle via
  // the CLEARED Cheque branch above, same reasoning as Vendor Payment). ────────
  expenseEntries
    .filter((e) => e.status === 'PAID' && !isCheque(e.paymentMode))
    .forEach((e) => {
      const dateStr = (e.paymentDate ?? e.date)?.slice(0, 10) ?? '';
      const acc = EXPENSE_CATEGORY_ACCOUNT[e.category] ?? DEFAULT_EXPENSE_ACCOUNT;
      const desc = e.description || `${e.category} expense`;
      const cashCode = isCash(e.paymentMode) ? '1001' : '1002';
      const eAmt = Number(e.amount || 0);

      rows.push({
        date: dateStr,
        account: `${acc.code} ${acc.name}`,
        accountCode: acc.code,
        description: desc,
        source: 'Expense',
        sourceId: e.id,
        debit: eAmt,
        credit: 0,
        currency: e.currency,
      });
      rows.push({
        date: dateStr,
        account: cashCode === '1001' ? '1001 Cash in Hand' : '1002 Cash at Bank',
        accountCode: cashCode,
        description: desc,
        source: 'Expense',
        sourceId: e.id,
        debit: 0,
        credit: eAmt,
        currency: e.currency,
      });
    });

  return rows
    .map((r) => ({ ...r, searchBlob: buildSearchBlob(r) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Universal search — a single query OR-matches across every field the old
// dedicated Customer/Vendor/Income-Type/Expense-Type filters used to cover
// individually. Built once per row (not per keystroke) into `searchBlob`. ─────

function buildSearchBlob(e: GLEntryDraft): string {
  const parts = [
    e.description,
    e.account,
    e.customerName,
    e.vendorName,
    e.incomeSubType ? INCOME_SUBTYPE_LABELS[e.incomeSubType] : undefined,
    e.incomeSubType ? INCOME_TOP_CATEGORY_LABELS[incomeTopCategory(e.incomeSubType)] : undefined,
    e.purchaseOrigin === 'DOMESTIC'
      ? 'Domestic'
      : e.purchaseOrigin === 'INTERNATIONAL'
        ? 'International'
        : undefined,
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function matchesSearch(entry: GLEntry, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return entry.searchBlob.includes(needle);
}
