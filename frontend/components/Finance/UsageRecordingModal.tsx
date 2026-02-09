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
  createNextMonthInvoice,
  getUsageHistory,
  Invoice,
  InvoiceItem,
  UsageRecord,
} from '@/lib/invoice';
import { toast } from 'sonner';
import { Loader2, IndianRupee, History } from 'lucide-react';
import { format } from 'date-fns';
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
  const [history, setHistory] = useState<UsageRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

      getUsageHistory(contractId)
        .then((data) => setHistory(data))
        .catch((err) => console.error('Failed to fetch usage history:', err));
    }
  }, [contractId, editingInvoice, defaultMonth, defaultYear]);

  // Pre-fill existing usage if found for the current period (for Editing pending usage)
  React.useEffect(() => {
    if (!editingInvoice && history.length > 0 && formData.billingPeriodStart) {
      const currentStart = formData.billingPeriodStart;
      const existing = history.find((h) => {
        const hStart = new Date(h.billingPeriodStart).toISOString().split('T')[0];
        return hStart === currentStart;
      });

      if (existing) {
        setFormData((prev) => ({
          ...prev,
          bwA4Count: String(existing.bwA4Count),
          bwA3Count: String(existing.bwA3Count),
          colorA4Count: String(existing.colorA4Count),
          colorA3Count: String(existing.colorA3Count),
          remarks: existing.remarks || '',
        }));
      }
    }
  }, [history, formData.billingPeriodStart, editingInvoice]);

  // Find previous reading based on current billingPeriodStart
  const prevUsage = React.useMemo(() => {
    if (!history.length || !formData.billingPeriodStart) return null;
    const currentStart = new Date(formData.billingPeriodStart);
    // Filter history to find items strictly before the current start date
    // Also exclude the editing invoice itself if we are in EDIT mode
    return history
      .filter((h) => new Date(h.billingPeriodStart) < currentStart && h.id !== editingInvoice?.id)
      .sort(
        (a, b) =>
          new Date(b.billingPeriodStart).getTime() - new Date(a.billingPeriodStart).getTime(),
      )[0];
  }, [history, formData.billingPeriodStart, editingInvoice]);

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

      const chargeable = Math.max(0, totalCopies - includedLimit);
      let cost = 0;

      // 3. Apply Slabs (Flat Volume based on Total Excess)
      if (chargeable > 0) {
        if (slabRanges && slabRanges.length > 0) {
          // Find the slab that matches the TOTAL chargeable count
          const match = slabRanges.find(
            (s) => chargeable >= safeParse(s.from) && chargeable <= safeParse(s.to),
          );

          if (match) {
            cost = chargeable * safeParse(match.rate);
          } else {
            // Fallback if no slab matches? Using excessRate as default or 0?
            // Backend logic falls back to 0 if findSlabRate fails
            // BUT generally we might want to default to the highest slab or excessRate?
            // Given user requirement "10000-100000 range price must be calculated for all",
            // if it exceeds 100000 and no slab exists, what happens?
            // Assuming strict range match for now to align with backend.
            // If no match in slabs, check if we should fall back to linear excessRate?
            // Backend code: if (slabs) use slab (and return 0 if no match).
            // Let's stick to backend logic.
            cost = 0;
          }
        } else {
          // 4. No Slabs -> Use Linear Excess Rate
          cost = chargeable * excessRate;
        }
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

  const validateReadings = () => {
    if (!prevUsage) return true;

    const errors: string[] = [];
    if (Number(formData.bwA4Count) < prevUsage.bwA4Count) {
      errors.push(
        `BW A4 reading (${formData.bwA4Count}) cannot be lower than previous (${prevUsage.bwA4Count})`,
      );
    }
    if (Number(formData.bwA3Count) < prevUsage.bwA3Count) {
      errors.push(
        `BW A3 reading (${formData.bwA3Count}) cannot be lower than previous (${prevUsage.bwA3Count})`,
      );
    }
    if (Number(formData.colorA4Count) < prevUsage.colorA4Count) {
      errors.push(
        `Color A4 reading (${formData.colorA4Count}) cannot be lower than previous (${prevUsage.colorA4Count})`,
      );
    }
    if (Number(formData.colorA3Count) < prevUsage.colorA3Count) {
      errors.push(
        `Color A3 reading (${formData.colorA3Count}) cannot be lower than previous (${prevUsage.colorA3Count})`,
      );
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReadings()) return;
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

  const handleSubmitAndNext = async () => {
    if (!validateReadings()) return;
    setLoading(true);
    try {
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

      await recordUsage(payload);
      await createNextMonthInvoice(contractId);

      toast.success('Usage recorded. Switching to next month.');

      // Refresh contract and history to get next period dates and updated references
      const [updatedContract, updatedHistory] = await Promise.all([
        getInvoiceById(contractId),
        getUsageHistory(contractId),
      ]);
      setContract(updatedContract);
      setHistory(updatedHistory);

      // Shift dates manually to be safe or use updatedContract
      const currentEnd = new Date(formData.billingPeriodEnd);
      const nextStart = new Date(currentEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      const nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0);

      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setFormData({
        billingPeriodStart: fmt(nextStart),
        billingPeriodEnd: fmt(nextEnd),
        bwA4Count: '',
        bwA3Count: '',
        colorA4Count: '',
        colorA3Count: '',
        remarks: '',
      });
      setFile(null);
      onSuccess();
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
            <div className="flex justify-between items-center pr-8">
              <DialogTitle>Record Usage for {customerName}</DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs"
              >
                <History className="mr-2 h-3 w-3" />
                {showHistory ? 'Hide History' : 'Show History'}
              </Button>
            </div>
          </DialogHeader>

          {showHistory && (
            <div className="border border-border rounded-lg overflow-hidden mb-4 max-h-[200px] overflow-y-auto">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-muted text-muted-foreground uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-2">Period</th>
                    <th className="p-2">BW A4</th>
                    <th className="p-2">BW A3</th>
                    <th className="p-2">Col A4</th>
                    <th className="p-2">Col A3</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No previous records found
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/50">
                        <td className="p-2">
                          {format(new Date(h.billingPeriodStart), 'MMM yyyy')}
                        </td>
                        <td className="p-2">{h.bwA4Count}</td>
                        <td className="p-2">{h.bwA3Count}</td>
                        <td className="p-2">{h.colorA4Count}</td>
                        <td className="p-2">{h.colorA3Count}</td>
                        <td className="p-2 truncate max-w-[100px]">{h.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

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
                      <div className="flex justify-between items-center">
                        <Label>BW A4 Count</Label>
                        <div className="text-[10px] space-x-2">
                          {prevUsage && (
                            <span className="text-orange-600 font-bold">
                              Prev: {prevUsage.bwA4Count}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Free:{' '}
                            {contract.items.find((i) => i.description.includes('Black'))
                              ?.bwIncludedLimit || 0}
                          </span>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={prevUsage ? String(prevUsage.bwA4Count) : '0'}
                        value={formData.bwA4Count}
                        placeholder={prevUsage ? `Must be >= ${prevUsage.bwA4Count}` : '0'}
                        onChange={(e) =>
                          setFormData({ ...formData, bwA4Count: handleNumberInput(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>BW A3 Count</Label>
                        {prevUsage && (
                          <span className="text-[10px] text-orange-600 font-bold">
                            Prev: {prevUsage.bwA3Count}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={prevUsage ? String(prevUsage.bwA3Count) : '0'}
                        value={formData.bwA3Count}
                        placeholder={prevUsage ? `Must be >= ${prevUsage.bwA3Count}` : '0'}
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
                      <div className="flex justify-between items-center">
                        <Label>Color A4 Count</Label>
                        <div className="text-[10px] space-x-2">
                          {prevUsage && (
                            <span className="text-orange-600 font-bold">
                              Prev: {prevUsage.colorA4Count}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Free:{' '}
                            {contract.items.find((i) => i.description.includes('Color'))
                              ?.colorIncludedLimit || 0}
                          </span>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={prevUsage ? String(prevUsage.colorA4Count) : '0'}
                        value={formData.colorA4Count}
                        placeholder={prevUsage ? `Must be >= ${prevUsage.colorA4Count}` : '0'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            colorA4Count: handleNumberInput(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Color A3 Count</Label>
                        {prevUsage && (
                          <span className="text-[10px] text-orange-600 font-bold">
                            Prev: {prevUsage.colorA3Count}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={prevUsage ? String(prevUsage.colorA3Count) : '0'}
                        value={formData.colorA3Count}
                        placeholder={prevUsage ? `Must be >= ${prevUsage.colorA3Count}` : '0'}
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

            <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border bg-slate-100/50 flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  Usage Summary
                </span>
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              {!editingInvoice && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSubmitAndNext}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit & Next Month
                </Button>
              )}
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
