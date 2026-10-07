'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, CheckCircle2, XCircle, Loader2, Wrench, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { ReplacementAuditModal } from './ReplacementAuditModal';
import {
  listReplacements,
  decideReplacement,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_CLASS,
  type ReplacementRequest,
} from '@/lib/replacement';
import { ReplacementViewDialog } from './ReplacementViewDialog';

/**
 * Stage 02 — Finance's queue.
 *
 * Accept/reject are the only two things Finance does in the whole chain: they no longer
 * initiate a swap (that moved to the employee's Request Replacement) and they never
 * touch the machine itself. Approving simply unlocks the employee's green button.
 */

const fmt = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function FinanceReplacementsTab() {
  const [rows, setRows] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReplacementRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listReplacements());
    } catch (err) {
      toast.error('Failed to load replacement requests', {
        description: getApiErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (r: ReplacementRequest) => {
    setBusyId(r.id);
    try {
      await decideReplacement(r.id, 'APPROVE');
      toast.success(`${r.requestNo} approved — the employee can now proceed`);
      await load();
    } catch (err) {
      toast.error('Could not approve', { description: getApiErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setBusyId(rejectTarget.id);
    try {
      await decideReplacement(rejectTarget.id, 'REJECT', rejectReason.trim());
      toast.success(`${rejectTarget.requestNo} rejected`);
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toast.error('Could not reject', { description: getApiErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'PENDING_FINANCE').length;

  return (
    <div className="space-y-4">
      {pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <Wrench size={18} className="shrink-0 text-warning" />
          <p className="text-sm font-semibold text-warning">
            {pending} replacement request{pending === 1 ? '' : 's'} awaiting your decision.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table pagination={{ pageSize: 10 }} className="min-w-[900px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-primary">REQUEST</TableHead>
                <TableHead className="font-bold text-primary">CUSTOMER</TableHead>
                <TableHead className="font-bold text-primary">REQUESTED</TableHead>
                <TableHead className="font-bold text-primary">EMPLOYEE</TableHead>
                <TableHead className="font-bold text-primary">MACHINE</TableHead>
                <TableHead className="font-bold text-primary">REASON</TableHead>
                <TableHead className="font-bold text-primary">STATUS</TableHead>
                <TableHead className="text-center font-bold text-primary">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline-block animate-spin" size={16} />
                    Loading replacement requests…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Wrench className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    No replacement requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={
                      r.status === 'PENDING_FINANCE' ? 'bg-warning/10 hover:bg-warning/10' : ''
                    }
                  >
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {r.requestNo}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{r.customerName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmt(r.raisedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground">
                      {r.raisedByEmployeeName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {r.oldSerialNumber}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{r.reason}</TableCell>
                    <TableCell>
                      <Badge className={`border ${REPLACEMENT_STATUS_CLASS[r.status]}`}>
                        {REPLACEMENT_STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-primary hover:bg-primary/10"
                          title="View full request"
                          onClick={() => setViewingId(r.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(r.status === 'INSTALLED' || r.status === 'CUSTOMER_APPROVED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 rounded-lg p-0 ${
                              (r.dispositionStatus ?? 'PENDING') === 'PENDING'
                                ? 'animate-pulse text-warning hover:bg-warning/10'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                            title={
                              (r.dispositionStatus ?? 'PENDING') === 'PENDING'
                                ? 'Audit the returned machine — move to stock or GWR'
                                : r.dispositionStatus === 'MOVED_TO_STOCK'
                                  ? 'Audited — moved back to stock'
                                  : 'Audited — sent to GWR (damaged)'
                            }
                            onClick={() => setAuditingId(r.id)}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status === 'PENDING_FINANCE' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === r.id}
                              className="h-8 w-8 rounded-lg p-0 text-success hover:bg-success/10"
                              title="Approve"
                              onClick={() => approve(r)}
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === r.id}
                              className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                              title="Reject"
                              onClick={() => {
                                setRejectTarget(r);
                                setRejectReason('');
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {auditingId && (
        <ReplacementAuditModal
          requestId={auditingId}
          onClose={() => setAuditingId(null)}
          onDone={load}
        />
      )}

      {viewingId && (
        <ReplacementViewDialog
          requestId={viewingId}
          onClose={() => setViewingId(null)}
          actions={(detail) =>
            detail.request.status === 'PENDING_FINANCE' ? (
              <>
                <Button
                  variant="outline"
                  className="h-9 border-destructive/30 text-xs font-black text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setRejectTarget(detail.request);
                    setRejectReason('');
                    setViewingId(null);
                  }}
                >
                  <XCircle size={14} className="mr-1.5" />
                  Reject
                </Button>
                <Button
                  className="h-9 bg-success text-xs font-black text-success-foreground hover:bg-success/90"
                  onClick={async () => {
                    await approve(detail.request);
                    setViewingId(null);
                  }}
                >
                  <CheckCircle2 size={14} className="mr-1.5" />
                  Approve
                </Button>
              </>
            ) : null
          }
        />
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.requestNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The reason is shown to {rejectTarget?.raisedByEmployeeName} on the contract row, so they
            know what to change before raising it again.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this replacement being declined?"
            className="min-h-[90px] text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectReason.trim() || !!busyId}
              onClick={reject}
            >
              {busyId ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
