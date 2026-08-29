'use client';

import React from 'react';
import { SalePaymentRequest } from '@/lib/saleWorkflow';
import { Invoice } from '@/lib/invoice';
import { CheckCircle2, Building2, User, CreditCard, Calendar } from 'lucide-react';

interface SalePaymentReceiptViewProps {
  payment: SalePaymentRequest;
  invoice?: Invoice | null;
  currency: string;
  printRef?: React.RefObject<HTMLDivElement | null>;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtAmt(n?: number | null, curr?: string) {
  if (n == null) return '—';
  return `${curr ?? ''} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function modeLabel(mode: string) {
  return mode === 'BANK_TRANSFER' ? 'Bank Transfer' : mode === 'CASH' ? 'Cash' : 'Cheque';
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
};

type ReceiptType = 'SALE' | 'RENT' | 'LEASE' | 'OTHER';

interface ContextMeta {
  title: string;
  subtitle: string;
  type: ReceiptType;
  badge: string;
  badgeClass: string;
}

function getContextMeta(ctx?: string | null): ContextMeta {
  switch (ctx) {
    case 'SALE':
      return {
        title: 'Sale Advance Payment',
        subtitle: 'Initial advance collected at contract conversion',
        type: 'SALE',
        badge: 'SALE',
        badgeClass: 'bg-indigo-100 text-indigo-700',
      };
    case 'RENT_ADVANCE':
      return {
        title: 'First Month Advance Payment',
        subtitle: 'Initial first month advance payment for rental contract',
        type: 'RENT',
        badge: 'RENT · ADVANCE',
        badgeClass: 'bg-blue-100 text-blue-700',
      };
    case 'RENT_PERIODIC':
      return {
        title: 'Monthly Rental Collection',
        subtitle: 'Periodic rental payment collection',
        type: 'RENT',
        badge: 'RENT · MONTHLY',
        badgeClass: 'bg-blue-100 text-blue-700',
      };
    case 'RENT_SECURITY_DEPOSIT':
      return {
        title: 'Security Deposit Receipt',
        subtitle: 'Refundable security deposit — not a rent payment',
        type: 'RENT',
        badge: 'RENT · SECURITY DEPOSIT',
        badgeClass: 'bg-teal-100 text-teal-700',
      };
    case 'LEASE_ADVANCE':
      return {
        title: 'First Month Advance Payment',
        subtitle: 'Initial first month advance payment for lease contract',
        type: 'LEASE',
        badge: 'LEASE · ADVANCE',
        badgeClass: 'bg-violet-100 text-violet-700',
      };
    case 'LEASE_PERIODIC':
      return {
        title: 'Lease Installment Payment',
        subtitle: 'Periodic lease / EMI installment',
        type: 'LEASE',
        badge: 'LEASE · INSTALLMENT',
        badgeClass: 'bg-violet-100 text-violet-700',
      };
    case 'LEASE_SECURITY_DEPOSIT':
      return {
        title: 'Security Deposit Receipt',
        subtitle: 'Refundable security deposit — not a lease payment',
        type: 'LEASE',
        badge: 'LEASE · SECURITY DEPOSIT',
        badgeClass: 'bg-teal-100 text-teal-700',
      };
    default:
      return {
        title: 'Payment Receipt',
        subtitle: 'Contract payment',
        type: 'OTHER',
        badge: 'PAYMENT',
        badgeClass: 'bg-slate-100 text-slate-700',
      };
  }
}

function SaleSection({
  payment,
  invoice,
  currency,
}: {
  payment: SalePaymentRequest;
  invoice?: Invoice | null;
  currency: string;
}) {
  const total = invoice?.totalAmount;
  return (
    <div className="p-3 bg-indigo-50 rounded-xl space-y-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
        Sale Contract Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {total != null && (
          <>
            <span className="text-slate-500 font-bold">Total Contract Value</span>
            <span className="text-right font-black text-slate-800">{fmtAmt(total, currency)}</span>
          </>
        )}
        <span className="text-slate-500 font-bold">This Payment</span>
        <span className="text-right font-black text-indigo-700">
          {fmtAmt(Number(payment.amount), currency)}
        </span>
        <span className="text-slate-500 font-bold">Payment Type</span>
        <span className="text-right font-bold text-slate-700">Advance at Conversion</span>
      </div>
    </div>
  );
}

function RentSection({
  payment,
  invoice,
  currency,
  context,
}: {
  payment: SalePaymentRequest;
  invoice?: Invoice | null;
  currency: string;
  context?: string | null;
}) {
  const billingMonth = new Date(payment.paymentDate).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const isAdvance = context === 'RENT_ADVANCE';
  const isDeposit = context === 'RENT_SECURITY_DEPOSIT';

  const bwItem = invoice?.items?.find(
    (i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0,
  );
  const monthlyRate = bwItem
    ? (bwItem.unitPrice ?? null)
    : (invoice?.items?.find((i) => (i.unitPrice ?? 0) > 0)?.unitPrice ?? null);

  return (
    <div className={`p-3 rounded-xl space-y-2 ${isDeposit ? 'bg-teal-50' : 'bg-blue-50'}`}>
      <p
        className={`text-[9px] font-black uppercase tracking-widest ${isDeposit ? 'text-teal-600' : 'text-blue-500'}`}
      >
        Rental Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="text-slate-500 font-bold">Payment Type</span>
        <span className="text-right font-bold text-slate-700">
          {isDeposit
            ? 'Security Deposit (Refundable)'
            : isAdvance
              ? 'First Month Advance'
              : `Monthly Rental — ${billingMonth}`}
        </span>
        {isDeposit && (
          <p className="col-span-2 text-[9px] text-teal-700 leading-relaxed">
            This is a refundable guarantee, held separately from rent — it is returned per the terms
            of your contract, not applied toward rent charges.
          </p>
        )}
        {!isAdvance && !isDeposit && (
          <>
            <span className="text-slate-500 font-bold">Billing Period</span>
            <span className="text-right font-bold text-slate-700">{billingMonth}</span>
          </>
        )}
        {monthlyRate != null && !isDeposit && (
          <>
            <span className="text-slate-500 font-bold">Monthly Rate</span>
            <span className="text-right font-black text-slate-800">
              {fmtAmt(monthlyRate, currency)}
            </span>
          </>
        )}
        <span className="text-slate-500 font-bold">Amount Collected</span>
        <span className={`text-right font-black ${isDeposit ? 'text-teal-700' : 'text-blue-700'}`}>
          {fmtAmt(Number(payment.amount), currency)}
        </span>
      </div>
    </div>
  );
}

function LeaseSection({
  payment,
  invoice,
  currency,
  context,
}: {
  payment: SalePaymentRequest;
  invoice?: Invoice | null;
  currency: string;
  context?: string | null;
}) {
  const isAdvance = context === 'LEASE_ADVANCE';
  const isDeposit = context === 'LEASE_SECURITY_DEPOSIT';
  const leaseType = invoice?.leaseType ?? 'EMI';
  const billingMonth = new Date(payment.paymentDate).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={`p-3 rounded-xl space-y-2 ${isDeposit ? 'bg-teal-50' : 'bg-violet-50'}`}>
      <p
        className={`text-[9px] font-black uppercase tracking-widest ${isDeposit ? 'text-teal-600' : 'text-violet-500'}`}
      >
        Lease Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="text-slate-500 font-bold">Lease Type</span>
        <span className="text-right font-bold text-slate-700">
          {leaseType === 'EMI' ? 'EMI Lease' : 'Full Service Maintenance'}
        </span>
        <span className="text-slate-500 font-bold">Payment Type</span>
        <span className="text-right font-bold text-slate-700">
          {isDeposit
            ? 'Security Deposit (Refundable)'
            : isAdvance
              ? 'First Month Advance'
              : leaseType === 'EMI'
                ? `Monthly Installment — ${billingMonth}`
                : `Service Period — ${billingMonth}`}
        </span>
        {isDeposit && (
          <p className="col-span-2 text-[9px] text-teal-700 leading-relaxed">
            This is a refundable guarantee, held separately from lease payments — it is returned per
            the terms of your contract, not applied toward lease charges.
          </p>
        )}
        <span className="text-slate-500 font-bold">Amount</span>
        <span
          className={`text-right font-black ${isDeposit ? 'text-teal-700' : 'text-violet-700'}`}
        >
          {fmtAmt(Number(payment.amount), currency)}
        </span>
      </div>
    </div>
  );
}

export function SalePaymentReceiptView({
  payment,
  invoice,
  currency,
  printRef,
}: SalePaymentReceiptViewProps) {
  const meta = getContextMeta(payment.paymentContext);

  return (
    <div ref={printRef} className="bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white p-5 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              Payment Receipt
            </p>
            <p className="text-xl font-black text-slate-800">{payment.requestNo}</p>
            <p className="text-xs font-bold mt-0.5 text-slate-500">{meta.title}</p>
          </div>
          <div className="text-right">
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                STATUS_BADGE_CLASS[payment.status] ??
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {payment.status}
            </span>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {fmtDate(payment.paymentDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
              <Building2 size={9} /> Branch
            </p>
            <p className="text-xs font-black text-slate-700">Xerocare</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
              <User size={9} /> Received From
            </p>
            <p className="text-xs font-black text-slate-700">{payment.customerName}</p>
          </div>
        </div>

        {/* Contract reference */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Contract / Invoice
            </p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{payment.invoiceNumber}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${meta.badgeClass}`}
          >
            {meta.badge}
          </span>
        </div>

