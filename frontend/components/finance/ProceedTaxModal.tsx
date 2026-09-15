'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchCashBankAccounts,
  accountTypeForPaymentMode,
  insufficientBalanceError,
} from '@/lib/finance/accountsApi';
import { createTaxPaymentRequest } from '@/lib/employeeExpenses';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque'];

export interface ProceedTaxTarget {
  taxRecordId: string;
  taxType: 'INPUT_VAT' | 'REVERSE_CHARGE_VAT';
  taxName: string;
  amount: number;
  currency: string;
  vendorName?: string;
  reference?: string;
  taxPercent?: number | null;
  periodFrom?: string;
  periodTo?: string;
}

/**
 * Raises a payment-approval request against one tax record.
 *
 * The amount is read-only on purpose: it comes from the tax record and the server
 * re-checks it on submit, so this cannot become a way to settle a different figure than
 * the one the tax actually is. Nothing here settles anything — the tax stays outstanding
 * and no cash moves until Finance approves the request this creates.
 */
export default function ProceedTaxModal({
  target,
  onClose,
}: {
  target: ProceedTaxTarget | null;
  onClose: (didCreate: boolean) => void;
}) {
  const qc = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paidFrom, setPaidFrom] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const { data: accountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
    enabled: !!target,
  });
  const accounts = accountsRaw as {
    id: string;
    name: string;
    type: string;
    currentBalance: number;
    currency: string;
  }[];

  const matching = useMemo(
    () => accounts.filter((a) => a.type === accountTypeForPaymentMode(paymentMethod)),
    [accounts, paymentMethod],
  );

  useEffect(() => {
    if (matching.some((a) => a.id === paidFrom)) return;
    setPaidFrom(matching[0]?.id ?? '');
  }, [matching, paidFrom]);

  useEffect(() => {
    if (target) return;
    setPaymentMethod('Bank Transfer');
    setPaidFrom('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setDescription('');
  }, [target]);

  const selectedAccount = accounts.find((a) => a.id === paidFrom);
  const balanceError =
    target && paymentMethod !== 'Cheque'
      ? insufficientBalanceError(target.amount, selectedAccount)
      : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('No tax selected');
      return createTaxPaymentRequest({
        taxRecordId: target.taxRecordId,
        taxType: target.taxType,
        amount: target.amount,
        paymentMethod,
        paidFromAccountId: paymentMethod !== 'Cheque' ? paidFrom : undefined,
        taxPeriodFrom: target.periodFrom,
        taxPeriodTo: target.periodTo,
        vendorName: target.vendorName,
        purchaseRef: target.reference,
        description: description.trim() || undefined,
        paymentDate,
        currency: target.currency,
      });
    },
    onSuccess: (res) => {
      // The server is idempotent — a second Proceed returns the standing request rather
      // than raising another, and says so instead of pretending it created one.
      if (res.alreadyExists) {
        toast.info(res.message ?? 'A payment request already exists for this tax.');
      } else {
        toast.success('Tax payment request submitted for Finance approval', {
          description: 'The tax stays outstanding until the payment is approved.',
        });
      }
      qc.invalidateQueries({ queryKey: ['tax-input-local'] });
      qc.invalidateQueries({ queryKey: ['admin-tax-input-local'] });
      qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
      onClose(true);
    },
    onError: (e) =>
      toast.error('Could not proceed this tax', { description: getApiErrorMessage(e) }),
  });

  const submit = () => {
    if (!target) return;
    if (paymentMethod !== 'Cheque' && !paidFrom) {
      return toast.error('Select the account this will be paid from');
    }
    if (balanceError) return toast.error(balanceError);
    mutation.mutate();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt size={17} className="text-indigo-600" />
            Proceed Tax Payment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creates a payment request for Finance to approve. Nothing is paid and the tax stays
            outstanding until that approval.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            {/* Read-only tax facts — the request is raised against this record, and the
                server re-reads the amount rather than trusting the form. */}
            <div className="space-y-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tax Type</span>
                <span className="font-bold text-slate-800">
                  {target.taxName}
                  {target.taxPercent != null ? ` (${Number(target.taxPercent)}%)` : ''}
                </span>
              </div>
              {target.vendorName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor</span>
                  <span className="font-semibold text-slate-700">{target.vendorName}</span>
                </div>
              )}
              {target.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {target.reference}
                  </span>
                </div>
              )}
              {(target.periodFrom || target.periodTo) && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Period</span>
                  <span className="font-semibold text-slate-700">
                    {target.periodFrom ?? '—'} → {target.periodTo ?? '—'}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-indigo-200 pt-1.5">
                <span className="font-bold text-slate-600">Tax Amount</span>
                <span className="font-black text-slate-900">
                  {formatCurrency(target.amount, target.currency)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Payment Method
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
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
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  className="mt-1 h-9"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              {paymentMethod !== 'Cheque' && (
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pay From *
                  </Label>
                  <Select value={paidFrom || undefined} onValueChange={setPaidFrom}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="No matching account" />
                    </SelectTrigger>
                    <SelectContent>
                      {matching.map((a) => (
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
              <div className="sm:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Note
                </Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Optional — anything Finance should know"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {balanceError && (
              <p className="text-[11px] font-semibold text-red-600">{balanceError}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
