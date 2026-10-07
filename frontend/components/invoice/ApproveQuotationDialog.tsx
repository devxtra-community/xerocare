import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeApproveQuotation, Invoice } from '@/lib/invoice';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
              className={`p-2 rounded-full ${isExtension ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}
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
          <div className="grid gap-2 border rounded-lg p-4 bg-warning/10 my-2">
            <Label
              htmlFor="extensionDate"
              className="text-xs font-bold text-warning uppercase tracking-wider"
            >
              New Validity Date
            </Label>
            <Input
              id="extensionDate"
              type="date"
              value={extensionDate}
              onChange={(e) => setExtensionDate(e.target.value)}
              className="border-warning/30 focus:border-warning/30"
            />
            <p className="text-[10px] text-warning font-medium">
              The employee can convert this quotation until this date.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleApprove}
            loading={loading}
            loadingText="Approving..."
            disabled={loading}
            className={cn(
              buttonVariants(),
              isExtension
                ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
                : 'bg-success hover:bg-success/90 text-success-foreground',
            )}
          >
            {isExtension ? 'Approve Extension' : 'Approve Quotation'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
