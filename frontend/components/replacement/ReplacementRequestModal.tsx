'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  getReplacementContext,
  createReplacementRequest,
  REPLACEMENT_REASONS,
  type ReplacementContext,
  type ReplacementMachine,
} from '@/lib/replacement';

/**
 * Stage 01 — the employee raises a replacement.
 *
 * Everything above the reason is fetched and read-only: the point of the form is to
 * capture WHY, with evidence, against a machine whose identity nobody has to retype.
 * No pricing is shown — a replacement is a service event, not a sale.
 */

interface Props {
  contractId: string;
  onClose: () => void;
  onCreated: () => void;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value ?? '—'}</p>
    </div>
  );
}

const fmt = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function ReplacementRequestModal({ contractId, onClose, onCreated }: Props) {
  const [ctx, setCtx] = useState<ReplacementContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allocationId, setAllocationId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getReplacementContext(contractId);
        if (cancelled) return;
        setCtx(data);
        // Single-machine contracts are the common case — pre-select so the technician
        // isn't asked a question with only one answer.
        if (data.machines.length === 1) setAllocationId(data.machines[0].allocationId);
      } catch (err) {
        toast.error('Failed to load contract', { description: getApiErrorMessage(err) });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId, onClose]);

  const machine: ReplacementMachine | undefined = useMemo(
    () => ctx?.machines.find((m) => m.allocationId === allocationId),
    [ctx, allocationId],
  );

  const durationLabel = useMemo(() => {
    const c = ctx?.contract;
    if (!c?.effectiveFrom || !c?.effectiveTo) return '—';
    const from = new Date(c.effectiveFrom);
    const to = new Date(c.effectiveTo);
    const months = Math.max(1, Math.round((to.getTime() - from.getTime()) / (30.44 * 86400000)));
    return `${fmt(c.effectiveFrom)} → ${fmt(c.effectiveTo)} · ${months} month${months === 1 ? '' : 's'}`;
  }, [ctx]);

  const canSubmit = allocationId && reason && notes.trim() && photos.length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createReplacementRequest({ contractId, allocationId, reason, notes, photos });
      toast.success('Replacement request sent to Finance for approval');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Could not raise the request', { description: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Request Machine Replacement</DialogTitle>

        <div className="bg-white p-5 border-b border-slate-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center">
              <Wrench size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Request Machine Replacement
              </p>
              <p className="text-base font-black text-slate-800">
                {ctx?.contract.invoiceNumber ?? '…'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* ── Context, all read-only ─────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Row label="Customer" value={ctx?.contract.customerName} />
                <Row label="Request date" value={fmt(new Date().toISOString())} />
                <Row label="Contract type" value={ctx?.contract.saleType} />
                <Row label="Contract duration" value={durationLabel} />
                <Row label="Machine installed on" value={fmt(machine?.startTimestamp)} />
                <Row label="Current serial" value={machine?.serialNumber} />
              </div>

              {ctx && ctx.machines.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Which machine is being replaced?
                  </Label>
                  <Select value={allocationId} onValueChange={setAllocationId}>
                    <SelectTrigger className="h-10 bg-white text-xs font-bold">
                      <SelectValue placeholder="Select the machine…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ctx.machines.map((m) => (
                        <SelectItem key={m.allocationId} value={m.allocationId} className="text-xs">
                          {m.serialNumber} — {m.product?.name ?? 'Machine'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {machine && (
                <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-3">
                  {machine.product?.image_url && (
                    <Image
                      src={machine.product.image_url}
                      alt={machine.product?.name || machine.serialNumber}
                      width={112}
                      height={112}
                      unoptimized
                      className="rounded-lg border border-slate-100 object-cover shrink-0"
                      style={{ width: 112, height: 112 }}
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-black text-slate-800">
                      {machine.product?.name ?? 'Machine'}
                    </p>
                    <p className="font-mono text-xs text-slate-600">{machine.serialNumber}</p>
                    {(machine.product?.brand || machine.product?.model_name) && (
                      <p className="text-[11px] font-semibold text-slate-500">
                        {[machine.product?.brand, machine.product?.model_name]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {machine.product?.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {machine.product.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── What the employee actually fills in ─────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Replacement reason *
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-10 text-xs font-bold">
                    <SelectValue placeholder="Why is this machine being replaced?" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPLACEMENT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Notes *
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the fault and what was already tried on site…"
                  className="min-h-[90px] text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Proof photos * — at least one
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                  className="text-xs"
                />
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photos.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                          className="text-slate-400 hover:text-red-500"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sticky bottom-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-xs font-black"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="h-9 bg-red-600 text-xs font-black text-white hover:bg-red-700"
          >
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Send to Finance for Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