        {/* Type-specific section */}
        {meta.type === 'SALE' && (
          <SaleSection payment={payment} invoice={invoice} currency={currency} />
        )}
        {meta.type === 'RENT' && (
          <RentSection
            payment={payment}
            invoice={invoice}
            currency={currency}
            context={payment.paymentContext}
          />
        )}
        {meta.type === 'LEASE' && (
          <LeaseSection
            payment={payment}
            invoice={invoice}
            currency={currency}
            context={payment.paymentContext}
          />
        )}

        {/* Payment method */}
        <div className="p-3 border border-slate-200 rounded-xl space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <CreditCard size={9} /> Payment Details
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">Mode</span>
            <span className="text-right font-black text-slate-800">
              {modeLabel(payment.paymentMode)}
            </span>
            <span className="text-slate-500 font-bold">Amount</span>
            <span className="text-right font-black text-slate-900 text-sm">
              {fmtAmt(Number(payment.amount), currency)}
            </span>
            <span className="text-slate-500 font-bold">Date</span>
            <span className="text-right font-bold text-slate-700">
              {fmtDate(payment.paymentDate)}
            </span>
            {payment.referenceNumber && (
              <>
                <span className="text-slate-500 font-bold">Reference</span>
                <span className="text-right font-bold text-slate-700">
                  {payment.referenceNumber}
                </span>
              </>
            )}
          </div>
          {payment.paymentMode === 'CHEQUE' && (payment.chequeNumber || payment.chequeBankName) && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                Cheque Details
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {payment.chequeNumber && (
                  <>
                    <span className="text-slate-500 font-bold">Cheque No.</span>
                    <span className="text-right font-bold text-slate-700">
                      {payment.chequeNumber}
                    </span>
                  </>
                )}
                {payment.chequeBankName && (
                  <>
                    <span className="text-slate-500 font-bold">Bank</span>
                    <span className="text-right font-bold text-slate-700">
                      {payment.chequeBankName}
                    </span>
                  </>
                )}
                {payment.chequeDate && (
                  <>
                    <span className="text-slate-500 font-bold">Cheque Date</span>
                    <span className="text-right font-bold text-slate-700">
                      {fmtDate(payment.chequeDate)}
                    </span>
                  </>
                )}
                {payment.chequeDueDate && (
                  <>
                    <span className="text-slate-500 font-bold">Due Date</span>
                    <span className="text-right font-bold text-slate-700">
                      {fmtDate(payment.chequeDueDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          {payment.remarks && (
            <p className="text-xs text-slate-500 font-bold italic border-t border-slate-100 pt-2 mt-1">
              Note: {payment.remarks}
            </p>
          )}
        </div>

        {/* Approval status */}
        {payment.status === 'APPROVED' && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-black text-emerald-700">Approved & Posted to Ledger</p>
              {payment.reviewedByName && (
                <p className="text-[10px] text-emerald-600 font-bold">
                  By {payment.reviewedByName}
                  {payment.reviewedAt ? ` · ${fmtDate(payment.reviewedAt)}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {payment.status === 'REJECTED' && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-black text-red-600">Payment Rejected</p>
            {payment.rejectionReason && (
              <p className="text-[10px] text-red-500 font-bold mt-0.5">{payment.rejectionReason}</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
            <Calendar size={10} />
            <span>Recorded {fmtDate(payment.createdAt)}</span>
            {payment.recordedByEmployeeName && <span>· {payment.recordedByEmployeeName}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
