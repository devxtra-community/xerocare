'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createExpenseEntry,
  fetchCashBankAccounts,
  fetchChartOfAccountsStructure,
  accountTypeForPaymentMode,
  insufficientBalanceError,
} from '@/lib/finance/accountsApi';
import { expenseCategoryOptions } from '@/lib/finance/expenseCategories';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getApiErrorMessage } from '@/lib/apiError';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'Card'];

/**
 * One expense being entered. Several are captured at once because a single receipt or
 * settlement run routinely covers more than one category — a utilities bill plus its
 * municipality fee, or a month's rent plus the maintenance charge on it. Forcing those
 * through one category to save reopening the form is what makes a P&L stop meaning
 * anything, so the form takes a list and posts each as its own entry.
 */
interface ExpenseLine {
  uid: string;
  category: string;
  subCategory: string;
  description: string;
  amount: string;
}

const blankLine = (): ExpenseLine => ({
  uid: Math.random().toString(36).slice(2),
  category: 'OTHER',
  subCategory: '',
  description: '',
  amount: '',
});

const n = (v: string) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export default function AddExpenseModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const currency = useBranchCurrency();
  const qc = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<ExpenseLine[]>([blankLine()]);
  const [payNow, setPayNow] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidFrom, setPaidFrom] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrepayment, setIsPrepayment] = useState(false);
  const [coveredFrom, setCoveredFrom] = useState('');
  const [coveredTo, setCoveredTo] = useState('');

  const { data: coaRows = [] } = useQuery({
    queryKey: ['coa-structure'],
    queryFn: () => fetchChartOfAccountsStructure(),
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const categories = useMemo(() => expenseCategoryOptions(coaRows), [coaRows]);

  const { data: accountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
    enabled: open,
  });
  const accounts = accountsRaw as {
    id: string;
    name: string;
    type: string;
    currentBalance: number;
    currency: string;
  }[];

  // Cash mode draws on a Cash account and everything else on a Bank account — the same
  // rule the server enforces, applied here so an impossible pairing is never offered.
  const matchingAccounts = useMemo(
    () => accounts.filter((a) => a.type === accountTypeForPaymentMode(paymentMode)),
    [accounts, paymentMode],
  );

  useEffect(() => {
    if (matchingAccounts.some((a) => a.id === paidFrom)) return;
    setPaidFrom(matchingAccounts[0]?.id ?? '');
  }, [matchingAccounts, paidFrom]);

  useEffect(() => {
    if (open) return;
    setDate(new Date().toISOString().slice(0, 10));
    setLines([blankLine()]);
    setPayNow(false);
    setPaymentMode('Cash');
    setPaidFrom('');
    setReferenceNo('');
    setNotes('');
    setIsPrepayment(false);
    setCoveredFrom('');
    setCoveredTo('');
  }, [open]);

  const patch = (uid: string, p: Partial<ExpenseLine>) =>
    setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...p } : l)));

  const total = useMemo(() => lines.reduce((s, l) => s + n(l.amount), 0), [lines]);

  const selectedAccount = accounts.find((a) => a.id === paidFrom);
  // Only a real outflow can overdraw an account. A cheque is not cash leaving today —
  // it moves when it clears — so it is exempt, matching the server.
  const balanceError =
    payNow && paymentMode !== 'Cheque' ? insufficientBalanceError(total, selectedAccount) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      // Posted one at a time rather than as a batch: each line is its own expense entry
      // against its own account, and the API has no multi-entry endpoint. Sequential so
      // the generated expenseNo counter cannot collide.
      const created = [];
      for (const l of lines) {
        const amount = n(l.amount);
        created.push(
          await createExpenseEntry({
            date,
            category: l.category,
            subCategory: l.subCategory.trim() || undefined,
            description: l.description.trim(),
            // netAmount is the operative figure — it is what the P&L charges and what
            // leaves the bank. amount mirrors it and vatAmount stays 0, matching every
            // other writer of this table: tax on expenses is not modelled anywhere and
            // is never reclaimed, so splitting one out here would imply a recovery that
            // never happens and quietly overstate the cost by it.
            amount,
            vatAmount: 0,
            netAmount: amount,
            currency,
            // Recorded by Accounts, who are the approver — so an unpaid one is APPROVED,
            // not PENDING. The P&L only counts APPROVED/PAID; leaving it PENDING would
            // book a real expense that never appeared in any report.
            status: payNow ? 'PAID' : 'APPROVED',
            ...(payNow
              ? {
                  paymentMode,
                  paidFrom: paymentMode !== 'Cheque' ? paidFrom : undefined,
                  paymentDate: date,
                  referenceNo: referenceNo.trim() || undefined,
                }
              : {}),
            notes: notes.trim() || undefined,
            isPrepayment,
            ...(isPrepayment && coveredFrom ? { coveredPeriodStart: coveredFrom } : {}),
            ...(isPrepayment && coveredTo ? { coveredPeriodEnd: coveredTo } : {}),
          }),
        );
      }
      return created;
    },
    onSuccess: (created) => {
      toast.success(
        created.length === 1
          ? `Expense recorded${payNow ? ' and paid' : ''}`
          : `${created.length} expenses recorded${payNow ? ' and paid' : ''}`,
      );
      qc.invalidateQueries({ queryKey: ['accounts-expense-entries'] });
      qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error('Could not record the expense', { description: getApiErrorMessage(e) }),
  });

  const submit = () => {
    if (!lines.length) return toast.error('Add at least one expense line');
    for (const l of lines) {
      if (!l.description.trim()) return toast.error('Every line needs a description');
      if (n(l.amount) <= 0) return toast.error('Every line needs an amount greater than 0');
    }
    if (payNow && paymentMode !== 'Cheque' && !paidFrom) {
      return toast.error('Select the account this is paid from');
    }
    if (balanceError) return toast.error(balanceError);
    if (isPrepayment && (!coveredFrom || !coveredTo)) {
      return toast.error('A prepayment needs the period it covers');
    }
    if (isPrepayment && coveredTo < coveredFrom) {
      return toast.error('The covered period ends before it starts');
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b bg-slate-900 px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Wallet size={18} className="text-emerald-400" />
            Add Expense
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Recorded directly by Accounts — no employee request or approval step.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Expense Date *
              </Label>
              <Input
                type="date"
                className="mt-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Reference / Bill No.
              </Label>
              <Input
                className="mt-1"
                placeholder="Supplier invoice or receipt number"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Expenses
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((ls) => [...ls, blankLine()])}
              >
                <Plus size={13} className="mr-1" /> Add another type
              </Button>
            </div>

            {lines.map((l, idx) => {
              const cat = categories.find((c) => c.key === l.category);
              return (
                <div key={l.uid} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Line {idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines((ls) => ls.filter((x) => x.uid !== l.uid))}
                        className="text-slate-400 transition hover:text-red-600"
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Expense Type *</Label>
                      <Select
                        value={l.category}
                        onValueChange={(v) => patch(l.uid, { category: v })}
                      >
                        <SelectTrigger className="mt-1 h-9 bg-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {c.label}
                              {c.custom ? ' (custom)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {cat && (
                        <p className="mt-1 text-[10px] text-slate-400">Posts to {cat.account}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Sub-category</Label>
                      <Input
                        className="mt-1 h-9"
                        placeholder="Optional — e.g. Electricity"
                        value={l.subCategory}
                        onChange={(e) => patch(l.uid, { subCategory: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500">Description *</Label>
                      <Input
                        className="mt-1 h-9"
                        placeholder="What was this for?"
                        value={l.description}
                        onChange={(e) => patch(l.uid, { description: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500">
                        Amount *
                        <span className="ml-1 font-normal text-slate-400">
                          (total for this line, including any tax)
                        </span>
                      </Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={l.amount}
                        onChange={(e) => patch(l.uid, { amount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals — the two figures differ on purpose and the split matters. */}
          <div className="flex justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm font-black text-slate-800">
            <span>
              Total
              <span className="ml-1 text-[11px] font-medium text-slate-400">
                ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
              </span>
            </span>
            <span>{formatCurrency(total, currency)}</span>
          </div>

          {/* Payment */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={payNow}
                onChange={(e) => setPayNow(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-bold text-slate-700">Pay now</span>
              <span className="text-[11px] text-slate-400">
                — deducts from the account and posts to the day book. Leave off to record it as
                unpaid.
              </span>
            </label>

            {payNow && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-bold text-slate-500">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="mt-1 h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {paymentMode !== 'Cheque' && (
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500">Paid From *</Label>
                    <Select value={paidFrom} onValueChange={setPaidFrom}>
                      <SelectTrigger className="mt-1 h-9 bg-white text-sm">
                        <SelectValue placeholder="No matching account" />
                      </SelectTrigger>
                      <SelectContent>
                        {matchingAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} — {a.currency}{' '}
                            {Number(a.currentBalance).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {balanceError && (
                  <p className="text-[11px] font-semibold text-red-600 sm:col-span-2">
                    {balanceError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Prepayment */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPrepayment}
                onChange={(e) => setIsPrepayment(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-bold text-slate-700">This is a prepayment</span>
              <span className="text-[11px] text-slate-400">
                — e.g. a year of rent or insurance paid upfront
              </span>
            </label>
            {isPrepayment && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500">Covers From *</Label>
                    <Input
                      type="date"
                      className="mt-1 h-9"
                      value={coveredFrom}
                      onChange={(e) => setCoveredFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500">Covers To *</Label>
                    <Input
                      type="date"
                      className="mt-1 h-9"
                      value={coveredTo}
                      onChange={(e) => setCoveredTo(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[10px] leading-snug text-slate-400">
                  Held as a Prepaid Expense asset (1005) until the period it covers has run, rather
                  than charged to this month in full.
                </p>
              </>
            )}
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Notes
            </Label>
            <Input
              className="mt-1"
              placeholder="Anything worth keeping with this expense"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
            {payNow ? 'Record & Pay' : 'Record Expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
