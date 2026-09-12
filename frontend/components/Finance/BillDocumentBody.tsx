'use client';

import React from 'react';
import { Invoice, InvoiceItem } from '@/lib/invoice';
import { Bill, SalePaymentRequest, PreviousBillSummary } from '@/lib/saleWorkflow';
import { Letterhead, BANK } from '@/components/shared/documentTemplate';
import { numberToWords } from '@/lib/numberToWords';

interface Props {
  invoice: Invoice;
  bill: Partial<Bill>;
  currency: string;
  /** Present when bill.billType is 'ADVANCE' or 'SECURITY_DEPOSIT' — the real collected
   *  payment this Bill wraps for customer sign-off (amount/mode/date/status live here,
   *  not on the bill itself). Named advancePayment for historical reasons; it now also
   *  carries the security deposit payment for that billType. */
  advancePayment?: SalePaymentRequest | null;
  /** Present alongside advancePayment when bill.billType is 'ADVANCE' and the contract
   *  also has a security deposit on file — rendered as its own section within this same
   *  First Month Advance Bill rather than as a separate bill/document. Never folded into
   *  the bill's own charged total (a deposit is a refundable liability, not revenue). */
  depositPayment?: SalePaymentRequest | null;
  /** Last period's figures, for the previous-vs-current usage comparison. */
  previousBill?: PreviousBillSummary | null;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** dd-mm-yyyy — the format the meter-reading table uses on the printed bill. */
function fmtShortDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtAmt(n?: number | null, cur = 'QAR') {
  return `${cur} ${Number(n ?? 0).toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtNum(n?: number | null) {
  return Number(n ?? 0).toLocaleString('en');
}

/** Per-copy rates are quoted to three decimals on the reference bill (0.050, 0.220). */
function fmtRate(n?: number | null) {
  return Number(n ?? 0).toLocaleString('en', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function periodLabel(start?: string, end?: string) {
  if (!start || !end) return '—';
  return `${fmtShortDate(start)} – ${fmtShortDate(end)}`;
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-2 print:text-slate-800">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 print:text-slate-500">
      {children}
    </p>
  );
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'bg-amber-50 text-amber-700',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-emerald-50 text-emerald-700',
  },
  CUSTOMER_REJECTED: { label: 'Disputed', className: 'bg-red-50 text-red-700' },
};

const RENT_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
};

/** Billing months per period — used only to label the allowance row. */
const PERIOD_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

// ─── Header ──────────────────────────────────────────────────────────────────

function docTitleFor(bill: Partial<Bill>, hasDeposit?: boolean) {
  if (bill.billType === 'ADVANCE')
    return hasDeposit ? 'Advance & Security Deposit Bill' : 'Advance Bill';
  if (bill.billType === 'SECURITY_DEPOSIT') return 'Security Deposit Bill';
  return 'Bill';
}

/**
 * Customer block on the left, document meta on the right — the arrangement the printed
 * bill uses. Bill date and due date are deliberately the same value: a usage bill falls
 * due on issue, so the document states that rather than leaving the customer to infer it.
 */
function BillHeader({
  invoice,
  bill,
  hasDeposit,
}: {
  invoice: Invoice;
  bill: Partial<Bill>;
  hasDeposit?: boolean;
}) {
  const status = STATUS_META[bill.billStatus || 'PENDING_APPROVAL'];
  const isWrapped = bill.billType === 'ADVANCE' || bill.billType === 'SECURITY_DEPOSIT';
  const title = docTitleFor(bill, hasDeposit);
  const issued = bill.createdAt;

  const meta: Array<[string, React.ReactNode]> = [
    [
      'Bill No.',
      <span key="n" className="font-mono">
        {bill.billNumber || '—'}
      </span>,
    ],
    ['Bill Date', fmtShortDate(issued)],
    ['Due Date', fmtShortDate(issued)],
    [
      'Contract',
      <span key="c" className="font-mono">
        {invoice.invoiceNumber}
      </span>,
    ],
  ];
  if (!isWrapped) {
    meta.push(['Billing Period', periodLabel(bill.billingPeriodStart, bill.billingPeriodEnd)]);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xl font-black tracking-tight text-slate-800 uppercase leading-none">
          {title}
        </p>
        {status && (
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.className}`}
          >
            {status.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        <div className="p-3">
          <FieldLabel>Bill To</FieldLabel>
          <p className="text-sm font-black text-slate-800 leading-snug">
            {invoice.customerName || 'Customer'}
          </p>
          {invoice.customerAddress && (
            <p className="text-[11px] text-slate-600 leading-snug mt-1 whitespace-pre-line">
              {invoice.customerAddress}
            </p>
          )}
          <div className="mt-1.5 space-y-0.5">
            {invoice.customerEmail && (
              <p className="text-[11px] text-slate-600 leading-snug">{invoice.customerEmail}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-[11px] text-slate-600 leading-snug">{invoice.customerPhone}</p>
            )}
          </div>
          {invoice.customerTrn && (
            <p className="text-[10px] text-slate-500 mt-1.5">
              TRN: <span className="font-mono">{invoice.customerTrn}</span>
            </p>
          )}
        </div>

        <div>
          {meta.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 px-3 py-[5px]">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-slate-500 shrink-0">
                {label}
              </span>
              <span className="text-[11px] font-bold text-slate-800 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Contract details ────────────────────────────────────────────────────────

function ContractDetailsSection({ invoice }: { invoice: Invoice }) {
  const isLease = invoice.saleType === 'LEASE';
  const planType = isLease ? invoice.leaseType : invoice.rentType?.replace(/_/g, ' ');
  const billingCycle = isLease
    ? invoice.leaseTenureMonths
      ? `${invoice.leaseTenureMonths} months`
      : '—'
    : (RENT_PERIOD_LABELS[invoice.rentPeriod || ''] ?? invoice.rentPeriod ?? '—');

  const cells: Array<[string, React.ReactNode]> = [
    ['Type', invoice.saleType],
    ['Plan', planType || '—'],
    ['Billing Cycle', billingCycle],
    [
      'Contract Period',
      `${fmtShortDate(invoice.effectiveFrom)} – ${fmtShortDate(invoice.effectiveTo)}`,
    ],
  ];

  return (
    <div>
      <SectionHeading>Contract Details</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
        {cells.map(([label, value]) => (
          <div key={label} className="p-2.5">
            <FieldLabel>{label}</FieldLabel>
            <p className="text-xs font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Machines ────────────────────────────────────────────────────────────────

type BillItem = NonNullable<Bill['items']>[number];

/**
 * Every machine this bill covers, with the reading it opened and closed on.
 *
 * A machine swapped mid-period appears twice: the outgoing unit (allocation REPLACED,
 * endTimestamp = the swap) and the unit that took over (replacementOfAllocationId set).
 * Both are billed on this document — usage up to the swap on the removed unit, and from
 * the swap onwards on its replacement — so both are listed with their own readings
 * rather than collapsed into one line the customer cannot reconcile.
 */
function MachinesSection({ bill }: { bill: Partial<Bill> }) {
  const items = bill.items || [];
  if (items.length === 0) return null;

  const outgoing = items.find((it) => it.allocation?.status === 'REPLACED');
  const incoming = items.find((it) => it.allocation?.replacementOfAllocationId);
  const replacedOn = outgoing?.allocation?.endTimestamp ?? incoming?.allocation?.startTimestamp;
  const hasSwap = Boolean(outgoing && incoming);

  const roleOf = (it: BillItem) => {
    if (it.allocation?.status === 'REPLACED') return 'Previous (removed)';
    if (it.allocation?.replacementOfAllocationId) return 'Current (installed)';
    return 'Current';
  };

  return (
    <div>
      <SectionHeading>Machines & Readings on This Bill</SectionHeading>

      {hasSwap && (
        <div className="mb-2 bg-amber-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
            Machine replaced during this period — {fmtShortDate(replacedOn)}
          </p>
          <p className="mt-1 text-[10px] text-amber-800 leading-relaxed">
            Both machines are billed here: usage up to the swap on{' '}
            <span className="font-bold font-mono">{outgoing?.allocation?.serialNumber}</span>, and
            from the swap onwards on{' '}
            <span className="font-bold font-mono">{incoming?.allocation?.serialNumber}</span>.
            {incoming?.allocation?.replacementReason
              ? ` Reason: ${incoming.allocation.replacementReason}.`
              : ''}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-slate-50 print:bg-slate-100">
              <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-500">
                Machine
              </th>
              <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-500">
                Role
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
                B/W A4
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
                B/W A3
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
                Colour A4
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
                Colour A3
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <React.Fragment key={it.allocationId || idx}>
                <tr>
                  <td rowSpan={2} className="p-1.5 align-top font-bold text-slate-700 font-mono">
                    {it.allocation?.serialNumber || `Machine ${idx + 1}`}
                  </td>
                  <td rowSpan={2} className="p-1.5 align-top text-slate-600">
                    {roleOf(it)}
                    {it.allocation?.status === 'REPLACED' && it.allocation.endTimestamp && (
                      <span className="block text-[9px] text-amber-700">
                        {fmtShortDate(it.allocation.endTimestamp)}
                      </span>
                    )}
                    {it.allocation?.replacementOfAllocationId && it.allocation.startTimestamp && (
                      <span className="block text-[9px] text-emerald-700">
                        {fmtShortDate(it.allocation.startTimestamp)}
                      </span>
                    )}
                  </td>
                  <td className="p-1.5 text-right text-slate-500">
                    <span className="text-[8px] uppercase tracking-wider">Opening </span>
                    {fmtNum(it.startBwA4)}
                  </td>
                  <td className="p-1.5 text-right text-slate-500">
                    <span className="text-[8px] uppercase tracking-wider">Opening </span>
                    {fmtNum(it.startBwA3)}
                  </td>
                  <td className="p-1.5 text-right text-slate-500">
                    <span className="text-[8px] uppercase tracking-wider">Opening </span>
                    {fmtNum(it.startColorA4)}
                  </td>
                  <td className="p-1.5 text-right text-slate-500">
                    <span className="text-[8px] uppercase tracking-wider">Opening </span>
                    {fmtNum(it.startColorA3)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 text-right font-bold text-slate-700">
                    <span className="text-[8px] font-normal uppercase tracking-wider text-slate-400">
                      Closing{' '}
                    </span>
                    {fmtNum(it.endBwA4)}
                  </td>
                  <td className="p-1.5 text-right font-bold text-slate-700">
                    <span className="text-[8px] font-normal uppercase tracking-wider text-slate-400">
                      Closing{' '}
                    </span>
                    {fmtNum(it.endBwA3)}
                  </td>
                  <td className="p-1.5 text-right font-bold text-slate-700">
                    <span className="text-[8px] font-normal uppercase tracking-wider text-slate-400">
                      Closing{' '}
                    </span>
                    {fmtNum(it.endColorA4)}
                  </td>
                  <td className="p-1.5 text-right font-bold text-slate-700">
                    <span className="text-[8px] font-normal uppercase tracking-wider text-slate-400">
                      Closing{' '}
                    </span>
                    {fmtNum(it.endColorA3)}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Meter reading & usage ───────────────────────────────────────────────────

/**
 * Resolves the contract's pricing rule the same way the Finance usage form does — the
 * rule may be a dedicated PRICING_RULE item or the pricing fields merged onto a product
 * line, and older contracts leave itemType unset entirely.
 */
function resolvePricingRule(invoice: Invoice) {
  const items = invoice.items || [];
  const isRule = (i: InvoiceItem) => i.itemType === 'PRICING_RULE' || !i.itemType;
  const bw =
    items.find((i) => isRule(i) && i.description?.includes('Black')) ??
    items.find((i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0);
  const color =
    items.find((i) => isRule(i) && i.description?.includes('Color')) ??
    items.find((i) => (i.colorIncludedLimit ?? 0) > 0 || (i.colorExcessRate ?? 0) > 0);
  const combo =
    items.find((i) => isRule(i) && i.description?.includes('Combined')) ??
    items.find((i) => (i.combinedIncludedLimit ?? 0) > 0 || (i.combinedExcessRate ?? 0) > 0);
  return { bw, color, combo };
}

/** A row in a usage group. Values sit either per paper size, or pooled across both. */
type UsageRow = {
  label: string;
  a4Date?: string;
  a3Date?: string;
  a4?: React.ReactNode;
  a3?: React.ReactNode;
  /** Rendered across the four size columns — used where the plan prices A4 and A3
   *  together, so no per-size figure exists to show. */
  pooled?: React.ReactNode;
  amount?: React.ReactNode;
  strong?: boolean;
};

function UsageGroupTable({ title, rows }: { title: string; rows: UsageRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-slate-50 print:bg-slate-100">
            <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-700 w-[34%]">
              {title}
            </th>
            <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-500">
              Date (A4)
            </th>
            <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
              Counter (A4)
            </th>
            <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-500">
              Date (A3)
            </th>
            <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
              Counter (A3)
            </th>
            <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500 w-[16%]">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={r.strong ? 'bg-slate-50 print:bg-slate-100' : undefined}>
              <td className={`p-1.5 ${r.strong ? 'font-black text-slate-800' : 'text-slate-600'}`}>
                {r.label}
              </td>
              {r.pooled !== undefined ? (
                <td colSpan={4} className="p-1.5 text-right font-bold text-slate-700">
                  {r.pooled}
                </td>
              ) : (
                <>
                  <td className="p-1.5 text-slate-500">{r.a4Date ?? ''}</td>
                  <td
                    className={`p-1.5 text-right ${r.strong ? 'font-black text-slate-800' : 'font-bold text-slate-700'}`}
                  >
                    {r.a4 ?? ''}
                  </td>
                  <td className="p-1.5 text-slate-500">{r.a3Date ?? ''}</td>
                  <td
                    className={`p-1.5 text-right ${r.strong ? 'font-black text-slate-800' : 'font-bold text-slate-700'}`}
                  >
                    {r.a3 ?? ''}
                  </td>
                </>
              )}
              <td
                className={`p-1.5 text-right ${r.strong ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}
              >
                {r.amount ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The meter-reading and usage breakdown.
 *
 * Every figure here is either stored on the bill or read straight off the contract's
 * pricing rule — the pricing itself is untouched. Where the plan prices A4 and A3
 * together (all types except CPC with separate A3 pricing), the allowance, excess and
 * charge rows are shown pooled rather than split per size, because a per-size split is
 * not what was charged: the engine converts A3 into A4-equivalent clicks at 2× and
 * applies one allowance to the result. Splitting it for presentation would invent
 * numbers that do not add up to the total actually billed.
 */
function UsageSection({
  bill,
  invoice,
  currency,
  previousBill,
}: {
  bill: Partial<Bill>;
  invoice: Invoice;
  currency: string;
  previousBill?: PreviousBillSummary | null;
}) {
  const rule = resolvePricingRule(invoice);
  const rentType = invoice.rentType;
  const isCombo = rentType === 'FIXED_COMBO';
  const isFixedLimit = rentType === 'FIXED_LIMIT';
  const separateA3 = Boolean(
    rentType === 'CPC' &&
    (rule.bw?.separateA3Pricing || rule.color?.separateA3Pricing || rule.combo?.separateA3Pricing),
  );

  const months = PERIOD_MONTHS[invoice.rentPeriod || 'MONTHLY'] ?? 1;

  // Opening side of this period: the previous bill's closing counters. On a contract's
  // very first bill there is none, so fall back to the installation readings captured on
  // the machine allocations — the same starting point the usage engine measures from.
  const allocs = (invoice.productAllocations ?? []).filter(
    (a) => a.itemType !== 'ACCESSORY' && a.status === 'ALLOCATED',
  );
  const initial = allocs.reduce(
    (acc, a) => ({
      bwA4: acc.bwA4 + (a.initialBwA4 ?? 0),
      bwA3: acc.bwA3 + (a.initialBwA3 ?? 0),
      colorA4: acc.colorA4 + (a.initialColorA4 ?? 0),
      colorA3: acc.colorA3 + (a.initialColorA3 ?? 0),
    }),
    { bwA4: 0, bwA3: 0, colorA4: 0, colorA3: 0 },
  );

  const prev = previousBill
    ? {
        date: previousBill.readingTakenDate || previousBill.billingPeriodEnd,
        bwA4: previousBill.bwA4Count,
        bwA3: previousBill.bwA3Count,
        colorA4: previousBill.colorA4Count,
        colorA3: previousBill.colorA3Count,
      }
    : {
        date: invoice.effectiveFrom || bill.billingPeriodStart,
        bwA4: initial.bwA4,
        bwA3: initial.bwA3,
        colorA4: initial.colorA4,
        colorA3: initial.colorA3,
      };

  const presentDate = bill.readingTakenDate || bill.billingPeriodEnd;

  // A3 bills as two A4-equivalent clicks everywhere except separate-A3 pricing, where the
  // A3 rate carries the size premium itself. This mirrors usageService's normalisation.
  const a4eq = (a4: number, a3: number) => (separateA3 ? a4 + a3 : a4 + a3 * 2);

  const buildGroup = (d: {
    prevA4: number;
    prevA3: number;
    curA4: number;
    curA3: number;
    deltaA4: number;
    deltaA3: number;
    discountCopies: number;
    limit?: number;
    rate?: number;
    a3Rate?: number;
    /** Per-group amount, when the plan makes one exactly derivable. */
    amount?: number;
    slabbed?: boolean;
  }): UsageRow[] => {
    const chargeable = a4eq(d.deltaA4, d.deltaA3);
    const afterDiscount = Math.max(0, chargeable - d.discountCopies);
    const limit = d.limit ?? 0;
    const excess = d.slabbed ? afterDiscount : Math.max(0, afterDiscount - limit);

    const rows: UsageRow[] = [
      {
        label: 'Previous meter reading',
        a4Date: fmtShortDate(prev.date),
        a4: fmtNum(d.prevA4),
        a3Date: fmtShortDate(prev.date),
        a3: fmtNum(d.prevA3),
      },
      {
        label: 'Present meter reading',
        a4Date: fmtShortDate(presentDate),
        a4: fmtNum(d.curA4),
        a3Date: fmtShortDate(presentDate),
        a3: fmtNum(d.curA3),
      },
      { label: 'Total consumption', a4: fmtNum(d.deltaA4), a3: fmtNum(d.deltaA3) },
    ];

    if (!separateA3 && d.deltaA3 > 0) {
      rows.push({
        label: 'Chargeable volume (A3 counted as 2 × A4)',
        pooled: fmtNum(chargeable),
      });
    }

    if (!d.slabbed) {
      rows.push({ label: 'Allowed per Month', pooled: fmtNum(limit) });
      if (months !== 1) {
        rows.push({
          label: `Allowed per ${months} Month`,
          pooled: fmtNum(limit),
        });
      }
    }

    rows.push({ label: 'Total Discount (copies)', pooled: fmtNum(d.discountCopies) });
    rows.push({ label: 'After Discount', pooled: fmtNum(afterDiscount) });
    rows.push({ label: d.slabbed ? 'Chargeable copies' : 'Excess copy', pooled: fmtNum(excess) });
    rows.push({
      label: 'Charge',
      pooled: d.slabbed ? 'As per agreed slab rates' : fmtRate(d.rate),
    });
    rows.push({
      label: 'Total net usage amount this month',
      pooled: '',
      amount: d.amount !== undefined ? fmtAmt(d.amount, currency) : '—',
      strong: true,
    });
    return rows;
  };

  const discountBw = Number(bill.discountBwCopies ?? 0);
  const discountColor = Number(bill.discountColorCopies ?? 0);
  const groups: Array<{ title: string; rows: UsageRow[] }> = [];

  if (isCombo) {
    // One combined allowance and one rate across B/W and colour — the engine never
    // separates them here, so neither does the document.
    const limit =
      Number(rule.combo?.combinedIncludedLimit ?? 0) ||
      Number(rule.bw?.bwIncludedLimit ?? 0) + Number(rule.color?.colorIncludedLimit ?? 0);
    const rate = Number(rule.combo?.combinedExcessRate ?? rule.bw?.bwExcessRate ?? 0);
    groups.push({
      title: 'Black & White + Colour (combined)',
      rows: buildGroup({
        prevA4: prev.bwA4 + prev.colorA4,
        prevA3: prev.bwA3 + prev.colorA3,
        curA4: Number(bill.bwA4Count ?? 0) + Number(bill.colorA4Count ?? 0),
        curA3: Number(bill.bwA3Count ?? 0) + Number(bill.colorA3Count ?? 0),
        deltaA4: Number(bill.bwA4Delta ?? 0) + Number(bill.colorA4Delta ?? 0),
        deltaA3: Number(bill.bwA3Delta ?? 0) + Number(bill.colorA3Delta ?? 0),
        discountCopies: discountBw + discountColor,
        limit,
        rate,
        amount: Number(bill.exceededCharge ?? 0),
      }),
    });
  } else {
    const slabbed = !isFixedLimit; // CPC / CPC_COMBO price off slab tables, not an allowance
    const bwExcess = Math.max(
      0,
      a4eq(Number(bill.bwA4Delta ?? 0), Number(bill.bwA3Delta ?? 0)) -
        discountBw -
        Number(rule.bw?.bwIncludedLimit ?? 0),
    );
    const colorExcess = Math.max(
      0,
      a4eq(Number(bill.colorA4Delta ?? 0), Number(bill.colorA3Delta ?? 0)) -
        discountColor -
        Number(rule.color?.colorIncludedLimit ?? 0),
    );

    groups.push({
      title: 'Black & White',
      rows: buildGroup({
        prevA4: prev.bwA4,
        prevA3: prev.bwA3,
        curA4: Number(bill.bwA4Count ?? 0),
        curA3: Number(bill.bwA3Count ?? 0),
        deltaA4: Number(bill.bwA4Delta ?? 0),
        deltaA3: Number(bill.bwA3Delta ?? 0),
        discountCopies: discountBw,
        limit: Number(rule.bw?.bwIncludedLimit ?? 0),
        rate: Number(rule.bw?.bwExcessRate ?? 0),
        slabbed,
        // Only FIXED_LIMIT gives an exact per-colour amount (excess × that colour's
        // rate — precisely what the engine charges). Slab plans price off bands, so the
        // per-colour figure is left to the section total rather than approximated.
        amount: isFixedLimit ? bwExcess * Number(rule.bw?.bwExcessRate ?? 0) : undefined,
      }),
    });

    const hasColour =
      Number(bill.colorA4Delta ?? 0) > 0 ||
      Number(bill.colorA3Delta ?? 0) > 0 ||
      Number(rule.color?.colorIncludedLimit ?? 0) > 0 ||
      Number(rule.color?.colorExcessRate ?? 0) > 0;
    if (hasColour) {
      groups.push({
        title: 'Colour',
        rows: buildGroup({
          prevA4: prev.colorA4,
          prevA3: prev.colorA3,
          curA4: Number(bill.colorA4Count ?? 0),
          curA3: Number(bill.colorA3Count ?? 0),
          deltaA4: Number(bill.colorA4Delta ?? 0),
          deltaA3: Number(bill.colorA3Delta ?? 0),
          discountCopies: discountColor,
          limit: Number(rule.color?.colorIncludedLimit ?? 0),
          rate: Number(rule.color?.colorExcessRate ?? 0),
          slabbed,
          amount: isFixedLimit ? colorExcess * Number(rule.color?.colorExcessRate ?? 0) : undefined,
        }),
      });
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <SectionHeading>Meter Reading &amp; Usage</SectionHeading>
        <p className="text-[9px] font-bold text-slate-500">
          Reading taken:{' '}
          <span className="text-slate-700">{fmtShortDate(bill.readingTakenDate)}</span>
        </p>
      </div>

      <div>
        {groups.map((g, i) => (
          <div key={g.title} className={i > 0 ? '' : ''}>
            <UsageGroupTable title={g.title} rows={g.rows} />
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            Total excess usage charged this period
          </span>
          <span className="text-xs font-black text-slate-900">
            {fmtAmt(bill.exceededCharge, currency)}
          </span>
        </div>
      </div>

      {months !== 1 && (
        <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
          The included volume is the plan&apos;s allowance for one whole billing period, so it is
          not multiplied by the number of months in the period.
        </p>
      )}
    </div>
  );
}

// ─── Previous vs current period ──────────────────────────────────────────────

/** Last period's usage beside this one, so the customer can see the movement. */
function PeriodComparisonSection({
  bill,
  previousBill,
  currency,
}: {
  bill: Partial<Bill>;
  previousBill: PreviousBillSummary;
  currency: string;
}) {
  const rows: Array<[string, React.ReactNode, React.ReactNode]> = [
    [
      'Billing period',
      periodLabel(previousBill.billingPeriodStart, previousBill.billingPeriodEnd),
      periodLabel(bill.billingPeriodStart, bill.billingPeriodEnd),
    ],
    ['B/W A4 used', fmtNum(previousBill.bwA4Delta), fmtNum(bill.bwA4Delta)],
    ['B/W A3 used', fmtNum(previousBill.bwA3Delta), fmtNum(bill.bwA3Delta)],
    ['Colour A4 used', fmtNum(previousBill.colorA4Delta), fmtNum(bill.colorA4Delta)],
    ['Colour A3 used', fmtNum(previousBill.colorA3Delta), fmtNum(bill.colorA3Delta)],
    ['Excess copies', fmtNum(previousBill.exceededTotal), fmtNum(bill.exceededTotal)],
    [
      'Excess charge',
      fmtAmt(previousBill.exceededCharge, currency),
      fmtAmt(bill.exceededCharge, currency),
    ],
    ['Bill total', fmtAmt(previousBill.totalCharge, currency), fmtAmt(bill.totalCharge, currency)],
  ];

  return (
    <div>
      <SectionHeading>Previous Period vs This Period</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-slate-50 print:bg-slate-100">
              <th className="text-left p-1.5 font-black uppercase tracking-wider text-slate-500 w-[34%]">
                &nbsp;
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-500">
                Previous
                {previousBill.billNumber ? (
                  <span className="block font-mono font-normal text-[8px] text-slate-400">
                    {previousBill.billNumber}
                  </span>
                ) : null}
              </th>
              <th className="text-right p-1.5 font-black uppercase tracking-wider text-slate-700">
                This Bill
                {bill.billNumber ? (
                  <span className="block font-mono font-normal text-[8px] text-slate-400">
                    {bill.billNumber}
                  </span>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, now]) => (
              <tr key={label}>
                <td className="p-1.5 text-slate-600">{label}</td>
                <td className="p-1.5 text-right text-slate-500">{before}</td>
                <td className="p-1.5 text-right font-bold text-slate-800">{now}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Advance / deposit ───────────────────────────────────────────────────────

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending Accounts Approval',
    className: 'bg-amber-50 text-amber-700',
  },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

function AdvancePaymentSection({
  advancePayment,
  currency,
  sectionLabel = 'Advance Payment',
  footerNote = 'This Advance Bill documents the advance payment above for your records and approval — it is independent of Accounts’ internal approval of the payment itself.',
  accessoryItems,
}: {
  advancePayment?: SalePaymentRequest | null;
  currency: string;
  sectionLabel?: string;
  footerNote?: string;
  accessoryItems?: { description: string; quantity?: number; unitPrice?: number }[];
}) {
  if (!advancePayment) {
    return (
      <div>
        <SectionHeading>{sectionLabel}</SectionHeading>
        <p className="text-xs text-slate-400 italic">{sectionLabel} details unavailable.</p>
      </div>
    );
  }
  const paymentStatus = PAYMENT_STATUS_META[advancePayment.status];
  const cells: Array<[string, React.ReactNode]> = [
    ['Amount', fmtAmt(advancePayment.amount, advancePayment.currency || currency)],
    ['Payment Mode', advancePayment.paymentMode?.replace('_', ' ')],
    ['Date Collected', fmtShortDate(advancePayment.paymentDate)],
    ['Reference', advancePayment.referenceNumber || advancePayment.chequeNumber || '—'],
  ];

  return (
    <div>
      <SectionHeading>{sectionLabel}</SectionHeading>
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
          {cells.map(([label, value]) => (
            <div key={label} className="p-2.5">
              <FieldLabel>{label}</FieldLabel>
              <p className="text-xs font-black text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 print:bg-slate-100">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Payment Approval Status
          </span>
          {paymentStatus && (
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${paymentStatus.className}`}
            >
              {paymentStatus.label}
            </span>
          )}
        </div>
      </div>
      {accessoryItems && accessoryItems.length > 0 && (
        <div>
          <div className="px-3 py-1 bg-slate-50 print:bg-slate-100">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Includes Accessories (excl. tax — see Amount above for the tax-inclusive total)
            </span>
          </div>
          {accessoryItems.map((it, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1">
              <span className="text-xs text-slate-600">
                {it.description} {(it.quantity ?? 1) > 1 ? `× ${it.quantity}` : ''}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {fmtAmt((it.quantity ?? 1) * Number(it.unitPrice ?? 0), currency)}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{footerNote}</p>
    </div>
  );
}

// ─── Charges + totals ────────────────────────────────────────────────────────

function ChargesSection({
  bill,
  currency,
  invoice,
}: {
  bill: Partial<Bill>;
  currency: string;
  invoice: Invoice;
}) {
  // Advance-billing model: the advance collected at signing prepays period 1's rent; every
  // bill after that already prepays the UPCOMING period's rent alongside this period's
  // actual excess usage (advanceAdjusted, present only on the final bill, is what credits
  // back the one period that has nothing further to prepay). Label the rent line to match,
  // so the customer isn't left wondering why a bill for period N's meter reading also
  // charges what looks like a second rent payment.
  const isAdvanceBilling = invoice.paymentTiming !== 'ARREARS';
  const isFinalPeriodCredit = Number(bill.advanceAdjusted) > 0;
  const rentLabel =
    isAdvanceBilling && !isFinalPeriodCredit
      ? 'Rent — Upcoming Period (paid in advance)'
      : 'Base Rent';
  const rows: Array<[string, number | undefined]> = [
    [rentLabel, bill.monthlyRent],
    ['Excess Usage Charge', bill.exceededCharge],
  ];
  if (isFinalPeriodCredit)
    rows.push(['Advance Adjusted (final period — already prepaid)', -Number(bill.advanceAdjusted)]);
  if (Number(bill.discountAmount) > 0) rows.push(['Discount', -Number(bill.discountAmount)]);
  rows.push(['Taxable Amount', Number(bill.taxableAmount ?? 0)]);
  if (Number(bill.taxAmount) > 0) {
    rows.push([
      `${invoice.taxName || 'VAT'}${bill.taxPercent ? ` (${bill.taxPercent}%)` : ''}`,
      Number(bill.taxAmount),
    ]);
  }

  return (
    <div>
      <SectionHeading>Charges</SectionHeading>
      <div>
        {rows.map(([label, amt]) => (
          <div key={label} className="flex items-center justify-between px-3 py-1.5 text-xs">
            <span className="text-slate-500">{label}</span>
            <span className="font-bold text-slate-700">{fmtAmt(amt, currency)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
            Grand Total
          </span>
          <span className="text-base font-black text-slate-900">
            {fmtAmt(bill.totalCharge, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Amount in words and remittance details on the left, the settlement summary on the
 * right — the closing block of the printed bill.
 */
function TotalsFooter({ total, currency }: { total: number; currency: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
      <div className="p-3">
        <FieldLabel>Total in words</FieldLabel>
        <p className="text-[11px] font-bold text-slate-800 leading-snug">
          {numberToWords(Number(total || 0), currency)}
        </p>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Please make cheque &amp; online transfer payable to:
        </p>
        <p className="text-[11px] font-black text-slate-800 mt-0.5">{BANK.payTo}</p>
        <p className="text-[10px] text-slate-600 leading-snug">
          {BANK.bank}, A/c no: {BANK.accountNo}
        </p>
        <p className="text-[10px] text-slate-600 leading-snug font-mono">IBAN: {BANK.iban}</p>
        <p className="text-[10px] text-slate-600 leading-snug font-mono">SWIFT: {BANK.swift}</p>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-500">Net Amount</span>
          <span className="font-bold text-slate-700">{fmtAmt(total, currency)}</span>
        </div>
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-500">Discount</span>
          <span className="font-bold text-slate-700">{fmtAmt(0, currency)}</span>
        </div>
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-500">Payment / Credit</span>
          <span className="font-bold text-slate-700">—</span>
        </div>
        <div className="flex items-center justify-between py-1.5 mt-1 bg-slate-100 px-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
            Net Amount
          </span>
          <span className="text-sm font-black text-slate-900">{fmtAmt(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}

function ApprovalSection({ bill }: { bill: Partial<Bill> }) {
  return (
    <div>
      <div className="p-2.5 space-y-1">
        <p className="text-[10px] text-slate-500">
          Bill created by{' '}
          <span className="font-bold text-slate-700">{bill.billCreatedByName || 'Employee'}</span>
          {bill.createdAt ? ` on ${fmtDate(bill.createdAt)}` : ''}
        </p>
        {bill.billStatus === 'CUSTOMER_APPROVED' && (
          <p className="text-[10px] text-emerald-700">
            Approved by <span className="font-bold">{bill.customerApprovedByName}</span>
            {bill.customerApprovedAt ? ` on ${fmtDate(bill.customerApprovedAt)}` : ''}
            {bill.customerApprovalMethod === 'FINANCE_MANUAL'
              ? bill.customerApprovalRecordedByName
                ? ` (recorded by ${bill.customerApprovalRecordedByName})`
                : ' (recorded by staff)'
              : ' (remote link)'}
          </p>
        )}
        {bill.billStatus === 'CUSTOMER_REJECTED' && (
          <p className="text-[10px] text-red-700">
            Disputed{bill.customerRejectedAt ? ` on ${fmtDate(bill.customerRejectedAt)}` : ''}
            {bill.customerRejectionReason ? ` — "${bill.customerRejectionReason}"` : ''}
          </p>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed text-center">
        If you notice any incorrect reading or have questions, please contact our finance team
        before approving this bill.
      </p>
    </div>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

export function BillDocumentBody({
  invoice,
  bill,
  currency,
  advancePayment,
  depositPayment,
  previousBill,
}: Props) {
  const isAdvance = bill.billType === 'ADVANCE';
  const isSecurityDeposit = bill.billType === 'SECURITY_DEPOSIT';
  // A deposit collected alongside the advance shows as its own section within this same
  // First Month Advance Bill — no separate Security Deposit Bill needed for that case.
  // The standalone Security Deposit Bill (billType 'SECURITY_DEPOSIT') still exists for
  // the deposit-only edge case: a contract with no advance but a deposit on file.
  const showDepositSection = isAdvance && !!depositPayment;
  // Accessories (stand, tray, stapler unit, etc.) added on the quotation alongside the
  // machine — collected together with the advance, shown as a breakdown under it. Never
  // relevant to the standalone Security Deposit Bill (a deposit isn't a purchase).
  const accessoryItems = isAdvance
    ? (invoice.items || []).filter((it) => (it.itemType as string) === 'ACCESSORY')
    : [];

  // What the closing block settles. For a wrapped Advance/Deposit bill that is the
  // payment it documents; for a usage bill it is the period's own total.
  const settlementTotal =
    isAdvance || isSecurityDeposit
      ? Number(advancePayment?.amount ?? bill.totalCharge ?? 0)
      : Number(bill.totalCharge ?? 0);

  return (
    // Company stationery — the same letterhead artwork the quotations use.
    <Letterhead>
      <div className="space-y-4 text-slate-800">
        <BillHeader invoice={invoice} bill={bill} hasDeposit={showDepositSection} />
        <ContractDetailsSection invoice={invoice} />

        {isAdvance || isSecurityDeposit ? (
          <>
            <AdvancePaymentSection
              advancePayment={advancePayment}
              currency={currency}
              sectionLabel={isSecurityDeposit ? 'Security Deposit' : 'Advance Payment'}
              footerNote={
                isSecurityDeposit
                  ? 'This Security Deposit Bill documents the deposit above for your records and approval — it is independent of Accounts’ internal approval of the payment itself. The deposit is refundable per the terms of your contract.'
                  : undefined
              }
              accessoryItems={accessoryItems}
            />
            {showDepositSection && (
              <AdvancePaymentSection
                advancePayment={depositPayment}
                currency={currency}
                sectionLabel="Security Deposit"
                footerNote="This deposit is refundable per the terms of your contract, and is held separately from the advance rent above — it is not part of your rent charges."
              />
            )}
          </>
        ) : (
          <>
            <MachinesSection bill={bill} />
            <UsageSection
              bill={bill}
              invoice={invoice}
              currency={currency}
              previousBill={previousBill}
            />
            {previousBill && (
              <PeriodComparisonSection
                bill={bill}
                previousBill={previousBill}
                currency={currency}
              />
            )}
            <ChargesSection bill={bill} currency={currency} invoice={invoice} />
          </>
        )}

        <TotalsFooter total={settlementTotal} currency={currency} />
        <ApprovalSection bill={bill} />
      </div>
    </Letterhead>
  );
}
