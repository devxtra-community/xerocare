'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseService, Purchase, UpdatePurchaseDTO } from '@/services/purchaseService';
import { toast } from 'sonner';

interface EditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  onSuccess: () => void;
}

export default function EditPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  onSuccess,
}: EditPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UpdatePurchaseDTO>({});

  useEffect(() => {
    if (open && purchase) {
      setFormData({
        purchase_number: purchase.purchase_number,
        lot_number: purchase.lot_number,
        vendor_id: purchase.vendor_id,
        total_amount: purchase.total_amount,
        status: purchase.status,
        // Note: Keeping existing product/model IDs as is for now in this simplified form
        product_ids: purchase.product_ids,
        model_ids: purchase.model_ids,
      });
    }
  }, [open, purchase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await purchaseService.updatePurchase(purchase.id, formData);
      toast.success('Purchase updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_purchase_number">Purchase Number</Label>
              <Input
                id="edit_purchase_number"
                value={formData.purchase_number || ''}
                onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_lot_number">Lot Number</Label>
              <Input
                id="edit_lot_number"
                value={formData.lot_number || ''}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_vendor">Vendor ID</Label>
            <Input
              id="edit_vendor"
              value={formData.vendor_id || ''}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              placeholder="Enter Vendor ID"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_total_amount">Total Amount</Label>
              <Input
                id="edit_total_amount"
                type="number"
                value={formData.total_amount || 0}
                onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'PENDING' | 'COMPLETED' | 'CANCELLED') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
