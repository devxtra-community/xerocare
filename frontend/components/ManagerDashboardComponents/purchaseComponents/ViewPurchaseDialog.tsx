'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Purchase } from '@/services/purchaseService';
import { Badge } from '@/components/ui/badge';

interface ViewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
}

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
              <p className="text-sm font-medium text-muted-foreground">Purchase Number</p>
              <p className="font-semibold">{purchase.purchase_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lot Number</p>
              <p className="font-semibold">{purchase.lot_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vendor</p>
              <p className="font-semibold">{purchase.vendor_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge
                variant={
                  purchase.status === 'COMPLETED'
                    ? 'default'
                    : purchase.status === 'PENDING'
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
              <p className="font-medium">{new Date(purchase.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="font-bold text-lg text-primary">
                ₹{purchase.total_amount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Products</h4>
            <div className="bg-muted/50 p-3 rounded-md">
              <ul className="list-disc list-inside space-y-1">
                {purchase.product_names.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Models</h4>
            <div className="bg-muted/50 p-3 rounded-md">
              <ul className="list-disc list-inside space-y-1">
                {purchase.model_names.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
