'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { autoReferencePreview } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordSalePayment, generateSecurityDepositBill } from '@/lib/saleWorkflow';
import { getApiErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  contractId: string;
  customerName: string;
  invoiceNumber: string;
  /** Prefilled from the contract's securityDepositAmount, editable — the actual amount
   *  collected can differ (e.g. a partial deposit) even when a fixed figure was quoted. */
  defaultAmount: number;
  onClose: () => void;
  /** Fires once the deposit has been submitted (and, if requested, its Bill generated) —
   *  callers should treat this as "refresh, this row's state changed", not "fully done":
   *  the payment itself still needs Accounts' approval like any other collection. */
  onSuccess: () => void;
}

/**
 * Shared "collect a security deposit that hasn't been taken yet" form — used from both
 * the Technician's Installation Requests table (when the Employee never collected one at
 * conversion) and Finance's Rent/Lease table (as the last-resort catch-all). Submits
 * through the exact same recordSalePayment(..., { isSecurityDeposit: true }) path the
 * Employee's own conversion-flow form already uses, so it lands in the same Accounts
 * approval queue and — for CHEQUE — the same Guarantee Cheques section, not a parallel
 * mechanism.
 */
export function CollectSecurityDepositModal({
  contractId,
  customerName,
  invoiceNumber,
  defaultAmount,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : '');
  const [mode, setMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [generateBillAfter, setGenerateBillAfter] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid deposit amount');
      return;
    }
    if (mode === 'CHEQUE' && !chequeNumber.trim()) {
      toast.error('Cheque number is required');
      return;
    }
    setSubmitting(true);
    try {
      await recordSalePayment(contractId, {
        amount: Number(amount),
        paymentMode: mode,
        paymentDate: date,
        // Auto-generated server-side for non-Cheque modes (see billingHelpers.ts's
        // generatePaymentReference) — nothing to send from here.
        referenceNumber: undefined,
        remarks: `Security Deposit collected — Invoice ${invoiceNumber}`,
        isSecurityDeposit: true,
        chequeNumber: mode === 'CHEQUE' ? chequeNumber.trim() : undefined,
        chequeBankName: mode === 'CHEQUE' ? chequeBankName || undefined : undefined,
        chequeDate: mode === 'CHEQUE' ? chequeDate : undefined,
      });
      toast.success('Security Deposit submitted for Accounts approval');

      if (generateBillAfter) {
        try {
          await generateSecurityDepositBill(contractId);
          toast.success('Security Deposit Bill generated');
        } catch (err) {
          // Non-fatal — the deposit itself was recorded fine; the Bill can be generated
          // later from wherever this action is available (Employee, Finance).
          toast.error('Deposit recorded, but generating its Bill failed', {
            description: getApiErrorMessage(err),
          });
        }
      }
      onSuccess();
    } catch (err) {
      toast.error('Failed to submit Security Deposit', { description: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            Collect Security Deposit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500">
            {customerName} — {invoiceNumber}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Payment Mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'CHEQUE' ? (
            <div className="grid grid-cols-2 gap-3 p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
              <div className="space-y-1">
                <Label>Cheque Number *</Label>
                <Input
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label>Bank Name</Label>
                <Input
                  value={chequeBankName}
                  onChange={(e) => setChequeBankName(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Cheque Date (earliest deposit/clear date)</Label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <p className="text-[10px] text-teal-700 col-span-2">
                This cheque is a guarantee, not a payment — it goes to the Guarantee Cheques
                section, not the regular cheque register.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Reference</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                Auto-generated on save — {autoReferencePreview(mode)}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <input
              type="checkbox"
              checked={generateBillAfter}
              onChange={(e) => setGenerateBillAfter(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Generate the Security Deposit Bill immediately after submitting
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
