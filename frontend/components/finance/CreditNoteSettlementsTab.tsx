'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Check, X, CreditCard } from 'lucide-react';
import {
  fetchCreditNoteSettlements,
  approveCreditNoteSettlement,
  rejectCreditNoteSettlement,
  settleCreditNoteSettlement,
  fetchCashBankAccounts,
  filterAccountsByPaymentMode,
  insufficientBalanceError,
  type CreditNoteSettlement,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER_REFUND: 'Customer Refund',
  CREDIT_EXCHANGE_RECEIPT: 'Exchange Collection',
  CREDIT_EXCHANGE_REFUND: 'Exchange Refund',
};

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE'];

/**
 * The status a person actually needs to read off this row.
 *
 * Approval and settlement are two different things and the UI must never let one look
 * like the other: an approved refund is authorised, not paid, and showing it as "done"
 * would have someone believe the customer has their money back.
 */
function statusChip(row: CreditNoteSettlement) {
  if (row.approvalStatus === 'REJECTED') {
    // Rejection refuses the payment, not the debt — the balance is still owed and still
    // shows in Receivables/Payables. Saying just "Rejected" would read as "closed".
    return {
      label: row.outstanding > 0 ? 'Rejected — still outstanding' : 'Rejected',
      cls: 'bg-red-100 text-red-700 border-red-200',
    };
  }
  if (row.approvalStatus === 'PENDING') {
    return {
      label: 'Pending Accounts Approval',
      cls: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  if (row.settlementStatus === 'SETTLED') {
    return { label: 'Paid / Settled', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  if (row.settlementStatus === 'PARTIAL') {
    return { label: 'Partly Settled', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  }
  return {
    label: 'Approved — Payment Pending',
    cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
}

function DirectionChip({ row }: { row: CreditNoteSettlement }) {
  const incoming = row.paymentDirection === 'CUSTOMER_TO_COMPANY';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
        incoming
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-orange-200 bg-orange-50 text-orange-700'
      }`}
    >
      {incoming ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
      {incoming ? 'Customer pays us' : 'We pay customer'}
    </span>
  );
}

function SettleModal({
  row,
  onClose,
  onDone,
}: {
  row: CreditNoteSettlement;
  onClose: () => void;
  onDone: () => void;
}) {
  const currency = useBranchCurrency();
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [accountId, setAccountId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });
  const eligible = useMemo(
    () => filterAccountsByPaymentMode(accounts, paymentMode),
    [accounts, paymentMode],
  );

  const mut = useMutation({
    mutationFn: () =>
      // The amount is fixed to the outstanding balance and is re-validated server-side —
      // it is deliberately not an editable field, so nobody can settle for more or less
      // than Accounts approved.
      settleCreditNoteSettlement(row, {
        amount: row.outstanding,
        paymentMode,
        accountId: accountId || undefined,
        referenceNo: referenceNo || undefined,
        paymentDate,
      }),
    onSuccess: () => {
      toast.success(
        row.paymentDirection === 'CUSTOMER_TO_COMPANY' ? 'Payment collected' : 'Refund paid',
      );
      onDone();
    },
    onError: (e) =>
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to record settlement',
      ),
  });

  const incoming = row.paymentDirection === 'CUSTOMER_TO_COMPANY';
  const selectedAccount = eligible.find((a) => a.id === accountId);
  // Only an outgoing refund can overdraw an account; a collection adds to it.
  const balanceWarning = incoming
    ? null
    : insufficientBalanceError(row.outstanding, selectedAccount);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-slate-800">
            {incoming ? 'Collect from Customer' : 'Pay Customer Refund'}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3 px-6 py-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{row.referenceNo}</span>
              <span className="font-mono text-xs text-muted-foreground">{row.creditNoteNo}</span>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net</span>
                <span>{formatCurrency(row.netAmount, row.currency || currency)}</span>
              </div>
              {row.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>− {formatCurrency(row.discountAmount, row.currency || currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>{formatCurrency(row.taxAmount, row.currency || currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold">
                <span>Amount to settle</span>
                <span>{formatCurrency(row.outstanding, row.currency || currency)}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
            <Select
              value={paymentMode}
              onValueChange={(v) => {
                setPaymentMode(v);
                setAccountId('');
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {paymentMode !== 'CHEQUE' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {incoming ? 'Deposit To' : 'Pay From'}
              </label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {formatCurrency(a.currentBalance, a.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reference</label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        {balanceWarning && (
          <p className="px-6 pb-1 text-xs font-medium text-red-600">{balanceWarning}</p>
        )}
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !!balanceWarning}
            className="flex-1"
          >
            {mut.isPending ? 'Recording…' : incoming ? 'Record Collection' : 'Pay Refund'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CreditNoteSettlementsTab({ branchIds }: { branchIds?: string }) {
  const currency = useBranchCurrency();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [settling, setSettling] = useState<CreditNoteSettlement | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['credit-note-settlements', branchIds],
    queryFn: () => fetchCreditNoteSettlements(branchIds ? { branchIds } : undefined),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['credit-note-settlements'] });
    // The same rows feed Receivables, Payables and the Balance Sheet, so those have to
    // refetch too or the page would show a settled row next to a stale total.
    qc.invalidateQueries({ queryKey: ['manual-receivables'] });
    qc.invalidateQueries({ queryKey: ['manual-payables'] });
    qc.invalidateQueries({ queryKey: ['admin-payables'] });
    qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => approveCreditNoteSettlement(id),
    onSuccess: () => {
      toast.success('Approved — the payment can now be recorded');
      invalidate();
    },
    onError: () => toast.error('Failed to approve'),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectCreditNoteSettlement(id, reason),
    onSuccess: () => {
      toast.success('Rejected');
      invalidate();
    },
    onError: () => toast.error('Failed to reject'),
  });

  const filtered = useMemo(
    () => rows.filter((r) => statusFilter === 'ALL' || r.approvalStatus === statusFilter),
    [rows, statusFilter],
  );
  const pendingCount = rows.filter((r) => r.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Credit Note Settlements</h3>
          <p className="text-xs text-muted-foreground">
            Refunds and exchange differences awaiting Accounts approval. No money moves until a
            request is approved and then settled.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
              {pendingCount} awaiting approval
            </span>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    No credit note settlements
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const chip = statusChip(r);
                  const canSettle =
                    r.approvalStatus === 'APPROVED' && r.settlementStatus !== 'SETTLED';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4">
                        <div className="font-mono text-xs text-slate-700">{r.referenceNo}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.creditNoteNo}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.customerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </TableCell>
                      <TableCell>
                        <DirectionChip row={r} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.netAmount, r.currency || currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-emerald-700">
                        {r.discountAmount > 0
                          ? `− ${formatCurrency(r.discountAmount, r.currency || currency)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.taxAmount, r.currency || currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-slate-800">
                        {formatCurrency(r.amount, r.currency || currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                        {r.rejectionReason && (
                          <div className="mt-1 max-w-48 text-[10px] text-red-600">
                            {r.rejectionReason}
                          </div>
                        )}
                        {r.settlementReference && (
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {r.settlementReference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center gap-1">
                          {r.approvalStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => approveMut.mutate(r.id)}
                                disabled={approveMut.isPending}
                                className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                title="Approve"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt(
                                    'Reason for rejecting this request?',
                                  );
                                  if (reason?.trim())
                                    rejectMut.mutate({ id: r.id, reason: reason.trim() });
                                }}
                                disabled={rejectMut.isPending}
                                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {canSettle && (
                            <button
                              onClick={() => setSettling(r)}
                              className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50"
                              title={
                                r.paymentDirection === 'CUSTOMER_TO_COMPANY'
                                  ? 'Record collection'
                                  : 'Pay refund'
                              }
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {settling && (
        <SettleModal
          row={settling}
          onClose={() => setSettling(null)}
          onDone={() => {
            setSettling(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}
