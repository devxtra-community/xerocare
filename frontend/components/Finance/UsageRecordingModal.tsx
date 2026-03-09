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
} from '@/lib/invoice';
import { Product, getProductById } from '@/lib/product';
import { toast } from 'sonner';
import { Loader2, Calendar, Coins } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const { data: contract } = useQuery({
    queryKey: ['invoice', contractId || editingInvoice?.referenceContractId],
    queryFn: () => getInvoiceById(contractId || editingInvoice!.referenceContractId!),
    enabled: !!(contractId || editingInvoice?.referenceContractId),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['usage-history', contractId],
    queryFn: () => getUsageHistory(contractId),
    enabled: !!contractId,
  });

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recordedUsageData, setRecordedUsageData] = useState<RecordedUsageData | null>(null);

  const [formData, setFormData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    bwA4Count: '',
    bwA3Count: '',
    colorA4Count: '',
    colorA3Count: '',
    discountType: 'NONE' as 'NONE' | 'AMOUNT' | 'COPIES',
    discountAmount: '',
    discountBwCopies: '',
    discountColorCopies: '',
    remarks: '',
    items: [] as Array<{
      allocationId: string;
      serialNumber?: string;
      modelId?: string;
      startBwA4: number;
      endBwA4: number;
      startBwA3: number;
      endBwA3: number;
      startColorA4: number;
      endColorA4: number;
      startColorA3: number;
      endColorA3: number;
    }>,
  });
  const [file, setFile] = useState<File | null>(null);

  const isSimplifiedLease = contract?.saleType === 'LEASE' && contract?.leaseType !== 'FSM';

  React.useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
      setRecordedUsageData(null);
    }
  }, [isOpen]);

  // Hook Ordering Fix: Define memoized values used in effects first
  const prevUsage = React.useMemo(() => {
    if (!history.length || !formData.billingPeriodStart) return null;
    const currentStart = new Date(formData.billingPeriodStart);
    return history
      .filter((h) => new Date(h.periodStart) < currentStart && h.id !== editingInvoice?.id)
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
  }, [history, formData.billingPeriodStart, editingInvoice]);

  const activeAllocationInitialCounts = React.useMemo(() => {
    const allocs = contract?.productAllocations;
    if (!allocs) return null;
    const activeAlloc = allocs.find((a) => a.status === 'ALLOCATED' && a.replacementOfAllocationId);
    if (!activeAlloc) return null;
    return {
      bwA4: activeAlloc.initialBwA4 ?? 0,
      bwA3: activeAlloc.initialBwA3 ?? 0,
      clrA4: activeAlloc.initialColorA4 ?? 0,
      clrA3: activeAlloc.initialColorA3 ?? 0,
    };
  }, [contract?.productAllocations]);

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

  const effectivePrevCounts = React.useMemo(() => {
    // Determine active machine(s)
    const activeAllocs =
      contract?.productAllocations?.filter((a) => a.status === 'ALLOCATED') || [];

    // Priority 1: If we have previous usage record, try to get specific machine readings
    if (prevUsage) {
      // If there is exactly one active machine, use its reading from the previous record.
      if (activeAllocs.length === 1) {
        if (prevUsage.items && prevUsage.items.length > 0) {
          const activeItem = prevUsage.items.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (i: any) => i.allocationId === activeAllocs[0].id,
          );
          if (activeItem) {
            return {
              bwA4: activeItem.endBwA4 || 0,
              bwA3: activeItem.endBwA3 || 0,
              clrA4: activeItem.endColorA4 || 0,
              clrA3: activeItem.endColorA3 || 0,
              label: 'Prev',
            };
          }
        }

        // If it's the only machine but wasn't in the previous usage record's items list...
        // it means it was newly replaced THIS month. Fallback to its own initial counts.
        if (activeAllocationInitialCounts) {
          return {
            ...activeAllocationInitialCounts,
            label: 'Replaced Initial',
          };
        }
      }

      // If it's a multi-machine contract without itemized tracking, fallback to gross cumulative sum
      return {
        bwA4: prevUsage.bwA4Count || 0,
        bwA3: prevUsage.bwA3Count || 0,
        clrA4: prevUsage.colorA4Count || 0,
        clrA3: prevUsage.colorA3Count || 0,
        label: 'Prev',
      };
    }

    // Priority 2: If NO prevUsage exists (first month of contract), check if it's already a replacement
    if (activeAllocationInitialCounts) {
      return {
        ...activeAllocationInitialCounts,
        label: 'Replaced Initial',
      };
    }

    // Priority 3: Original contract initial counts
    return {
      ...calculatedInitialCounts,
      label: 'Initial',
    };
  }, [
    activeAllocationInitialCounts,
    prevUsage,
    calculatedInitialCounts,
    contract?.productAllocations,
  ]);

  React.useEffect(() => {
    if (editingInvoice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = editingInvoice as any;
      const start = (inv.billingPeriodStart || inv.periodStart || '').split('T')[0];
      const end = (inv.billingPeriodEnd || inv.periodEnd || '').split('T')[0];

      let initialDiscountType: 'NONE' | 'AMOUNT' | 'COPIES' = 'NONE';
      if (inv.discountAmount > 0) initialDiscountType = 'AMOUNT';
      else if (inv.discountBwCopies > 0 || inv.discountColorCopies > 0)
        initialDiscountType = 'COPIES';

      setFormData((prev) => ({
        ...prev,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        bwA4Count: String(inv.bwA4Count || 0),
        bwA3Count: String(inv.bwA3Count || 0),
        colorA4Count: String(inv.colorA4Count || 0),
        colorA3Count: String(inv.colorA3Count || 0),
        discountType: initialDiscountType,
        discountAmount: inv.discountAmount ? String(inv.discountAmount) : '',
        discountBwCopies: inv.discountBwCopies ? String(inv.discountBwCopies) : '',
        discountColorCopies: inv.discountColorCopies ? String(inv.discountColorCopies) : '',
        remarks: inv.financeRemarks || inv.remarks || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (inv.items || []).map((item: any) => ({
          allocationId: item.allocationId,
          serialNumber: item.allocation?.serialNumber,
          modelId: item.allocation?.modelId,
          startBwA4: item.startBwA4 || 0,
          endBwA4: item.endBwA4 || 0,
          startBwA3: item.startBwA3 || 0,
          endBwA3: item.endBwA3 || 0,
          startColorA4: item.startColorA4 || 0,
          endColorA4: item.endColorA4 || 0,
          startColorA3: item.startColorA3 || 0,
          endColorA3: item.endColorA3 || 0,
        })),
      }));

      if (contract) {
        // Fix formData initialized values if there's exactly one active machine
        const activeAllocs =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contract.productAllocations?.filter((pa: any) => pa.status === 'ALLOCATED') || [];
        if (activeAllocs.length === 1) {
          const activeId = activeAllocs[0].id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeItem = inv.items?.find((i: any) => i.allocationId === activeId);
          if (activeItem) {
            setFormData((prev) => ({
              ...prev,
              bwA4Count: String(activeItem.endBwA4 || 0),
              bwA3Count: String(activeItem.endBwA3 || 0),
              colorA4Count: String(activeItem.endColorA4 || 0),
              colorA3Count: String(activeItem.endColorA3 || 0),
            }));
          }
        }
      }
    } else if (contract) {
      // Use the contract's actual billing period (effectiveFrom to effectiveTo)
      const startStr = contract.effectiveFrom?.split('T')[0] || '';
      const endStr = contract.effectiveTo?.split('T')[0] || '';

      setFormData((prev) => ({
        ...prev,
        billingPeriodStart: startStr,
        billingPeriodEnd: endStr,
        items: (contract.productAllocations || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((a: any) => {
            if (a.status === 'ALLOCATED') return true;
            if (a.status === 'REPLACED' && a.endTimestamp) {
              return true;
            }
            return false;
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) => ({
            allocationId: a.id,
            serialNumber: a.serialNumber,
            modelId: a.modelId,
            startBwA4:
              a.status === 'ALLOCATED'
                ? effectivePrevCounts?.bwA4 || a.initialBwA4 || 0
                : a.initialBwA4 || 0,
            endBwA4: a.status === 'ALLOCATED' ? a.currentBwA4 || 0 : a.currentBwA4 || 0,
            startBwA3:
              a.status === 'ALLOCATED'
                ? effectivePrevCounts?.bwA3 || a.initialBwA3 || 0
                : a.initialBwA3 || 0,
            endBwA3: a.status === 'ALLOCATED' ? a.currentBwA3 || 0 : a.currentBwA3 || 0,
            startColorA4:
              a.status === 'ALLOCATED'
                ? effectivePrevCounts?.clrA4 || a.initialColorA4 || 0
                : a.initialColorA4 || 0,
            endColorA4: a.status === 'ALLOCATED' ? a.currentColorA4 || 0 : a.currentColorA4 || 0,
            startColorA3:
              a.status === 'ALLOCATED'
                ? effectivePrevCounts?.clrA3 || a.initialColorA3 || 0
                : a.initialColorA3 || 0,
            endColorA3: a.status === 'ALLOCATED' ? a.currentColorA3 || 0 : a.currentColorA3 || 0,
          })),
      }));
    }
  }, [contract, editingInvoice, effectivePrevCounts]);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (last.items || []).map((item: any) => ({
          allocationId: item.allocationId,
          serialNumber: item.allocation?.serialNumber,
          modelId: item.allocation?.modelId,
          startBwA4: item.endBwA4 || 0, // previous end is current start
          endBwA4: item.endBwA4 || 0,
          startBwA3: item.endBwA3 || 0,
          endBwA3: item.endBwA3 || 0,
          startColorA4: item.endColorA4 || 0,
          endColorA4: item.endColorA4 || 0,
          startColorA3: item.endColorA3 || 0,
          endColorA3: item.endColorA3 || 0,
        })),
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

  // Calculate usage of any devices that were replaced *during* this billing period
  const replacedDeltas = React.useMemo(() => {
    const deltas = {
      bwA4: 0,
      bwA3: 0,
      clrA4: 0,
      clrA3: 0,
      machines: [] as Array<{
        serialNumber: string;
        bwDelta: number;
        clrDelta: number;
        bwA4: number;
        bwA3: number;
        clrA4: number;
        clrA3: number;
      }>,
    };

    if (
      !contract?.productAllocations ||
      !formData.billingPeriodStart ||
      !formData.billingPeriodEnd
    ) {
      return deltas;
    }

    const startPeriod = new Date(formData.billingPeriodStart).getTime();
    const endPeriod = new Date(formData.billingPeriodEnd).getTime();

    contract.productAllocations
      .filter((a) => {
        // @ts-expect-error DB field not in frontend type
        if (a.status !== 'REPLACED' || !a.endTimestamp) return false;
        // @ts-expect-error DB field not in frontend type
        const endTs = new Date(a.endTimestamp).getTime();
        return endTs >= startPeriod && endTs <= endPeriod;
      })
      .forEach((allocation) => {
        // @ts-expect-error DB field not in frontend type
        const allocStartTs = new Date(allocation.startTimestamp).getTime();

        const startBwA4 =
          allocStartTs < startPeriod && prevUsage
            ? prevUsage.bwA4Count
            : allocation.initialBwA4 || 0;
        const startBwA3 =
          allocStartTs < startPeriod && prevUsage
            ? prevUsage.bwA3Count
            : allocation.initialBwA3 || 0;
        const startClrA4 =
          allocStartTs < startPeriod && prevUsage
            ? prevUsage.colorA4Count
            : allocation.initialColorA4 || 0;
        const startClrA3 =
          allocStartTs < startPeriod && prevUsage
            ? prevUsage.colorA3Count
            : allocation.initialColorA3 || 0;

        const finalBwA4 = allocation.currentBwA4 || 0;
        const finalBwA3 = allocation.currentBwA3 || 0;
        const finalClrA4 = allocation.currentColorA4 || 0;
        const finalClrA3 = allocation.currentColorA3 || 0;

        const mBwA4 = Math.max(0, finalBwA4 - startBwA4);
        const mBwA3 = Math.max(0, finalBwA3 - startBwA3);
        const mClrA4 = Math.max(0, finalClrA4 - startClrA4);
        const mClrA3 = Math.max(0, finalClrA3 - startClrA3);

        const bwDelta = mBwA4 + mBwA3 * 2;
        const clrDelta = mClrA4 + mClrA3 * 2;

        deltas.bwA4 += mBwA4;
        deltas.bwA3 += mBwA3;
        deltas.clrA4 += mClrA4;
        deltas.clrA3 += mClrA3;

        deltas.machines.push({
          serialNumber: allocation.serialNumber,
          bwDelta,
          clrDelta,
          bwA4: mBwA4,
          bwA3: mBwA3,
          clrA4: mClrA4,
          clrA3: mClrA3,
        });
      });

    return deltas;
  }, [
    contract?.productAllocations,
    formData.billingPeriodStart,
    formData.billingPeriodEnd,
    prevUsage,
  ]);

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
      (i) =>
        (i.colorIncludedLimit ?? 0) > 0 ||
        (i.colorExcessRate ?? 0) > 0 ||
        hasSlabs(i.colorSlabRanges),
    );
    const mergedCombo = contract.items.find(
      (i) =>
        (i.combinedIncludedLimit ?? 0) > 0 ||
        (i.combinedExcessRate ?? 0) > 0 ||
        hasSlabs(i.comboSlabRanges),
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
    // For combo contracts, input is shown inside the combo block — not separately
    if (ruleItems.combo) return false;
    if (ruleItems.bw) return true;
    if (products.some((p) => p.print_colour === 'BLACK_WHITE' || p.print_colour === 'BOTH'))
      return true;
    return !isColorDetected && !!contract;
  }, [ruleItems, products, isColorDetected, contract]);

  const isColor = React.useMemo(() => {
    // For combo contracts, color input is merged into the combo block
    if (ruleItems.combo) return false;
    if (ruleItems.color) return true;
    return products.some((p) => p.print_colour === 'COLOUR' || p.print_colour === 'BOTH');
  }, [ruleItems, products]);

  // For reading panels: show BW/Color panels whenever any rule requires those readings
  const showBwReading = React.useMemo(() => {
    if (ruleItems.bw || ruleItems.combo) return true;
    if (products.some((p) => p.print_colour === 'BLACK_WHITE' || p.print_colour === 'BOTH'))
      return true;
    return !isColorDetected && !!contract;
  }, [ruleItems, products, isColorDetected, contract]);

  const showColorReading = React.useMemo(() => {
    if (ruleItems.color || ruleItems.combo) return true;
    return products.some((p) => p.print_colour === 'COLOUR' || p.print_colour === 'BOTH');
  }, [ruleItems, products]);

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
      if (count <= 0) return 0;
      const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
      // Flat-rate model: find whichever slab the count falls into, apply that rate to ALL copies
      let applicableRate = sortedSlabs[0]?.rate || 0;
      for (const slab of sortedSlabs) {
        if (count >= slab.from) {
          applicableRate = slab.rate;
        }
      }
      return count * Number(applicableRate);
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
      discountCopies: number = 0,
      // For COMBO: pass color counts separately to avoid cross-contamination with BW prev
      colorCountA4?: number,
      colorCountA3?: number,
      prevColorA4?: number,
      prevColorA3?: number,
      replacedDeltasToInclude?: { bwA4: number; bwA3: number; clrA4: number; clrA3: number },
    ) => {
      if (!ruleItem) return { charge: 0, totalDelta: 0, limit: 0, rate: 0 };

      let totalDeltaEquiv: number;
      if (type === 'COMBO' && colorCountA4 !== undefined) {
        // Compute BW and Color deltas independently to avoid cross-contamination
        const bwDeltaA4 = Math.max(0, countA4 - prevA4) + (replacedDeltasToInclude?.bwA4 || 0);
        const bwDeltaA3 = Math.max(0, countA3 - prevA3) + (replacedDeltasToInclude?.bwA3 || 0);
        const clrDeltaA4 =
          Math.max(0, (colorCountA4 || 0) - (prevColorA4 || 0)) +
          (replacedDeltasToInclude?.clrA4 || 0);
        const clrDeltaA3 =
          Math.max(0, (colorCountA3 || 0) - (prevColorA3 || 0)) +
          (replacedDeltasToInclude?.clrA3 || 0);
        totalDeltaEquiv = Math.max(
          0,
          bwDeltaA4 + bwDeltaA3 * 2 + clrDeltaA4 + clrDeltaA3 * 2 - discountCopies,
        );
      } else {
        const rA4 =
          type === 'COLOR'
            ? replacedDeltasToInclude?.clrA4 || 0
            : type === 'BW'
              ? replacedDeltasToInclude?.bwA4 || 0
              : 0;
        const rA3 =
          type === 'COLOR'
            ? replacedDeltasToInclude?.clrA3 || 0
            : type === 'BW'
              ? replacedDeltasToInclude?.bwA3 || 0
              : 0;
        const deltaA4 = Math.max(0, countA4 - prevA4) + rA4;
        const deltaA3 = Math.max(0, countA3 - prevA3) + rA3;
        totalDeltaEquiv = Math.max(0, deltaA4 + deltaA3 * 2 - discountCopies);
      }

      if (rentType?.includes('CPC')) {
        const slabs = parseSlabs(
          type === 'BW'
            ? ruleItem.bwSlabRanges
            : type === 'COLOR'
              ? ruleItem.colorSlabRanges
              : ruleItem.comboSlabRanges,
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

    const prevBwA4 = effectivePrevCounts.bwA4;
    const prevBwA3 = effectivePrevCounts.bwA3;
    const prevClrA4 = effectivePrevCounts.clrA4;
    const prevClrA3 = effectivePrevCounts.clrA3;

    if (ruleItems.combo) {
      const breakdown = calculateRuleCost(
        ruleItems.combo,
        bwA4, // BW A4 only
        bwA3, // BW A3 only
        prevBwA4,
        prevBwA3,
        'COMBO',
        contract.rentType,
        formData.discountType === 'COPIES'
          ? Number(formData.discountBwCopies || 0) + Number(formData.discountColorCopies || 0)
          : 0,
        clrA4, // Color A4 separately
        clrA3, // Color A3 separately
        prevClrA4, // Prev color A4
        prevClrA3, // Prev color A3
        replacedDeltas,
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
          formData.discountType === 'COPIES' ? Number(formData.discountBwCopies || 0) : 0,
          undefined,
          undefined,
          undefined,
          undefined,
          replacedDeltas,
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
          formData.discountType === 'COPIES' ? Number(formData.discountColorCopies || 0) : 0,
          undefined,
          undefined,
          undefined,
          undefined,
          replacedDeltas,
        );
        totalAmount += breakdown.charge;
      }
    }

    if (formData.discountType === 'AMOUNT') {
      totalAmount = Math.max(0, totalAmount - Number(formData.discountAmount || 0));
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
    effectivePrevCounts,
    replacedDeltas,
  ]);

  // Real-time error detection for UI feedback
  const getErrors = React.useMemo(() => {
    const errs: Record<string, string> = {};
    const bwA4 = Number(formData.bwA4Count || 0);
    const bwA3 = Number(formData.bwA3Count || 0);
    const clrA4 = Number(formData.colorA4Count || 0);
    const clrA3 = Number(formData.colorA3Count || 0);

    const prevBwA4 = effectivePrevCounts.bwA4;
    const prevBwA3 = effectivePrevCounts.bwA3;
    const prevClrA4 = effectivePrevCounts.clrA4;
    const prevClrA3 = effectivePrevCounts.clrA3;

    if (!isSimplifiedLease) {
      if (bwA4 > 0 && bwA4 < prevBwA4) errs.bwA4 = `Cannot be less than ${prevBwA4}`;
      if (bwA3 > 0 && bwA3 < prevBwA3) errs.bwA3 = `Cannot be less than ${prevBwA3}`;
      if (clrA4 > 0 && clrA4 < prevClrA4) errs.clrA4 = `Cannot be less than ${prevClrA4}`;
      if (clrA3 > 0 && clrA3 < prevClrA3) errs.clrA3 = `Cannot be less than ${prevClrA3}`;
    }

    // check zero usage if all are touched or not (maybe just block at submit for zero usage)
    return errs;
  }, [formData, effectivePrevCounts, isSimplifiedLease]);

  const hasErrors = Object.keys(getErrors).length > 0;

  const validateReadings = () => {
    const errors: string[] = [];

    const bwA4 = Number(formData.bwA4Count || 0);
    const bwA3 = Number(formData.bwA3Count || 0);
    const clrA4 = Number(formData.colorA4Count || 0);
    const clrA3 = Number(formData.colorA3Count || 0);

    const prevBwA4 = effectivePrevCounts.bwA4;
    const prevBwA3 = effectivePrevCounts.bwA3;
    const prevClrA4 = effectivePrevCounts.clrA4;
    const prevClrA3 = effectivePrevCounts.clrA3;

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
        const discountCopies =
          formData.discountType === 'COPIES'
            ? Number(formData.discountBwCopies || 0) + Number(formData.discountColorCopies || 0)
            : 0;
        let calculatedDiscountAmount =
          formData.discountType === 'AMOUNT' ? Number(formData.discountAmount || 0) : 0;

        if (formData.discountType === 'COPIES' && discountCopies > 0) {
          // Calculate Gross Usage Delta for Slab Detection
          const grossBwA4 = Number(formData.bwA4Count || 0) + replacedDeltas.bwA4;
          const grossBwA3 = Number(formData.bwA3Count || 0) + replacedDeltas.bwA3;
          const grossClrA4 = Number(formData.colorA4Count || 0) + replacedDeltas.clrA4;
          const grossClrA3 = Number(formData.colorA3Count || 0) + replacedDeltas.clrA3;

          const grossUsageDelta =
            grossBwA4 -
            effectivePrevCounts.bwA4 +
            (grossBwA3 - effectivePrevCounts.bwA3) * 2 +
            (grossClrA4 - effectivePrevCounts.clrA4 + (grossClrA3 - effectivePrevCounts.clrA3) * 2);

          const slabs = parseSlabs(
            ruleItems.combo?.comboSlabRanges ||
              ruleItems.bw?.bwSlabRanges ||
              ruleItems.color?.colorSlabRanges,
          );
          let rate = 0;
          if (slabs.length > 0) {
            const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
            rate = sortedSlabs[0]?.rate || 0;
            for (const s of sortedSlabs) {
              if (grossUsageDelta >= s.from) rate = Number(s.rate);
            }
          } else {
            rate = Number(
              ruleItems.combo?.combinedExcessRate ||
                ruleItems.bw?.bwExcessRate ||
                ruleItems.color?.colorExcessRate ||
                0,
            );
          }
          calculatedDiscountAmount = discountCopies * rate;
        }

        await updateUsageRecord(editingInvoice.id, {
          bwA4Count: Number(formData.bwA4Count),
          bwA3Count: Number(formData.bwA3Count),
          colorA4Count: Number(formData.colorA4Count),
          colorA3Count: Number(formData.colorA3Count),
          billingPeriodEnd: formData.billingPeriodEnd,
          discountAmount: calculatedDiscountAmount,
          discountBwCopies:
            formData.discountType === 'COPIES' ? Number(formData.discountBwCopies) : 0,
          discountColorCopies:
            formData.discountType === 'COPIES' ? Number(formData.discountColorCopies) : 0,
          items: formData.items,
        });
        toast.success('Usage record updated successfully');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['usage-history', contractId] });
        queryClient.invalidateQueries({
          queryKey: ['invoice', contractId || editingInvoice?.referenceContractId],
        });
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
        const discountCopies =
          formData.discountType === 'COPIES'
            ? Number(formData.discountBwCopies || 0) + Number(formData.discountColorCopies || 0)
            : 0;
        let calculatedDiscountAmount =
          formData.discountType === 'AMOUNT' ? Number(formData.discountAmount || 0) : 0;

        if (formData.discountType === 'COPIES' && discountCopies > 0) {
          // Calculate Gross Usage Delta for Slab Detection
          const grossBwA4 = Number(formData.bwA4Count || 0) + replacedDeltas.bwA4;
          const grossBwA3 = Number(formData.bwA3Count || 0) + replacedDeltas.bwA3;
          const grossClrA4 = Number(formData.colorA4Count || 0) + replacedDeltas.clrA4;
          const grossClrA3 = Number(formData.colorA3Count || 0) + replacedDeltas.clrA3;

          const grossUsageDelta =
            grossBwA4 -
            effectivePrevCounts.bwA4 +
            (grossBwA3 - effectivePrevCounts.bwA3) * 2 +
            (grossClrA4 - effectivePrevCounts.clrA4 + (grossClrA3 - effectivePrevCounts.clrA3) * 2);

          const slabs = parseSlabs(
            ruleItems.combo?.comboSlabRanges ||
              ruleItems.bw?.bwSlabRanges ||
              ruleItems.color?.colorSlabRanges,
          );
          let rate = 0;
          if (slabs.length > 0) {
            const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
            rate = sortedSlabs[0]?.rate || 0;
            for (const s of sortedSlabs) {
              if (grossUsageDelta >= s.from) rate = Number(s.rate);
            }
          } else {
            rate = Number(
              ruleItems.combo?.combinedExcessRate ||
                ruleItems.bw?.bwExcessRate ||
                ruleItems.color?.colorExcessRate ||
                0,
            );
          }
          calculatedDiscountAmount = discountCopies * rate;
        }

        if (calculatedDiscountAmount > 0) {
          payload.append('discountAmount', String(calculatedDiscountAmount));
        }
        if (formData.discountType === 'COPIES') {
          payload.append('discountBwCopies', String(formData.discountBwCopies || 0));
          payload.append('discountColorCopies', String(formData.discountColorCopies || 0));
        }
        payload.append('remarks', formData.remarks);
        payload.append('reportedBy', 'EMPLOYEE');

        if (formData.items && formData.items.length > 0) {
          payload.append('items', JSON.stringify(formData.items));
        }

        if (file) {
          payload.append('file', file);
        }

        const response = await recordUsage(payload);
        toast.success('Usage recorded successfully');

        toast.success('Usage recorded successfully');

        const prevBwA4 = effectivePrevCounts.bwA4;
        const prevBwA3 = effectivePrevCounts.bwA3;
        const prevClrA4 = effectivePrevCounts.clrA4;
        const prevClrA3 = effectivePrevCounts.clrA3;

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
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['usage-history', contractId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', contractId] });
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
            {!contract?.rentType?.includes('CPC') && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                  <Coins size={16} /> {isSimplifiedLease ? 'EMI Info' : 'Rent Info'}
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
            )}

            {/* Last Month Alert */}
            {isLastMonth && !contract?.rentType?.includes('CPC') && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span className="text-amber-500 text-lg">⚠️</span> Last Month of Contract
                </h3>
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
                {showBwReading && (
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
                            {ruleItems.combo ? 'Combined Total Limit' : 'Free Limit'}:{' '}
                            <span className="font-bold text-slate-700">
                              {Number(
                                ruleItems.combo?.combinedIncludedLimit ||
                                  ruleItems.bw?.bwIncludedLimit ||
                                  0,
                              ).toLocaleString()}
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
                                  ruleItems.bw?.bwSlabRanges || ruleItems.combo?.comboSlabRanges,
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
                              return `QAR ${Number(ruleItems.bw?.bwExcessRate || ruleItems.combo?.combinedExcessRate || 0).toFixed(2)}`;
                            })()}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A4 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {effectivePrevCounts.label}: {effectivePrevCounts.bwA4}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.bwA4Count || 0) - effectivePrevCounts.bwA4,
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.bwA4Count}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const activeAllocs = prev.items.filter((item) => {
                                const a = contract?.productAllocations?.find(
                                  (pa) => pa.id === item.allocationId,
                                );
                                return a?.status === 'ALLOCATED';
                              });

                              return {
                                ...prev,
                                bwA4Count: val,
                                items: prev.items.map((item) => {
                                  // Only auto-update items if there's exactly one active machine
                                  if (
                                    activeAllocs.length === 1 &&
                                    item.allocationId === activeAllocs[0].allocationId
                                  ) {
                                    return { ...item, endBwA4: Number(val || 0) };
                                  }
                                  return item;
                                }),
                              };
                            });
                          }}
                          readOnly={
                            formData.items.filter((i) => {
                              const a = contract?.productAllocations?.find(
                                (pa) => pa.id === i.allocationId,
                              );
                              return a?.status === 'ALLOCATED';
                            }).length > 1
                          }
                          className={
                            getErrors.bwA4
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : formData.items.filter((i) => {
                                    const a = contract?.productAllocations?.find(
                                      (pa) => pa.id === i.allocationId,
                                    );
                                    return a?.status === 'ALLOCATED';
                                  }).length > 1
                                ? 'bg-slate-100 cursor-not-allowed opacity-70'
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
                              {effectivePrevCounts.label}: {effectivePrevCounts.bwA3}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.bwA3Count || 0) - effectivePrevCounts.bwA3,
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.bwA3Count}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const activeAllocs = prev.items.filter((item) => {
                                const a = contract?.productAllocations?.find(
                                  (pa) => pa.id === item.allocationId,
                                );
                                return a?.status === 'ALLOCATED';
                              });

                              return {
                                ...prev,
                                bwA3Count: val,
                                items: prev.items.map((item) => {
                                  if (
                                    activeAllocs.length === 1 &&
                                    item.allocationId === activeAllocs[0].allocationId
                                  ) {
                                    return { ...item, endBwA3: Number(val || 0) };
                                  }
                                  return item;
                                }),
                              };
                            });
                          }}
                          readOnly={
                            formData.items.filter((i) => {
                              const a = contract?.productAllocations?.find(
                                (pa) => pa.id === i.allocationId,
                              );
                              return a?.status === 'ALLOCATED';
                            }).length > 1
                          }
                          className={
                            getErrors.bwA3
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : formData.items.filter((i) => {
                                    const a = contract?.productAllocations?.find(
                                      (pa) => pa.id === i.allocationId,
                                    );
                                    return a?.status === 'ALLOCATED';
                                  }).length > 1
                                ? 'bg-slate-100 cursor-not-allowed opacity-70'
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

                {showColorReading && (
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
                            {ruleItems.combo ? 'Combined Total Limit' : 'Free Limit'}:{' '}
                            <span className="font-bold text-rose-700">
                              {Number(
                                ruleItems.combo?.combinedIncludedLimit ||
                                  ruleItems.color?.colorIncludedLimit ||
                                  0,
                              ).toLocaleString()}
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
                                    ruleItems.combo?.comboSlabRanges,
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
                              return `QAR ${Number(ruleItems.color?.colorExcessRate || ruleItems.combo?.combinedExcessRate || 0).toFixed(2)}`;
                            })()}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-xs font-semibold">A4 Current Reading</Label>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-600 block">
                              {effectivePrevCounts.label}: {effectivePrevCounts.clrA4}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.colorA4Count || 0) - effectivePrevCounts.clrA4,
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.colorA4Count}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const activeAllocs = prev.items.filter((item) => {
                                const a = contract?.productAllocations?.find(
                                  (pa) => pa.id === item.allocationId,
                                );
                                return a?.status === 'ALLOCATED';
                              });

                              return {
                                ...prev,
                                colorA4Count: val,
                                items: prev.items.map((item) => {
                                  if (
                                    activeAllocs.length === 1 &&
                                    item.allocationId === activeAllocs[0].allocationId
                                  ) {
                                    return { ...item, endColorA4: Number(val || 0) };
                                  }
                                  return item;
                                }),
                              };
                            });
                          }}
                          readOnly={
                            formData.items.filter((i) => {
                              const a = contract?.productAllocations?.find(
                                (pa) => pa.id === i.allocationId,
                              );
                              return a?.status === 'ALLOCATED';
                            }).length > 1
                          }
                          className={
                            getErrors.clrA4
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : formData.items.filter((i) => {
                                    const a = contract?.productAllocations?.find(
                                      (pa) => pa.id === i.allocationId,
                                    );
                                    return a?.status === 'ALLOCATED';
                                  }).length > 1
                                ? 'bg-slate-100 cursor-not-allowed opacity-70'
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
                              {effectivePrevCounts.label}: {effectivePrevCounts.clrA3}
                            </span>
                            <span className="text-[10px] text-green-600 font-bold block">
                              Usage:{' '}
                              {Math.max(
                                0,
                                Number(formData.colorA3Count || 0) - effectivePrevCounts.clrA3,
                              )}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          value={formData.colorA3Count}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const activeAllocs = prev.items.filter((item) => {
                                const a = contract?.productAllocations?.find(
                                  (pa) => pa.id === item.allocationId,
                                );
                                return a?.status === 'ALLOCATED';
                              });

                              return {
                                ...prev,
                                colorA3Count: val,
                                items: prev.items.map((item) => {
                                  if (
                                    activeAllocs.length === 1 &&
                                    item.allocationId === activeAllocs[0].allocationId
                                  ) {
                                    return { ...item, endColorA3: Number(val || 0) };
                                  }
                                  return item;
                                }),
                              };
                            });
                          }}
                          readOnly={
                            formData.items.filter((i) => {
                              const a = contract?.productAllocations?.find(
                                (pa) => pa.id === i.allocationId,
                              );
                              return a?.status === 'ALLOCATED';
                            }).length > 1
                          }
                          className={
                            getErrors.clrA3
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/50'
                              : formData.items.filter((i) => {
                                    const a = contract?.productAllocations?.find(
                                      (pa) => pa.id === i.allocationId,
                                    );
                                    return a?.status === 'ALLOCATED';
                                  }).length > 1
                                ? 'bg-slate-100 cursor-not-allowed opacity-70'
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

            {/* Discount Options Section */}
            {!isSimplifiedLease && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 pb-2 border-b flex items-center gap-2">
                  🎁 Apply Discount (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <select
                      className="w-full p-2 border border-slate-300 rounded-md"
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value as 'NONE' | 'AMOUNT' | 'COPIES',
                        })
                      }
                    >
                      <option value="NONE">None</option>
                      <option value="AMOUNT">By Amount (QAR)</option>
                      <option value="COPIES">By Copies (A4 Equivalent)</option>
                    </select>
                  </div>
                  {formData.discountType === 'AMOUNT' && (
                    <div className="space-y-2">
                      <Label>Discount Amount (QAR)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.discountAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, discountAmount: e.target.value })
                        }
                        placeholder="e.g. 50"
                      />
                    </div>
                  )}
                </div>
                {formData.discountType === 'COPIES' && (
                  <div className="grid grid-cols-2 gap-4">
                    {ruleItems.combo ? (
                      // COMBO: single combined discount input
                      <div className="space-y-2 col-span-2">
                        <Label>Total Copies Discount (A4 Equivalent)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.discountBwCopies}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discountBwCopies: e.target.value,
                              discountColorCopies: '0',
                            })
                          }
                          placeholder="e.g. 500"
                        />
                      </div>
                    ) : (
                      <>
                        {isBw && (
                          <div className="space-y-2">
                            <Label>B&W Copies Discount</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.discountBwCopies}
                              onChange={(e) =>
                                setFormData({ ...formData, discountBwCopies: e.target.value })
                              }
                              placeholder="e.g. 500"
                            />
                          </div>
                        )}
                        {/* Only show color discount if there is an actual color rule */}
                        {ruleItems.color && (
                          <div className="space-y-2">
                            <Label>Color Copies Discount</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.discountColorCopies}
                              onChange={(e) =>
                                setFormData({ ...formData, discountColorCopies: e.target.value })
                              }
                              placeholder="e.g. 100"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isSimplifiedLease &&
              formData.items.filter((i) => {
                const a = contract?.productAllocations?.find((pa) => pa.id === i.allocationId);
                return a?.status === 'ALLOCATED';
              }).length > 1 && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 pb-2 border-b flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Machine-Wise Readings (Required)
                  </h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {formData.items
                      .filter((item) => {
                        const a = contract?.productAllocations?.find(
                          (pa) => pa.id === item.allocationId,
                        );
                        return a?.status === 'ALLOCATED';
                      })
                      .map((item, idx) => (
                        <div
                          key={item.allocationId}
                          className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-600">
                              Machine #{idx + 1}: {item.serialNumber || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.modelId}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* BW Section */}
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-500">
                                B&W Readings
                              </Label>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-orange-600">Prev A4: {item.startBwA4}</span>
                                  <span className="text-green-600 font-bold">
                                    Delta: {Math.max(0, (item.endBwA4 || 0) - item.startBwA4)}
                                  </span>
                                </div>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  placeholder="A4 Reading"
                                  value={item.endBwA4 || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value || 0);
                                    setFormData((prev) => {
                                      const newItems = prev.items.map((it) =>
                                        it.allocationId === item.allocationId
                                          ? { ...it, endBwA4: val }
                                          : it,
                                      );
                                      const newSum = newItems.reduce((acc, it) => {
                                        const a = contract?.productAllocations?.find(
                                          (pa) => pa.id === it.allocationId,
                                        );
                                        return a?.status === 'ALLOCATED'
                                          ? acc + (it.endBwA4 || 0)
                                          : acc;
                                      }, 0);
                                      return {
                                        ...prev,
                                        items: newItems,
                                        bwA4Count: String(newSum),
                                      };
                                    });
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-orange-600">Prev A3: {item.startBwA3}</span>
                                  <span className="text-green-600 font-bold">
                                    Delta: {Math.max(0, (item.endBwA3 || 0) - item.startBwA3)}
                                  </span>
                                </div>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  placeholder="A3 Reading"
                                  value={item.endBwA3 || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value || 0);
                                    setFormData((prev) => {
                                      const newItems = prev.items.map((it) =>
                                        it.allocationId === item.allocationId
                                          ? { ...it, endBwA3: val }
                                          : it,
                                      );
                                      const newSum = newItems.reduce((acc, it) => {
                                        const a = contract?.productAllocations?.find(
                                          (pa) => pa.id === it.allocationId,
                                        );
                                        return a?.status === 'ALLOCATED'
                                          ? acc + (it.endBwA3 || 0)
                                          : acc;
                                      }, 0);
                                      return {
                                        ...prev,
                                        items: newItems,
                                        bwA3Count: String(newSum),
                                      };
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            {/* Color Section */}
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-rose-500">
                                Color Readings
                              </Label>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-orange-600">
                                    Prev A4: {item.startColorA4}
                                  </span>
                                  <span className="text-green-600 font-bold">
                                    Delta: {Math.max(0, (item.endColorA4 || 0) - item.startColorA4)}
                                  </span>
                                </div>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  placeholder="A4 Reading"
                                  value={item.endColorA4 || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value || 0);
                                    setFormData((prev) => {
                                      const newItems = prev.items.map((it) =>
                                        it.allocationId === item.allocationId
                                          ? { ...it, endColorA4: val }
                                          : it,
                                      );
                                      const newSum = newItems.reduce((acc, it) => {
                                        const a = contract?.productAllocations?.find(
                                          (pa) => pa.id === it.allocationId,
                                        );
                                        return a?.status === 'ALLOCATED'
                                          ? acc + (it.endColorA4 || 0)
                                          : acc;
                                      }, 0);
                                      return {
                                        ...prev,
                                        items: newItems,
                                        colorA4Count: String(newSum),
                                      };
                                    });
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-orange-600">
                                    Prev A3: {item.startColorA3}
                                  </span>
                                  <span className="text-green-600 font-bold">
                                    Delta: {Math.max(0, (item.endColorA3 || 0) - item.startColorA3)}
                                  </span>
                                </div>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  placeholder="A3 Reading"
                                  value={item.endColorA3 || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value || 0);
                                    setFormData((prev) => {
                                      const newItems = prev.items.map((it) =>
                                        it.allocationId === item.allocationId
                                          ? { ...it, endColorA3: val }
                                          : it,
                                      );
                                      const newSum = newItems.reduce((acc, it) => {
                                        const a = contract?.productAllocations?.find(
                                          (pa) => pa.id === it.allocationId,
                                        );
                                        return a?.status === 'ALLOCATED'
                                          ? acc + (it.endColorA3 || 0)
                                          : acc;
                                      }, 0);
                                      return {
                                        ...prev,
                                        items: newItems,
                                        colorA3Count: String(newSum),
                                      };
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
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
                      <div className="space-y-1 text-xs pt-1">
                        {/* Summary breakdown is now handled in the standardized section below */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          {(() => {
                            const isCpc = contract?.rentType?.includes('CPC');
                            const slabs = parseSlabs(ruleItems.combo?.comboSlabRanges);
                            const currentDeltaA4 = Math.max(
                              0,
                              Number(formData.bwA4Count || 0) - effectivePrevCounts.bwA4,
                            );
                            const currentDeltaA3 = Math.max(
                              0,
                              Number(formData.bwA3Count || 0) - effectivePrevCounts.bwA3,
                            );
                            const currentDeltaClrA4 = Math.max(
                              0,
                              Number(formData.colorA4Count || 0) - effectivePrevCounts.clrA4,
                            );
                            const currentDeltaClrA3 = Math.max(
                              0,
                              Number(formData.colorA3Count || 0) - effectivePrevCounts.clrA3,
                            );

                            const currentVolume =
                              currentDeltaA4 +
                              currentDeltaA3 * 2 +
                              currentDeltaClrA4 +
                              currentDeltaClrA3 * 2;
                            const replacedVolume =
                              replacedDeltas.bwA4 +
                              replacedDeltas.bwA3 * 2 +
                              replacedDeltas.clrA4 +
                              replacedDeltas.clrA3 * 2;
                            const totalVolume = currentVolume + replacedVolume;

                            let applicableRate = 0;
                            let applicableRange = '';

                            if (isCpc && slabs.length > 0) {
                              const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
                              applicableRate = sortedSlabs[0]?.rate || 0;
                              applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;
                              for (const slab of sortedSlabs) {
                                if (totalVolume >= slab.from) {
                                  applicableRate = slab.rate;
                                  applicableRange =
                                    slab.to === 9999999
                                      ? `${slab.from}+`
                                      : `${slab.from}-${slab.to}`;
                                }
                              }
                            } else {
                              applicableRate = Number(ruleItems.combo?.combinedExcessRate || 0);
                            }

                            return (
                              <>
                                <div className="flex justify-between text-slate-700 font-medium">
                                  <span>Total Billed Units:</span>
                                  <span className="font-bold">
                                    {totalVolume.toLocaleString()} units
                                  </span>
                                </div>
                                <div className="pl-3 space-y-1 text-[11px] text-slate-500 border-l-2 border-slate-100 ml-1">
                                  <div className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1">
                                    <div className="flex justify-between">
                                      <span>
                                        • Current Machine Usage ({currentVolume.toLocaleString()}{' '}
                                        units)
                                      </span>
                                      <span>QAR {(currentVolume * applicableRate).toFixed(2)}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 italic pl-2">
                                      (BW A4: {currentDeltaA4.toLocaleString()}, A3:{' '}
                                      {currentDeltaA3.toLocaleString()} | Color A4:{' '}
                                      {currentDeltaClrA4.toLocaleString()}, A3:{' '}
                                      {currentDeltaClrA3.toLocaleString()})
                                    </div>
                                  </div>
                                  {replacedDeltas.machines.map((m, i) => (
                                    <div
                                      key={i}
                                      className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1"
                                    >
                                      <div className="flex justify-between text-[10px]">
                                        <span>• Replaced Device (SN: {m.serialNumber})</span>
                                        <span>
                                          {(m.bwDelta + m.clrDelta).toLocaleString()} units (QAR{' '}
                                          {((m.bwDelta + m.clrDelta) * applicableRate).toFixed(2)})
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-slate-400 italic pl-2">
                                        (BW A4: {m.bwA4.toLocaleString()}, A3:{' '}
                                        {m.bwA3.toLocaleString()} | Color A4:{' '}
                                        {m.clrA4.toLocaleString()}, A3: {m.clrA3.toLocaleString()})
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Net Chargeable Calculation */}
                                {(() => {
                                  const included = Number(
                                    ruleItems.combo?.combinedIncludedLimit || 0,
                                  );
                                  const chargeable = Math.max(0, totalVolume - included);
                                  if (included > 0) {
                                    return (
                                      <div className="bg-blue-50/50 p-2 rounded mt-1 border border-blue-100/50 space-y-0.5 text-[10px]">
                                        <div className="flex justify-between text-blue-700">
                                          <span>Total Gross Units:</span>
                                          <span>{totalVolume.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 italic">
                                          <span>Less: Included Limit (Free):</span>
                                          <span>- {included.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-blue-800 border-t border-blue-200/50 pt-0.5">
                                          <span>Net Chargeable Units:</span>
                                          <span>{chargeable.toLocaleString()} units</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                <div className="flex justify-between text-slate-500 text-[11px] mt-1">
                                  <span>Excess Rate:</span>
                                  <span className="font-bold">
                                    ₹{applicableRate}{' '}
                                    {applicableRange ? `(${applicableRange} units)` : '/ unit'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-orange-600 font-bold mt-1 border-t border-slate-100 pt-1">
                                  <span>Total Excess Charge:</span>
                                  <span>
                                    QAR{' '}
                                    {(() => {
                                      const included = Number(
                                        ruleItems.combo?.combinedIncludedLimit || 0,
                                      );
                                      const chargeable = Math.max(0, totalVolume - included);
                                      return (chargeable * applicableRate).toFixed(2);
                                    })()}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
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
                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                              {(() => {
                                const isCpc = contract?.rentType?.includes('CPC');
                                const slabs = parseSlabs(ruleItems.bw?.bwSlabRanges);

                                const currentDeltaA4 = Math.max(
                                  0,
                                  Number(formData.bwA4Count || 0) - effectivePrevCounts.bwA4,
                                );
                                const currentDeltaA3 = Math.max(
                                  0,
                                  Number(formData.bwA3Count || 0) - effectivePrevCounts.bwA3,
                                );
                                const currentVolume = currentDeltaA4 + currentDeltaA3 * 2;
                                const replacedVolume =
                                  replacedDeltas.bwA4 + replacedDeltas.bwA3 * 2;
                                const totalVolume = currentVolume + replacedVolume;

                                let applicableRate = 0;
                                let applicableRange = '';

                                if (isCpc && slabs.length > 0) {
                                  const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
                                  applicableRate = sortedSlabs[0]?.rate || 0;
                                  applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;
                                  for (const slab of sortedSlabs) {
                                    if (totalVolume >= slab.from) {
                                      applicableRate = slab.rate;
                                      applicableRange =
                                        slab.to === 9999999
                                          ? `${slab.from}+`
                                          : `${slab.from}-${slab.to}`;
                                    }
                                  }
                                } else {
                                  applicableRate = Number(ruleItems.bw?.bwExcessRate || 0);
                                }

                                return (
                                  <>
                                    <div className="flex justify-between text-slate-700 font-medium">
                                      <span>Total Billed Units (BW):</span>
                                      <span className="font-bold">
                                        {totalVolume.toLocaleString()} units
                                      </span>
                                    </div>
                                    <div className="pl-3 space-y-1 text-[11px] text-slate-500 border-l-2 border-slate-100 ml-1">
                                      <div className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1">
                                        <div className="flex justify-between">
                                          <span>
                                            • Current Machine Usage (
                                            {currentVolume.toLocaleString()} units)
                                          </span>
                                          <span>
                                            QAR {(currentVolume * applicableRate).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                      {replacedDeltas.machines
                                        .filter((m) => m.bwDelta > 0)
                                        .map((m, i) => (
                                          <div
                                            key={i}
                                            className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1"
                                          >
                                            <div className="flex justify-between text-[10px]">
                                              <span>• Replaced Device (SN: {m.serialNumber})</span>
                                              <span>
                                                {m.bwDelta.toLocaleString()} units (QAR{' '}
                                                {(m.bwDelta * applicableRate).toFixed(2)})
                                              </span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 italic pl-2">
                                              (BW A4: {m.bwA4.toLocaleString()}, A3:{' '}
                                              {m.bwA3.toLocaleString()})
                                            </div>
                                          </div>
                                        ))}
                                    </div>

                                    {/* Net Chargeable Calculation */}
                                    {(() => {
                                      const bwRule = ruleItems.bw;
                                      const included = Number(bwRule?.bwIncludedLimit || 0);
                                      const chargeable = Math.max(0, totalVolume - included);
                                      if (included > 0) {
                                        return (
                                          <div className="bg-blue-50/50 p-2 rounded mt-1 border border-blue-100/50 space-y-0.5 text-[10px]">
                                            <div className="flex justify-between text-blue-700">
                                              <span>Total Gross Units:</span>
                                              <span>{totalVolume.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500 italic">
                                              <span>Less: Included Limit (Free):</span>
                                              <span>- {included.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-blue-800 border-t border-blue-200/50 pt-0.5">
                                              <span>Net Chargeable Units:</span>
                                              <span>{chargeable.toLocaleString()} units</span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    <div className="flex justify-between text-slate-500 text-[11px] mt-1">
                                      <span>Excess Rate (BW):</span>
                                      <span className="font-bold">
                                        ₹{applicableRate}{' '}
                                        {applicableRange ? `(${applicableRange} units)` : '/ unit'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-orange-600 font-bold mt-1 border-t border-slate-100 pt-1">
                                      <span>Excess Charge:</span>
                                      <span>
                                        QAR{' '}
                                        {(() => {
                                          const included = Number(
                                            ruleItems.bw?.bwIncludedLimit || 0,
                                          );
                                          const chargeable = Math.max(0, totalVolume - included);
                                          return (chargeable * applicableRate).toFixed(2);
                                        })()}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
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
                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                              {(() => {
                                const isCpc = contract?.rentType?.includes('CPC');
                                const slabs = parseSlabs(ruleItems.color?.colorSlabRanges);

                                const currentDeltaA4 = Math.max(
                                  0,
                                  Number(formData.colorA4Count || 0) - effectivePrevCounts.clrA4,
                                );
                                const currentDeltaA3 = Math.max(
                                  0,
                                  Number(formData.colorA3Count || 0) - effectivePrevCounts.clrA3,
                                );
                                const currentVolume = currentDeltaA4 + currentDeltaA3 * 2;
                                const replacedVolume =
                                  replacedDeltas.clrA4 + replacedDeltas.clrA3 * 2;
                                const totalVolume = currentVolume + replacedVolume;

                                let applicableRate = 0;
                                let applicableRange = '';

                                if (isCpc && slabs.length > 0) {
                                  const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
                                  applicableRate = sortedSlabs[0]?.rate || 0;
                                  applicableRange = `${sortedSlabs[0]?.from || 0}-${sortedSlabs[0]?.to || 0}`;
                                  for (const slab of sortedSlabs) {
                                    if (totalVolume >= slab.from) {
                                      applicableRate = slab.rate;
                                      applicableRange =
                                        slab.to === 9999999
                                          ? `${slab.from}+`
                                          : `${slab.from}-${slab.to}`;
                                    }
                                  }
                                } else {
                                  applicableRate = Number(ruleItems.color?.colorExcessRate || 0);
                                }

                                return (
                                  <>
                                    <div className="flex justify-between text-slate-700 font-medium">
                                      <span>Total Billed Units (Color):</span>
                                      <span className="font-bold">
                                        {totalVolume.toLocaleString()} units
                                      </span>
                                    </div>
                                    <div className="pl-3 space-y-1 text-[11px] text-slate-500 border-l-2 border-slate-100 ml-1">
                                      <div className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1">
                                        <div className="flex justify-between">
                                          <span>
                                            • Current Machine Usage (
                                            {currentVolume.toLocaleString()} units)
                                          </span>
                                          <span>
                                            QAR {(currentVolume * applicableRate).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                      {replacedDeltas.machines
                                        .filter((m) => m.clrDelta > 0)
                                        .map((m, i) => (
                                          <div
                                            key={i}
                                            className="flex flex-col border-b border-slate-50 last:border-0 pb-1 mb-1"
                                          >
                                            <div className="flex justify-between text-[10px]">
                                              <span>• Replaced Device (SN: {m.serialNumber})</span>
                                              <span>
                                                {m.clrDelta.toLocaleString()} units (QAR{' '}
                                                {(m.clrDelta * applicableRate).toFixed(2)})
                                              </span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 italic pl-2">
                                              (Color A4: {m.clrA4.toLocaleString()}, A3:{' '}
                                              {m.clrA3.toLocaleString()})
                                            </div>
                                          </div>
                                        ))}
                                    </div>

                                    {/* Net Chargeable Calculation */}
                                    {(() => {
                                      const colorRule = ruleItems.color;
                                      const included = Number(colorRule?.colorIncludedLimit || 0);
                                      const chargeable = Math.max(0, totalVolume - included);
                                      if (included > 0) {
                                        return (
                                          <div className="bg-rose-50/50 p-2 rounded mt-1 border border-rose-100/50 space-y-0.5 text-[10px]">
                                            <div className="flex justify-between text-rose-700">
                                              <span>Total Gross Units:</span>
                                              <span>{totalVolume.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500 italic">
                                              <span>Less: Included Limit (Free):</span>
                                              <span>- {included.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-rose-800 border-t border-rose-200/50 pt-0.5">
                                              <span>Net Chargeable Units:</span>
                                              <span>{chargeable.toLocaleString()} units</span>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    <div className="flex justify-between text-slate-500 text-[11px] mt-1">
                                      <span>Excess Rate (Color):</span>
                                      <span className="font-bold">
                                        ₹{applicableRate}{' '}
                                        {applicableRange ? `(${applicableRange} units)` : '/ unit'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-orange-600 font-bold mt-1 border-t border-slate-100 pt-1">
                                      <span>Excess Charge:</span>
                                      <span>
                                        QAR{' '}
                                        {(() => {
                                          const included = Number(
                                            ruleItems.color?.colorIncludedLimit || 0,
                                          );
                                          const chargeable = Math.max(0, totalVolume - included);
                                          return (chargeable * applicableRate).toFixed(2);
                                        })()}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
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
                          return `QAR ${rentToShow.toLocaleString()} (Adv. will be adjusted)`;
                        }

                        return `QAR ${amount.toLocaleString()}`;
                      })()}
                    </span>
                  </div>

                  {/* Discount row */}
                  {formData.discountType !== 'NONE' && (
                    <div className="pt-1 flex flex-col items-end text-xs text-purple-700">
                      <div className="w-full flex justify-between items-center mb-0.5">
                        <span className="font-medium font-bold">Discount Applied</span>
                        <span className="font-bold">
                          {formData.discountType === 'AMOUNT'
                            ? `- QAR ${Number(formData.discountAmount || 0).toLocaleString()}`
                            : (() => {
                                // Calculate total monetary discount from both types
                                const bwDiscount = Number(formData.discountBwCopies || 0);
                                const clrDiscount = Number(formData.discountColorCopies || 0);

                                // Find rates
                                let bwRate = 0;
                                let clrRate = 0;

                                if (contract?.rentType?.includes('CPC')) {
                                  const bwSlabs = parseSlabs(ruleItems.bw?.bwSlabRanges);
                                  const clrSlabs = parseSlabs(ruleItems.color?.colorSlabRanges);
                                  const comboSlabs = parseSlabs(ruleItems.combo?.comboSlabRanges);

                                  const bwUsage =
                                    Number(formData.bwA4Count || 0) -
                                    effectivePrevCounts.bwA4 +
                                    (Number(formData.bwA3Count || 0) - effectivePrevCounts.bwA3) *
                                      2;
                                  const clrUsage =
                                    Number(formData.colorA4Count || 0) -
                                    effectivePrevCounts.clrA4 +
                                    (Number(formData.colorA3Count || 0) -
                                      effectivePrevCounts.clrA3) *
                                      2;
                                  const totalUsage = bwUsage + clrUsage;

                                  if (comboSlabs.length > 0) {
                                    const sorted = [...comboSlabs].sort((a, b) => a.from - b.from);
                                    let rate = sorted[0]?.rate || 0;
                                    for (const s of sorted) {
                                      if (totalUsage >= s.from) rate = s.rate;
                                    }
                                    bwRate = rate;
                                    clrRate = rate;
                                  } else {
                                    if (bwSlabs.length > 0) {
                                      const sorted = [...bwSlabs].sort((a, b) => a.from - b.from);
                                      let rate = sorted[0]?.rate || 0;
                                      for (const s of sorted) {
                                        if (bwUsage >= s.from) rate = s.rate;
                                      }
                                      bwRate = rate;
                                    } else {
                                      bwRate = Number(
                                        ruleItems.bw?.bwExcessRate ||
                                          ruleItems.combo?.combinedExcessRate ||
                                          0,
                                      );
                                    }

                                    if (clrSlabs.length > 0) {
                                      const sorted = [...clrSlabs].sort((a, b) => a.from - b.from);
                                      let rate = sorted[0]?.rate || 0;
                                      for (const s of sorted) {
                                        if (clrUsage >= s.from) rate = s.rate;
                                      }
                                      clrRate = rate;
                                    } else {
                                      clrRate = Number(
                                        ruleItems.color?.colorExcessRate ||
                                          ruleItems.combo?.combinedExcessRate ||
                                          0,
                                      );
                                    }
                                  }
                                } else {
                                  bwRate = Number(
                                    ruleItems.bw?.bwExcessRate ||
                                      ruleItems.combo?.combinedExcessRate ||
                                      0,
                                  );
                                  clrRate = Number(
                                    ruleItems.color?.colorExcessRate ||
                                      ruleItems.combo?.combinedExcessRate ||
                                      0,
                                  );
                                }

                                const totalMonetary = bwDiscount * bwRate + clrDiscount * clrRate;
                                return `- QAR ${totalMonetary.toLocaleString()}`;
                              })()}
                        </span>
                      </div>
                      {formData.discountType === 'COPIES' && (
                        <div className="text-[9px] text-purple-600/70 italic text-right">
                          {Number(formData.discountBwCopies || 0) > 0 && (
                            <div>
                              • BW: {formData.discountBwCopies} copies
                              {(() => {
                                let rate = 0;
                                if (contract?.rentType?.includes('CPC')) {
                                  const slabs = parseSlabs(
                                    ruleItems.bw?.bwSlabRanges || ruleItems.combo?.comboSlabRanges,
                                  );
                                  const usage =
                                    Number(formData.bwA4Count || 0) -
                                    effectivePrevCounts.bwA4 +
                                    (Number(formData.bwA3Count || 0) - effectivePrevCounts.bwA3) *
                                      2;
                                  if (slabs.length > 0) {
                                    const sorted = [...slabs].sort((a, b) => a.from - b.from);
                                    rate = sorted[0]?.rate || 0;
                                    for (const s of sorted) {
                                      if (usage >= s.from) rate = s.rate;
                                    }
                                  } else {
                                    rate = Number(
                                      ruleItems.bw?.bwExcessRate ||
                                        ruleItems.combo?.combinedExcessRate ||
                                        0,
                                    );
                                  }
                                } else {
                                  rate = Number(
                                    ruleItems.bw?.bwExcessRate ||
                                      ruleItems.combo?.combinedExcessRate ||
                                      0,
                                  );
                                }
                                return ` (- QAR ${(Number(formData.discountBwCopies) * rate).toLocaleString()})`;
                              })()}
                            </div>
                          )}
                          {Number(formData.discountColorCopies || 0) > 0 && (
                            <div>
                              • Color: {formData.discountColorCopies} copies
                              {(() => {
                                let rate = 0;
                                if (contract?.rentType?.includes('CPC')) {
                                  const slabs = parseSlabs(
                                    ruleItems.color?.colorSlabRanges ||
                                      ruleItems.combo?.comboSlabRanges,
                                  );
                                  const usage =
                                    Number(formData.colorA4Count || 0) -
                                    effectivePrevCounts.clrA4 +
                                    (Number(formData.colorA3Count || 0) -
                                      effectivePrevCounts.clrA3) *
                                      2;
                                  if (slabs.length > 0) {
                                    const sorted = [...slabs].sort((a, b) => a.from - b.from);
                                    rate = sorted[0]?.rate || 0;
                                    for (const s of sorted) {
                                      if (usage >= s.from) rate = s.rate;
                                    }
                                  } else {
                                    rate = Number(
                                      ruleItems.color?.colorExcessRate ||
                                        ruleItems.combo?.combinedExcessRate ||
                                        0,
                                    );
                                  }
                                } else {
                                  rate = Number(
                                    ruleItems.color?.colorExcessRate ||
                                      ruleItems.combo?.combinedExcessRate ||
                                      0,
                                  );
                                }
                                return ` (- QAR ${(Number(formData.discountColorCopies) * rate).toLocaleString()})`;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center mt-2">
                    <span className="font-bold text-sm text-slate-800">Grand Total</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(estimatedCost)}
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
