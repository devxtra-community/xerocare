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
import { Eye, Gauge, FileText, Loader2, Wrench, Play, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  listReplacements,
  startReplacementWork,
  formatWorkDuration,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_CLASS,
  type ReplacementRequest,
} from '@/lib/replacement';
import { ReplacementViewDialog } from './ReplacementViewDialog';
import { ReplacementInstallModal } from './ReplacementInstallModal';
import { ReplacementReportModal } from './ReplacementReportModal';

/**
 * Stage 06–07 as the technician sees them — their own assigned swaps, the meter form,
 * and the report once the swap is done.
 *
 * Scoped with `mine: true` so a technician only ever sees jobs assigned to them; the
 * service desk's own page is where the full queue lives.
 */

const fmt = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function TechnicianReplacementsTab() {
  const [rows, setRows] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  // Ticks once a second purely so a running job's elapsed time counts up on screen —
  // the authoritative duration is computed server-side at install, never from this.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = async (r: ReplacementRequest) => {
    setStartingId(r.id);
    try {
      await startReplacementWork(r.id);
      toast.success('Job started — the clock is running');
      await load();
    } catch (err) {
      toast.error('Could not start the job', { description: getApiErrorMessage(err) });
    } finally {
      setStartingId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await listReplacements({
          mine: true,
          status: 'TECHNICIAN_ASSIGNED,INSTALLED,CUSTOMER_APPROVED',
        }),
      );
    } catch (err) {
      toast.error('Failed to load your replacements', {
        description: getApiErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-card p-4 shadow-sm">
        <div className="mb-2 overflow-x-auto">
          <Table className="min-w-[900px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-primary">REQUEST</TableHead>
                <TableHead className="font-bold text-primary">CUSTOMER</TableHead>
                <TableHead className="font-bold text-primary">CONTRACT</TableHead>
                <TableHead className="font-bold text-primary">OUT → IN</TableHead>
                <TableHead className="font-bold text-primary">ASSIGNED</TableHead>
                <TableHead className="font-bold text-primary">TIME TAKEN</TableHead>
                <TableHead className="font-bold text-primary">STATUS</TableHead>
                <TableHead className="text-center font-bold text-primary">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline-block animate-spin" size={16} />
                    Loading your replacements…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center text-muted-foreground">
                    <Wrench className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    No replacement jobs assigned to you.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {r.requestNo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-bold text-slate-700">
                      {r.customerName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {r.contractNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <span className="text-red-600">{r.oldSerialNumber}</span>
                      {' → '}
                      <span className="text-emerald-700">{r.newSerialNumber ?? '—'}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmt(r.assignedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.workDurationSeconds != null ? (
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {formatWorkDuration(r.workDurationSeconds)}
                        </span>
                      ) : r.workStartedAt ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-600">
                          <Timer className="h-3 w-3 animate-pulse" />
                          {formatWorkDuration(
                            Math.floor((now - new Date(r.workStartedAt).getTime()) / 1000),
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
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
                          className="h-8 w-8 rounded-lg p-0 text-blue-500 hover:bg-blue-50"
                          title="View job details"
                          onClick={() => setViewingId(r.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {r.status === 'TECHNICIAN_ASSIGNED' && !r.workStartedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={startingId === r.id}
                            className="h-8 w-8 rounded-lg p-0 text-emerald-600 hover:bg-emerald-50"
                            title="Start the job — begins timing the swap"
                            onClick={() => start(r)}
                          >
                            {startingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {r.status === 'TECHNICIAN_ASSIGNED' && r.workStartedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 text-primary hover:bg-blue-50"
                            title="Finish the job — record both meters"
                            onClick={() => setInstallingId(r.id)}
                          >
                            <Gauge className="h-4 w-4" />
                          </Button>
                        )}
                        {(r.status === 'INSTALLED' || r.status === 'CUSTOMER_APPROVED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 text-emerald-600 hover:bg-emerald-50"
                            title="Replacement report"
                            onClick={() => setReportId(r.id)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
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

      {viewingId && (
        <ReplacementViewDialog requestId={viewingId} onClose={() => setViewingId(null)} />
      )}
      {installingId && (
        <ReplacementInstallModal
          requestId={installingId}
          onClose={() => setInstallingId(null)}
          onDone={load}
        />
      )}
      {reportId && (
        <ReplacementReportModal
          requestId={reportId}
          onClose={() => setReportId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
