'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, FileText } from 'lucide-react';
import { fetchChequeById, type Cheque } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';

export const CHEQUE_TABLE_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  DEPOSITED: 'bg-blue-100 text-blue-700',
  ISSUED: 'bg-purple-100 text-purple-700',
  CLEARED: 'bg-emerald-100 text-emerald-700',
  BOUNCED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export const CHEQUE_STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  DEPOSITED: <RefreshCw className="h-3.5 w-3.5" />,
  ISSUED: <RefreshCw className="h-3.5 w-3.5" />,
  CLEARED: <CheckCircle className="h-3.5 w-3.5" />,
  BOUNCED: <AlertTriangle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
};

const SALE_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  SALE: { label: 'SALE', cls: 'bg-blue-100 text-blue-700' },
  PRODUCT_SALE: { label: 'PRODUCT SALE', cls: 'bg-blue-100 text-blue-700' },
  SPAREPART_SALE: { label: 'SPARE PART SALE', cls: 'bg-blue-100 text-blue-700' },
  RENT: { label: 'RENT', cls: 'bg-orange-100 text-orange-700' },
  LEASE: { label: 'LEASE', cls: 'bg-purple-100 text-purple-700' },
};

export function SaleTypeBadge({ saleType }: { saleType?: string | null }) {
  if (!saleType) return null;
  const badge = SALE_TYPE_BADGE[saleType] ?? {
    label: saleType.replace(/_/g, ' '),
    cls: 'bg-slate-100 text-slate-600',
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${badge.cls}`}
    >
      {badge.label}
    </span>
  );
}

// Pure presentational — the fields + payment-proof block, no modal chrome. Reused
// by the standalone ChequeDetailModal below and embedded directly inside the
// General Ledger transaction detail view for Payment/Cheque-sourced entries.
export function ChequeDetailBody({ cheque, currency }: { cheque: Cheque; currency: string }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Cheque Number', value: <span className="font-mono">{cheque.chequeNo}</span> },
    { label: cheque.type === 'RECEIVED' ? 'Customer' : 'Party', value: cheque.partyName },
    { label: 'Bank', value: cheque.bankName ?? '—' },
    { label: 'Amount', value: formatCurrency(cheque.amount, currency) },
    {
      label: cheque.type === 'RECEIVED' ? 'Cheque Date' : 'Issue Date',
      value:
        cheque.type === 'RECEIVED'
          ? cheque.chequeDate
            ? String(cheque.chequeDate).slice(0, 10)
            : '—'
          : cheque.issueDate
            ? String(cheque.issueDate).slice(0, 10)
            : '—',
    },
    { label: 'Due Date', value: String(cheque.dueDate).slice(0, 10) },
    {
      label: 'Status',
      value: (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHEQUE_TABLE_STATUS_BADGE[cheque.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {CHEQUE_STATUS_ICON[cheque.status]}
          {cheque.status}
        </span>
      ),
    },
  ];
  if (cheque.depositDate) {
    rows.push({ label: 'Deposit Date', value: String(cheque.depositDate).slice(0, 10) });
  }
  if (cheque.clearedDate) {
    rows.push({
      label: 'Cleared / Cash Received Date',
      value: String(cheque.clearedDate).slice(0, 10),
    });
  }
  if (cheque.saleType) {
    rows.push({ label: 'Transaction Type', value: <SaleTypeBadge saleType={cheque.saleType} /> });
  }
  if (cheque.invoiceNo) rows.push({ label: 'Invoice', value: cheque.invoiceNo });
  if (cheque.sourceLabel) rows.push({ label: 'Source', value: cheque.sourceLabel });
  if (cheque.description) rows.push({ label: 'Description', value: cheque.description });
  if ((cheque.status === 'BOUNCED' || cheque.status === 'CANCELLED') && cheque.reason) {
    rows.push({
      label: cheque.status === 'BOUNCED' ? 'Bounce Reason' : 'Cancellation Reason',
      value: <span className="text-red-600">{cheque.reason}</span>,
    });
  }

  const isImageProof =
    !!cheque.receiptUrl && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(cheque.receiptUrl);

  return (
    <div className="space-y-4">
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-gray-500 whitespace-nowrap">{r.label}</dt>
            <dd className="font-medium text-gray-800 text-right break-words min-w-0">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
          Payment Proof
        </p>
        {cheque.receiptUrl ? (
          <div className="space-y-2">
            {isImageProof && (
              <img
                src={cheque.receiptUrl}
                alt="Payment proof"
                className="w-full max-h-64 object-contain rounded-lg border bg-gray-50"
              />
            )}
            <a
              href={cheque.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
            >
              <FileText className="h-4 w-4" /> View Payment Proof
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No payment proof uploaded.</p>
        )}
      </div>
    </div>
  );
}

// ─── Cheque Detail Modal (full details + payment proof) ───────────────────────
// Fetches fresh data by id (rather than trusting the row passed in from the list)
// so Cheque Date / Deposit Date / Cleared Date / Bounce-Cancel reason are always
// current, even if the caller's copy was cached before the latest action.
export function ChequeDetailModal({
  cheque: initialCheque,
  currency,
  onClose,
}: {
  cheque: Cheque;
  currency: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['cheque-detail', initialCheque.id],
    queryFn: () => fetchChequeById(initialCheque.id),
  });
  const cheque = data ?? initialCheque;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Cheque Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="p-6">
            <ChequeDetailBody cheque={cheque} currency={currency} />
          </div>
        )}
      </div>
    </div>
  );
}
