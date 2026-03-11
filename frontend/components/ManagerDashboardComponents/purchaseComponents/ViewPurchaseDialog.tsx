'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Purchase } from '@/services/purchaseService';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

interface ViewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
}

/**
 * Dialog component for viewing detailed purchase information.
 * Read-only view showing all purchase attributes including associated products and models.
 */
export default function ViewPurchaseDialog({
  open,
  onOpenChange,
  purchase,
}: ViewPurchaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Purchase Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="font-semibold">{purchase.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lot ID</p>
              <p className="font-semibold">{purchase.lotId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vendor ID</p>
              <p className="font-semibold">{purchase.vendorId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge
                variant={
                  purchase.status === 'PAID'
                    ? 'default'
                    : purchase.status === 'PARTIAL'
                      ? 'secondary'
                      : 'destructive'
                }
                className="mt-1"
              >
                {purchase.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="font-medium">{new Date(purchase.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="font-bold text-lg text-primary">
                {formatCurrency(purchase.totalAmount)}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Costs Breakdown</h4>
            <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
              <p>Documentation Fee: {formatCurrency(purchase.documentationFee)}</p>
              <p>Labour Cost: {formatCurrency(purchase.labourCost)}</p>
              <p>Handling Fee: {formatCurrency(purchase.handlingFee)}</p>
              <p>Transportation Cost: {formatCurrency(purchase.transportationCost)}</p>
              <p>Shipping Cost: {formatCurrency(purchase.shippingCost)}</p>
              <p>Groundfield Cost: {formatCurrency(purchase.groundfieldCost)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
