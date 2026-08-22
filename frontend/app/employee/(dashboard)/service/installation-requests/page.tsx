'use client';

import React, { useEffect, useState } from 'react';
import {
  getInstallationRequests,
  startInstallation,
  stopInstallation,
  getContractAgreement,
  InstallationRequest,
  ContractAgreement,
  formatDuration,
} from '@/lib/saleWorkflow';
import { getProductById } from '@/lib/product';
import { getInvoiceById } from '@/lib/invoice';
import type { Invoice } from '@/lib/invoice';
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
  Wrench,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Timer,
  Gauge,
  Eye,
  RefreshCcw,
  FileText,
  X,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { ProductDetailModal } from '@/components/shared/ProductDetailModal';
import { ChangeMachineModal } from '@/components/employeeComponents/ChangeMachineModal';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';

export default function InstallationRequestsPage() {
  // Vendor purchasing/contact info isn't relevant here (Service Desk); Lot info is
  // additionally hidden for Service Technicians specifically, who also use this page.
  const [isServiceTechnician, setIsServiceTechnician] = useState(false);
  useEffect(() => {
    setIsServiceTechnician(getUserFromToken()?.employeeJob === EmployeeJob.SERVICE_TECHNICIAN);
  }, []);
  const [requests, setRequests] = useState<InstallationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveTimers, setLiveTimers] = useState<Record<string, number>>({});

  // Initial reading dialog (RENT/LEASE jobs only)
  const [readingTarget, setReadingTarget] = useState<InstallationRequest | null>(null);
  const [bwCount, setBwCount] = useState('');
  const [bwA3Count, setBwA3Count] = useState('');
  const [colorCount, setColorCount] = useState('');
  const [colorA3Count, setColorA3Count] = useState('');
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [readingContract, setReadingContract] = useState<Invoice | null>(null);

  // Product view + Change Machine
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<InstallationRequest | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // Warehouse name cache keyed by productId
  const [warehouseCache, setWarehouseCache] = useState<Record<string, string>>({});

  // Contract view dialog
  const [viewContract, setViewContract] = useState<ContractAgreement | null>(null);
  const [contractLoading, setContractLoading] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getInstallationRequests();
      setRequests(data);

      const uniquePids = [
        ...new Set(data.filter((r) => r.currentProductId).map((r) => r.currentProductId as string)),
      ];
      if (uniquePids.length > 0) {
        const cache: Record<string, string> = {};
        await Promise.allSettled(
          uniquePids.map(async (pid) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = (await getProductById(pid)) as any;
              const name: string | undefined = p?.warehouse?.name ?? p?.warehouse?.warehouseName;
              if (name) cache[pid] = name;
            } catch {
              /* skip */
            }
          }),
        );
        setWarehouseCache(cache);
      }
    } catch (err) {
      toast.error('Failed to load installation requests', { description: getApiErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewContract = async (req: InstallationRequest) => {
    setContractLoading(req.id);
    try {
      const agreement = await getContractAgreement(req.invoiceId);
      setViewContract(agreement);
    } catch (err) {
      toast.error('Failed to load contract', { description: getApiErrorMessage(err) });
    } finally {
      setContractLoading(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tick live timer every second for IN_PROGRESS requests
  useEffect(() => {
    const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS' && r.startTime);
    if (inProgress.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};
      for (const r of inProgress) {
        if (r.startTime) {
          newTimers[r.id] = Math.floor((now - new Date(r.startTime).getTime()) / 1000);
        }
      }
      setLiveTimers((prev) => ({ ...prev, ...newTimers }));
    }, 1000);

    return () => clearInterval(interval);
  }, [requests]);

  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await startInstallation(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('Installation started');
    } catch (err) {
      toast.error('Failed to start', { description: getApiErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string, readings?: Parameters<typeof stopInstallation>[1]) => {
    setActionLoading(id);
    try {
      const updated = await stopInstallation(id, readings);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setLiveTimers((prev) => {
        const t = { ...prev };
        delete t[id];
        return t;
      });
      toast.success('Installation completed', {
        description: updated.durationSeconds
          ? `Duration: ${formatDuration(updated.durationSeconds)}`
          : undefined,
      });
    } catch (err) {
      toast.error('Failed to stop', { description: getApiErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!readingTarget?.invoiceId) {
      setReadingContract(null);
      return;
    }
    getInvoiceById(readingTarget.invoiceId)
      .then((inv) => setReadingContract(inv))
      .catch(() => setReadingContract(null));
  }, [readingTarget?.invoiceId]);

  const handleCompleteClick = (req: InstallationRequest) => {
    const isRentLease = req.saleType === 'RENT' || req.saleType === 'LEASE';
    if (isRentLease) {
      setBwCount('');
      setBwA3Count('');
      setColorCount('');
      setColorA3Count('');
      setReadingDate(new Date().toISOString().split('T')[0]);
      setReadingTarget(req);
    } else {
      handleStop(req.id);
    }
  };

  const handleSubmitReadings = async () => {
    if (!readingTarget) return;
    if (!bwCount) {
      toast.error('B&W meter reading is required');
      return;
    }
    setIsSavingReading(true);
    try {
      await handleStop(readingTarget.id, {
        bwCount: Number(bwCount),
        bwA3Count: bwA3Count ? Number(bwA3Count) : undefined,
        colorCount: colorCount ? Number(colorCount) : undefined,
        colorA3Count: colorA3Count ? Number(colorA3Count) : undefined,
        readingTakenDate: readingDate,
      });
      setReadingTarget(null);
    } finally {
      setIsSavingReading(false);
    }
  };

  const filtered = requests.filter(
    (r) =>
      !search ||
      r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (r.technicianName || '').toLowerCase().includes(search.toLowerCase()),
  );

  const statusBadge = (status: InstallationRequest['status']) => {
    const map = {
      PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
      ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
      IN_PROGRESS: { label: 'In Progress', color: 'bg-emerald-100 text-emerald-700' },
      COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-600' },
    };
    const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-500' };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.color}`}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Installation Requests
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Track and manage product installation tasks
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
        >
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Pending',
            count: requests.filter((r) => r.status === 'PENDING').length,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Assigned',
            count: requests.filter((r) => r.status === 'ASSIGNED').length,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'In Progress',
            count: requests.filter((r) => r.status === 'IN_PROGRESS').length,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Completed',
            count: requests.filter((r) => r.status === 'COMPLETED').length,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex flex-col items-center gap-1`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice, customer, or technician..."
          className="pl-9 h-9 border-slate-200 text-sm font-bold"
        />
      </div>

      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Wrench size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No installation requests</p>
              <p className="text-xs text-slate-400 mt-1">
                Requests appear here when created from Customer Contracts.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Invoice
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Type
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Customer
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Service Desk
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Warehouse
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Technician
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Duration
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Started
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => {
                  const isActing = actionLoading === req.id;
                  const liveSec = liveTimers[req.id];
                  const isRentLease = req.saleType === 'RENT' || req.saleType === 'LEASE';
                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-slate-800 text-sm">{req.invoiceNumber}</TableCell>
                      <TableCell>
                        {(() => {
                          const type = req.saleType?.toUpperCase();
                          if (type === 'SALE')
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                Sale
                              </span>
                            );
                          if (type === 'RENT')
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                                Rent
                              </span>
                            );
                          if (type === 'LEASE')
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                                Lease
                              </span>
                            );
                          return <span className="text-slate-400 text-[11px]">—</span>;
                        })()}
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {req.customerName}
                        {req.customerAddress && (
                          <p className="text-[10px] text-slate-400">{req.customerAddress}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {req.assignedByEmployeeName || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {req.currentProductId && warehouseCache[req.currentProductId] ? (
                          <span className="flex items-center gap-1">
                            <WarehouseIcon size={11} className="text-slate-400" />
                            {warehouseCache[req.currentProductId]}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {req.technicianName || (
                          <span className="text-slate-400 text-[11px]">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="font-bold text-slate-700">
                        {req.status === 'IN_PROGRESS' && liveSec !== undefined ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Timer size={12} className="animate-pulse" />
                            {formatDuration(liveSec)}
                          </span>
                        ) : req.durationSeconds ? (
                          formatDuration(req.durationSeconds)
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500 font-bold">
                        {req.startTime
                          ? new Date(req.startTime).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewContract(req)}
                            disabled={contractLoading === req.id}
                            title="View contract"
                            className="h-7 w-7 p-0 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            {contractLoading === req.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <FileText size={13} />
                            )}
                          </Button>
                          {req.currentProductId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewProductId(req.currentProductId!)}
                              title={`View product · ${req.currentSerialNumber ?? ''}`}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            >
                              <Eye size={13} />
                            </Button>
                          )}
                          {/* Sale-only: Rent/Lease machines are replaced by Finance/Admin from the
                              contract screen, so the meter readings needed for billing get captured. */}
                          {req.currentProductId && req.status !== 'PENDING' && !isRentLease && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSwapTarget(req);
                                setSwapOpen(true);
                              }}
                              title="Change Machine"
                              className="h-7 w-7 p-0 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                            >
                              <RefreshCcw size={13} />
                            </Button>
                          )}
                          {req.status === 'ASSIGNED' && (
                            <Button
                              size="sm"
                              onClick={() => handleStart(req.id)}
                              disabled={isActing}
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest px-3 rounded-lg"
                            >
                              {isActing ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  <Play size={10} className="mr-1" />
                                  Start
                                </>
                              )}
                            </Button>
                          )}
                          {req.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteClick(req)}
                              disabled={isActing}
                              className="h-7 bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-3 rounded-lg"
                            >
                              {isActing ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  {isRentLease ? (
                                    <Gauge size={10} className="mr-1" />
                                  ) : (
                                    <Square size={10} className="mr-1" />
                                  )}
                                  {isRentLease ? 'Readings' : 'Complete'}
                                </>
                              )}
                            </Button>
                          )}
                          {req.status === 'COMPLETED' && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle2 size={14} />
                              <span className="text-[10px] font-black">Done</span>
                            </span>
                          )}
                          {req.status === 'PENDING' && (
                            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                              <Clock size={12} />
                              Pending
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductDetailModal
        productId={viewProductId}
        open={!!viewProductId}
        onClose={() => setViewProductId(null)}
        hideVendorDetails
        hideLotDetails={isServiceTechnician}
      />

      {swapTarget && (
        <ChangeMachineModal
          open={swapOpen}
          onClose={() => {
            setSwapOpen(false);
            setSwapTarget(null);
          }}
          contractId={swapTarget.invoiceId}
          invoiceNumber={swapTarget.invoiceNumber}
          contractType={swapTarget.saleType ?? 'CONTRACT'}
          currentSerialNumber={swapTarget.currentSerialNumber}
          currentModelId={swapTarget.currentModelId}
          onSwapRequested={loadData}
        />
      )}

      {/* Contract View Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(v) => !v && setViewContract(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Contract Agreement</DialogTitle>
          {viewContract && (
            <>
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-5 text-white flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                      Contract Agreement
                    </p>
                    <p className="text-base font-black">{viewContract.agreementNumber}</p>
                    <p className="text-[10px] opacity-70">
                      {new Date(viewContract.contractDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewContract(null)}
                  className="text-white/60 hover:text-white mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                      Customer
                    </p>
                    <p className="font-bold text-slate-700">{viewContract.customerName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                      Created By
                    </p>
                    <p className="font-bold text-slate-700">
                      {viewContract.createdByEmployeeName || '—'}
                    </p>
                  </div>
                  {viewContract.customerPhone && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                        Phone
                      </p>
                      <p className="font-bold text-slate-700">{viewContract.customerPhone}</p>
                    </div>
                  )}
                  {viewContract.customerEmail && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                        Email
                      </p>
                      <p className="font-bold text-slate-700">{viewContract.customerEmail}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Signatures
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold text-xs">Employee</span>
                    {viewContract.employeeSignatureData ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-black">
                        <CheckCircle2 size={12} />
                        {viewContract.employeeSignedByName ?? 'Signed'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">Pending</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold text-xs">Customer</span>
                    {viewContract.customerSignatureData ||
                    viewContract.customerSignedDocumentUrl ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-black">
                        <CheckCircle2 size={12} />
                        {viewContract.customerSignedByName ?? 'Signed'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">Pending</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewContract(null)}
                    className="h-8 text-xs font-black"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Initial Reading Dialog — RENT/LEASE jobs */}
      <Dialog
        open={!!readingTarget}
        onOpenChange={(v) => {
          if (!v) {
            setReadingTarget(null);
            setReadingContract(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Initial Meter Readings</DialogTitle>

          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-5 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Gauge size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Initial Meter Readings
                  </p>
                  <p className="text-base font-black text-slate-800">
                    {readingTarget?.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 font-bold font-sans">
                    {readingTarget?.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReadingTarget(null);
                  setReadingContract(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {(() => {
            // Derive pricing rule items from the loaded contract
            const bwItem = readingContract?.items?.find(
              (i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0,
            );
            const colorItem = readingContract?.items?.find(
              (i) => (i.colorIncludedLimit ?? 0) > 0 || (i.colorExcessRate ?? 0) > 0,
            );
            // Show color section when: contract not yet loaded OR contract has color billing
            const showColor = !readingContract || !!colorItem;
            return (
              <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                {/* Rent Info */}
                {readingContract && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2">
                      Rent Info
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                          Monthly Rent
                        </p>
                        <p className="font-black text-slate-700 text-sm">
                          QAR{' '}
                          {Number(readingContract.monthlyRent ?? 0).toLocaleString('en', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                          Rent Type
                        </p>
                        <p className="font-black text-slate-700 text-xs">
                          {readingContract.rentType?.replace(/_/g, ' ') ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Black & White Readings */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Black &amp; White Readings
                      </p>
                    </div>
                    {bwItem && (
                      <div className="text-right text-[9px] text-slate-400 font-bold leading-tight">
                        <span>Free: {Number(bwItem.bwIncludedLimit ?? 0).toLocaleString()}/mo</span>
                        <span className="mx-1">·</span>
                        <span>Excess: QAR {Number(bwItem.bwExcessRate ?? 0).toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        A4 Starting Count <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={bwCount}
                        onChange={(e) => setBwCount(e.target.value)}
                        className="h-9 text-sm font-bold bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        A3 Starting Count
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0 (optional)"
                        value={bwA3Count}
                        onChange={(e) => setBwA3Count(e.target.value)}
                        className="h-9 text-sm font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Readings — hidden when contract has no color billing rule */}
                {showColor && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Color Readings
                        </p>
                      </div>
                      {colorItem && (
                        <div className="text-right text-[9px] text-slate-400 font-bold leading-tight">
                          <span>
                            Free: {Number(colorItem.colorIncludedLimit ?? 0).toLocaleString()}/mo
                          </span>
                          <span className="mx-1">·</span>
                          <span>
                            Excess: QAR {Number(colorItem.colorExcessRate ?? 0).toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          A4 Starting Count
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0 (optional)"
                          value={colorCount}
                          onChange={(e) => setColorCount(e.target.value)}
                          className="h-9 text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          A3 Starting Count
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0 (optional)"
                          value={colorA3Count}
                          onChange={(e) => setColorA3Count(e.target.value)}
                          className="h-9 text-sm font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Installation Date */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Installation Date
                  </Label>
                  <Input
                    type="date"
                    value={readingDate}
                    onChange={(e) => setReadingDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-bold bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  These readings mark the starting point for billing calculations. B&W A4 count is
                  required.
                </p>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs font-black"
                    onClick={() => {
                      setReadingTarget(null);
                      setReadingContract(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-9 text-xs font-black bg-blue-600 hover:bg-blue-700"
                    onClick={handleSubmitReadings}
                    disabled={isSavingReading || !bwCount}
                  >
                    {isSavingReading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Complete Installation'
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
