'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  Truck,
  FileCheck,
  Users,
  Globe,
  Package,
  Wrench,
  Boxes,
  Loader2,
  Info,
  Plus,
} from 'lucide-react';
import { purchaseService, CreatePurchaseDTO, Purchase } from '@/services/purchaseService';
import { lotService, Lot } from '@/lib/lot';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/format';

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMode?: boolean;
  purchaseData?: Purchase | null;
}

/**
 * Dialog component for recording or updating a purchase.
 * Captures cost breakdown fields.
 */
export default function AddPurchaseDialog({
  open,
  onOpenChange,
  onSuccess,
  editMode = false,
  purchaseData = null,
}: AddPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  const [formData, setFormData] = useState<CreatePurchaseDTO>({
    lotId: '',
    documentationFee: 0,
    labourCost: 0,
    handlingFee: 0,
    transportationCost: 0,
    shippingCost: 0,
    groundfieldCost: 0,
  });

  useEffect(() => {
    if (open) {
      fetchLots();
      if (editMode && purchaseData) {
        setFormData({
          lotId: purchaseData.lotId,
          documentationFee: purchaseData.documentationFee,
          labourCost: purchaseData.labourCost,
          handlingFee: purchaseData.handlingFee,
          transportationCost: purchaseData.transportationCost,
          shippingCost: purchaseData.shippingCost,
          groundfieldCost: purchaseData.groundfieldCost,
        });
      } else {
        setFormData({
          lotId: '',
          documentationFee: 0,
          labourCost: 0,
          handlingFee: 0,
          transportationCost: 0,
          shippingCost: 0,
          groundfieldCost: 0,
        });
      }
    }
  }, [open, editMode, purchaseData]);

  const fetchLots = async () => {
    try {
      setLoadingLots(true);
      const res = await lotService.getAllLots({ limit: 100 });
      setLots(res.data || []);
    } catch (error) {
      console.error('Failed to fetch lots:', error);
      toast.error('Failed to load lots');
    } finally {
      setLoadingLots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lotId) {
      return toast.error('Please select a Lot');
    }

    setLoading(true);
    try {
      if (editMode && purchaseData) {
        await purchaseService.updatePurchase(purchaseData.id, formData);
        toast.success('Lot amount updated successfully');
      } else {
        await purchaseService.createPurchase(formData);
        toast.success('Lot amount record created successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg =
        err.response?.data?.message ||
        (editMode ? 'Failed to update lot amount' : 'Failed to create lot amount record');
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
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-white">
              {editMode ? 'Edit Costs' : 'New Lot Amount Record'}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm">
              Manage financial tracking for procurement lots.
            </DialogDescription>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 bg-white overflow-y-auto max-h-[85vh]"
        >
          {/* Lot Selection Section */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 italic transition-all hover:border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Select Procurement Lot *
              </Label>
              {editMode && (
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                  ID: {formData.lotId.slice(0, 8)}
                </span>
              )}
            </div>

            <SearchableSelect
              options={lots.map((lot) => ({
                value: lot.id,
                label: `Lot: ${lot.lotNumber} - ${lot.vendor?.name || 'Unknown Vendor'} (${new Date(lot.purchaseDate).toLocaleDateString()})`,
              }))}
              value={formData.lotId}
              onValueChange={(val) => setFormData({ ...formData, lotId: val })}
              placeholder={
                loadingLots ? 'Loading lots...' : 'Select a Lot to attach this record to...'
              }
              emptyText="No lots available for selection."
              disabled={editMode || loadingLots}
            />
            {!editMode && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Only lots that don&apos;t already have a lot amount record will be processed
                successfully.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
              <Calculator className="h-4 w-4 text-primary" />
              Additional Costs Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Documentation Fee */}
              <div className="space-y-2">
                <Label
                  htmlFor="documentationFee"
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
                    id="documentationFee"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.documentationFee}
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
                  htmlFor="labourCost"
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
                    id="labourCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.labourCost}
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
                  htmlFor="handlingFee"
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
                    id="handlingFee"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.handlingFee}
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
                  htmlFor="transportationCost"
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
                    id="transportationCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.transportationCost}
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
                  htmlFor="shippingCost"
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
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.shippingCost}
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
                  htmlFor="groundfieldCost"
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
                    id="groundfieldCost"
                    type="number"
                    step="0.01"
                    className="pl-12 focus-visible:ring-primary h-11"
                    value={formData.groundfieldCost}
                    onChange={(e) =>
                      setFormData({ ...formData, groundfieldCost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row justify-between items-center gap-4 italic shadow-xl shadow-slate-200">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Financial Summary Preview
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Base (Lot)</p>
                  <p className="text-sm font-bold">
                    {(() => {
                      const lot = lots.find((l) => l.id === formData.lotId);
                      const base =
                        lot?.items?.reduce((sum, item) => sum + Number(item.totalPrice), 0) || 0;
                      return formatCurrency(base);
                    })()}
                  </p>
                </div>
                <Plus className="h-3 w-3 text-slate-600" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Extras</p>
                  <p className="text-sm font-bold text-blue-400">
                    {formatCurrency(
                      formData.documentationFee +
                        formData.labourCost +
                        formData.handlingFee +
                        formData.transportationCost +
                        formData.shippingCost +
                        formData.groundfieldCost,
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Estimated Total Cost
              </p>
              <p className="text-2xl font-black text-primary">
                {(() => {
                  const lot = lots.find((l) => l.id === formData.lotId);
                  const base =
                    lot?.items?.reduce((sum, item) => sum + Number(item.totalPrice), 0) || 0;
                  const extras =
                    formData.documentationFee +
                    formData.labourCost +
                    formData.handlingFee +
                    formData.transportationCost +
                    formData.shippingCost +
                    formData.groundfieldCost;
                  return formatCurrency(base + extras);
                })()}
              </p>
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
                  {editMode ? 'Saving...' : 'Processing...'}
                </div>
              ) : editMode ? (
                'Save Changes'
              ) : (
                'Create Lot Amount'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
