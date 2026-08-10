'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllProducts, Product, ProductStatus } from '@/lib/product';
import { initiateMachineSwap } from '@/lib/machineSwap';
import { getApiErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { Loader2, ArrowRight, RefreshCw, Package, Search, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  contractId: string;
  invoiceNumber: string;
  contractType: string;
  currentSerialNumber?: string | null;
  currentModelId?: string | null;
  onSwapRequested?: () => void;
}

export function ChangeMachineModal({
  open,
  onClose,
  contractId,
  invoiceNumber,
  contractType,
  currentSerialNumber,
  currentModelId,
  onSwapRequested,
}: Props) {
  const [availableUnits, setAvailableUnits] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedProductId(null);
      setReason('');
      setSearch('');
      return;
    }
    setLoading(true);
    getAllProducts({
      modelId: currentModelId ?? undefined,
      status: ProductStatus.AVAILABLE,
      limit: 200,
    })
      .then((products) => {
        setAvailableUnits(products.filter((p) => p.serial_no !== currentSerialNumber));
      })
      .catch(() => toast.error('Failed to load available units'))
      .finally(() => setLoading(false));
  }, [open, currentModelId, currentSerialNumber]);

  const filtered = availableUnits.filter(
    (p) =>
      !search ||
      p.serial_no.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async () => {
    if (!selectedProductId) {
      toast.error('Select a replacement unit first');
      return;
    }
    setSubmitting(true);
    try {
      await initiateMachineSwap(contractId, { requestedProductId: selectedProductId, reason });
      toast.success('Swap request submitted', {
        description: 'A Manager will review and approve the change.',
      });
      onSwapRequested?.();
      onClose();
    } catch (err) {
      toast.error('Failed to submit swap request', { description: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUnit = availableUnits.find((p) => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
        <DialogTitle className="sr-only">Change Machine</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <RefreshCw size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                Change Machine
              </p>
              <p className="text-base font-black">{invoiceNumber}</p>
              <p className="text-[11px] opacity-70">
                {contractType} · Current serial: {currentSerialNumber ?? 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
              This request will be sent to a Manager for approval before the swap takes effect. The
              old unit will return to available stock; the replacement takes over billing
              attribution.
            </p>
          </div>

          {/* Current serial */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Current Unit
            </p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Package size={14} className="text-slate-400" />
              <span className="text-sm font-mono font-bold text-slate-600">
                {currentSerialNumber ?? 'Not allocated'}
              </span>
            </div>
          </div>

          {/* Replacement unit selection */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Select Replacement Unit
              {!currentModelId && (
                <span className="ml-1 text-amber-500 normal-case">
                  (showing all available — no model filter)
                </span>
              )}
            </p>
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by serial or name…"
                className="pl-8 h-8 text-xs font-bold border-slate-200"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Package size={24} className="mx-auto mb-2" />
                <p className="text-xs font-bold">No available units of this model</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id === selectedProductId ? null : p.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-xs ${
                      selectedProductId === p.id
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-black">{p.serial_no}</span>
                      <span className="ml-2 text-slate-400 font-semibold">{p.name}</span>
                    </div>
                    {selectedProductId === p.id && (
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Reason for Swap (optional)
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Paper jam fault, hardware defect…"
              className="h-9 text-xs font-bold border-slate-200"
            />
          </div>

          {/* Preview */}
          {selectedUnit && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[10px] font-black text-slate-500 font-mono">
                {currentSerialNumber ?? '?'}
              </span>
              <ArrowRight size={12} className="text-orange-500 flex-shrink-0" />
              <span className="text-[10px] font-black text-emerald-700 font-mono">
                {selectedUnit.serial_no}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-9 text-xs font-black" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-9 text-xs font-black bg-orange-600 hover:bg-orange-700"
              onClick={handleSubmit}
              disabled={submitting || !selectedProductId}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw size={12} className="mr-1" />
                  Request Swap
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
