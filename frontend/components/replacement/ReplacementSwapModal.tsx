'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useStableCallback } from '@/lib/hooks/useStableCallback';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getAvailableProductsByModel, Product } from '@/lib/product';
import { getReplacement, selectReplacementUnit, type ReplacementDetail } from '@/lib/replacement';

/**
 * Stage 03 — the employee picks the incoming unit.
 *
 * Nothing is swapped here. This records WHICH machine will go out to the customer; the
 * allocation itself only changes when the technician reads both meters on site
 * (installReplacement), because that reading is what sets the billing boundary.
 *
 * The picker is fed by getAvailableProductsByModel, which admits AVAILABLE and RETURNED
 * only — never DAMAGED. Offering a damaged unit as the fix for a faulty one is the
 * defect this flow was rebuilt to avoid.
 */

interface Props {
  requestId: string;
  onClose: () => void;
  onDone: () => void;
}

function Panel({
  tone,
  heading,
  serial,
  product,
  children,
}: {
  tone: 'out' | 'in';
  heading: string;
  serial?: string;
  product?: (Partial<Product> & { image_url?: string; model_name?: string }) | null;
  children?: React.ReactNode;
}) {
  const ring =
    tone === 'out' ? 'border-destructive/30 bg-destructive/10' : 'border-success/30 bg-success/10';
  const chip = tone === 'out' ? 'text-destructive' : 'text-success';
  return (
    <div className={`flex-1 rounded-xl border p-4 space-y-3 ${ring}`}>
      <p className={`text-[9px] font-black uppercase tracking-widest ${chip}`}>{heading}</p>
      {product?.image_url && (
        <Image
          src={product.image_url}
          alt={product?.name || serial || 'Machine'}
          width={320}
          height={150}
          unoptimized
          className="w-full rounded-lg border border-border object-cover"
          style={{ maxHeight: 150 }}
        />
      )}
      <div className="space-y-1">
        <p className="text-sm font-black text-foreground">{product?.name || '—'}</p>
        <p className="font-mono text-xs text-foreground">{serial || 'Not selected'}</p>
        {(product?.brand || product?.model_name) && (
          <p className="text-[11px] font-semibold text-muted-foreground">
            {[product?.brand, product?.model_name].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function ReplacementSwapModal({ requestId, onClose: onCloseProp, onDone }: Props) {
  // Stable identity: parents pass onClose inline and may re-render every second (live
  // timers), which otherwise restarted — and cancelled — this modal's load each tick.
  const onClose = useStableCallback(onCloseProp);
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chosenId, setChosenId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getReplacement(requestId);
        if (cancelled) return;
        setDetail(d);

        if (d.request.modelId) {
          const list = await getAvailableProductsByModel(d.request.modelId);
          if (cancelled) return;
          // Never offer the machine being replaced back as its own replacement.
          setCandidates(list.filter((p) => p.id !== d.request.oldProductId));
        }
      } catch (err) {
        toast.error('Failed to load the replacement', { description: getApiErrorMessage(err) });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, onClose]);

  const chosen = useMemo(() => candidates.find((p) => p.id === chosenId), [candidates, chosenId]);

  const submit = async () => {
    if (!chosen) return;
    setSaving(true);
    try {
      await selectReplacementUnit(requestId, chosen.id, chosen.serial_no);
      toast.success('Replacement unit selected — sent to the service desk');
      onDone();
      onClose();
    } catch (err) {
      toast.error('Could not select that unit', { description: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Select Replacement Machine</DialogTitle>

        <div className="bg-card p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center">
              <PackageCheck size={18} className="text-success" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Proceed Replacement · select the machine
              </p>
              <p className="text-base font-black text-foreground">
                {detail?.request.requestNo ?? '…'} · {detail?.request.customerName ?? ''}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <Panel
                tone="out"
                heading="Going out — currently on contract"
                serial={detail?.request.oldSerialNumber}
                product={detail?.oldProduct as never}
              >
                {detail?.oldAllocation && (
                  <div className="rounded-lg border border-border bg-card p-2.5 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Current counters
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-foreground">
                      B&amp;W {detail.oldAllocation.currentBwA4.toLocaleString()} (+
                      {detail.oldAllocation.currentBwA3.toLocaleString()} A3) · Clr{' '}
                      {detail.oldAllocation.currentColorA4.toLocaleString()} (+
                      {detail.oldAllocation.currentColorA3.toLocaleString()} A3)
                    </p>
                  </div>
                )}
              </Panel>

              <ArrowRight className="mx-auto hidden h-6 w-6 shrink-0 text-muted-foreground md:block" />

              <Panel
                tone="in"
                heading="Coming in — same model"
                serial={chosen?.serial_no}
                product={chosen as never}
              >
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Available machines on this model
                  </Label>
                  <SearchableSelect
                    value={chosenId}
                    onValueChange={setChosenId}
                    placeholder={
                      candidates.length ? 'Search serial, brand or name…' : 'No available units'
                    }
                    options={candidates.map((p) => ({
                      value: p.id,
                      label: (
                        <span className="flex items-center gap-2">
                          {p.serial_no} — {p.brand?.toUpperCase() || ''} {p.name}
                          {p.product_status !== 'AVAILABLE' && (
                            <span className="text-[10px] font-bold text-warning">
                              [{p.product_status}]
                            </span>
                          )}
                        </span>
                      ),
                      searchText: `${p.serial_no} ${p.brand} ${p.name} ${p.product_status}`,
                      description: p.model?.model_name ? `Model: ${p.model.model_name}` : undefined,
                    }))}
                  />
                  {candidates.length === 0 && (
                    <p className="text-[11px] font-semibold text-warning">
                      No spare unit of this model is free right now. Add stock or return a unit
                      before proceeding.
                    </p>
                  )}
                </div>
              </Panel>
            </div>

            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-[11px] leading-relaxed text-foreground">
                Selecting a unit reserves it for this contract and sends the job to the service
                desk. The machine on the contract does not change yet — the technician records both
                meter readings on site, and that is what moves the billing across.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted p-4">
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
            disabled={!chosen || saving}
            className="h-9 bg-success text-xs font-black text-success-foreground hover:bg-success/90"
          >
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Confirm &amp; Send to Service Desk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
