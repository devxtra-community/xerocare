'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, User, Building2, CreditCard, ShieldCheck } from 'lucide-react';
import {
  fetchReceivableRowDetail,
  fetchPayableRowDetail,
  type ReceivableRowDetail,
  type PayableRowDetail,
  type PaymentHistoryRow,
  type RowChequeInfo,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';

export const CHEQUE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  DEPOSITED: 'bg-blue-50 text-blue-700 border-blue-200',
  CLEARED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BOUNCED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  ISSUED: 'bg-purple-50 text-purple-700 border-purple-200',
};

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4 space-y-5">{children}</div>
        <div className="flex justify-end px-6 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

export function ChequeList({ cheques }: { cheques: RowChequeInfo[] }) {
  if (cheques.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {cheques.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2"
        >
          <span className="font-mono">
            {c.chequeNo} {c.bankName ? `· ${c.bankName}` : ''}
          </span>
          <span className="text-muted-foreground">Due {c.dueDate?.slice(0, 10)}</span>
          <span className="font-medium">{formatCurrency(c.amount, undefined)}</span>
          <span
            className={`px-2 py-0.5 rounded-md font-semibold border ${CHEQUE_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PaymentHistoryTable({
  payments,
  currency,
}: {
  payments: PaymentHistoryRow[];
  currency: string;
}) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-bold">Date</th>
            <th className="text-left px-3 py-2 font-bold">Mode</th>
            <th className="text-left px-3 py-2 font-bold">Reference</th>
            <th className="text-right px-3 py-2 font-bold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 text-xs text-muted-foreground">{p.date?.slice(0, 10)}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {p.mode ?? '—'}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {p.referenceNumber ?? '—'}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                {formatCurrency(p.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
      <Icon className="h-3.5 w-3.5" /> {children}
    </h3>
  );
}

// Pure presentational — no fetch, no modal shell. Reused as-is inside the General
// Ledger's transaction detail view (which supplies its own ModalShell) as well as
// the thin ReceivableDetailModal wrapper below.
export function ReceivableDetailBody({ data }: { data: ReceivableRowDetail }) {
  return (
    <>
      <div>
        <SectionHeading icon={User}>Customer</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Name" value={data.customer.name} />
          <DetailField label="Phone" value={data.customer.phone} />
          <DetailField label="Email" value={data.customer.email} />
          <DetailField label="VAT Number" value={data.customer.vatNumber} />
          <DetailField
            label="Location"
            value={
              [data.customer.city, data.customer.stateProvince, data.customer.country]
                .filter(Boolean)
                .join(', ') || null
            }
          />
        </div>
      </div>

      <div>
        <SectionHeading icon={FileText}>Source Document</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField
            label={data.source === 'INVOICE' ? 'Invoice #' : 'Reference #'}
            value={data.referenceNo}
          />
          <DetailField label="Sale Type" value={data.saleType} />
          <DetailField label="Status" value={data.status} />
          <DetailField label="Issue Date" value={data.issueDate?.slice(0, 10)} />
          {data.dueDate && <DetailField label="Due Date" value={data.dueDate.slice(0, 10)} />}
          {data.billingPeriodStart && (
            <DetailField
              label="Billing Period"
              value={`${data.billingPeriodStart.slice(0, 10)} → ${data.billingPeriodEnd?.slice(0, 10) ?? ''}`}
            />
          )}
          <DetailField
            label="Original Amount"
            value={formatCurrency(data.totalAmount, data.currencyCode)}
          />
          <DetailField label="Paid" value={formatCurrency(data.paid, data.currencyCode)} />
          <DetailField
            label="Outstanding"
            value={formatCurrency(data.outstanding, data.currencyCode)}
          />
        </div>
      </div>

      <div>
        <SectionHeading icon={CreditCard}>Payment History</SectionHeading>
        <PaymentHistoryTable payments={data.paymentHistory} currency={data.currencyCode} />
        <div className="mt-2">
          <ChequeList cheques={data.cheques} />
        </div>
      </div>
    </>
  );
}

export function ReceivableDetailModal({
  sourceType,
  id,
  onClose,
}: {
  sourceType: 'INVOICE' | 'MANUAL';
  id: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['receivable-row-detail', sourceType, id],
    queryFn: () => fetchReceivableRowDetail(sourceType, id),
  });

  return (
    <ModalShell
      title={data?.customer.name ?? 'Receivable Detail'}
      subtitle={data ? `${data.referenceNo} · ${data.saleType}` : undefined}
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ReceivableDetailBody data={data} />
      )}
    </ModalShell>
  );
}

export function PayableDetailModal({
  sourceType,
  id,
  onClose,
}: {
  sourceType: 'PO' | 'MANUAL';
  id: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['payable-row-detail', sourceType, id],
    queryFn: () => fetchPayableRowDetail(sourceType, id),
  });

  return (
    <ModalShell
      title={data?.vendor?.name ?? 'Payable Detail'}
      subtitle={
        data ? `${data.referenceNo}${data.category ? ` · ${data.category}` : ''}` : undefined
      }
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <PayableDetailBody data={data} />
      )}
    </ModalShell>
  );
}

// Pure presentational — no fetch, no modal shell. See ReceivableDetailBody's
// comment above; reused by the General Ledger transaction detail view.
export function PayableDetailBody({ data }: { data: PayableRowDetail }) {
  return (
    <>
      <div>
        <SectionHeading icon={Building2}>Vendor</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Name" value={data.vendor?.name} />
          <DetailField label="Phone" value={data.vendor?.phone} />
          <DetailField label="Email" value={data.vendor?.email} />
          <DetailField label="Contact Person" value={data.vendor?.contactPerson} />
          <DetailField label="VAT Number" value={data.vendor?.vatNumber} />
          <DetailField
            label="Location"
            value={
              [data.vendor?.city, data.vendor?.stateProvince, data.vendor?.country]
                .filter(Boolean)
                .join(', ') || null
            }
          />
          {Array.isArray(data.vendor?.bankAccounts) && data.vendor.bankAccounts.length > 0 && (
            <div className="col-span-full">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Bank Details
              </p>
              <div className="space-y-1">
                {(
                  data.vendor.bankAccounts as {
                    bankName?: string;
                    accountHolderName?: string;
                    accountNumber?: string;
                    iban?: string;
                  }[]
                ).map((b, i) => (
                  <p key={i} className="text-xs text-slate-700">
                    {b.bankName} — {b.accountHolderName} — A/C {b.accountNumber}
                    {b.iban ? ` — IBAN/IFSC ${b.iban}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeading icon={FileText}>Source Document</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Reference #" value={data.referenceNo} />
          {data.category && <DetailField label="Category" value={data.category} />}
          {data.origin && <DetailField label="Origin" value={data.origin} />}
          <DetailField label="Issue Date" value={data.issueDate?.slice(0, 10)} />
          {data.dueDate && <DetailField label="Due Date" value={data.dueDate.slice(0, 10)} />}
          <DetailField
            label="Original Amount"
            value={formatCurrency(data.totalAmount, data.currencyCode)}
          />
          <DetailField label="Paid" value={formatCurrency(data.paid, data.currencyCode)} />
          <DetailField
            label="Outstanding"
            value={formatCurrency(data.outstanding, data.currencyCode)}
          />
        </div>
      </div>

      <div>
        <SectionHeading icon={CreditCard}>Payment History</SectionHeading>
        <PaymentHistoryTable payments={data.paymentHistory} currency={data.currencyCode} />
        <div className="mt-2">
          <ChequeList cheques={data.cheques} />
        </div>
      </div>

      {data.approvals.length > 0 && (
        <div>
          <SectionHeading icon={ShieldCheck}>Manager Approval Flow</SectionHeading>
          <div className="space-y-1.5">
            {data.approvals.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs bg-muted/30 rounded-md px-3 py-2"
              >
                <span className="font-mono">{a.requestNo}</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${APPROVAL_STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {a.status}
                </span>
                <span className="text-muted-foreground">
                  Requested by {a.employeeName}
                  {a.paymentMode ? ` · ${a.paymentMode}` : ''}
                </span>
                {a.reviewedBy && (
                  <span className="text-muted-foreground">
                    · Reviewed by {a.reviewedBy}
                    {a.reviewedAt ? ` on ${a.reviewedAt.slice(0, 10)}` : ''}
                  </span>
                )}
                {a.rejectionReason && (
                  <span className="text-red-600">· Rejected: {a.rejectionReason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
