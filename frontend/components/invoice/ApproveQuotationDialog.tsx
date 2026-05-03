import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeApproveQuotation, Invoice } from '@/lib/invoice';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

interface ApproveQuotationDialogProps {
  invoiceId: string;
  quotation: Invoice; // Add the whole quotation object
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Dialog for approving a quotation and converting it into a Proforma Contract.
 * Allows collecting an optional security deposit and specifying payment mode (Cash/Cheque).
 */
export function ApproveQuotationDialog({
  invoiceId,
  quotation,
  onClose,
  onSuccess,
}: ApproveQuotationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>(''); // string to handle empty state
  const [mode, setMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [reference, setReference] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);

  // Extension state
  const isExtension = quotation.status === 'VALIDITY_EXTENSION_REQUESTED';
  const defaultExtensionDate = new Date();
  defaultExtensionDate.setDate(defaultExtensionDate.getDate() + 30); // Default +30 days
  const [extensionDate, setExtensionDate] = useState(
    defaultExtensionDate.toISOString().split('T')[0],
  );

  const handleApprove = async () => {
    try {
      setLoading(true);
      const depositAmount = parseFloat(amount) || 0;
      const payload = {
        ...(depositAmount > 0
          ? {
              amount: depositAmount,
              mode,
              reference: mode === 'CHEQUE' ? reference : undefined,
              receivedDate,
            }
          : {}),
        effectiveTo: isExtension ? extensionDate : undefined,
      };

      await financeApproveQuotation(invoiceId, payload);
      toast.success('Quotation approved successfully.');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Failed to approve quotation:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve quotation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-full ${isExtension ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
            >
              <ShieldCheck size={20} />
            </div>
            <DialogTitle>
              {isExtension ? 'Approve Validity Extension' : 'Approve Quotation'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isExtension
              ? 'Extend the validity of this expired quotation to allow conversion.'
              : 'Confirm approval to convert this quotation into a Proforma Contract.'}
            {!isExtension && (
              <>
                <br />
                You can optionally record a security deposit below.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2 border rounded-lg p-4 bg-muted/50/50">
            <h4 className="font-medium text-sm text-foreground mb-2">
              Security Deposit (Optional)
            </h4>

            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-xs">
                Amount
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-6"
                />
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                  QAR
                </span>
              </div>
            </div>

            {parseFloat(amount) > 0 && (
              <>
                <div className="grid gap-2">
                  <Label className="text-xs">Payment Mode</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value="CASH"
                        checked={mode === 'CASH'}
                        onChange={(e) => setMode(e.target.value as 'CASH' | 'CHEQUE')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs font-normal">Cash</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value="CHEQUE"
                        checked={mode === 'CHEQUE'}
                        onChange={(e) => setMode(e.target.value as 'CASH' | 'CHEQUE')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs font-normal">Cheque</span>
                    </label>
                  </div>
                </div>

                {mode === 'CHEQUE' && (
                  <div className="grid gap-2">
                    <Label htmlFor="reference" className="text-xs">
                      Reference No. (Cheque / Receipt)
                    </Label>
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. CHQ-123456"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-xs">
                    Received Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {isExtension && (
            <div className="grid gap-2 border rounded-lg p-4 bg-amber-50/30">
              <Label
                htmlFor="extensionDate"
                className="text-xs font-bold text-amber-700 uppercase tracking-wider"
              >
                New Validity Date (Extension)
              </Label>
              <Input
                id="extensionDate"
                type="date"
                value={extensionDate}
                onChange={(e) => setExtensionDate(e.target.value)}
                className="border-amber-200 focus:border-amber-400"
              />
              <p className="text-[10px] text-amber-600 font-medium">
                The employee will be able to convert this quotation until this date.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className={
              isExtension
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isExtension ? 'Approve Extension' : 'Approve & Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
