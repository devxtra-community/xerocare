'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extendContract, OngoingContractSummary } from '@/lib/invoice';
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExtendContractModalProps {
  contract: OngoingContractSummary;
  onClose: () => void;
  onExtended: () => void;
}

/**
 * Fetches the contract's current end date (already on `contract`, passed in from the
 * Ongoing Contracts table — no separate lookup needed) and asks Finance how many more
 * months to extend it by. Pushing effectiveTo out is all that's required for the
 * contract to keep billing through the normal monthly usage cycle afterward — see
 * contractRenewalService.ts's extendContract for what else this triggers server-side
 * (reviving a completed/expired contract, re-allocating a released machine if possible).
 */
export function ExtendContractModal({ contract, onClose, onExtended }: ExtendContractModalProps) {
  const [months, setMonths] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const currentEnd = contract.effectiveTo ? new Date(contract.effectiveTo) : null;
  const monthsNum = Number(months);
  const isValid = Number.isInteger(monthsNum) && monthsNum >= 1 && monthsNum <= 60;
  const newEnd =
    currentEnd && isValid
      ? new Date(new Date(currentEnd).setMonth(currentEnd.getMonth() + monthsNum))
      : null;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('Enter a whole number of months between 1 and 60.');
      return;
    }
    setSubmitting(true);
    try {
      const { warning } = await extendContract(contract.id, monthsNum);
      toast.success(
        `Contract ${contract.invoiceNumber} extended by ${monthsNum} month${monthsNum === 1 ? '' : 's'}.`,
      );
      if (warning) toast.warning(warning, { duration: 10000 });
      onExtended();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to extend contract.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock size={18} className="text-primary" />
            Extend Contract — {contract.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Current End Date
              </p>
              <p className="text-sm font-black text-slate-800 mt-1">
                {currentEnd ? format(currentEnd, 'dd MMM yyyy') : '—'}
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                New End Date
              </p>
              <p className="text-sm font-black text-primary mt-1">
                {newEnd ? format(newEnd, 'dd MMM yyyy') : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extend-months" className="text-xs font-bold text-muted-foreground">
              Extend By (months)
            </Label>
            <Input
              id="extend-months"
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="h-10"
            />
            {!isValid && (
              <p className="text-[11px] text-red-500">Enter a whole number between 1 and 60.</p>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            The quotation&apos;s month count and displayed contract value update automatically from
            the new end date
            {contract.saleType === 'LEASE' ? ' (lease tenure is extended too)' : ''}. Finance can
            continue recording monthly usage against this contract right after extending.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Extend Contract
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
