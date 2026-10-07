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

// Every mode gets its own label. This used to fall through to 'Cheque' for anything
// that was not Cash or Bank Transfer, so a card receipt told the customer they had paid
// by cheque.
const MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  ONLINE_PAYMENT: 'Online Payment (Card)',
  CREDIT_CARD: 'Card',
};

function modeLabel(mode: string) {
  return MODE_LABELS[mode] ?? mode.replace(/_/g, ' ');
}

const NETWORK_LABELS: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'American Express',
  UNIONPAY: 'UnionPay',
  MADA: 'mada',
  KNET: 'KNET',
  OTHER: 'Other',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border border-warning/30',
  APPROVED: 'bg-success/10 text-success border border-success/30',
  REJECTED: 'bg-destructive/10 text-destructive border border-destructive/30',
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
        badgeClass: 'bg-primary/10 text-primary',
      };
    case 'RENT_ADVANCE':
      return {
        title: 'First Month Advance Payment',
        subtitle: 'Initial first month advance payment for rental contract',
        type: 'RENT',
        badge: 'RENT · ADVANCE',
        badgeClass: 'bg-primary/10 text-primary',
      };
    case 'RENT_PERIODIC':
      return {
        title: 'Monthly Rental Collection',
        subtitle: 'Periodic rental payment collection',
        type: 'RENT',
        badge: 'RENT · MONTHLY',
        badgeClass: 'bg-primary/10 text-primary',
      };
    case 'RENT_SECURITY_DEPOSIT':
      return {
        title: 'Security Deposit Receipt',
        subtitle: 'Refundable security deposit — not a rent payment',
        type: 'RENT',
        badge: 'RENT · SECURITY DEPOSIT',
        badgeClass: 'bg-info/10 text-info',
      };
    case 'LEASE_ADVANCE':
      return {
        title: 'First Month Advance Payment',
        subtitle: 'Initial first month advance payment for lease contract',
        type: 'LEASE',
        badge: 'LEASE · ADVANCE',
        badgeClass: 'bg-lease/10 text-lease',
      };
    case 'LEASE_PERIODIC':
      return {
        title: 'Lease Installment Payment',
        subtitle: 'Periodic lease / EMI installment',
        type: 'LEASE',
        badge: 'LEASE · INSTALLMENT',
        badgeClass: 'bg-lease/10 text-lease',
      };
    case 'LEASE_SECURITY_DEPOSIT':
      return {
        title: 'Security Deposit Receipt',
        subtitle: 'Refundable security deposit — not a lease payment',
        type: 'LEASE',
        badge: 'LEASE · SECURITY DEPOSIT',
        badgeClass: 'bg-info/10 text-info',
      };
    default:
      return {
        title: 'Payment Receipt',
        subtitle: 'Contract payment',
        type: 'OTHER',
        badge: 'PAYMENT',
        badgeClass: 'bg-muted text-foreground',
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
    <div className="p-3 bg-primary/10 rounded-xl space-y-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-primary">
        Sale Contract Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {total != null && (
          <>
            <span className="text-muted-foreground font-bold">Total Contract Value</span>
            <span className="text-right font-black text-foreground">{fmtAmt(total, currency)}</span>
          </>
        )}
        <span className="text-muted-foreground font-bold">This Payment</span>
        <span className="text-right font-black text-primary">
          {fmtAmt(Number(payment.amount), currency)}
        </span>
        <span className="text-muted-foreground font-bold">Payment Type</span>
        <span className="text-right font-bold text-foreground">Advance at Conversion</span>
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
    <div className={`p-3 rounded-xl space-y-2 ${isDeposit ? 'bg-info/10' : 'bg-primary/10'}`}>
      <p
        className={`text-[9px] font-black uppercase tracking-widest ${isDeposit ? 'text-info' : 'text-primary'}`}
      >
        Rental Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="text-muted-foreground font-bold">Payment Type</span>
        <span className="text-right font-bold text-foreground">
          {isDeposit
            ? 'Security Deposit (Refundable)'
            : isAdvance
              ? 'First Month Advance'
              : `Monthly Rental — ${billingMonth}`}
        </span>
        {isDeposit && (
          <p className="col-span-2 text-[9px] text-info leading-relaxed">
            This is a refundable guarantee, held separately from rent — it is returned per the terms
            of your contract, not applied toward rent charges.
          </p>
        )}
        {!isAdvance && !isDeposit && (
          <>
            <span className="text-muted-foreground font-bold">Billing Period</span>
            <span className="text-right font-bold text-foreground">{billingMonth}</span>
          </>
        )}
        {monthlyRate != null && !isDeposit && (
          <>
            <span className="text-muted-foreground font-bold">Monthly Rate</span>
            <span className="text-right font-black text-foreground">
              {fmtAmt(monthlyRate, currency)}
            </span>
          </>
        )}
        <span className="text-muted-foreground font-bold">Amount Collected</span>
        <span className={`text-right font-black ${isDeposit ? 'text-info' : 'text-primary'}`}>
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
    <div className={`p-3 rounded-xl space-y-2 ${isDeposit ? 'bg-info/10' : 'bg-lease/10'}`}>
      <p
        className={`text-[9px] font-black uppercase tracking-widest ${isDeposit ? 'text-info' : 'text-lease'}`}
      >
        Lease Details
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="text-muted-foreground font-bold">Lease Type</span>
        <span className="text-right font-bold text-foreground">
          {leaseType === 'EMI' ? 'EMI Lease' : 'Full Service Maintenance'}
        </span>
        <span className="text-muted-foreground font-bold">Payment Type</span>
        <span className="text-right font-bold text-foreground">
          {isDeposit
            ? 'Security Deposit (Refundable)'
            : isAdvance
              ? 'First Month Advance'
              : leaseType === 'EMI'
                ? `Monthly Installment — ${billingMonth}`
                : `Service Period — ${billingMonth}`}
        </span>
        {isDeposit && (
          <p className="col-span-2 text-[9px] text-info leading-relaxed">
            This is a refundable guarantee, held separately from lease payments — it is returned per
            the terms of your contract, not applied toward lease charges.
          </p>
        )}
        <span className="text-muted-foreground font-bold">Amount</span>
        <span className={`text-right font-black ${isDeposit ? 'text-info' : 'text-lease'}`}>
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
    <div ref={printRef} className="bg-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-card p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
              Payment Receipt
            </p>
            <p className="text-xl font-black text-foreground">{payment.requestNo}</p>
            <p className="text-xs font-bold mt-0.5 text-muted-foreground">{meta.title}</p>
          </div>
          <div className="text-right">
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                STATUS_BADGE_CLASS[payment.status] ??
                'bg-muted text-foreground border border-border'
              }`}
            >
              {payment.status}
            </span>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              {fmtDate(payment.paymentDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
              <Building2 size={9} /> Branch
            </p>
            <p className="text-xs font-black text-foreground">Xerocare</p>
          </div>
          <div className="p-3 bg-muted rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
              <User size={9} /> Received From
            </p>
            <p className="text-xs font-black text-foreground">{payment.customerName}</p>
          </div>
        </div>

        {/* Contract reference */}
        <div className="flex items-center justify-between p-2.5 bg-muted rounded-xl">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Contract / Invoice
            </p>
            <p className="text-sm font-black text-foreground mt-0.5">{payment.invoiceNumber}</p>
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
        <div className="p-3 border border-border rounded-xl space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <CreditCard size={9} /> Payment Details
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <span className="text-muted-foreground font-bold">Mode</span>
            <span className="text-right font-black text-foreground">
              {modeLabel(payment.paymentMode)}
            </span>
            <span className="text-muted-foreground font-bold">Amount</span>
            <span className="text-right font-black text-foreground text-sm">
              {fmtAmt(Number(payment.amount), currency)}
            </span>
            <span className="text-muted-foreground font-bold">Date</span>
            <span className="text-right font-bold text-foreground">
              {fmtDate(payment.paymentDate)}
            </span>
            {payment.referenceNumber && (
              <>
                <span className="text-muted-foreground font-bold">Reference</span>
                <span className="text-right font-bold text-foreground">
                  {payment.referenceNumber}
                </span>
              </>
            )}
          </div>
          {payment.paymentMode === 'ONLINE_PAYMENT' && payment.cardLast4 && (
            <div className="mt-2 p-2 bg-primary/10 rounded-lg space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                Card Details
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground font-bold">Card</span>
                <span className="text-right font-bold text-foreground">
                  {payment.issuerBank ? `${payment.issuerBank} ` : ''}
                  {payment.cardNetwork
                    ? (NETWORK_LABELS[payment.cardNetwork] ?? payment.cardNetwork)
                    : ''}
                  {payment.cardType ? ` ${payment.cardType === 'DEBIT' ? 'Debit' : 'Credit'}` : ''}
                </span>
                {/* Masked, always. The full number is not stored, so it cannot be shown
                    here even by mistake. */}
                <span className="text-muted-foreground font-bold">Card Number</span>
                <span className="text-right font-bold text-foreground font-mono">
                  •••• •••• •••• {payment.cardLast4}
                </span>
                {payment.cardHolderName && (
                  <>
                    <span className="text-muted-foreground font-bold">Card Holder</span>
                    <span className="text-right font-bold text-foreground uppercase">
                      {payment.cardHolderName}
                    </span>
                  </>
                )}
                {payment.transactionReference && (
                  <>
                    <span className="text-muted-foreground font-bold">Approval Ref</span>
                    <span className="text-right font-bold text-foreground">
                      {payment.transactionReference}
                    </span>
                  </>
                )}
              </div>

              {/* Bank commission, at the rate agreed with THIS issuer.
                  Stated separately and labelled as the merchant's cost, because the
                  customer paid the gross above and is not charged this — the acquirer
                  withholds it from what it settles to us. */}
              {payment.commissionAmount != null && (
                <div className="mt-2 border-t border-dashed border-primary/30 pt-2">
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground font-bold">Amount Charged</span>
                    <span className="text-right font-bold text-foreground">
                      {fmtAmt(Number(payment.amount), currency)}
                    </span>
                    <span className="text-muted-foreground font-bold">
                      Bank Commission
                      {payment.commissionRateApplied != null &&
                        ` (${Number(payment.commissionRateApplied)}%)`}
                    </span>
                    <span className="text-right font-bold text-destructive">
                      − {fmtAmt(Number(payment.commissionAmount), currency)}
                    </span>
                    <span className="text-foreground font-black">Net Settlement</span>
                    <span className="text-right font-black text-success">
                      {fmtAmt(Number(payment.netSettlementAmount ?? payment.amount), currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] font-bold text-muted-foreground">
                    Commission is deducted by the bank from the merchant&apos;s settlement. The
                    customer is credited the full amount charged.
                  </p>
                </div>
              )}
            </div>
          )}

          {payment.paymentMode === 'CHEQUE' && (payment.chequeNumber || payment.chequeBankName) && (
            <div className="mt-2 p-2 bg-warning/10 rounded-lg space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-warning">
                Cheque Details
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {payment.chequeNumber && (
                  <>
                    <span className="text-muted-foreground font-bold">Cheque No.</span>
                    <span className="text-right font-bold text-foreground">
                      {payment.chequeNumber}
                    </span>
                  </>
                )}
                {payment.chequeBankName && (
                  <>
                    <span className="text-muted-foreground font-bold">Bank</span>
                    <span className="text-right font-bold text-foreground">
                      {payment.chequeBankName}
                    </span>
                  </>
                )}
                {payment.paymentDate && (
                  <>
                    <span className="text-muted-foreground font-bold">Cheque Received Date</span>
                    <span className="text-right font-bold text-foreground">
                      {fmtDate(payment.paymentDate)}
                    </span>
                  </>
                )}
                {payment.chequeDate && (
                  <>
                    <span className="text-muted-foreground font-bold">Cheque Date</span>
                    <span className="text-right font-bold text-foreground">
                      {fmtDate(payment.chequeDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          {payment.remarks && (
            <p className="text-xs text-muted-foreground font-bold italic border-t border-border pt-2 mt-1">
              Note: {payment.remarks}
            </p>
          )}
        </div>

        {/* Approval status */}
        {payment.status === 'APPROVED' && (
          <div className="flex items-center gap-2 p-2.5 bg-success/10 border border-success/30 rounded-xl">
            <CheckCircle2 size={16} className="text-success shrink-0" />
            <div>
              <p className="text-xs font-black text-success">Approved & Posted to Ledger</p>
              {payment.reviewedByName && (
                <p className="text-[10px] text-success font-bold">
                  By {payment.reviewedByName}
                  {payment.reviewedAt ? ` · ${fmtDate(payment.reviewedAt)}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {payment.status === 'REJECTED' && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-xs font-black text-destructive">Payment Rejected</p>
            {payment.rejectionReason && (
              <p className="text-[10px] text-destructive font-bold mt-0.5">
                {payment.rejectionReason}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
            <Calendar size={10} />
            <span>Recorded {fmtDate(payment.createdAt)}</span>
            {payment.recordedByEmployeeName && <span>· {payment.recordedByEmployeeName}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
