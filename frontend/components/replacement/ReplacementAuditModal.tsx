'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useStableCallback } from '@/lib/hooks/useStableCallback';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PackageCheck, PackageX, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { getReplacement, dispositionReplacement, type ReplacementDetail } from '@/lib/replacement';
import { ReplacementDetailView } from './ReplacementDetailView';

/**
 * Stage 08 — Finance audits the machine that came off the contract.
 *
 * The evidence is the whole point of this screen, so it reuses ReplacementDetailView
 * rather than re-listing anything: the customer's proof photos and sign-off, both
 * machines with model and serial, the reason it was raised, and the meters at swap. On
 * top of that sits the one decision only Finance can make — is this unit sellable again,
 * or is it a write-off.
 */
export function ReplacementAuditModal({
  requestId,
  onClose: onCloseProp,
  onDone,
}: {
  requestId: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  // Stable identity: parents pass onClose inline and may re-render every second (live
  // timers), which otherwise restarted — and cancelled — this modal's load each tick.
  const onClose = useStableCallback(onCloseProp);
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'STOCK' | 'GWR' | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await getReplacement(requestId));
    } catch (err) {
      toast.error('Could not load the request', { description: getApiErrorMessage(err) });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [requestId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (action: 'STOCK' | 'GWR') => {
    setBusy(action);
    try {
      await dispositionReplacement(requestId, { action, note: note.trim() || undefined });
      toast.success(
        action === 'STOCK'
          ? 'Machine cleared back into stock'
          : 'Machine sent to goods-warehouse-return',
        {
          description:
            action === 'STOCK'
              ? 'It is Available again and can be sold or allocated.'
              : 'It is marked Damaged and is out of sellable stock.',
        },
      );
      onDone?.();
      onClose();
    } catch (err) {
      toast.error('Could not record the decision', { description: getApiErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const done = detail?.request.dispositionStatus && detail.request.dispositionStatus !== 'PENDING';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl">
        <DialogTitle className="sr-only">Audit Returned Machine</DialogTitle>

        <div className="sticky top-0 z-10 border-b border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <ClipboardCheck size={17} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Audit Returned Machine
              </p>
              <p className="text-base font-black text-foreground">
                {detail?.request.requestNo ?? '…'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="space-y-5 p-5">
            <ReplacementDetailView detail={detail} />

            {done ? (
              <div
                className={`rounded-xl border p-4 text-center ${
                  detail.request.dispositionStatus === 'MOVED_TO_STOCK'
                    ? 'border-success/30 bg-success/10'
                    : 'border-destructive/30 bg-destructive/10'
                }`}
              >
                <p
                  className={`text-sm font-black ${
                    detail.request.dispositionStatus === 'MOVED_TO_STOCK'
                      ? 'text-success'
                      : 'text-destructive'
                  }`}
                >
                  {detail.request.dispositionStatus === 'MOVED_TO_STOCK'
                    ? 'Moved back to stock — the unit is Available'
                    : 'Sent to goods-warehouse-return — the unit is Damaged'}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground">
                  {detail.request.dispositionByName}
                  {detail.request.dispositionAt
                    ? ` · ${new Date(detail.request.dispositionAt).toLocaleString('en-GB')}`
                    : ''}
                </p>
                {detail.request.dispositionNote && (
                  <p className="mt-1 text-[11px] italic text-muted-foreground">
                    “{detail.request.dispositionNote}”
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
                <div>
                  <p className="text-xs font-black text-foreground">
                    Where does the returned machine go?
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    It is off the contract but not yet sellable stock. This decision is recorded
                    once and cannot be undone.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Finance note (optional)
                  </Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-[70px] bg-card text-sm"
                    placeholder="Condition on inspection, what was found, why this decision…"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    disabled={busy !== null}
                    onClick={() => decide('STOCK')}
                    className="h-10 bg-success text-xs font-black text-success-foreground hover:bg-success/90"
                  >
                    {busy === 'STOCK' ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <PackageCheck size={14} className="mr-1.5" />
                    )}
                    Move to Stock — Available
                  </Button>
                  <Button
                    disabled={busy !== null}
                    onClick={() => decide('GWR')}
                    className="h-10 bg-destructive text-xs font-black text-destructive-foreground hover:bg-destructive/90"
                  >
                    {busy === 'GWR' ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <PackageX size={14} className="mr-1.5" />
                    )}
                    Move to GWR — Damaged
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="sticky bottom-0 flex items-center justify-end border-t border-border bg-muted p-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 text-xs font-black text-muted-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
