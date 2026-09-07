'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, PackageCheck, Clock, Loader2 } from 'lucide-react';
import {
  listReplacements,
  OPEN_REPLACEMENT_STATUSES,
  REPLACEMENT_STATUS_LABEL,
  type ReplacementRequest,
} from '@/lib/replacement';
import { ReplacementRequestModal } from './ReplacementRequestModal';
import { ReplacementSwapModal } from './ReplacementSwapModal';
import { ReplacementViewDialog } from './ReplacementViewDialog';

/**
 * The contract row's replacement control, and the only place the employee-side stage
 * rules live.
 *
 * Red "Request Replacement" until Finance has approved; green "Proceed Replacement"
 * once they have. Everything in between is a disabled progress chip that still opens
 * the tracker, so the employee can always see where the job has got to without being
 * able to push it forward out of turn.
 */

/**
 * One request-list call per table, shared by every row.
 *
 * Fetching per row would mean one HTTP call per contract on a page that routinely shows
 * twenty; the map is keyed by contractId and handed down instead.
 */
export function useReplacementMap(enabled = true) {
  const [map, setMap] = useState<Record<string, ReplacementRequest>>({});
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await listReplacements();
      const next: Record<string, ReplacementRequest> = {};
      // Rows arrive newest-first, so the first one seen for a contract is its latest.
      for (const r of rows) if (!next[r.contractId]) next[r.contractId] = r;
      setMap(next);
    } catch {
      setMap({});
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { map, loading, refresh };
}

interface Props {
  contractId: string;
  contractStatus?: string | null;
  /** Latest request on this contract, from useReplacementMap. */
  request?: ReplacementRequest;
  onChanged: () => void;
}

export function ReplacementActionButton({ contractId, contractStatus, request, onChanged }: Props) {
  const [showRequest, setShowRequest] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showView, setShowView] = useState(false);

  // Only a live contract can have its machine swapped — a completed or cancelled one has
  // nothing left to bill, so there is no boundary to move.
  const eligible = contractStatus === 'ACTIVE';

  const stage = useMemo(() => {
    if (!request) return 'NONE' as const;
    if (request.status === 'REJECTED' || request.status === 'CANCELLED') return 'NONE' as const;
    if (request.status === 'PENDING_FINANCE') return 'PENDING' as const;
    if (request.status === 'APPROVED') return 'READY' as const;
    if (OPEN_REPLACEMENT_STATUSES.includes(request.status)) return 'PROGRESS' as const;
    return 'DONE' as const;
  }, [request]);

  if (!eligible) return null;

  return (
    <>
      {stage === 'NONE' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
          title={
            request?.status === 'REJECTED'
              ? `Previous request rejected: ${request.rejectionReason ?? ''} — raise a new one`
              : 'Request Replacement'
          }
          onClick={() => setShowRequest(true)}
        >
          <Wrench className="h-4 w-4" />
        </Button>
      )}

      {stage === 'PENDING' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-600"
          title="Replacement awaiting Finance approval — click to view"
          onClick={() => setShowView(true)}
        >
          <Clock className="h-4 w-4" />
        </Button>
      )}

      {stage === 'READY' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          title="Approved — proceed the replacement"
          onClick={() => setShowSwap(true)}
        >
          <PackageCheck className="h-4 w-4" />
        </Button>
      )}

      {stage === 'PROGRESS' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
          title={`Replacement in progress — ${request ? REPLACEMENT_STATUS_LABEL[request.status] : ''}`}
          onClick={() => setShowView(true)}
        >
          <Loader2 className="h-4 w-4" />
        </Button>
      )}

      {showRequest && (
        <ReplacementRequestModal
          contractId={contractId}
          onClose={() => setShowRequest(false)}
          onCreated={onChanged}
        />
      )}
      {showSwap && request && (
        <ReplacementSwapModal
          requestId={request.id}
          onClose={() => setShowSwap(false)}
          onDone={onChanged}
        />
      )}
      {showView && request && (
        <ReplacementViewDialog requestId={request.id} onClose={() => setShowView(false)} />
      )}
    </>
  );
}
