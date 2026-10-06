'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ClipboardList, Eye, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCustomerById } from '@/lib/customer';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import {
  approveEstimateFinance,
  approveRevisionFinance,
  FinancePendingServiceEstimates,
  getTechnicians,
  rejectEstimateFinance,
  rejectRevisionFinance,
  ServiceEstimate,
  ServiceEstimateItem,
  ServiceEstimateRevision,
  ServiceTechnicianInfo,
  ServiceTicket,
} from '@/lib/serviceTicket';
import { Customer } from '@/lib/customer';

type FinanceQueueRecord =
  | {
      sourceType: 'SERVICE_ESTIMATE';
      sourceId: string;
      version: number;
      submittedAt: string;
      customerTotal: number;
      labourCost: number;
      visitChargeAmount: number;
      transportChargeAmount: number;
      discountAmount: number;
      items: ServiceEstimateItem[];
      ticket: ServiceTicket;
      estimate: ServiceEstimate;
    }
  | {
      sourceType: 'SERVICE_ESTIMATE_REVISION';
      sourceId: string;
      version: number;
      submittedAt: string;
      customerTotal: number;
      labourCost: number;
      visitChargeAmount: number;
      transportChargeAmount: number;
      discountAmount: number;
      items: ServiceEstimateItem[];
      ticket: ServiceTicket;
      revision: ServiceEstimateRevision;
    };

interface PendingServiceEstimateQueueProps {
  data: FinancePendingServiceEstimates;
  onRefresh: () => void;
}

