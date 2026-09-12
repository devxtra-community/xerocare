'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { lotService, type Lot, type SplitMethod, type LandedCostAllocationResult } from '@/lib/lot';
import type { Purchase, PurchaseCost } from '@/services/purchaseService';
import { formatCurrency } from '@/lib/format';

const SPLIT_METHOD_LABELS: Record<SplitMethod, string> = {
  BY_VALUE: 'By Value',
  BY_QUANTITY: 'By Quantity',
  EQUAL: 'Equal',
};

interface AllocateLandedCostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: Lot;
  purchase: Purchase;
  currency: string;
  /** Called after Apply/Reset succeed — parent should refetch the lot + purchase. */
  onChanged: () => void;
}

function itemLabel(item: Lot['items'][number]): string {
  return (
    item.model?.model_name ||
    item.customProductName ||
    item.sparePart?.part_name ||
    item.customSparePartName ||
    'Item'
  );
}

export default function AllocateLandedCostsModal({
  open,
  onOpenChange,
  lot,
  purchase,
  currency,
  onChanged,
}: AllocateLandedCostsModalProps) {
  const [methods, setMethods] = useState<Record<string, SplitMethod>>({});
  const [breakdown, setBreakdown] = useState<LandedCostAllocationResult['items'] | null>(null);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);

  const costs: PurchaseCost[] = useMemo(() => purchase.costs || [], [purchase.costs]);
  const alreadyAllocated = lot.items.some((i) => i.originalUnitPrice != null);

  // A cost added/edited after the most recent item save (allocation bumps
  // updatedAt on every item it touches) means the last allocation is stale.
  const needsReallocation = useMemo(() => {
    if (!alreadyAllocated || costs.length === 0) return false;
    const lastItemUpdate = Math.max(
      ...lot.items.map((i) => (i.updatedAt ? new Date(i.updatedAt).getTime() : 0)),
    );
    const lastCostChange = Math.max(
      ...costs.map((c) => (c.createdAt ? new Date(c.createdAt).getTime() : 0)),
    );
    return lastCostChange > lastItemUpdate;
  }, [alreadyAllocated, costs, lot.items]);

  useEffect(() => {
    if (open) {
      const initial: Record<string, SplitMethod> = {};
      for (const c of costs) initial[c.id] = (c.splitMethod as SplitMethod) || 'BY_VALUE';
      setMethods(initial);
      setBreakdown(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const canAllocate = lot.status === 'RECEIVED' && costs.length > 0;

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await lotService.allocateLandedCosts(lot.id, methods);
      setBreakdown(result.items);
      toast.success('Landed costs allocated across all items.');
      onChanged();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to allocate landed costs.';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await lotService.resetLandedCostAllocation(lot.id);
      setBreakdown(null);
      toast.success('Allocation reset — items show their original unit price again.');
      onChanged();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reset allocation.';
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  const findItem = (lotItemId: string) => lot.items.find((i) => i.id === lotItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Allocate Landed Costs</DialogTitle>
        </DialogHeader>

        {!canAllocate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {lot.status !== 'RECEIVED'
              ? 'Allocation can only be applied once this lot has been marked RECEIVED.'
              : 'Add at least one additional cost to this lot before allocating.'}
          </div>
        )}

        {needsReallocation && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs font-semibold text-orange-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Costs have changed since last allocation — please re-allocate.
          </div>
        )}

        {canAllocate && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Additional costs on this lot
            </p>
            <div className="space-y-2">
              {costs.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.costType}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(c.amount, currency)}</p>
                  </div>
                  <Select
                    value={methods[c.id] || 'BY_VALUE'}
                    onValueChange={(val) =>
                      setMethods((prev) => ({ ...prev, [c.id]: val as SplitMethod }))
                    }
                  >
                    <SelectTrigger className="h-9 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SPLIT_METHOD_LABELS) as SplitMethod[]).map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {SPLIT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {breakdown && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Allocation breakdown
            </p>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs text-right">Orig. Unit Cost</TableHead>
                    <TableHead className="text-xs text-right">Allocated</TableHead>
                    <TableHead className="text-xs text-right">New Unit Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((row) => {
                    const item = findItem(row.lotItemId);
                    return (
                      <TableRow key={row.lotItemId}>
                        <TableCell className="text-xs font-medium">
                          {item ? itemLabel(item) : row.lotItemId}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-500">
                          {formatCurrency(row.originalUnitPrice, currency)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-500">
                          {formatCurrency(row.landedCostAllocated / row.quantity, currency)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-slate-900">
                          {formatCurrency(row.landedCostUnitCost, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
            disabled={!alreadyAllocated || resetting}
            onClick={handleReset}
          >
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Reset
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="h-9 text-xs"
              disabled={!canAllocate || applying}
              onClick={handleApply}
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Apply Allocation
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          Applies immediately — use Reset to undo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
