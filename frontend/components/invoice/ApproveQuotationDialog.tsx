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
  quotation: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Finance approval dialog — only approves or rejects the quotation.
 * Security deposit & product allocation happen later when the
 * customer proceeds and the employee converts the quotation to an invoice.
 */
export function ApproveQuotationDialog({
  invoiceId,
  quotation,
  onClose,
  onSuccess,
}: ApproveQuotationDialogProps) {
  const [loading, setLoading] = useState(false);

  // Only relevant for validity-extension requests
  const isExtension = quotation.status === 'VALIDITY_EXTENSION_REQUESTED';
  const defaultExtensionDate = new Date();
  defaultExtensionDate.setDate(defaultExtensionDate.getDate() + 30);
  const [extensionDate, setExtensionDate] = useState(
    defaultExtensionDate.toISOString().split('T')[0],
  );

  const handleApprove = async () => {
    try {
      setLoading(true);
      await financeApproveQuotation(invoiceId, {
        effectiveTo: isExtension ? extensionDate : undefined,
      });
      toast.success(
        isExtension ? 'Validity extended successfully.' : 'Quotation approved successfully.',
      );
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
      <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
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
              ? 'Extend the validity of this expired quotation so the employee can convert it.'
              : `Approve ${quotation.invoiceNumber}. After approval, finance or the employee can send it to the customer. The security deposit and product allocation happen when the customer confirms and the employee converts the quotation to an active invoice.`}
          </DialogDescription>
        </DialogHeader>

        {/* Show date picker only for validity extension */}
        {isExtension && (
          <div className="grid gap-2 border rounded-lg p-4 bg-amber-50/30 my-2">
            <Label
              htmlFor="extensionDate"
              className="text-xs font-bold text-amber-700 uppercase tracking-wider"
            >
              New Validity Date
            </Label>
            <Input
              id="extensionDate"
              type="date"
              value={extensionDate}
              onChange={(e) => setExtensionDate(e.target.value)}
              className="border-amber-200 focus:border-amber-400"
            />
            <p className="text-[10px] text-amber-600 font-medium">
              The employee can convert this quotation until this date.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
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
            {isExtension ? 'Approve Extension' : 'Approve Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
