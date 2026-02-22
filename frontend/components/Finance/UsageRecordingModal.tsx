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
  updateUsageRecord,
  getUsageHistory,
  Invoice,
  InvoiceItem,
  UsageRecord,
} from '@/lib/invoice';
import { Product, getProductById } from '@/lib/product';
import { toast } from 'sonner';
import { Loader2, Calendar, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

import { format } from 'date-fns';

interface UsageRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
  onSuccess: () => void;
  invoice?: Invoice | null; // Added for editing
}

interface SlabRange {
  from: number;
  to: number;
  rate: number;
}

const parseSlabs = (ranges: unknown): SlabRange[] => {
  if (Array.isArray(ranges)) return ranges;
  if (typeof ranges === 'string') {
    try {
      return JSON.parse(ranges);
    } catch {
      return [];
    }
  }
  return [];
};

interface RecordedUsageData {
  bwA4Count: number;
  bwA3Count: number;
  colorA4Count: number;
  colorA3Count: number;
  bwA4Delta: number;
  bwA3Delta: number;
  colorA4Delta: number;
  colorA3Delta: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  remarks: string;
  meterImageUrl?: string;
  extraBwCount?: number;
  extraColorCount?: number;
  monthlyRent?: number;
  additionalCharges?: number;
  additionalChargesRemarks?: string;
}

/**
 * Modal dialog for recording new meter readings.
 * Handles input validation, cost estimation, and submission of usage data.
 */
