'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  recordUsage,
  getInvoiceById,
  updateInvoiceUsage,
  Invoice,
  InvoiceItem,
} from '@/lib/invoice';
import { toast } from 'sonner';
import { Loader2, IndianRupee } from 'lucide-react';
import UsagePreviewDialog from './UsagePreviewDialog';

interface UsageRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
  onSuccess: () => void;
  invoice?: Invoice | null; // Added for editing
  defaultMonth?: number;
  defaultYear?: number;
}

interface RecordedUsageData {
  bwA4Count: number;
  bwA3Count: number;
  colorA4Count: number;
  colorA3Count: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  remarks: string;
  meterImageUrl?: string;
}

export default function UsageRecordingModal({
  isOpen,
  onClose,
  contractId,
  customerName,
  onSuccess,
  invoice: editingInvoice,
  defaultMonth,
  defaultYear,
}: UsageRecordingModalProps) {
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<Invoice | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [recordedUsageData, setRecordedUsageData] = useState<RecordedUsageData | null>(null);

  const [formData, setFormData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    bwA4Count: '', // Initialize as empty strings
    bwA3Count: '',
    colorA4Count: '',
    colorA3Count: '',
    remarks: '',
  });
  const [file, setFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (editingInvoice) {
      setContract(editingInvoice);
      setFormData({
        billingPeriodStart: editingInvoice.billingPeriodStart?.split('T')[0] || '',
        billingPeriodEnd: editingInvoice.billingPeriodEnd?.split('T')[0] || '',
        bwA4Count: String(editingInvoice.bwA4Count || 0),
        bwA3Count: String(editingInvoice.bwA3Count || 0),
        colorA4Count: String(editingInvoice.colorA4Count || 0),
        colorA3Count: String(editingInvoice.colorA3Count || 0),
        remarks: editingInvoice.financeRemarks || '',
      });
    } else if (contractId) {
      getInvoiceById(contractId)
        .then((data) => {
          setContract(data);
          let startStr = data.effectiveFrom?.split('T')[0] || '';
          let endStr = data.effectiveTo?.split('T')[0] || '';

          // If default month/year provided, use that range
          if (defaultMonth !== undefined && defaultYear !== undefined) {
            const start = new Date(defaultYear, defaultMonth, 1);
            const end = new Date(defaultYear, defaultMonth + 1, 0);
            // Use local date components to avoid timezone shifts
            const fmt = (d: Date) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };
            startStr = fmt(start);
            endStr = fmt(end);
          }

          setFormData((prev) => ({
            ...prev,
            billingPeriodStart: startStr,
            billingPeriodEnd: endStr,
          }));
        })
        .catch((err) => console.error('Failed to fetch contract details:', err));
    }
  }, [contractId, editingInvoice, defaultMonth, defaultYear]);

  // Determine Machine Capabilities from pricing items
  const isBw = React.useMemo(() => {
    if (!contract?.items) return true; // Default show all
    return contract.items.some(
      (i) =>
        i.itemType === 'PRICING_RULE' &&
        (i.description.includes('Black') || i.description.includes('Combined')),
    );
  }, [contract]);

  const isColor = React.useMemo(() => {
    if (!contract?.items) return true;
    return contract.items.some(
      (i) =>
        i.itemType === 'PRICING_RULE' &&
        (i.description.includes('Color') || i.description.includes('Combined')),
    );
  }, [contract]);

  // Price Estimation Logic
  React.useEffect(() => {
    if (!contract) return;

    // Helper for robust parsing
    const safeParse = (val: unknown) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]+/g, '');
        const num = Number(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    // Helper: Calculate cost for a specific rule (BW/Color/Combo)
    const calculateRuleCost = (
      ruleItem: InvoiceItem | undefined,
      countA4: number,
      countA3: number,
    ) => {
      if (!ruleItem) return 0;

      // 1. Total Copies (A3 = 2x A4)
      const totalCopies = countA4 + countA3 * 2;

      // 2. Deduct Included Limit
      let includedLimit = 0;
      let slabRanges: { from: number | string; to: number | string; rate: number | string }[] = [];
      let excessRate = 0;

      if (ruleItem.description.includes('Black')) {
        includedLimit = safeParse(ruleItem.bwIncludedLimit);
        slabRanges = ruleItem.bwSlabRanges || [];
        excessRate = safeParse(ruleItem.bwExcessRate);
      } else if (ruleItem.description.includes('Color')) {
        includedLimit = safeParse(ruleItem.colorIncludedLimit);
        slabRanges = ruleItem.colorSlabRanges || [];
        excessRate = safeParse(ruleItem.colorExcessRate);
      } else if (ruleItem.description.includes('Combined')) {
        includedLimit = safeParse(ruleItem.combinedIncludedLimit);
        slabRanges = ruleItem.comboSlabRanges || [];
        excessRate = safeParse(ruleItem.combinedExcessRate);
      }

      let chargeable = Math.max(0, totalCopies - includedLimit);
      let cost = 0;

      // 3. Apply Slabs (Graduated)
      if (slabRanges && slabRanges.length > 0) {
        // Sort by 'from'
        const sortedSlabs = [...slabRanges].sort((a, b) => safeParse(a.from) - safeParse(b.from));

        for (const slab of sortedSlabs) {
          if (chargeable <= 0) break;

          const from = safeParse(slab.from);
          const to = safeParse(slab.to);
          const rate = safeParse(slab.rate);

          // Slab Capacity
          const capacity = to - from + 1;
          const usageInSlab = Math.min(chargeable, capacity);

          cost += usageInSlab * rate;
          chargeable -= usageInSlab;
        }
      }

      // 4. Apply Excess Rate to remaining
      if (chargeable > 0) {
        cost += chargeable * excessRate;
      }

      return cost;
    };

    // Main Calculation
    // ----------------
    // Rent Type Check
    const isCpc = contract.rentType?.includes('CPC');
    const advance = safeParse(contract.advanceAmount);

    let total = 0;

    // 1. Establish Base & Advance Logic
    if (isCpc) {
      // CPC: Pay for Usage Only. Base Rent = 0.
      // Advance is NOT deducted for CPC in this context (per backend rules).
      total = 0;
    } else {
      // FIXED: Base is Monthly Rent. Deduct Advance.
      total = safeParse(contract.monthlyRent);
      total -= advance;
    }

    // Inputs
    const bwA4 = safeParse(formData.bwA4Count);
    const bwA3 = safeParse(formData.bwA3Count);
    const clrA4 = safeParse(formData.colorA4Count);
    const clrA3 = safeParse(formData.colorA3Count);

    // Find Rules
    const bwRule = contract.items?.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Black'),
    );
    const colorRule = contract.items?.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Color'),
    );
    const comboRule = contract.items?.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Combined'),
    );

    // Calculate Rule Costs
    if (comboRule) {
      total += calculateRuleCost(comboRule, bwA4 + clrA4, bwA3 + clrA3);
    } else {
      if (bwRule) total += calculateRuleCost(bwRule, bwA4, bwA3);
      if (colorRule) total += calculateRuleCost(colorRule, clrA4, clrA3);
    }

    // Fix floating point precision
    const finalVal = Math.round((total + Number.EPSILON) * 100) / 100;
    setEstimatedCost(isNaN(finalVal) ? 0 : finalVal);
  }, [formData, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingInvoice) {
        await updateInvoiceUsage(editingInvoice.id, {
          bwA4Count: Number(formData.bwA4Count),
          bwA3Count: Number(formData.bwA3Count),
          colorA4Count: Number(formData.colorA4Count),
          colorA3Count: Number(formData.colorA3Count),
        });
        toast.success('Invoice usage updated successfully');
        onSuccess();
        onClose();
      } else {
        const payload = new FormData();
        payload.append('contractId', contractId);
        payload.append('billingPeriodStart', formData.billingPeriodStart);
        payload.append('billingPeriodEnd', formData.billingPeriodEnd);
        payload.append('bwA4Count', String(formData.bwA4Count));
        payload.append('bwA3Count', String(formData.bwA3Count));
        payload.append('colorA4Count', String(formData.colorA4Count));
        payload.append('colorA3Count', String(formData.colorA3Count));
        payload.append('remarks', formData.remarks);
        payload.append('reportedBy', 'EMPLOYEE');

        if (file) {
          payload.append('file', file);
        }

        const response = await recordUsage(payload);
        toast.success('Usage recorded successfully');

        // Store usage data for preview
        setRecordedUsageData({
          bwA4Count: Number(formData.bwA4Count),
          bwA3Count: Number(formData.bwA3Count),
          colorA4Count: Number(formData.colorA4Count),
          colorA3Count: Number(formData.colorA3Count),
          billingPeriodStart: formData.billingPeriodStart,
          billingPeriodEnd: formData.billingPeriodEnd,
          remarks: formData.remarks,
          meterImageUrl: (response as { meterImageUrl?: string })?.meterImageUrl,
        });

        // Show preview
        setShowPreview(true);
        onSuccess();
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleNumberInput = (val: string) => {
    if (val === '') return '';
    return val;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record Usage for {customerName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  required
                  readOnly={!!editingInvoice}
                  value={formData.billingPeriodStart}
                  onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  required
                  readOnly={!!editingInvoice}
                  value={formData.billingPeriodEnd}
                  onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isBw &&
                contract?.items?.find(
                  (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Black'),
                ) && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>BW A4 Count</Label>
                        <span className="text-xs text-slate-500">
                          Free Limit:{' '}
                          {contract.items.find((i) => i.description.includes('Black'))
                            ?.bwIncludedLimit || 0}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={formData.bwA4Count}
                        onChange={(e) =>
                          setFormData({ ...formData, bwA4Count: handleNumberInput(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>BW A3 Count</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.bwA3Count}
                        onChange={(e) =>
                          setFormData({ ...formData, bwA3Count: handleNumberInput(e.target.value) })
                        }
                      />
                      <p className="text-[10px] text-slate-400 text-right">Counts as 2x copies</p>
                    </div>
                  </>
                )}

              {isColor &&
                contract?.items?.find(
                  (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Color'),
                ) && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Color A4 Count</Label>
                        <span className="text-xs text-slate-500">
                          Free Limit:{' '}
                          {contract.items.find((i) => i.description.includes('Color'))
                            ?.colorIncludedLimit || 0}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={formData.colorA4Count}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            colorA4Count: handleNumberInput(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color A3 Count</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.colorA3Count}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            colorA3Count: handleNumberInput(e.target.value),
                          })
                        }
                      />
                      <p className="text-[10px] text-slate-400 text-right">Counts as 2x copies</p>
                    </div>
                  </>
                )}
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Usage Summary</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Total A4 Copies
                  </p>
                  <p className="text-lg font-bold text-slate-700">
                    {(Number(formData.bwA4Count) + Number(formData.colorA4Count)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Total A3 Copies
                  </p>
                  <p className="text-lg font-bold text-slate-700">
                    {(Number(formData.bwA3Count) + Number(formData.colorA3Count)).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-blue-50/50 border-t border-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-xs font-bold text-blue-600 uppercase block">
                      Grand Total Estimated
                    </Label>
                    <span className="text-[10px] text-blue-400 font-medium">
                      {contract?.rentType?.includes('CPC')
                        ? '(Slab/Usage Cost)'
                        : '(Rent - Advance + Excess)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-2xl font-bold text-blue-700">
                    <IndianRupee size={22} className="mt-1" />
                    {estimatedCost.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meter Image (Required for verification)</Label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingInvoice ? 'Update Invoice' : 'Submit Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && contract && recordedUsageData && (
        <UsagePreviewDialog
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            onClose();
          }}
          invoice={contract}
          usageData={recordedUsageData}
        />
      )}
    </>
  );
}
