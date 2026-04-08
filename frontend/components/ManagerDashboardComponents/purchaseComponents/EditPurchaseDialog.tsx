'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pencil,
  FileCheck,
  Users,
  Package,
  Truck,
  Globe,
  Wrench,
  Loader2,
  Calculator,
} from 'lucide-react';
import { purchaseService, Purchase, UpdatePurchaseDTO } from '@/services/purchaseService';
import { toast } from 'sonner';

interface EditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  onSuccess: () => void;
}

/**
 * Dialog component for editing an existing lot amount record.
 * Pre-fills the form with current lot amount data and allows updates to details and status.
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
      toast.success('Lot amount updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to update lot amount';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Pencil className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-white">
              Edit Lot Amount Costs
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm">
              Update the financial breakdown for Record ID: {purchase.id.slice(0, 8)}
            </DialogDescription>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 bg-white overflow-y-auto max-h-[85vh]"
        >
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
              <Calculator className="h-4 w-4 text-primary" />
              Adjust Cost Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Documentation Fee */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_documentationFee"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Documentation Fee
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_documentationFee"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.documentationFee || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, documentationFee: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {/* Labour Cost */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_labourCost"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <Users className="h-3.5 w-3.5" />
                  Labour Cost
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_labourCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.labourCost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, labourCost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {/* Handling Fee */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_handlingFee"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <Package className="h-3.5 w-3.5" />
                  Handling Fee
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_handlingFee"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.handlingFee || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, handlingFee: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {/* Transportation Cost */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_transportationCost"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Transportation Cost
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_transportationCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.transportationCost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, transportationCost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {/* Shipping Cost */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_shippingCost"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Shipping Cost
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_shippingCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.shippingCost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, shippingCost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {/* Groundfield Cost */}
              <div className="space-y-2">
                <Label
                  htmlFor="edit_groundfieldCost"
                  className="text-xs font-semibold text-slate-600 flex items-center gap-2"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Groundfield Cost
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    QAR
                  </span>
                  <Input
                    id="edit_groundfieldCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.groundfieldCost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, groundfieldCost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 !mt-10 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[150px] h-11 bg-primary px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