export default function UsageRecordingModal({
  isOpen,
  onClose,
  contractId,
  customerName,
  onSuccess,
  invoice: editingInvoice,
}: UsageRecordingModalProps) {
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<Invoice | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [recordedUsageData, setRecordedUsageData] = useState<RecordedUsageData | null>(null);
  const [history, setHistory] = useState<UsageRecord[]>([]);

  const [formData, setFormData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    bwA4Count: '',
    bwA3Count: '',
    colorA4Count: '',
    colorA3Count: '',
    remarks: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const isSimplifiedLease = contract?.saleType === 'LEASE' && contract?.leaseType !== 'FSM';

  React.useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
      setRecordedUsageData(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (editingInvoice) {
      const start = (editingInvoice.billingPeriodStart || (editingInvoice as any).periodStart || '').split('T')[0];
      const end = (editingInvoice.billingPeriodEnd || (editingInvoice as any).periodEnd || '').split('T')[0];

      setFormData({
        billingPeriodStart: start,
        billingPeriodEnd: end,
        bwA4Count: String(editingInvoice.bwA4Count || (editingInvoice as any).bwA4Count || 0),
        bwA3Count: String(editingInvoice.bwA3Count || (editingInvoice as any).bwA3Count || 0),
        colorA4Count: String(editingInvoice.colorA4Count || (editingInvoice as any).colorA4Count || 0),
        colorA3Count: String(editingInvoice.colorA3Count || (editingInvoice as any).colorA3Count || 0),
        remarks: editingInvoice.financeRemarks || (editingInvoice as any).remarks || '',
      });

      if (editingInvoice.referenceContractId || contractId) {
        getInvoiceById(editingInvoice.referenceContractId || contractId)
          .then(setContract)
          .catch((err) => console.error('Failed to fetch reference contract:', err));
      }
    } else if (contractId) {
      getInvoiceById(contractId)
        .then((data) => {
          setContract(data);

          // Use the contract's actual billing period (effectiveFrom to effectiveTo)
          const startStr = data.effectiveFrom?.split('T')[0] || '';
          const endStr = data.effectiveTo?.split('T')[0] || '';

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
  }, [contractId, editingInvoice]);

  React.useEffect(() => {
    if (editingInvoice) return;

    if (history.length > 0) {
      // Sort by end date descending
      const sorted = [...history].sort(
        (a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime(),
      );
      const last = sorted[0];
      const nextStart = new Date(last.periodEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);

      if (isNaN(nextStart.getTime()) || isNaN(nextEnd.getTime())) return;

      setFormData((prev) => ({
        ...prev,
        billingPeriodStart: nextStart.toISOString().split('T')[0],
        billingPeriodEnd: nextEnd.toISOString().split('T')[0],
      }));
    } else if (contract && contract.effectiveFrom) {
      const start = new Date(contract.effectiveFrom);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      setFormData((prev) => ({
        ...prev,
        billingPeriodStart: start.toISOString().split('T')[0],
        billingPeriodEnd: end.toISOString().split('T')[0],
      }));
    }
  }, [history, contract, editingInvoice]);

  const prevUsage = React.useMemo(() => {
    if (!history.length || !formData.billingPeriodStart) return null;
    const currentStart = new Date(formData.billingPeriodStart);
    return history
      .filter((h) => new Date(h.periodStart) < currentStart && h.id !== editingInvoice?.id)
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
  }, [history, formData.billingPeriodStart, editingInvoice]);

  // Fetch product details when contract changes
  React.useEffect(() => {
    if (!contract?.items) return;

    const fetchProducts = async () => {
      // Fetch any item that has a productId, regardless of strict itemType
      const productItems = contract.items?.filter((i) => i.productId) || [];
      if (productItems.length === 0) return;

      try {
        const productPromises = productItems.map((item) =>
          getProductById(item.productId!).catch((err) => {
            console.error(`Failed to fetch product ${item.productId}:`, err);
            return null;
          }),
        );

        const results = await Promise.all(productPromises);
        setProducts(results.filter((p): p is Product => p !== null));
      } catch (err) {
        console.error('Error fetching contract products:', err);
      }
    };

    fetchProducts();
  }, [contract]);

  // Centralized Rule Detection
  const ruleItems = React.useMemo(() => {
    if (!contract?.items) return { bw: undefined, color: undefined, combo: undefined };

    // Looser check: Allow itemType to be missing if description matches
    const isRule = (i: InvoiceItem) => i.itemType === 'PRICING_RULE' || !i.itemType;

    const bw = contract.items.find((i) => isRule(i) && i.description.includes('Black'));
    const color = contract.items.find((i) => isRule(i) && i.description.includes('Color'));
    const combo = contract.items.find((i) => isRule(i) && i.description.includes('Combined'));

    // Check for "Merged" items (Product containing pricing fields)
    const hasSlabs = (ranges: unknown) => parseSlabs(ranges).length > 0;

    const mergedBw = contract.items.find(
      (i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0 || hasSlabs(i.bwSlabRanges),
    );
    const mergedColor = contract.items.find(
      (i) => (i.colorIncludedLimit ?? 0) > 0 || (i.colorExcessRate ?? 0) > 0 || hasSlabs(i.colorSlabRanges),
    );
    const mergedCombo = contract.items.find(
      (i) => (i.combinedIncludedLimit ?? 0) > 0 || (i.combinedExcessRate ?? 0) > 0 || hasSlabs(i.comboSlabRanges),
    );

    // Prioritize separate rules, fallback to merged items
    return {
      bw: bw || mergedBw,
      color: color || mergedColor,
      combo: combo || mergedCombo,
    };
  }, [contract]);

  // Helper to check if color is explicitly detected
  const isColorDetected = React.useMemo(() => {
    if (ruleItems.color || ruleItems.combo) return true;
    return products.some((p) => p.print_colour === 'COLOUR' || p.print_colour === 'BOTH');
  }, [ruleItems, products]);

  const isBw = React.useMemo(() => {
    // Check rules first
    if (ruleItems.bw || ruleItems.combo) return true;
    // Fallback to product capabilities
    if (products.some((p) => p.print_colour === 'BLACK_WHITE' || p.print_colour === 'BOTH'))
      return true;
    // Last resort: if no rules and no color product, but we have a contract, default to B/W
    return !isColorDetected && !!contract;
  }, [ruleItems, products, isColorDetected, contract]);

  const isColor = React.useMemo(() => {
    // Check rules first
    if (ruleItems.color || ruleItems.combo) return true;
    // Fallback to product capabilities
    return products.some((p) => p.print_colour === 'COLOUR' || p.print_colour === 'BOTH');
  }, [ruleItems, products]);

  // Calculate Aggregated Initial Counts from ALL Product Items
  const calculatedInitialCounts = React.useMemo(() => {
    if (!contract?.items) return { bwA4: 0, bwA3: 0, clrA4: 0, clrA3: 0 };

    let bwA4 = 0,
      bwA3 = 0,
      clrA4 = 0,
      clrA3 = 0;
    contract.items.forEach((item) => {
      // Check for product items (Allocated items)
      if (item.itemType === 'PRODUCT' || item.productId) {
        bwA4 += item.initialBwCount || 0;
        bwA3 += item.initialBwA3Count || 0;
        clrA4 += item.initialColorCount || 0;
        clrA3 += item.initialColorA3Count || 0;
      }
    });
    return { bwA4, bwA3, clrA4, clrA3 };
  }, [contract]);
  // Detect Last Month (Strict Date Match)
  const isLastMonth = React.useMemo(() => {
    if (!contract?.effectiveTo || !formData.billingPeriodEnd) return false;
    const contractEnd = new Date(contract.effectiveTo);
    contractEnd.setHours(0, 0, 0, 0);

    const inputEnd = new Date(formData.billingPeriodEnd);
    inputEnd.setHours(0, 0, 0, 0);

    return contractEnd.getTime() === inputEnd.getTime();
  }, [contract, formData.billingPeriodEnd]);

  const calculateSlabCharge = React.useCallback(
    (
      count: number,
      slabs: Array<{ from: number; to: number; rate: number }> | undefined,
    ): number => {
      if (!slabs || !Array.isArray(slabs) || slabs.length === 0) return 0;
      const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
      let remaining = count;
      let totalCharge = 0;
      for (const slab of sortedSlabs) {
        if (remaining <= 0) break;
        const slabSize = slab.to - slab.from + 1;
        const applicable = Math.min(remaining, slabSize);
        totalCharge += applicable * Number(slab.rate);
        remaining -= applicable;
      }
      return totalCharge;
    },
    [],
  );

  const calculateRuleCost = React.useCallback(
    (
      ruleItem: InvoiceItem | undefined,
      countA4: number,
      countA3: number,
      prevA4: number,
      prevA3: number,
      type: 'BW' | 'COLOR' | 'COMBO',
      rentType?: string,
    ) => {
      if (!ruleItem) return { charge: 0, totalDelta: 0, limit: 0, rate: 0 };

      const deltaA4 = Math.max(0, countA4 - prevA4);
      const deltaA3 = Math.max(0, countA3 - prevA3);
      const totalDeltaEquiv = deltaA4 + deltaA3 * 2;

      if (rentType?.includes('CPC')) {
        const slabs = parseSlabs(
          type === 'BW'
            ? ruleItem.bwSlabRanges
            : type === 'COLOR'
              ? ruleItem.colorSlabRanges
              : ruleItem.comboSlabRanges
        );
        return {
          charge: calculateSlabCharge(totalDeltaEquiv, slabs),
          totalDelta: totalDeltaEquiv,
          limit: 0,
          rate: 0, // Multiple rates
        };
      }

      let includedLimit = 0;
      let excessRate = 0;
      const safeNum = (val: unknown) =>
        val === undefined || val === null || val === '' ? 0 : Number(val);

      if (type === 'BW') {
        includedLimit = safeNum(ruleItem.bwIncludedLimit);
        excessRate = safeNum(ruleItem.bwExcessRate);
      } else if (type === 'COLOR') {
        includedLimit = safeNum(ruleItem.colorIncludedLimit);
        excessRate = safeNum(ruleItem.colorExcessRate);
      } else if (type === 'COMBO') {
        includedLimit =
          safeNum(ruleItem.combinedIncludedLimit) ||
          safeNum(ruleItem.bwIncludedLimit) + safeNum(ruleItem.colorIncludedLimit);
        excessRate = safeNum(ruleItem.combinedExcessRate) || safeNum(ruleItem.bwExcessRate);
      }

      const chargeable = Math.max(0, totalDeltaEquiv - includedLimit);
      return {
        charge: chargeable * excessRate,
        totalDelta: totalDeltaEquiv,
        limit: includedLimit,
        rate: excessRate,
      };
    },
    [calculateSlabCharge],
  );

  React.useEffect(() => {
    if (!contract) return;

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

    // For 12-month consolidated contract, we only calculate usage charges here.
    // Rent is calculated at the end.
    let totalAmount = 0;

    const bwA4 = safeParse(formData.bwA4Count);
    const bwA3 = safeParse(formData.bwA3Count);
    const clrA4 = safeParse(formData.colorA4Count);
    const clrA3 = safeParse(formData.colorA3Count);

    const prevBwA4 = prevUsage ? prevUsage.bwA4Count : calculatedInitialCounts.bwA4;
    const prevBwA3 = prevUsage ? prevUsage.bwA3Count : calculatedInitialCounts.bwA3;
    const prevClrA4 = prevUsage ? prevUsage.colorA4Count : calculatedInitialCounts.clrA4;
    const prevClrA3 = prevUsage ? prevUsage.colorA3Count : calculatedInitialCounts.clrA3;

    if (ruleItems.combo) {
      const breakdown = calculateRuleCost(
        ruleItems.combo,
        bwA4 + clrA4,
        bwA3 + clrA3,
        prevBwA4 + prevClrA4,
        prevBwA3 + prevClrA3,
        'COMBO',
        contract.rentType,
      );
      totalAmount += breakdown.charge;
    } else {
      if (ruleItems.bw) {
        const breakdown = calculateRuleCost(
          ruleItems.bw,
          bwA4,
          bwA3,
          prevBwA4,
          prevBwA3,
          'BW',
          contract.rentType,
        );
        totalAmount += breakdown.charge;
      }
      if (ruleItems.color) {
        const breakdown = calculateRuleCost(
          ruleItems.color,
          clrA4,
          clrA3,
          prevClrA4,
          prevClrA3,
          'COLOR',
          contract.rentType,
        );
        totalAmount += breakdown.charge;
      }
    }

    const finalVal = Math.round((totalAmount + Number.EPSILON) * 100) / 100;

    // Rent Calculation Logic
    const monthlyRentAmount = Number(
      contract?.monthlyRent || contract?.monthlyLeaseAmount || contract?.monthlyEmiAmount || 0,
    );

    // First Month: Rent is 0 (Collected via Advance/Deposit usually?) - respecting existing logic
    const isFirstMonth = history.length === 0;

    // STRICT FIX: Rent is ALWAYS applicable. No exceptions for first month.
    let applicableRent = monthlyRentAmount;

    // FINAL MONTH LOGIC: If it is the last month, rent is adjusted from Advance.
    // So the customer arguably pays 0 "new" rent.
    if (isLastMonth) {
      applicableRent = 0;
    }

    // DEBUG LOGGING
    console.log('DEBUG USAGE MODAL:', {
      isLastMonth,
      isFirstMonth,
      monthlyRentAmount,
      contractEnd: contract?.effectiveTo,
      inputEnd: formData.billingPeriodEnd,
      applicableRent,
      finalVal,
      total: (isNaN(finalVal) ? 0 : finalVal) + applicableRent,
    });

    setEstimatedCost((isNaN(finalVal) ? 0 : finalVal) + applicableRent);
  }, [
    formData,
    contract,
    history,
    calculateRuleCost,
    ruleItems,
    prevUsage,
    isLastMonth,
    calculatedInitialCounts.bwA4,
    calculatedInitialCounts.bwA3,
    calculatedInitialCounts.clrA4,
    calculatedInitialCounts.clrA3,
  ]);

  // Real-time error detection for UI feedback
  const getErrors = React.useMemo(() => {
    const errs: Record<string, string> = {};
    const bwA4 = Number(formData.bwA4Count || 0);
    const bwA3 = Number(formData.bwA3Count || 0);
    const clrA4 = Number(formData.colorA4Count || 0);
    const clrA3 = Number(formData.colorA3Count || 0);

    const prevBwA4 = prevUsage ? prevUsage.bwA4Count : calculatedInitialCounts.bwA4;
    const prevBwA3 = prevUsage ? prevUsage.bwA3Count : calculatedInitialCounts.bwA3;
    const prevClrA4 = prevUsage ? prevUsage.colorA4Count : calculatedInitialCounts.clrA4;
    const prevClrA3 = prevUsage ? prevUsage.colorA3Count : calculatedInitialCounts.clrA3;

    if (!isSimplifiedLease) {
      if (bwA4 > 0 && bwA4 < prevBwA4) errs.bwA4 = `Cannot be less than ${prevBwA4}`;
      if (bwA3 > 0 && bwA3 < prevBwA3) errs.bwA3 = `Cannot be less than ${prevBwA3}`;
      if (clrA4 > 0 && clrA4 < prevClrA4) errs.clrA4 = `Cannot be less than ${prevClrA4}`;
      if (clrA3 > 0 && clrA3 < prevClrA3) errs.clrA3 = `Cannot be less than ${prevClrA3}`;
    }

    // check zero usage if all are touched or not (maybe just block at submit for zero usage)
    return errs;
  }, [
    formData,
    prevUsage,
    calculatedInitialCounts.bwA3,
    calculatedInitialCounts.bwA4,
    calculatedInitialCounts.clrA3,
    calculatedInitialCounts.clrA4,
    isSimplifiedLease,
  ]);

  const hasErrors = Object.keys(getErrors).length > 0;

  const validateReadings = () => {
    const errors: string[] = [];

    const bwA4 = Number(formData.bwA4Count || 0);
    const bwA3 = Number(formData.bwA3Count || 0);
    const clrA4 = Number(formData.colorA4Count || 0);
    const clrA3 = Number(formData.colorA3Count || 0);

    const prevBwA4 = prevUsage
      ? prevUsage.bwA4Count
      : ruleItems.bw?.initialBwCount || ruleItems.combo?.initialBwCount || 0;
    const prevBwA3 = prevUsage ? prevUsage.bwA3Count : 0;
    const prevClrA4 = prevUsage ? prevUsage.colorA4Count : ruleItems.color?.initialColorCount || 0;
    const prevClrA3 = prevUsage ? prevUsage.colorA3Count : 0;

    // 1. Rollback Validation (Only for non-simplified leases)
    if (!isSimplifiedLease) {
      if (bwA4 < prevBwA4)
        errors.push(`BW A4 reading (${bwA4}) cannot be lower than previous (${prevBwA4})`);
      if (bwA3 < prevBwA3)
        errors.push(`BW A3 reading (${bwA3}) cannot be lower than previous (${prevBwA3})`);
      if (clrA4 < prevClrA4)
        errors.push(`Color A4 reading (${clrA4}) cannot be lower than previous (${prevClrA4})`);
      if (clrA3 < prevClrA3)
        errors.push(`Color A3 reading (${clrA3}) cannot be lower than previous (${prevClrA3})`);

      // 2. No Usage Validation (Professional)
      if (bwA4 === prevBwA4 && bwA3 === prevBwA3 && clrA4 === prevClrA4 && clrA3 === prevClrA3) {
        errors.push('No usage detected. Meter readings must be higher than previous month.');
      }
    }

    // 3. Contract Period Validation
    if (contract?.effectiveTo && formData.billingPeriodEnd) {
      // Strict String Comparison (YYYY-MM-DD) to avoid timezone issues
      const contractEndStr = String(contract.effectiveTo).split('T')[0]; // Ensure ISO string part
      const inputEndStr = formData.billingPeriodEnd; // Already YYYY-MM-DD

      if (inputEndStr > contractEndStr) {
        errors.push(
          `Billing period end cannot exceed contract end date (${formatDate(contract.effectiveTo as unknown as string)})`,
        );
      }
    }

    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
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
        await updateUsageRecord(editingInvoice.id, {
          bwA4Count: Number(formData.bwA4Count),
          bwA3Count: Number(formData.bwA3Count),
          colorA4Count: Number(formData.colorA4Count),
          colorA3Count: Number(formData.colorA3Count),
          billingPeriodEnd: formData.billingPeriodEnd,
        });
        toast.success('Usage record updated successfully');
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
        payload.append('colorA3Count', String(formData.colorA3Count)); // FIXED: was sending colorA4Count
        payload.append('remarks', formData.remarks);
        payload.append('reportedBy', 'EMPLOYEE');

        if (file) {
          payload.append('file', file);
        }

        const response = await recordUsage(payload);
        toast.success('Usage recorded successfully');

        const prevBwA4 = prevUsage ? prevUsage.bwA4Count : calculatedInitialCounts.bwA4;
        const prevBwA3 = prevUsage ? prevUsage.bwA3Count : calculatedInitialCounts.bwA3;
        const prevClrA4 = prevUsage ? prevUsage.colorA4Count : calculatedInitialCounts.clrA4;
        const prevClrA3 = prevUsage ? prevUsage.colorA3Count : calculatedInitialCounts.clrA3;

        setRecordedUsageData({
          bwA4Count: Number(formData.bwA4Count),
          bwA3Count: Number(formData.bwA3Count),
          colorA4Count: Number(formData.colorA4Count),
          colorA3Count: Number(formData.colorA3Count),
          bwA4Delta: Math.max(0, Number(formData.bwA4Count || 0) - prevBwA4),
          bwA3Delta: Math.max(0, Number(formData.bwA3Count || 0) - prevBwA3),
          colorA4Delta: Math.max(0, Number(formData.colorA4Count || 0) - prevClrA4),
          colorA3Delta: Math.max(0, Number(formData.colorA3Count || 0) - prevClrA3),
          billingPeriodStart: formData.billingPeriodStart,
          billingPeriodEnd: formData.billingPeriodEnd,
          remarks: formData.remarks,
          meterImageUrl: (response as { meterImageUrl?: string })?.meterImageUrl,
        });

        // setShowPreview(true);
        // We do *not* call onSuccess() here. Calling it triggers the parent to fetch and remount
        // the state, which instantly kills the UsagePreviewDialog and flips back to the input form.
        // onSuccess is deferred to the close callback of the Preview Dialog.
        onSuccess();
        onClose();
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // dd/MM/yyyy
  };

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[1.5rem] p-6 sm:p-10">
          <DialogHeader>
            <DialogTitle>Record Usage for {customerName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={
                      formData.billingPeriodStart
                        ? format(new Date(formData.billingPeriodStart), 'dd/MM/yyyy')
                        : ''
                    }
                    placeholder="DD/MM/YYYY"
                    className="font-semibold"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {!editingInvoice && (
                    <input
                      type="date"
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={formData.billingPeriodStart}
                      onChange={(e) =>
                        setFormData({ ...formData, billingPeriodStart: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={
                      formData.billingPeriodEnd
                        ? format(new Date(formData.billingPeriodEnd), 'dd/MM/yyyy')
                        : ''
                    }
                    placeholder="DD/MM/YYYY"
                    className="font-semibold"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={formData.billingPeriodEnd}
                    max={
                      contract?.effectiveTo ? String(contract.effectiveTo).split('T')[0] : undefined
                    }
                    onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Rent / EMI Section Display Only */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
              <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                <IndianRupee size={16} /> {isSimplifiedLease ? 'EMI Info' : 'Rent Info'}
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">
                  {isSimplifiedLease
                    ? 'Monthly EMI Amount'
                    : 'Monthly Rent (Accrued until contract end)'}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {(() => {
                    const tenure = contract?.leaseTenureMonths || 0;
                    const isFinalMonth = tenure > 0 && history.length + 1 === tenure;
                    const amount = Number(
                      contract?.monthlyRent ||
                      contract?.monthlyLeaseAmount ||
                      contract?.monthlyEmiAmount ||
                      0,
                    );

                    if (isFinalMonth) return `${formatCurrency(0)} (Adjusted from Advance)`;
                    return formatCurrency(amount);
                  })()}
                </span>
              </div>
            </div>

            {/* Last Month Alert */}
            {isLastMonth && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <span className="text-xl">⚠️</span>
                  <h3>Last Month of Contract</h3>
                </div>
                <p className="text-sm text-amber-800">
                  This billing period matches the contract end date. The{' '}
                  <strong>Advance Amount</strong> will be adjusted against this month&apos;s rent.
                </p>
                <div className="flex flex-col gap-1 mt-2 text-sm bg-white/50 p-3 rounded-lg border border-amber-100">
                  <div className="flex justify-between">
                    <span>Contract Advance Held:</span>
                    <span className="font-bold">
                      {formatCurrency(Number(contract?.advanceAmount || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month&apos;s Rent:</span>
                    <span className="font-bold">
                      {formatCurrency(Number(contract?.monthlyRent || 0))}
                    </span>
                  </div>
                  <div className="border-t border-amber-200/50 my-1"></div>
                  <div className="flex justify-between font-bold text-amber-950">
                    <span>Net Payable Rent:</span>
                    <span>
                      {formatCurrency(
                        Math.max(
                          0,
                          Number(contract?.monthlyRent || 0) - Number(contract?.advanceAmount || 0),
                        ),
                      )}
                    </span>
                  </div>
                  {Number(contract?.advanceAmount || 0) > Number(contract?.monthlyRent || 0) && (
                    <p className="text-xs text-green-700 mt-1">
                      * Remaining advance of{' '}
                      {formatCurrency(
                        Number(contract?.advanceAmount || 0) - Number(contract?.monthlyRent || 0),
                      )}{' '}
                      will be refunded or adjusted in final settlement.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Readings - only for FSM lease and RENT (not EMI lease) */}
            {!isSimplifiedLease && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isBw && (
                  <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-900" />
                      Black & White Readings
                    </h3>
                    {/* BW Inputs */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-100">
                        {contract?.rentType?.includes('CPC') ? (
                          <span className="invisible">Free Limit: 0</span>
                        ) : (
                          <span>
                            Free Limit:{' '}
                            <span className="font-bold text-slate-700">
                              {Number(ruleItems.bw?.bwIncludedLimit || 0).toLocaleString()}
                            </span>{' '}
                            per month
                          </span>
                        )}
                        <span>
                          Excess Rate:{' '}
                          <span className="font-bold text-slate-700">
                            {(() => {
                              const isCpc = contract?.rentType?.includes('CPC');
                              if (isCpc) {
                                const slabs = parseSlabs(
                                  ruleItems.bw?.bwSlabRanges ||
                                  ruleItems.combo?.comboSlabRanges
                                );
                                if (slabs.length > 0) {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] uppercase text-slate-400">
                                        Slabs
                                      </span>
                                      {slabs.map((s: SlabRange, i: number) => (
                                        <span key={i} className="whitespace-nowrap font-mono">
                                          {s.from}-{s.to}: ₹{s.rate}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                                return 'Slab-based';
                              }
                              return `₹${Number(ruleItems.bw?.bwExcessRate || ruleItems.combo?.combinedExcessRate || 0).toFixed(2)}`;
                            })()}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A4 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {prevUsage ? 'Prev' : 'Initial'}:{' '}
                              {prevUsage ? prevUsage.bwA4Count : calculatedInitialCounts.bwA4}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.bwA4Count || 0) -
                                (prevUsage ? prevUsage.bwA4Count : calculatedInitialCounts.bwA4),
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.bwA4Count}
                          onChange={(e) => setFormData({ ...formData, bwA4Count: e.target.value })}
                          className={
                            getErrors.bwA4
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : ''
                          }
                        />
                        {getErrors.bwA4 && (
                          <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            {getErrors.bwA4}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A3 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {prevUsage ? 'Prev' : 'Initial'}:{' '}
                              {prevUsage ? prevUsage.bwA3Count : calculatedInitialCounts.bwA3}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.bwA3Count || 0) -
                                (prevUsage ? prevUsage.bwA3Count : calculatedInitialCounts.bwA3),
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.bwA3Count}
                          onChange={(e) => setFormData({ ...formData, bwA3Count: e.target.value })}
                          className={
                            getErrors.bwA3
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : ''
                          }
                        />
                        {getErrors.bwA3 && (
                          <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            {getErrors.bwA3}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isColor && (
                  <div className="space-y-4 p-4 rounded-xl bg-rose-50/30 border border-rose-100">
                    <h3 className="text-sm font-bold text-rose-700 border-b border-rose-100 pb-2 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Color Readings
                    </h3>
                    {/* Color Inputs */}
                    <div className="bg-white p-3 rounded-lg border border-rose-100 space-y-3">
                      <div className="flex justify-between items-center text-xs text-rose-600/80 pb-2 border-b border-rose-50">
                        {contract?.rentType?.includes('CPC') ? (
                          <span className="invisible">Free Limit: 0</span>
                        ) : (
                          <span>
                            Free Limit:{' '}
                            <span className="font-bold text-rose-700">
                              {Number(ruleItems.color?.colorIncludedLimit || 0).toLocaleString()}
                            </span>{' '}
                            per month
                          </span>
                        )}
                        <span>
                          Excess Rate:{' '}
                          <span className="font-bold text-rose-700">
                            {(() => {
                              const isCpc = contract?.rentType?.includes('CPC');
                              if (isCpc) {
                                const slabs = parseSlabs(
                                  ruleItems.color?.colorSlabRanges ||
                                  ruleItems.combo?.comboSlabRanges
                                );
                                if (slabs.length > 0) {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] uppercase text-rose-400">
                                        Slabs
                                      </span>
                                      {slabs.map((s: SlabRange, i: number) => (
                                        <span key={i} className="whitespace-nowrap font-mono">
                                          {s.from}-{s.to}: ₹{s.rate}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                                return 'Slab-based';
                              }
                              return `₹${Number(ruleItems.color?.colorExcessRate || ruleItems.combo?.combinedExcessRate || 0).toFixed(2)}`;
                            })()}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A4 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {prevUsage ? 'Prev' : 'Initial'}:{' '}
                              {prevUsage ? prevUsage.colorA4Count : calculatedInitialCounts.clrA4}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.colorA4Count || 0) -
                                (prevUsage
                                  ? prevUsage.colorA4Count
                                  : calculatedInitialCounts.clrA4),
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.colorA4Count}
                          onChange={(e) =>
                            setFormData({ ...formData, colorA4Count: e.target.value })
                          }
                          className={
                            getErrors.clrA4
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : ''
                          }
                        />
                        {getErrors.clrA4 && (
                          <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            {getErrors.clrA4}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A3 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {prevUsage ? 'Prev' : 'Initial'}:{' '}
                              {prevUsage ? prevUsage.colorA3Count : calculatedInitialCounts.clrA3}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.colorA3Count || 0) -
                                (prevUsage
                                  ? prevUsage.colorA3Count
                                  : calculatedInitialCounts.clrA3),
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.colorA3Count}
                          onChange={(e) =>
                            setFormData({ ...formData, colorA3Count: e.target.value })
                          }
                          className={
                            getErrors.clrA3
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : ''
                          }
                        />
                        {getErrors.clrA3 && (
                          <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            {getErrors.clrA3}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Usage Summary - only for FSM lease and RENT (not EMI lease) */}
            {!isSimplifiedLease && (
              <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
                <div className="p-3 border-b border-border bg-slate-100/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Usage Summary
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Billing Period
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {formatDate(formData.billingPeriodStart)} to{' '}
                        {formatDate(formData.billingPeriodEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Rent Type
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {contract?.rentType?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Summary Rows */}
                  {ruleItems.combo ? (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-purple-600 uppercase mb-2">
                        Black & White & Color (Combined)
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Monthly Equivalent (Delta A4 + 2×Delta A3):
                          </span>
                          <span className="font-bold">
                            {(() => {
                              const prevA4 = prevUsage
                                ? prevUsage.bwA4Count
                                : calculatedInitialCounts.bwA4;
                              const prevA3 = prevUsage
                                ? prevUsage.bwA3Count
                                : calculatedInitialCounts.bwA3;
                              const deltaA4 = Math.max(0, Number(formData.bwA4Count || 0) - prevA4);
                              const deltaA3 = Math.max(0, Number(formData.bwA3Count || 0) - prevA3);

                              const prevClrA4 = prevUsage
                                ? prevUsage.colorA4Count
                                : calculatedInitialCounts.clrA4;
                              const prevClrA3 = prevUsage
                                ? prevUsage.colorA3Count
                                : calculatedInitialCounts.clrA3;
                              const deltaClrA4 = Math.max(
                                0,
                                Number(formData.colorA4Count || 0) - prevClrA4,
                              );
                              const deltaClrA3 = Math.max(
                                0,
                                Number(formData.colorA3Count || 0) - prevClrA3,
                              );

                              return (
                                deltaA4 +
                                deltaA3 * 2 +
                                deltaClrA4 +
                                deltaClrA3 * 2
                              ).toLocaleString();
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Excess Rate:</span>
                          <span className="font-bold">
                            {(() => {
                              const isCpc = contract?.rentType?.includes('CPC');
                              if (isCpc) {
                                const slabs = parseSlabs(ruleItems.combo?.comboSlabRanges);
                                if (slabs.length > 0) {
                                  const prevA4 = prevUsage
                                    ? prevUsage.bwA4Count
                                    : calculatedInitialCounts.bwA4;
                                  const prevA3 = prevUsage
                                    ? prevUsage.bwA3Count
                                    : calculatedInitialCounts.bwA3;
                                  const deltaA4 = Math.max(
                                    0,
                                    Number(formData.bwA4Count || 0) - prevA4,
                                  );
                                  const deltaA3 = Math.max(
                                    0,
                                    Number(formData.bwA3Count || 0) - prevA3,
                                  );

                                  const prevClrA4 = prevUsage
                                    ? prevUsage.colorA4Count
                                    : calculatedInitialCounts.clrA4;
                                  const prevClrA3 = prevUsage
                                    ? prevUsage.colorA3Count
                                    : calculatedInitialCounts.clrA3;
                                  const deltaClrA4 = Math.max(
                                    0,
                                    Number(formData.colorA4Count || 0) - prevClrA4,
                                  );
                                  const deltaClrA3 = Math.max(
                                    0,
                                    Number(formData.colorA3Count || 0) - prevClrA3,
                                  );

                                  const totalVolume =
                                    deltaA4 + deltaA3 * 2 + deltaClrA4 + deltaClrA3 * 2;

                                  // Find applicable slab
                                  const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
                                  let applicableRate = sortedSlabs[0]?.rate || 0;
                                  let applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;

                                  for (const slab of sortedSlabs) {
                                    if (totalVolume >= slab.from) {
                                      applicableRate = slab.rate;
                                      applicableRange =
                                        slab.to === 9999999
                                          ? `${slab.from}+`
                                          : `${slab.from}-${slab.to}`;
                                    }
                                  }
                                  return `₹${applicableRate} (${applicableRange} units)`;
                                }
                                return 'Slab-based';
                              }
                              return `₹${Number(ruleItems.combo?.combinedExcessRate || 0).toFixed(2)} / Unit`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between text-orange-600 font-medium border-t border-slate-100 pt-1 mt-1">
                          <span>Excess Charge:</span>
                          <span>
                            ₹
                            {(() => {
                              const bwA4 = Number(formData.bwA4Count || 0);
                              const bwA3 = Number(formData.bwA3Count || 0);
                              const prevA4 = prevUsage
                                ? prevUsage.bwA4Count
                                : calculatedInitialCounts.bwA4;
                              const prevA3 = prevUsage
                                ? prevUsage.bwA3Count
                                : calculatedInitialCounts.bwA3;

                              const clrA4 = Number(formData.colorA4Count || 0);
                              const clrA3 = Number(formData.colorA3Count || 0);
                              const prevClrA4 = prevUsage
                                ? prevUsage.colorA4Count
                                : calculatedInitialCounts.clrA4;
                              const prevClrA3 = prevUsage
                                ? prevUsage.colorA3Count
                                : calculatedInitialCounts.clrA3;

                              return calculateRuleCost(
                                ruleItems.combo,
                                bwA4 + clrA4,
                                bwA3 + clrA3,
                                prevA4 + prevClrA4,
                                prevA3 + prevClrA3,
                                'COMBO',
                                contract?.rentType,
                              ).charge.toFixed(2);
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isBw && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                            Black & White
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Monthly A4 Equivalent (Delta A4 + 2×Delta A3):
                              </span>
                              <span className="font-bold">
                                {(() => {
                                  const prevA4 = prevUsage
                                    ? prevUsage.bwA4Count
                                    : calculatedInitialCounts.bwA4;
                                  const prevA3 = prevUsage
                                    ? prevUsage.bwA3Count
                                    : calculatedInitialCounts.bwA3;
                                  const deltaA4 = Math.max(
                                    0,
                                    Number(formData.bwA4Count || 0) - prevA4,
                                  );
                                  const deltaA3 = Math.max(
                                    0,
                                    Number(formData.bwA3Count || 0) - prevA3,
                                  );
                                  return (deltaA4 + deltaA3 * 2).toLocaleString();
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Excess Rate:</span>
                              <span className="font-bold">
                                {(() => {
                                  const isCpc = contract?.rentType?.includes('CPC');
                                  if (isCpc) {
                                    const slabs = parseSlabs(ruleItems.bw?.bwSlabRanges);
                                    if (slabs.length > 0) {
                                      const prevA4 = prevUsage
                                        ? prevUsage.bwA4Count
                                        : calculatedInitialCounts.bwA4;
                                      const prevA3 = prevUsage
                                        ? prevUsage.bwA3Count
                                        : calculatedInitialCounts.bwA3;
                                      const deltaA4 = Math.max(
                                        0,
                                        Number(formData.bwA4Count || 0) - prevA4,
                                      );
                                      const deltaA3 = Math.max(
                                        0,
                                        Number(formData.bwA3Count || 0) - prevA3,
                                      );
                                      const totalVolume = deltaA4 + deltaA3 * 2;

                                      // Find applicable slab
                                      const sortedSlabs = [...slabs].sort(
                                        (a, b) => a.from - b.from,
                                      );
                                      let applicableRate = sortedSlabs[0]?.rate || 0;
                                      let applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;

                                      for (const slab of sortedSlabs) {
                                        if (totalVolume >= slab.from) {
                                          applicableRate = slab.rate;
                                          applicableRange =
                                            slab.to === 9999999
                                              ? `${slab.from}+`
                                              : `${slab.from}-${slab.to}`;
                                        }
                                      }
                                      return `₹${applicableRate} (${applicableRange} units)`;
                                    }
                                    return 'Slab-based';
                                  }
                                  return `₹${Number(ruleItems.bw?.bwExcessRate || 0).toFixed(2)} / Unit`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-orange-600 font-medium border-t border-slate-100 pt-1 mt-1">
                              <span>Excess Charge:</span>
                              <span>
                                ₹
                                {(() => {
                                  const bwA4 = Number(formData.bwA4Count || 0);
                                  const bwA3 = Number(formData.bwA3Count || 0);
                                  const prevA4 = prevUsage
                                    ? prevUsage.bwA4Count
                                    : calculatedInitialCounts.bwA4;
                                  const prevA3 = prevUsage
                                    ? prevUsage.bwA3Count
                                    : calculatedInitialCounts.bwA3;

                                  return calculateRuleCost(
                                    ruleItems.bw,
                                    bwA4,
                                    bwA3,
                                    prevA4,
                                    prevA3,
                                    'BW',
                                    contract?.rentType,
                                  ).charge.toFixed(2);
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {isColor && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-rose-600 uppercase mb-2">
                            Color
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Monthly A4 Equivalent (Delta A4 + 2×Delta A3):
                              </span>
                              <span className="font-bold">
                                {(() => {
                                  const prevA4 = prevUsage
                                    ? prevUsage.colorA4Count
                                    : calculatedInitialCounts.clrA4;
                                  const prevA3 = prevUsage
                                    ? prevUsage.colorA3Count
                                    : calculatedInitialCounts.clrA3;
                                  const deltaA4 = Math.max(
                                    0,
                                    Number(formData.colorA4Count || 0) - prevA4,
                                  );
                                  const deltaA3 = Math.max(
                                    0,
                                    Number(formData.colorA3Count || 0) - prevA3,
                                  );
                                  return (deltaA4 + deltaA3 * 2).toLocaleString();
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Excess Rate:</span>
                              <span className="font-bold">
                                {(() => {
                                  const isCpc = contract?.rentType?.includes('CPC');
                                  if (isCpc) {
                                    const slabs = parseSlabs(ruleItems.color?.colorSlabRanges);
                                    if (slabs.length > 0) {
                                      const prevA4 = prevUsage
                                        ? prevUsage.colorA4Count
                                        : calculatedInitialCounts.clrA4;
                                      const prevA3 = prevUsage
                                        ? prevUsage.colorA3Count
                                        : calculatedInitialCounts.clrA3;
                                      const deltaA4 = Math.max(
                                        0,
                                        Number(formData.colorA4Count || 0) - prevA4,
                                      );
                                      const deltaA3 = Math.max(
                                        0,
                                        Number(formData.colorA3Count || 0) - prevA3,
                                      );
                                      const totalVolume = deltaA4 + deltaA3 * 2;

                                      // Find applicable slab
                                      const sortedSlabs = [...slabs].sort(
                                        (a, b) => a.from - b.from,
                                      );
                                      let applicableRate = sortedSlabs[0]?.rate || 0;
                                      let applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;

                                      for (const slab of sortedSlabs) {
                                        if (totalVolume >= slab.from) {
                                          applicableRate = slab.rate;
                                          applicableRange =
                                            slab.to === 9999999
                                              ? `${slab.from}+`
                                              : `${slab.from}-${slab.to}`;
                                        }
                                      }
                                      return `₹${applicableRate} (${applicableRange} units)`;
                                    }
                                    return 'Slab-based';
                                  }
                                  return `₹${Number(ruleItems.color?.colorExcessRate || 0).toFixed(2)} / Unit`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-orange-600 font-medium border-t border-slate-100 pt-1 mt-1">
                              <span>Excess Charge:</span>
                              <span>
                                ₹
                                {(() => {
                                  const clrA4 = Number(formData.colorA4Count || 0);
                                  const clrA3 = Number(formData.colorA3Count || 0);
                                  const prevClrA4 = prevUsage
                                    ? prevUsage.colorA4Count
                                    : calculatedInitialCounts.clrA4;
                                  const prevClrA3 = prevUsage
                                    ? prevUsage.colorA3Count
                                    : calculatedInitialCounts.clrA3;

                                  return calculateRuleCost(
                                    ruleItems.color,
                                    clrA4,
                                    clrA3,
                                    prevClrA4,
                                    prevClrA3,
                                    'COLOR',
                                    contract?.rentType,
                                  ).charge.toFixed(2);
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center mt-2 text-xs">
                    <span className="text-slate-500">Monthly Rent</span>
                    <span className="font-bold text-slate-700">
                      {(() => {
                        const amount = Number(
                          contract?.monthlyRent ||
                          contract?.monthlyLeaseAmount ||
                          contract?.monthlyEmiAmount ||
                          0,
                        );

                        if (isLastMonth) {
                          const rentToShow = contract?.monthlyRent || 0;
                          // Always show rent (first month rent is now included)
                          return `₹${rentToShow.toLocaleString()} (Adv. will be adjusted)`;
                        }

                        return `₹${amount.toLocaleString()}`;
                      })()}
                    </span>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center mt-2">
                    <span className="font-bold text-sm text-slate-800">Grand Total</span>
                    <span className="font-bold text-lg text-green-600">
                      ₹{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {isSimplifiedLease
                  ? 'Payment Screenshot (Required for verification)'
                  : 'Meter Image (Required for verification)'}
              </Label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Finance remarks..."
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || hasErrors}
                className={
                  hasErrors ? 'bg-slate-300 pointer-events-none' : 'bg-blue-600 hover:bg-blue-700'
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Submit Record'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* {showPreview && contract && recordedUsageData && (
        <UsagePreviewDialog
          isOpen={showPreview && isOpen}
          onClose={() => {
            setShowPreview(false);
            onClose(); // Destroy the modal tree first
            onSuccess(); // Execute the deferred parent refresh
          }}
          invoice={contract}
          usageData={{
            bwA4Count: recordedUsageData.bwA4Count,
            bwA3Count: recordedUsageData.bwA3Count,
            colorA4Count: recordedUsageData.colorA4Count,
            colorA3Count: recordedUsageData.colorA3Count,
            bwA4Delta: recordedUsageData.bwA4Delta,
            bwA3Delta: recordedUsageData.bwA3Delta,
            colorA4Delta: recordedUsageData.colorA4Delta,
            colorA3Delta: recordedUsageData.colorA3Delta,
            billingPeriodStart: recordedUsageData.billingPeriodStart,
            billingPeriodEnd: recordedUsageData.billingPeriodEnd,
            meterImageUrl: recordedUsageData.meterImageUrl,
            remarks: recordedUsageData.remarks,
          }}
        />
      )} */}
    </>
  );
}
