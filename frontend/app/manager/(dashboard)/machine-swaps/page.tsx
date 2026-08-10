'use client';

import React, { useEffect, useState } from 'react';
import {
  getMachineSwapRequests,
  approveMachineSwap,
  rejectMachineSwap,
  MachineSwapRequest,
  SwapRequestStatus,
} from '@/lib/machineSwap';
import { getApiErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  ArrowRight,
  Filter,
} from 'lucide-react';

const STATUS_CONFIG: Record<SwapRequestStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
};

export default function MachineSwapsPage() {
  const [swaps, setSwaps] = useState<MachineSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SwapRequestStatus | 'ALL'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<MachineSwapRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMachineSwapRequests();
      setSwaps(data);
    } catch (err) {
      toast.error('Failed to load swap requests', { description: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (swap: MachineSwapRequest) => {
    setActionLoading(swap.id);
    try {
      const updated = await approveMachineSwap(swap.id);
      setSwaps((prev) => prev.map((s) => (s.id === swap.id ? updated : s)));
      toast.success('Swap approved', {
        description: `${swap.currentSerialNumber} → ${swap.requestedSerialNumber} applied.`,
      });
    } catch (err) {
      toast.error('Approval failed', { description: getApiErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const updated = await rejectMachineSwap(rejectTarget.id, rejectReason);
      setSwaps((prev) => prev.map((s) => (s.id === rejectTarget.id ? updated : s)));
      toast.success('Swap request rejected');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error('Rejection failed', { description: getApiErrorMessage(err) });
    } finally {
      setRejecting(false);
    }
  };

  const filtered = swaps.filter((s) => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      !search ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      s.currentSerialNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.requestedSerialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.modelName ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pending = swaps.filter((s) => s.status === 'PENDING').length;
  const approved = swaps.filter((s) => s.status === 'APPROVED').length;
  const rejected = swaps.filter((s) => s.status === 'REJECTED').length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Machine Swap Requests
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Review and approve serial number swaps requested by technicians
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
        >
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Review', count: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', count: approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', count: rejected, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex flex-col items-center gap-1`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice, customer, serial, or model..."
            className="pl-9 h-9 border-slate-200 text-sm font-bold"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-400" />
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={`h-8 text-[10px] font-black uppercase tracking-wider px-3 ${
                statusFilter === s
                  ? 'bg-slate-800 text-white'
                  : 'border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No swap requests</p>
              <p className="text-xs text-slate-400 mt-1">
                Requests appear here when technicians report a defective machine.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  {[
                    'Invoice',
                    'Customer',
                    'Model',
                    'Current → Replacement',
                    'Reason',
                    'Requested By',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((swap) => {
                  const isActing = actionLoading === swap.id;
                  const cfg = STATUS_CONFIG[swap.status];
                  return (
                    <TableRow key={swap.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-slate-800 text-sm">
                        {swap.invoiceNumber}
                        <p className="text-[9px] text-slate-400 font-bold">{swap.contractType}</p>
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {swap.customerName ?? '—'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {swap.modelName ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-black text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                            {swap.currentSerialNumber}
                          </span>
                          <ArrowRight size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-[11px] font-black text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">
                            {swap.requestedSerialNumber}
                          </span>
                        </div>
                        {swap.status === 'APPROVED' && swap.swapExecutedAt && (
                          <p className="text-[9px] text-emerald-600 font-bold mt-0.5">
                            Executed {new Date(swap.swapExecutedAt).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        {swap.status === 'REJECTED' && swap.rejectionReason && (
                          <p
                            className="text-[9px] text-red-500 font-bold mt-0.5 max-w-[160px] truncate"
                            title={swap.rejectionReason}
                          >
                            ✕ {swap.rejectionReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500 font-semibold max-w-[140px]">
                        <span className="line-clamp-2">{swap.reason || '—'}</span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {swap.requestedByName}
                        <p className="text-[9px] text-slate-400">
                          {new Date(swap.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        {swap.status !== 'PENDING' && swap.reviewedByName && (
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                            by {swap.reviewedByName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {swap.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(swap)}
                              disabled={isActing}
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest px-3 rounded-lg"
                            >
                              {isActing ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 size={10} className="mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectTarget(swap);
                                setRejectReason('');
                              }}
                              disabled={isActing}
                              className="h-7 border-red-200 text-red-600 hover:bg-red-50 font-black text-[9px] uppercase tracking-widest px-3 rounded-lg"
                            >
                              <XCircle size={10} className="mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="flex items-center justify-end gap-1 text-slate-400">
                            {swap.status === 'APPROVED' ? (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            ) : (
                              <XCircle size={14} className="text-red-400" />
                            )}
                            <span className="text-[10px] font-black">
                              {swap.status === 'APPROVED' ? 'Done' : 'Rejected'}
                            </span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Reject Swap Request</DialogTitle>
          <div className="bg-gradient-to-r from-red-600 to-red-500 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <XCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Reject Swap
                </p>
                <p className="text-base font-black">{rejectTarget?.invoiceNumber}</p>
                <p className="text-[11px] opacity-70">
                  {rejectTarget?.currentSerialNumber} → {rejectTarget?.requestedSerialNumber}
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Reason for Rejection (optional)
              </Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Replacement unit not available, policy reasons…"
                className="h-9 text-xs font-bold border-slate-200"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs font-black"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-9 text-xs font-black bg-red-600 hover:bg-red-700"
                onClick={handleRejectSubmit}
                disabled={rejecting}
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle size={12} className="mr-1" />
                    Confirm Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