function normalizeQueue(data: FinancePendingServiceEstimates): FinanceQueueRecord[] {
  return [
    ...data.estimates.map((estimate) => ({
      sourceType: 'SERVICE_ESTIMATE' as const,
      sourceId: estimate.id,
      version: estimate.version,
      submittedAt: estimate.created_at,
      customerTotal: Number(estimate.totalCost) || 0,
      labourCost: Number(estimate.labourCost) || 0,
      visitChargeAmount: Number(estimate.visitChargeAmount) || 0,
      transportChargeAmount: Number(estimate.transportChargeAmount) || 0,
      discountAmount: Number(estimate.discountAmount) || 0,
      items: estimate.items || [],
      ticket: estimate.ticket,
      estimate,
    })),
    ...data.revisions.map((revision) => ({
      sourceType: 'SERVICE_ESTIMATE_REVISION' as const,
      sourceId: revision.id,
      version: revision.version,
      submittedAt: revision.submittedAt || revision.created_at,
      customerTotal: Number(revision.totalCost) || 0,
      labourCost: Number(revision.labourCost) || 0,
      visitChargeAmount: Number(revision.visitChargeAmount) || 0,
      transportChargeAmount: 0,
      discountAmount: Number(revision.discountApplied) || 0,
      items: revision.items || [],
      ticket: revision.ticket,
      revision,
    })),
  ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export default function PendingServiceEstimateQueue({
  data,
  onRefresh,
}: PendingServiceEstimateQueueProps) {
  const currency = useBranchCurrency();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FinanceQueueRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FinanceQueueRecord | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [technicians, setTechnicians] = useState<ServiceTechnicianInfo[]>([]);
  const records = useMemo(() => normalizeQueue(data), [data]);
  const filtered = records.filter((record) => {
    const query = search.toLowerCase();
    return (
      record.ticket.ticketNumber.toLowerCase().includes(query) ||
      record.ticket.customerId?.toLowerCase().includes(query) ||
      record.ticket.productName?.toLowerCase().includes(query) ||
      record.ticket.serialNumber?.toLowerCase().includes(query) ||
      record.ticket.assignedTechnicianId?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!selected) {
      setCustomer(null);
      return;
    }
    if (selected.ticket.customerId) {
      getCustomerById(selected.ticket.customerId)
        .then(setCustomer)
        .catch(() => setCustomer(null));
    }
    getTechnicians()
      .then(setTechnicians)
      .catch(() => setTechnicians([]));
  }, [selected]);

  const selectedTechnician = technicians.find(
    (technician) => technician.id === selected?.ticket.assignedTechnicianId,
  );
  const technicianName =
    selectedTechnician?.name ||
    [selectedTechnician?.first_name, selectedTechnician?.last_name].filter(Boolean).join(' ') ||
    selected?.ticket.assignedTechnicianId ||
    '—';
  const partsInternalCost = (record: FinanceQueueRecord) =>
    record.items.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  const coveredValue = (record: FinanceQueueRecord) =>
    record.items.reduce(
      (sum, item) => sum + (item.isFree ? Number(item.listTotalPrice) || 0 : 0),
      0,
    );

  const handleApprove = async (record: FinanceQueueRecord) => {
    setActionLoading(record.sourceId);
    try {
      if (record.sourceType === 'SERVICE_ESTIMATE') {
        await approveEstimateFinance(record.sourceId);
      } else {
        await approveRevisionFinance(record.sourceId);
      }
      toast.success(`Service estimate v${record.version} approved by Finance.`);
      setSelected(null);
      onRefresh();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
      toast.error(message || 'Failed to approve service estimate.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectRemarks.trim()) {
      toast.error('Rejection remarks are required.');
      return;
    }
    setActionLoading(rejectTarget.sourceId);
    try {
      if (rejectTarget.sourceType === 'SERVICE_ESTIMATE') {
        await rejectEstimateFinance(rejectTarget.sourceId, rejectRemarks.trim());
      } else {
        await rejectRevisionFinance(rejectTarget.sourceId, rejectRemarks.trim());
      }
      toast.success(`Service estimate v${rejectTarget.version} rejected by Finance.`);
      setRejectTarget(null);
      setRejectRemarks('');
      setSelected(null);
      onRefresh();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
      toast.error(message || 'Failed to reject service estimate.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="rounded-2xl bg-card shadow-sm border border-violet-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2">
          <ClipboardList className="h-4 w-4 text-violet-700 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Internal Service Estimates</h3>
            <p className="text-xs text-muted-foreground">
              Estimate records without a Billing quotation, including covered work with no customer
              charge.
            </p>
          </div>
        </div>
        <Input
          aria-label="Search internal service estimates"
          placeholder="Search ticket, customer, machine, technician..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 text-xs max-w-sm"
        />
      </div>
      <div className="overflow-x-auto p-2">
        <Table pagination={{ pageSize: 10 }}>
          <TableHeader className="bg-violet-50/50">
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Customer charge</TableHead>
              <TableHead>Internal parts cost</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No unlinked service estimates are awaiting Finance approval.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((record) => (
                <TableRow key={`${record.sourceType}-${record.sourceId}`}>
                  <TableCell>
                    <div className="font-semibold text-violet-700 text-xs">SERVICE ESTIMATE</div>
                    <div className="text-[10px] text-muted-foreground">
                      {record.sourceType === 'SERVICE_ESTIMATE_REVISION'
                        ? `Revision v${record.version}`
                        : `Baseline v${record.version}`}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{record.ticket.ticketNumber}</TableCell>
                  <TableCell className="text-xs">{record.ticket.serviceContext}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.ticket.customerId || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.ticket.assignedTechnicianId || '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-xs">
                    {formatCurrency(record.customerTotal, currency)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatCurrency(partsInternalCost(record), currency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(record.submittedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Review source estimate"
                        onClick={() => setSelected(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Approve estimate"
                        disabled={actionLoading === record.sourceId}
                        onClick={() => handleApprove(record)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Reject estimate"
                        disabled={actionLoading === record.sourceId}
                        onClick={() => {
                          setRejectTarget(record);
                          setRejectRemarks('');
                        }}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Service Estimate v{selected.version} · {selected.ticket.ticketNumber}
              </DialogTitle>
              <DialogDescription>
                Review the authoritative service estimate. This item is not a Billing invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selected.sourceType.replaceAll('_', ' ')}</Badge>
                <Badge variant="outline">{selected.ticket.status}</Badge>
                <Badge variant="outline">{selected.ticket.serviceContext}</Badge>
                {['RENT', 'LEASE_CPC', 'FSMA'].includes(selected.ticket.serviceContext) && (
                  <Badge className="bg-emerald-100 text-emerald-800">Fully covered</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Info
                  label="Customer"
                  value={customer?.name || selected.ticket.customerId || '—'}
                />
                <Info label="Customer ID" value={selected.ticket.customerId || '—'} />
                <Info label="Technician" value={technicianName} />
                <Info
                  label="Machine"
                  value={
                    [
                      selected.ticket.productBrand,
                      selected.ticket.productModel || selected.ticket.productName,
                    ]
                      .filter(Boolean)
                      .join(' ') || '—'
                  }
                />
                <Info label="Serial number" value={selected.ticket.serialNumber || '—'} />
                <Info
                  label="Ticket / estimate IDs"
                  value={`${selected.ticket.id} / ${selected.sourceId}`}
                  mono
                />
                <Info
                  label="Contract reference"
                  value={selected.ticket.contractReferenceId || '—'}
                  mono
                />
                <Info
                  label="Branch"
                  value={selected.ticket.branchName || selected.ticket.branchId || '—'}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info label="Complaint" value={selected.ticket.issueDescription || '—'} />
                <Info
                  label="Diagnosis"
                  value={
                    [
                      selected.ticket.problemFound,
                      selected.ticket.rootCause,
                      selected.ticket.diagnosisNotes,
                    ]
                      .filter(Boolean)
                      .join('\n') || '—'
                  }
                />
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <Table pagination={{ pageSize: 10 }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part / item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Customer charge</TableHead>
                      <TableHead>Selling price / covered value</TableHead>
                      <TableHead>Machine service unit cost</TableHead>
                      <TableHead>Machine service cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.items.length ? (
                      selected.items.map((item) => (
                        <TableRow key={item.id || `${item.partName}-${item.sku}`}>
                          <TableCell>{item.partName || item.sku || 'Service item'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.totalPrice) || 0, currency)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              item.isFree ? Number(item.listTotalPrice) || 0 : 0,
                              currency,
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.unitCost) || 0, currency)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.totalCost) || 0, currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No declared parts.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Info
                  label="Customer total"
                  value={formatCurrency(selected.customerTotal, currency)}
                />
                <Info label="Labour charge" value={formatCurrency(selected.labourCost, currency)} />
                <Info
                  label="Parts machine service cost"
                  value={formatCurrency(partsInternalCost(selected), currency)}
                />
                <Info
                  label="Covered selling price"
                  value={formatCurrency(coveredValue(selected), currency)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setRejectTarget(selected);
                  setRejectRemarks('');
                  setSelected(null);
                }}
                disabled={actionLoading === selected.sourceId}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button
                onClick={() => handleApprove(selected)}
                disabled={actionLoading === selected.sourceId}
              >
                {actionLoading === selected.sourceId ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve Finance
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject service estimate</DialogTitle>
            <DialogDescription>
              Rejection applies to estimate v{rejectTarget?.version} for ticket{' '}
              {rejectTarget?.ticket.ticketNumber}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectRemarks}
            onChange={(event) => setRejectRemarks(event.target.value)}
            placeholder="Explain what needs to be revised"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectRemarks.trim() || actionLoading === rejectTarget?.sourceId}
            >
              Reject estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2 min-w-0">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xs whitespace-pre-wrap break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
