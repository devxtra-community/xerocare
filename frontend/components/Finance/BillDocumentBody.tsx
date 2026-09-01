'use client';

import React from 'react';
import { Invoice } from '@/lib/invoice';
import { Bill, SalePaymentRequest } from '@/lib/saleWorkflow';

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
}

// ─── Utilities (mirrors ContractDocumentBody's formatting conventions) ────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtAmt(n?: number | null, cur = 'QAR') {
  return `${cur} ${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function periodLabel(start?: string, end?: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  if (!start || !end) return '—';
  const s = fmt(start);
  const e = fmt(end);
  return s === e ? s : `${s} – ${e}`;
}

function DocRule() {
  return <hr className="border-0 border-t border-slate-300 my-0 print:border-slate-400" />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3 print:text-slate-800">
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
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CUSTOMER_REJECTED: { label: 'Disputed', className: 'bg-red-50 text-red-700 border-red-200' },
};

function DocumentHeader({
  invoice,
  bill,
  hasDeposit,
}: {
  invoice: Invoice;
  bill: Partial<Bill>;
  hasDeposit?: boolean;
}) {
  const status = STATUS_META[bill.billStatus || 'PENDING_APPROVAL'];
  const isAdvance = bill.billType === 'ADVANCE';
  const isSecurityDeposit = bill.billType === 'SECURITY_DEPOSIT';
  const isWrappedPayment = isAdvance || isSecurityDeposit;
  const docTitle = isAdvance
    ? hasDeposit
      ? 'Advance & Security Deposit Bill'
      : 'Advance Bill'
    : isSecurityDeposit
      ? 'Security Deposit Bill'
      : 'Bill';
  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
            Xerocare Trading &amp; Services W.L.L
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-65">
            {docTitle} for {invoice.customerName || 'Customer'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tracking-tight text-slate-800 uppercase leading-none">
            {docTitle}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Contract: <span className="font-bold text-slate-600">{invoice.invoiceNumber}</span>
          </p>
          {!isWrappedPayment && (
            <p className="text-[10px] text-slate-400">
              Period:{' '}
              <span className="font-bold text-slate-600">
                {periodLabel(bill.billingPeriodStart, bill.billingPeriodEnd)}
              </span>
            </p>
          )}
          {status && (
            <span
              className={`inline-block mt-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.className}`}
            >
              {status.label}
            </span>
          )}
        </div>
      </div>
      <DocRule />
    </div>
  );
}

function CustomerSection({ invoice }: { invoice: Invoice }) {
  return (
    <div>
      <SectionHeading>Billed To</SectionHeading>
      <div className="border border-slate-200 p-3">
        <FieldLabel>Customer</FieldLabel>
        <p className="text-sm font-black text-slate-800">{invoice.customerName || 'Customer'}</p>
      </div>
    </div>
  );
}

const RENT_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
};

function ContractDetailsSection({ invoice }: { invoice: Invoice }) {
  const isLease = invoice.saleType === 'LEASE';
  const planType = isLease ? invoice.leaseType : invoice.rentType?.replace(/_/g, ' ');
  const billingCycle = isLease
    ? invoice.leaseTenureMonths
      ? `${invoice.leaseTenureMonths} months`
      : '—'
    : (RENT_PERIOD_LABELS[invoice.rentPeriod || ''] ?? invoice.rentPeriod ?? '—');
  const activeAllocations = (invoice.productAllocations ?? []).filter(
    (a) => a.status === 'ALLOCATED' && a.itemType !== 'ACCESSORY',
  );
  const serials = activeAllocations.map((a) => a.serialNumber).filter(Boolean);
  // The reading the technician took at installation (or Finance entered at activation,
  // if installed later) — the actual starting point the first bill's usage is measured
  // from. Summed across every currently-allocated machine, matching how usageService.ts
  // itself aggregates a multi-machine contract's totals.
  const initialReading = activeAllocations.reduce(
    (acc, a) => ({
      bwA4: acc.bwA4 + (a.initialBwA4 ?? 0),
      bwA3: acc.bwA3 + (a.initialBwA3 ?? 0),
      colorA4: acc.colorA4 + (a.initialColorA4 ?? 0),
      colorA3: acc.colorA3 + (a.initialColorA3 ?? 0),
    }),
    { bwA4: 0, bwA3: 0, colorA4: 0, colorA3: 0 },
  );
  const hasInitialReading = activeAllocations.length > 0;

  return (
    <div>
      <SectionHeading>Contract Details</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-slate-200">
        <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
          <FieldLabel>Type</FieldLabel>
          <p className="text-xs font-black text-slate-800">{invoice.saleType}</p>
        </div>
        <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
          <FieldLabel>Plan</FieldLabel>
          <p className="text-xs font-black text-slate-800">{planType || '—'}</p>
        </div>
        <div className="p-3 border-r border-slate-200">
          <FieldLabel>Billing Cycle</FieldLabel>
          <p className="text-xs font-black text-slate-800">{billingCycle}</p>
        </div>
        <div className="p-3">
          <FieldLabel>Contract Period</FieldLabel>
          <p className="text-xs font-black text-slate-800">
            {fmtDate(invoice.effectiveFrom)} – {fmtDate(invoice.effectiveTo)}
          </p>
        </div>
      </div>
      {serials.length > 0 && (
        <div className="border border-t-0 border-slate-200 p-3">
          <FieldLabel>Product(s)</FieldLabel>
          <p className="text-xs font-bold text-slate-700 font-mono">{serials.join(', ')}</p>
        </div>
      )}
      {hasInitialReading && (
        <div className="border border-t-0 border-slate-200 p-3">
          <FieldLabel>Initial Meter Reading (at installation)</FieldLabel>
          <p className="text-xs font-bold text-slate-700">
            B/W: {initialReading.bwA4.toLocaleString()}
            {initialReading.bwA3 > 0 ? ` (+ ${initialReading.bwA3.toLocaleString()} A3)` : ''}
            {' · '}
            Color: {initialReading.colorA4.toLocaleString()}
            {initialReading.colorA3 > 0 ? ` (+ ${initialReading.colorA3.toLocaleString()} A3)` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

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
  /** Accessories (stand, tray, stapler unit, etc.) collected together with this payment —
   *  rendered as a breakdown under the amount grid so the customer can see what the lump
   *  sum above actually covers. Pre-tax figures — the Amount field above is the real,
   *  tax-inclusive amount collected. */
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
  const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pending Accounts Approval',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  };
  const paymentStatus = PAYMENT_STATUS_META[advancePayment.status];
  return (
    <div>
      <SectionHeading>{sectionLabel}</SectionHeading>
      <div className="border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
          <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
            <FieldLabel>Amount</FieldLabel>
            <p className="text-sm font-black text-slate-800">
              {fmtAmt(advancePayment.amount, advancePayment.currency || currency)}
            </p>
          </div>
          <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
            <FieldLabel>Payment Mode</FieldLabel>
            <p className="text-xs font-black text-slate-800">
              {advancePayment.paymentMode?.replace('_', ' ')}
            </p>
          </div>
          <div className="p-3 border-r border-slate-200">
            <FieldLabel>Date Collected</FieldLabel>
            <p className="text-xs font-black text-slate-800">
              {fmtDate(advancePayment.paymentDate)}
            </p>
          </div>
          <div className="p-3">
            <FieldLabel>Reference</FieldLabel>
            <p className="text-xs font-black text-slate-800">
              {advancePayment.referenceNumber || advancePayment.chequeNumber || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50">
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
        <div className="border border-slate-200 border-t-0">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Includes Accessories (excl. tax — see Amount above for the tax-inclusive total)
            </span>
          </div>
          {accessoryItems.map((it, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 last:border-b-0"
            >
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
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{footerNote}</p>
    </div>
  );
}

function ReadingsSection({ bill }: { bill: Partial<Bill> }) {
  const items = bill.items || [];
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <SectionHeading>Meter Readings</SectionHeading>
        {bill.readingTakenDate && (
          <p className="text-[9px] font-bold text-slate-500">
            Reading Taken: <span className="text-slate-700">{fmtDate(bill.readingTakenDate)}</span>
          </p>
        )}
      </div>
      {items.length > 0 ? (
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-2 font-black uppercase tracking-wider text-slate-500">
                  Machine
                </th>
                <th className="text-right p-2 font-black uppercase tracking-wider text-slate-500">
                  B&amp;W A4 (Start→End)
                </th>
                <th className="text-right p-2 font-black uppercase tracking-wider text-slate-500">
                  B&amp;W A3 (Start→End)
                </th>
                <th className="text-right p-2 font-black uppercase tracking-wider text-slate-500">
                  Color A4 (Start→End)
                </th>
                <th className="text-right p-2 font-black uppercase tracking-wider text-slate-500">
                  Color A3 (Start→End)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={it.allocationId || idx}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="p-2 font-bold text-slate-700">
                    {it.allocation?.serialNumber || `Machine ${idx + 1}`}
                  </td>
                  <td className="p-2 text-right text-slate-600">
                    {it.startBwA4} → {it.endBwA4}
                  </td>
                  <td className="p-2 text-right text-slate-600">
                    {it.startBwA3} → {it.endBwA3}
                  </td>
                  <td className="p-2 text-right text-slate-600">
                    {it.startColorA4} → {it.endColorA4}
                  </td>
                  <td className="p-2 text-right text-slate-600">
                    {it.startColorA3} → {it.endColorA3}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-slate-200">
          <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
            <FieldLabel>B&amp;W A4 Reading</FieldLabel>
            <p className="text-sm font-black text-slate-800">{bill.bwA4Count ?? 0}</p>
          </div>
          <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
            <FieldLabel>B&amp;W A3 Reading</FieldLabel>
            <p className="text-sm font-black text-slate-800">{bill.bwA3Count ?? 0}</p>
          </div>
          <div className="p-3 border-r border-slate-200">
            <FieldLabel>Color A4 Reading</FieldLabel>
            <p className="text-sm font-black text-slate-800">{bill.colorA4Count ?? 0}</p>
          </div>
          <div className="p-3">
            <FieldLabel>Color A3 Reading</FieldLabel>
            <p className="text-sm font-black text-slate-800">{bill.colorA3Count ?? 0}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-t-0 border-slate-200">
        <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
          <FieldLabel>B&amp;W A4 Used</FieldLabel>
          <p className="text-xs font-bold text-slate-600">{bill.bwA4Delta ?? 0}</p>
        </div>
        <div className="p-3 border-r border-b sm:border-b-0 border-slate-200">
          <FieldLabel>B&amp;W A3 Used</FieldLabel>
          <p className="text-xs font-bold text-slate-600">{bill.bwA3Delta ?? 0}</p>
        </div>
        <div className="p-3 border-r border-slate-200">
          <FieldLabel>Color A4 Used</FieldLabel>
          <p className="text-xs font-bold text-slate-600">{bill.colorA4Delta ?? 0}</p>
        </div>
        <div className="p-3">
          <FieldLabel>Color A3 Used</FieldLabel>
          <p className="text-xs font-bold text-slate-600">{bill.colorA3Delta ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div>
      <SectionHeading>Charges</SectionHeading>
      <div className="border border-slate-200">
        {rows.map(([label, amt]) => (
          <div
            key={label}
            className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-xs"
          >
            <span className="text-slate-500">{label}</span>
            <span className="font-bold text-slate-700">{fmtAmt(amt, currency)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-xs">
          <span className="text-slate-500">Taxable Amount</span>
          <span className="font-bold text-slate-700">{fmtAmt(bill.taxableAmount, currency)}</span>
        </div>
        {Number(bill.taxAmount) > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-xs">
            <span className="text-slate-500">
              {invoice.taxName || 'VAT'}
              {bill.taxPercent ? ` (${bill.taxPercent}%)` : ''}
            </span>
            <span className="font-bold text-slate-700">{fmtAmt(bill.taxAmount, currency)}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
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

function ApprovalSection({ bill }: { bill: Partial<Bill> }) {
  return (
    <div>
      <SectionHeading>Approval</SectionHeading>
      <div className="border border-slate-200 p-3 space-y-1">
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
              ? ' (recorded by Finance)'
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
      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed text-center">
        If you notice any incorrect reading or have questions, please contact our finance team
        before approving this bill.
      </p>
    </div>
  );
}

export function BillDocumentBody({
  invoice,
  bill,
  currency,
  advancePayment,
  depositPayment,
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
  return (
    <div className="space-y-5 text-slate-800 bg-white print:p-6">
      <DocumentHeader invoice={invoice} bill={bill} hasDeposit={showDepositSection} />
      <CustomerSection invoice={invoice} />
      <DocRule />
      {isAdvance || isSecurityDeposit ? (
        <>
          <ContractDetailsSection invoice={invoice} />
          <DocRule />
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
            <>
              <DocRule />
              <AdvancePaymentSection
                advancePayment={depositPayment}
                currency={currency}
                sectionLabel="Security Deposit"
                footerNote="This deposit is refundable per the terms of your contract, and is held separately from the advance rent above — it is not part of your rent charges."
              />
            </>
          )}
        </>
      ) : (
        <>
          <ReadingsSection bill={bill} />
          <DocRule />
          <ChargesSection bill={bill} currency={currency} invoice={invoice} />
        </>
      )}
      <DocRule />
      <ApprovalSection bill={bill} />
    </div>
  );
}
