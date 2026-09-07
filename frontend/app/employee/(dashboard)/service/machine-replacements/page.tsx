'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Eye, Truck, UserPlus, Loader2, PackageSearch, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { getTechnicians, ServiceTechnicianInfo } from '@/lib/serviceTicket';
import {
  listReplacements,
  formatWorkDuration,
  setReplacementDelivery,
  assignReplacementTechnician,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_CLASS,
  type ReplacementRequest,
} from '@/lib/replacement';
import { ReplacementViewDialog } from '@/components/replacement/ReplacementViewDialog';

/**
 * Stages 04–05 — the service desk's leg of the replacement chain.
 *
 * Two decisions live here and nowhere else: whether the replacement machine actually
 * reached the customer, and which technician performs the swap. Assignment is gated on
 * delivery because a technician cannot install a machine that has not arrived.
 */

const fmt = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Everything from unit-selected onwards — before that the service desk has nothing to do. */
const DESK_STATUSES = [
  'UNIT_SELECTED',
  'DELIVERED',
  'TECHNICIAN_ASSIGNED',
  'INSTALLED',
  'CUSTOMER_APPROVED',
].join(',');

function MachineReplacementsContent() {
  const [rows, setRows] = useState<ReplacementRequest[]>([]);
  const [technicians, setTechnicians] = useState<ServiceTechnicianInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ReplacementRequest | null>(null);
  const [technicianId, setTechnicianId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, techs] = await Promise.all([
        listReplacements({ status: DESK_STATUSES }),
        getTechnicians().catch(() => [] as ServiceTechnicianInfo[]),
      ]);
      setRows(reqs);
      setTechnicians(techs);
    } catch (err) {
      toast.error('Failed to load replacements', { description: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const techOptions = useMemo(
    () =>
      technicians.map((t) => {
        const name = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email;
        return {
          value: t.id,
          label: name,
          searchText: `${name} ${t.email} ${t.employeeJob}`,
          description: t.employeeJob || 'SERVICE_TECHNICIAN',
        };
      }),
    [technicians],
  );

  const setDelivered = async (r: ReplacementRequest, delivered: boolean) => {
    setBusyId(r.id);
    try {
      await setReplacementDelivery(r.id, delivered);
      toast.success(delivered ? 'Marked as delivered' : 'Delivery undone');
      await load();
    } catch (err) {
      toast.error('Could not update delivery', { description: getApiErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const assign = async () => {
    if (!assignTarget || !technicianId) return;
    const tech = technicians.find((t) => t.id === technicianId);
    const name =
      tech?.name || `${tech?.first_name || ''} ${tech?.last_name || ''}`.trim() || tech?.email;
    setBusyId(assignTarget.id);
    try {
      await assignReplacementTechnician(assignTarget.id, technicianId, name);
      toast.success(`Assigned to ${name}`);
      setAssignTarget(null);
      setTechnicianId('');
      await load();
    } catch (err) {
      toast.error('Could not assign technician', { description: getApiErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
          Machine Replacements
        </h3>
        <p className="text-sm text-muted-foreground font-medium">
          Approved replacements awaiting delivery and a technician
        </p>
      </div>

      <div className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden p-4">
        <div className="overflow-x-auto mb-2">
          <Table className="min-w-[980px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-primary font-bold">REQUEST</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">CONTRACT</TableHead>
                <TableHead className="text-primary font-bold">OUT → IN</TableHead>
                <TableHead className="text-primary font-bold">SELECTED</TableHead>
                <TableHead className="text-primary font-bold">TECHNICIAN</TableHead>
                <TableHead className="text-primary font-bold">TIME TAKEN</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Loading replacements…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                    <PackageSearch className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    Nothing waiting on the service desk.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {r.requestNo}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 whitespace-nowrap">
                      {r.customerName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {r.contractNumber}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <span className="text-red-600">{r.oldSerialNumber}</span>
                      {' → '}
                      <span className="text-emerald-700">{r.newSerialNumber ?? '—'}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmt(r.selectedAt)}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {r.technicianName ?? '—'}
                    </TableCell>
                    {/* How long the technician was on site. "In progress" while their
                        clock is still running — the desk sees the job is live without
                        needing the technician to tell them. */}
                    <TableCell className="whitespace-nowrap">
                      {r.workDurationSeconds != null ? (
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {formatWorkDuration(r.workDurationSeconds)}
                        </span>
                      ) : r.workStartedAt ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                          In progress
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
                          className="h-8 w-8 p-0 rounded-lg text-blue-500 hover:bg-blue-50"
                          title="View replacement"
                          onClick={() => setViewingId(r.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {r.status === 'UNIT_SELECTED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === r.id}
                            className="h-8 w-8 p-0 rounded-lg text-indigo-600 hover:bg-indigo-50"
                            title="Mark as delivered"
                            onClick={() => setDelivered(r, true)}
                          >
                            {busyId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Truck className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {(r.status === 'DELIVERED' || r.status === 'TECHNICIAN_ASSIGNED') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === r.id}
                              className="h-8 w-8 p-0 rounded-lg text-violet-600 hover:bg-violet-50"
                              title={
                                r.status === 'TECHNICIAN_ASSIGNED'
                                  ? 'Reassign technician'
                                  : 'Assign technician'
                              }
                              onClick={() => {
                                setAssignTarget(r);
                                setTechnicianId(r.technicianId ?? '');
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === r.id}
                              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-slate-100"
                              title="Not delivered — undo"
                              onClick={() => setDelivered(r, false)}
                            >
                              <RotateCcw className="h-4 w-4" />
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

      {viewingId && (
        <ReplacementViewDialog requestId={viewingId} onClose={() => setViewingId(null)} />
      )}

      <Dialog open={!!assignTarget} onOpenChange={(v) => !v && setAssignTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign technician — {assignTarget?.requestNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The technician records both meter readings on site. That is the moment the contract
            moves onto the new machine, so only assign someone who is going out to do the swap.
          </p>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Technician
            </Label>
            <SearchableSelect
              value={technicianId}
              onValueChange={setTechnicianId}
              options={techOptions}
              placeholder="Search technicians…"
              emptyText="No service technicians found"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button disabled={!technicianId || !!busyId} onClick={assign}>
              {busyId ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MachineReplacementsPage() {
  return (
    <ProtectedRoute requiredModules={['service', 'service_desk']}>
      <MachineReplacementsContent />
    </ProtectedRoute>
  );
}
