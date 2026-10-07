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
import StatCard from '@/components/StatCard';
import { ContractActionsMenu } from '@/components/employeeComponents/ContractActionsMenu';
import {
  ContractDocMark,
  ViewProductMark,
  MachineSwapMark,
  SecurityBillMark,
  ReportMark,
} from '@/components/ui/BrandMarks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Wrench,
  Square,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Timer,
  Gauge,
  FileText,
  X,
  Warehouse as WarehouseIcon,
  ShieldCheck,
} from 'lucide-react';
import { ProductDetailModal } from '@/components/shared/ProductDetailModal';
import { ChangeMachineModal } from '@/components/employeeComponents/ChangeMachineModal';
import { TechnicianReplacementsTab } from '@/components/replacement/TechnicianReplacementsTab';
import { CollectSecurityDepositModal } from '@/components/employeeComponents/CollectSecurityDepositModal';
import { InstallationReportModal } from '@/components/installation/InstallationReportModal';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';

export default function InstallationRequestsPage() {
  // Vendor purchasing/contact info isn't relevant here (Service Desk); Lot info is
  // additionally hidden for Service Technicians specifically, who also use this page.
  // The Replacement Requests tab lists replacement jobs assigned to the viewer as the
  // swapping technician, so it is always empty for the Service Desk — whose own leg of
  // that chain (confirm delivery, assign the technician) lives on the Machine
  // Replacements page instead.
  const [isServiceHelpDesk, setIsServiceHelpDesk] = useState(false);
  useEffect(() => {
    const job = getUserFromToken()?.employeeJob;
    setIsServiceHelpDesk(job === EmployeeJob.SERVICE_HELP_DESK);
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

  // Installation report + customer sign-off (COMPLETED jobs only)
  const [reportRequestId, setReportRequestId] = useState<string | null>(null);

  // Product view + Change Machine
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<InstallationRequest | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // Warehouse name cache keyed by productId
  const [warehouseCache, setWarehouseCache] = useState<Record<string, string>>({});

  // Contract view dialog
  const [viewContract, setViewContract] = useState<ContractAgreement | null>(null);
  const [contractLoading, setContractLoading] = useState<string | null>(null);

  // Collect Security Deposit — shown when the Employee didn't collect it at conversion
  const [depositTarget, setDepositTarget] = useState<InstallationRequest | null>(null);

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
      // The start endpoint returns the installation row without the deposit details
      // added by GET /installation-requests. Keep those fields from the enriched row
      // so the outstanding deposit action remains available throughout the job.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updated,
                securityDepositAmount: r.securityDepositAmount,
                securityDepositCollected: r.securityDepositCollected,
                securityDepositStatus: r.securityDepositStatus,
              }
            : r,
        ),
      );
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
      // Like the start endpoint, stop returns the bare installation row. Preserve
      // the GET response's deposit enrichment so an uncollected deposit can still
      // be collected after the technician records the initial meter readings.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updated,
                securityDepositAmount: r.securityDepositAmount,
                securityDepositCollected: r.securityDepositCollected,
                securityDepositStatus: r.securityDepositStatus,
              }
            : r,
        ),
      );
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
      PENDING: { label: 'Pending', color: 'bg-warning/10 text-warning' },
      ASSIGNED: { label: 'Assigned', color: 'bg-primary/10 text-primary' },
      IN_PROGRESS: { label: 'In Progress', color: 'bg-success/10 text-success' },
      COMPLETED: { label: 'Completed', color: 'bg-muted text-foreground' },
    };
    const cfg = map[status] || { label: status, color: 'bg-muted text-muted-foreground' };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.color}`}
      >
        {cfg.label}
      </span>
    );
  };

  // Technicians keep one destination: installations and replacement swaps are both
  // "jobs assigned to me", so replacements are a tab here rather than a separate page.
  const [jobTab, setJobTab] = useState<'installations' | 'replacements'>('installations');

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight">
            Installation Requests
          </h1>
          <p className="text-xs text-muted-foreground font-bold mt-0.5">
            {jobTab === 'installations' || isServiceHelpDesk
              ? 'Track and manage product installation tasks'
              : 'Machine replacements assigned to you'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-9"
        >
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Job type tabs — a lone tab is just noise, so the bar only appears when the
          viewer actually has a choice. */}
      {!isServiceHelpDesk && (
        <div className="flex gap-1 border-b border-border">
          {(
            [
              ['installations', 'Installations'],
              ['replacements', 'Replacement Requests'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setJobTab(key)}
              className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
                jobTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {jobTab === 'replacements' && !isServiceHelpDesk && <TechnicianReplacementsTab />}

      {(jobTab === 'installations' || isServiceHelpDesk) && (
        <>
          {/* Stats — the shared StatCard the Rent and Quotations pages use, so the
              service desk's summary reads the same as the rest of the app. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {[
              {
                title: 'Pending',
                value: requests.filter((r) => r.status === 'PENDING').length,
                subtitle: 'Awaiting a technician',
              },
              {
                title: 'Assigned',
                value: requests.filter((r) => r.status === 'ASSIGNED').length,
                subtitle: 'Technician allocated',
              },
              {
                title: 'In Progress',
                value: requests.filter((r) => r.status === 'IN_PROGRESS').length,
                subtitle: 'Installation underway',
              },
              {
                title: 'Completed',
                value: requests.filter((r) => r.status === 'COMPLETED').length,
                subtitle: 'Finished jobs',
              },
            ].map((s) => (
              <StatCard
                key={s.title}
                title={s.title}
                value={s.value.toString()}
                subtitle={s.subtitle}
              />
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, customer, or technician..."
              className="pl-9 h-9 border-border text-sm font-bold"
            />
          </div>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench size={32} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">
                    No installation requests
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requests appear here when created from Customer Contracts.
                  </p>
                </div>
              ) : (
                <Table pagination={{ pageSize: 10 }}>
                  <TableHeader>
                    <TableRow className="bg-muted/70">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Invoice
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Type
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Customer
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Service Desk
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Warehouse
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Technician
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Duration
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Started
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                        <TableRow key={req.id} className="hover:bg-muted/50">
                          <TableCell className="text-foreground text-sm">
                            {req.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const type = req.saleType?.toUpperCase();
                              if (type === 'SALE')
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-success/10 text-success">
                                    Sale
                                  </span>
                                );
                              if (type === 'RENT')
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                    Rent
                                  </span>
                                );
                              if (type === 'LEASE')
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-lease/10 text-lease">
                                    Lease
                                  </span>
                                );
                              return <span className="text-muted-foreground text-[11px]">—</span>;
                            })()}
                          </TableCell>
                          <TableCell className="font-bold text-foreground text-sm">
                            {req.customerName}
                            {req.customerAddress && (
                              <p className="text-[10px] text-muted-foreground">
                                {req.customerAddress}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {req.assignedByEmployeeName || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {req.currentProductId && warehouseCache[req.currentProductId] ? (
                              <span className="flex items-center gap-1">
                                <WarehouseIcon size={11} className="text-muted-foreground" />
                                {warehouseCache[req.currentProductId]}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-foreground text-sm">
                            {req.technicianName || (
                              <span className="text-muted-foreground text-[11px]">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>{statusBadge(req.status)}</TableCell>
                          <TableCell className="font-bold text-foreground">
                            {req.status === 'IN_PROGRESS' && liveSec !== undefined ? (
                              <span className="flex items-center gap-1 text-success">
                                <Timer size={12} className="animate-pulse" />
                                {formatDuration(liveSec)}
                              </span>
                            ) : req.durationSeconds ? (
                              formatDuration(req.durationSeconds)
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground font-bold">
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
                              {/* Secondary actions live in the shared popup, so the column
                                  stays a fixed width and the workflow button below is the
                                  one thing that stands out. Each entry keeps the exact
                                  condition it had as an inline icon button. */}
                              <ContractActionsMenu
                                label="Job Actions"
                                actions={[
                                  {
                                    key: 'contract',
                                    icon: <ContractDocMark />,
                                    label: 'View Contract',
                                    description: 'Open the contract this job belongs to',
                                    loading: contractLoading === req.id,
                                    onClick: () => handleViewContract(req),
                                  },
                                  ...(req.currentProductId
                                    ? [
                                        {
                                          key: 'product',
                                          icon: <ViewProductMark />,
                                          label: 'View Machine',
                                          description: req.currentSerialNumber
                                            ? `Serial ${req.currentSerialNumber}`
                                            : 'Machine on this job',
                                          onClick: () => setViewProductId(req.currentProductId!),
                                        },
                                      ]
                                    : []),
                                  // Sale-only: Rent/Lease machines are replaced by Finance/Admin
                                  // from the contract screen, so the meter readings needed for
                                  // billing get captured.
                                  ...(req.currentProductId &&
                                  req.status !== 'PENDING' &&
                                  !isRentLease
                                    ? [
                                        {
                                          key: 'swap',
                                          icon: <MachineSwapMark />,
                                          label: 'Change Machine',
                                          description: 'Swap the unit on this job',
                                          onClick: () => {
                                            setSwapTarget(req);
                                            setSwapOpen(true);
                                          },
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                              {/* Security deposit, always visible on a Rent/Lease job that
                                  requires one. It used to be a menu entry that simply
                                  vanished once the Employee had recorded the deposit at
                                  conversion, so the row gave no sign either way and the
                                  action read as missing. Now: "Collect Now" when nobody
                                  has taken it (the fallback so it is never left
                                  uncollected), and "Collected" once someone has. */}
                              {isRentLease &&
                                (req.securityDepositAmount ?? 0) > 0 &&
                                (req.securityDepositCollected ? (
                                  <span
                                    title={
                                      req.securityDepositStatus === 'APPROVED'
                                        ? 'Security deposit collected and approved by Finance'
                                        : 'Security deposit collected — awaiting Finance approval'
                                    }
                                    className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full bg-success/10 px-3 text-[9px] font-black uppercase tracking-widest text-success ring-1 ring-success/30"
                                  >
                                    <ShieldCheck size={12} />
                                    Deposit Collected
                                    {req.securityDepositStatus !== 'APPROVED' && (
                                      <span className="font-bold normal-case tracking-normal text-success/80">
                                        (awaiting approval)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDepositTarget(req)}
                                    title={`Collect the ${Number(req.securityDepositAmount).toFixed(2)} refundable security deposit`}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-border bg-primary px-3 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-px"
                                  >
                                    <SecurityBillMark size={14} />
                                    Collect Deposit Now
                                  </button>
                                ))}
                              {req.status === 'ASSIGNED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStart(req.id)}
                                  disabled={isActing}
                                  title="Start installation"
                                  className="inline-flex h-8 items-center justify-center rounded-full border-2 border-border bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {isActing ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    'Install Now'
                                  )}
                                </button>
                              )}
                              {req.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteClick(req)}
                                  disabled={isActing}
                                  className="h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-[9px] uppercase tracking-widest px-3 rounded-lg"
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
                                <button
                                  type="button"
                                  onClick={() => setReportRequestId(req.id)}
                                  title="Installation report & customer signature"
                                  className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-lease/10 text-lease font-black text-[9px] uppercase tracking-widest ring-1 ring-lease/30 transition-all hover:bg-lease/10 hover:ring-lease/30 active:translate-y-px"
                                >
                                  <ReportMark size={20} />
                                  Report
                                </button>
                              )}
                              {req.status === 'COMPLETED' && (
                                <span className="flex items-center gap-1 text-success">
                                  <CheckCircle2 size={14} />
                                  <span className="text-[10px] font-black">Done</span>
                                </span>
                              )}
                              {req.status === 'PENDING' && (
                                <span className="text-[10px] font-bold text-warning flex items-center gap-1">
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
        </>
      )}

      <ProductDetailModal
        productId={viewProductId}
        open={!!viewProductId}
        onClose={() => setViewProductId(null)}
        hideVendorDetails
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

      {depositTarget && (
        <CollectSecurityDepositModal
          contractId={depositTarget.invoiceId}
          customerName={depositTarget.customerName}
          invoiceNumber={depositTarget.invoiceNumber}
          defaultAmount={depositTarget.securityDepositAmount ?? 0}
          onClose={() => setDepositTarget(null)}
          onSuccess={() => {
            setDepositTarget(null);
            loadData();
          }}
        />
      )}

      {reportRequestId && (
        <InstallationReportModal
          requestId={reportRequestId}
          onClose={() => setReportRequestId(null)}
          onSigned={loadData}
        />
      )}

      {/* Contract View Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(v) => !v && setViewContract(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl"
        >
          <DialogTitle className="sr-only">Contract Agreement</DialogTitle>
          {viewContract && (
            <>
              <div className="bg-gradient-to-r from-primary to-primary p-5 text-primary-foreground flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-card flex items-center justify-center flex-shrink-0">
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
                  className="text-primary-foreground hover:text-primary-foreground mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">
                      Customer
                    </p>
                    <p className="font-bold text-foreground">{viewContract.customerName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">
                      Created By
                    </p>
                    <p className="font-bold text-foreground">
                      {viewContract.createdByEmployeeName || '—'}
                    </p>
                  </div>
                  {viewContract.customerPhone && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">
                        Phone
                      </p>
                      <p className="font-bold text-foreground">{viewContract.customerPhone}</p>
                    </div>
                  )}
                  {viewContract.customerEmail && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">
                        Email
                      </p>
                      <p className="font-bold text-foreground">{viewContract.customerEmail}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Signatures
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold text-xs">Employee</span>
                    {viewContract.employeeSignatureData ? (
                      <span className="flex items-center gap-1 text-success text-xs font-black">
                        <CheckCircle2 size={12} />
                        {viewContract.employeeSignedByName ?? 'Signed'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-bold">Pending</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold text-xs">Customer</span>
                    {viewContract.customerSignatureData ||
                    viewContract.customerSignedDocumentUrl ? (
                      <span className="flex items-center gap-1 text-success text-xs font-black">
                        <CheckCircle2 size={12} />
                        {viewContract.customerSignedByName ?? 'Signed'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-bold">Pending</span>
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
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl"
        >
          <DialogTitle className="sr-only">Initial Meter Readings</DialogTitle>

          {/* Header */}
          <div className="bg-card border-b border-border p-5 text-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  <Gauge size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                    Initial Meter Readings
                  </p>
                  <p className="text-base font-black text-foreground">
                    {readingTarget?.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-bold font-sans">
                    {readingTarget?.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReadingTarget(null);
                  setReadingContract(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-2">
                      Rent Info
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                          Monthly Rent
                        </p>
                        <p className="font-black text-foreground text-sm">
                          QAR{' '}
                          {Number(readingContract.monthlyRent ?? 0).toLocaleString('en', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                          Rent Type
                        </p>
                        <p className="font-black text-foreground text-xs">
                          {readingContract.rentType?.replace(/_/g, ' ') ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Black & White Readings */}
                <div className="bg-muted border border-border rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                        Black &amp; White Readings
                      </p>
                    </div>
                    {bwItem && (
                      <div className="text-right text-[9px] text-muted-foreground font-bold leading-tight">
                        <span>Free: {Number(bwItem.bwIncludedLimit ?? 0).toLocaleString()}/mo</span>
                        <span className="mx-1">·</span>
                        <span>Excess: QAR {Number(bwItem.bwExcessRate ?? 0).toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        A4 Starting Count <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={bwCount}
                        onChange={(e) => setBwCount(e.target.value)}
                        className="h-9 text-sm font-bold bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        A3 Starting Count
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0 (optional)"
                        value={bwA3Count}
                        onChange={(e) => setBwA3Count(e.target.value)}
                        className="h-9 text-sm font-bold bg-card"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Readings — hidden when contract has no color billing rule */}
                {showColor && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                          Color Readings
                        </p>
                      </div>
                      {colorItem && (
                        <div className="text-right text-[9px] text-muted-foreground font-bold leading-tight">
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
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          A4 Starting Count
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0 (optional)"
                          value={colorCount}
                          onChange={(e) => setColorCount(e.target.value)}
                          className="h-9 text-sm font-bold bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          A3 Starting Count
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0 (optional)"
                          value={colorA3Count}
                          onChange={(e) => setColorA3Count(e.target.value)}
                          className="h-9 text-sm font-bold bg-card"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Installation Date */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Installation Date
                  </Label>
                  <Input
                    type="date"
                    value={readingDate}
                    onChange={(e) => setReadingDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>

                <p className="text-[10px] text-muted-foreground font-bold bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
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
                    className="flex-1 h-9 text-xs font-black bg-primary hover:bg-primary/90"
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
