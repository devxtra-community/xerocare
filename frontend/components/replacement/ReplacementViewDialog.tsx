'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { getReplacement, type ReplacementDetail } from '@/lib/replacement';
import { ReplacementDetailView } from './ReplacementDetailView';

/**
 * Read-only wrapper around ReplacementDetailView.
 *
 * `actions` lets each caller add exactly the controls its own stage owns — Finance's
 * accept/reject, the service desk's deliver/assign — without any of them re-fetching or
 * re-rendering the facts themselves.
 */
export function ReplacementViewDialog({
  requestId,
  onClose,
  actions,
}: {
  requestId: string;
  onClose: () => void;
  actions?: (detail: ReplacementDetail, reload: () => void) => React.ReactNode;
}) {
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    try {
      setDetail(await getReplacement(requestId));
    } catch (err) {
      toast.error('Failed to load replacement', { description: getApiErrorMessage(err) });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [requestId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Replacement Details</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : detail ? (
          <div className="p-5">
            <ReplacementDetailView detail={detail} />
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 sticky bottom-0">
          {detail && actions?.(detail, load)}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 text-xs font-black text-slate-500"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
