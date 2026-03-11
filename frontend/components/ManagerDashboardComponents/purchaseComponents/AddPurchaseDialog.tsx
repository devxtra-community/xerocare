'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { purchaseService, CreatePurchaseDTO } from '@/services/purchaseService';
import { toast } from 'sonner';

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Dialog component for recording a new purchase.
 * Captures purchase number, lot reference, vendor, total amount, and status.
 */
export default function AddPurchaseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseDTO>({
    lotId: '',
    documentationFee: 0,
    labourCost: 0,
    handlingFee: 0,
    transportationCost: 0,
    shippingCost: 0,
    groundfieldCost: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await purchaseService.createPurchase(formData);
      toast.success('Purchase created successfully');
      setFormData({
        lotId: '',
        documentationFee: 0,
        labourCost: 0,
        handlingFee: 0,
        transportationCost: 0,
        shippingCost: 0,
        groundfieldCost: 0,
      });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lotId">Lot ID</Label>
              <Input
                id="lotId"
                value={formData.lotId}
                onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                placeholder="Enter Lot ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentationFee">Documentation Fee</Label>
              <Input
                id="documentationFee"
                type="number"
                value={formData.documentationFee}
                onChange={(e) =>
                  setFormData({ ...formData, documentationFee: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labourCost">Labour Cost</Label>
              <Input
                id="labourCost"
                type="number"
                value={formData.labourCost}
                onChange={(e) => setFormData({ ...formData, labourCost: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handlingFee">Handling Fee</Label>
              <Input
                id="handlingFee"
                type="number"
                value={formData.handlingFee}
                onChange={(e) => setFormData({ ...formData, handlingFee: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transportationCost">Transportation Cost</Label>
              <Input
                id="transportationCost"
                type="number"
                value={formData.transportationCost}
                onChange={(e) =>
                  setFormData({ ...formData, transportationCost: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingCost">Shipping Cost</Label>
              <Input
                id="shippingCost"
                type="number"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groundfieldCost">Groundfield Cost</Label>
              <Input
                id="groundfieldCost"
                type="number"
                value={formData.groundfieldCost}
                onChange={(e) =>
                  setFormData({ ...formData, groundfieldCost: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          {/* Note: Product and Model selection are simplified for this example. 
               In a real app, you'd likely use a multi-select component fetching from products/models APIs.
           */}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
