'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { purchaseService, Purchase, UpdatePurchaseDTO } from '@/services/purchaseService';
import { toast } from 'sonner';

interface EditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  onSuccess: () => void;
}

/**
 * Dialog component for editing an existing purchase record.
 * Pre-fills the form with current purchase data and allows updates to details and status.
 */
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
        documentationFee: purchase.documentationFee,
        labourCost: purchase.labourCost,
        handlingFee: purchase.handlingFee,
        transportationCost: purchase.transportationCost,
        shippingCost: purchase.shippingCost,
        groundfieldCost: purchase.groundfieldCost,
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
              <Label htmlFor="edit_documentationFee">Documentation Fee</Label>
              <Input
                id="edit_documentationFee"
                type="number"
                value={formData.documentationFee || 0}
                onChange={(e) =>
                  setFormData({ ...formData, documentationFee: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_labourCost">Labour Cost</Label>
              <Input
                id="edit_labourCost"
                type="number"
                value={formData.labourCost || 0}
                onChange={(e) => setFormData({ ...formData, labourCost: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_handlingFee">Handling Fee</Label>
              <Input
                id="edit_handlingFee"
                type="number"
                value={formData.handlingFee || 0}
                onChange={(e) => setFormData({ ...formData, handlingFee: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_transportationCost">Transportation Cost</Label>
              <Input
                id="edit_transportationCost"
                type="number"
                value={formData.transportationCost || 0}
                onChange={(e) =>
                  setFormData({ ...formData, transportationCost: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_shippingCost">Shipping Cost</Label>
              <Input
                id="edit_shippingCost"
                type="number"
                value={formData.shippingCost || 0}
                onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_groundfieldCost">Groundfield Cost</Label>
              <Input
                id="edit_groundfieldCost"
                type="number"
                value={formData.groundfieldCost || 0}
                onChange={(e) =>
                  setFormData({ ...formData, groundfieldCost: Number(e.target.value) })
                }
                required
              />
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
