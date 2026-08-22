'use client';

import React from 'react';
import { Invoice } from '@/lib/invoice';
import { Bill, SalePaymentRequest } from '@/lib/saleWorkflow';

interface Props {
  invoice: Invoice;
  bill: Partial<Bill>;
  currency: string;
  /** Present when bill.billType === 'ADVANCE' — the real collected payment this Bill
   *  wraps for customer sign-off (amount/mode/date/status live here, not on the bill). */
  advancePayment?: SalePaymentRequest | null;
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

function DocumentHeader({ invoice, bill }: { invoice: Invoice; bill: Partial<Bill> }) {
  const status = STATUS_META[bill.billStatus || 'PENDING_APPROVAL'];
  const isAdvance = bill.billType === 'ADVANCE';
  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
            Xerocare Trading &amp; Services W.L.L
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-65">
            {isAdvance ? 'Advance Bill for' : 'Bill for'} {invoice.customerName || 'Customer'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tracking-tight text-slate-800 uppercase leading-none">
            {isAdvance ? 'Advance Bill' : 'Bill'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Contract: <span className="font-bold text-slate-600">{invoice.invoiceNumber}</span>
          </p>
          {!isAdvance && (
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
  const serials = (invoice.productAllocations ?? [])
    .filter((a) => a.status === 'ALLOCATED')
    .map((a) => a.serialNumber)
    .filter(Boolean);

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
    </div>
  );
}

function AdvancePaymentSection({
  advancePayment,
  currency,
}: {
  advancePayment?: SalePaymentRequest | null;
  currency: string;
}) {
  if (!advancePayment) {
    return (
      <div>
        <SectionHeading>Advance Payment</SectionHeading>
        <p className="text-xs text-slate-400 italic">Advance payment details unavailable.</p>
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
      <SectionHeading>Advance Payment</SectionHeading>
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
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
        This Advance Bill documents the advance payment above for your records and approval — it is
        independent of Accounts&apos; internal approval of the payment itself.
      </p>
    </div>
  );
}

function ReadingsSection({ bill }: { bill: Partial<Bill> }) {
  const items = bill.items || [];
  return (
    <div>
      <SectionHeading>Meter Readings</SectionHeading>
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

function ChargesSection({ bill, currency }: { bill: Partial<Bill>; currency: string }) {
  const rows: Array<[string, number | undefined]> = [
    ['Base Rent', bill.monthlyRent],
    ['Excess Usage Charge', bill.exceededCharge],
  ];
  if (Number(bill.advanceAdjusted) > 0)
    rows.push(['Advance Adjusted', -Number(bill.advanceAdjusted)]);
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
              VAT{bill.taxPercent ? ` (${bill.taxPercent}%)` : ''}
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

export function BillDocumentBody({ invoice, bill, currency, advancePayment }: Props) {
  const isAdvance = bill.billType === 'ADVANCE';
  return (
    <div className="space-y-5 text-slate-800 bg-white print:p-6">
      <DocumentHeader invoice={invoice} bill={bill} />
      <CustomerSection invoice={invoice} />
      <DocRule />
      {isAdvance ? (
        <>
          <ContractDetailsSection invoice={invoice} />
          <DocRule />
          <AdvancePaymentSection advancePayment={advancePayment} currency={currency} />
        </>
      ) : (
        <>
          <ReadingsSection bill={bill} />
          <DocRule />
          <ChargesSection bill={bill} currency={currency} />
        </>
      )}
      <DocRule />
      <ApprovalSection bill={bill} />
    </div>
  );
}
