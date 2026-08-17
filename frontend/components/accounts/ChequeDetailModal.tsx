'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, FileText } from 'lucide-react';
import {
  fetchChequeById,
  depositCheque,
  issueCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  type Cheque,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

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

// ─── Shared action type ───────────────────────────────────────────────────────
export type ActionType = 'deposit' | 'issue' | 'clear' | 'bounce' | 'cancel';

// ─── Cheque Action Modal (deposit / issue / clear / bounce / cancel) ──────────
// Shared by Cheques page and PaymentsTab so both surfaces can perform the same
// lifecycle transitions without duplicating the form.
export function ChequeActionModal({
  cheque,
  action,
  cashAccounts,
  onClose,
}: {
  cheque: Cheque;
  action: ActionType;
  cashAccounts: { id: string; name: string; bankName?: string }[];
  onClose: () => void;
}) {
  const currency = useBranchCurrency();
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState(cheque.accountId ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const actionFn = () => {
    if (action === 'deposit')
      return depositCheque(cheque.id, { accountId, depositDate: date, notes });
    if (action === 'issue') return issueCheque(cheque.id, { accountId, issueDate: date, notes });
    if (action === 'clear') return clearCheque(cheque.id, { notes, clearedDate: date });
    if (action === 'bounce') return bounceCheque(cheque.id, { notes });
    return cancelCheque(cheque.id, { notes });
  };

  const mut = useMutation({
    mutationFn: actionFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] });
      qc.invalidateQueries({ queryKey: ['cheque-summary'] });
      qc.invalidateQueries({ queryKey: ['cheque-notifications'] });
      toast.success(`Cheque ${action === 'clear' ? 'cleared' : action + 'ed'} successfully`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || `Failed to ${action} cheque`),
  });

  const needsAccount = action === 'deposit' || action === 'issue';
  const needsDate = action === 'deposit' || action === 'issue' || action === 'clear';
  const requiresReason = action === 'bounce' || action === 'cancel';

  const cfg: Record<ActionType, { label: string; color: string; desc: string }> = {
    deposit: {
      label: 'Deposit to Bank',
      color: 'bg-blue-600 hover:bg-blue-700',
      desc: 'Mark cheque as deposited. Cash at Bank updates once you mark it Cleared — depositing alone does not move the balance.',
    },
    issue: {
      label: 'Issue to Vendor',
      color: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Mark cheque as issued. Cash at Bank decreases only when you mark it Cleared.',
    },
    clear: {
      label: 'Mark Cleared',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      desc:
        cheque.type === 'ISSUED'
          ? 'Bank confirms payment cleared. Cash at Bank decreases now.'
          : 'Bank confirms cheque cleared. Cash at Bank increases now.',
    },
    bounce: {
      label: 'Mark Returned',
      color: 'bg-red-600 hover:bg-red-700',
      desc: 'Cheque dishonored by the bank before clearing — no cash effect to reverse.',
    },
    cancel: {
      label: cheque.type === 'RECEIVED' ? 'Decline Cheque' : 'Cancel Cheque',
      color: 'bg-gray-600 hover:bg-gray-700',
      desc: 'Cancel this pending cheque — only available before Deposit/Issue, so there is no cash effect to reverse.',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{cfg[action].label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (needsAccount && !accountId) return toast.error('Please select a bank account');
            if (requiresReason && !notes.trim())
              return toast.error('A reason is required for this action');
            mut.mutate();
          }}
          className="p-6 space-y-4"
        >
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-500">{cfg[action].desc}</p>
            <p className="font-medium text-gray-800">
              {cheque.partyName} — #{cheque.chequeNo} — {formatCurrency(cheque.amount, currency)}
            </p>
            {cheque.sourceLabel && (
              <p className="text-xs text-gray-400">Source: {cheque.sourceLabel}</p>
            )}
          </div>
          {needsAccount && (
            <div>
              <label className="text-xs font-medium text-gray-600">Bank Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account…</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.bankName ? ` (${a.bankName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needsDate && (
            <div>
              <label className="text-xs font-medium text-gray-600">
                {action === 'clear' ? 'Cleared / Cash Received Date' : 'Transaction Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600">
              {requiresReason ? 'Reason *' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              required={requiresReason}
              placeholder={requiresReason ? 'Explain why…' : 'Optional notes…'}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending || (requiresReason && !notes.trim())}
              className={`flex-1 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${cfg[action].color}`}
            >
              {mut.isPending ? 'Processing…' : cfg[action].label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
