'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  fetchGuaranteeCheques,
  fetchGuaranteeStats,
  fetchCustomerContracts,
  createGuaranteeCheque,
  updateGuaranteeCheque,
  returnGuaranteeCheque,
  deleteGuaranteeCheque,
  type GuaranteeCheque,
  type GuaranteePurpose,
  type GuaranteeFilters,
} from '@/lib/finance/accountsApi';
import { getCustomers, type Customer } from '@/lib/customer';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

import { getActiveCurrency } from '@/lib/currency';
const today = new Date().toISOString().slice(0, 10);

const PURPOSE_LABELS: Record<string, string> = {
  PERFORMANCE_SECURITY: 'Performance Security',
  OTHER: 'Other',
};

const STATUS_BADGE: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  RETURNED: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function GuaranteeModal({
  cheque,
  onClose,
  onSaved,
}: {
  cheque?: GuaranteeCheque | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!cheque?.id;

  const [customerId, setCustomerId] = useState(cheque?.customerId ?? '');
  const [customerName, setCustomerName] = useState(cheque?.customerName ?? '');
  const [contractInvoiceId, setContractInvoiceId] = useState(cheque?.contractInvoiceId ?? '');
  const [contractReference, setContractReference] = useState(cheque?.contractReference ?? '');
  const [chequeNumber, setChequeNumber] = useState(cheque?.chequeNumber ?? '');
  const [amount, setAmount] = useState(cheque?.amount?.toString() ?? '');
  const [currencyCode, setCurrencyCode] = useState(cheque?.currencyCode ?? getActiveCurrency());
  const [bankName, setBankName] = useState(cheque?.bankName ?? '');
  const [receivedDate, setReceivedDate] = useState(cheque?.receivedDate?.slice(0, 10) ?? today);
  const [purpose, setPurpose] = useState<GuaranteePurpose>(
    cheque?.purpose ?? 'PERFORMANCE_SECURITY',
  );
  const [notes, setNotes] = useState(cheque?.notes ?? '');

  const qc = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-list'],
    queryFn: getCustomers,
    staleTime: 120_000,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: () => fetchCustomerContracts(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      if (cust.bankName) setBankName(cust.bankName);
    }
    setContractInvoiceId('');
    setContractReference('');
  };

  const handleContractSelect = (val: string) => {
    if (!val || val === 'none') {
      setContractInvoiceId('');
      setContractReference('');
      return;
    }
    const contract = contracts.find((c) => c.id === val);
    setContractInvoiceId(val);
    setContractReference(contract ? `${contract.invoiceNumber} (${contract.saleType})` : val);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId,
        customerName,
        contractInvoiceId: contractInvoiceId || null,
        contractReference: contractReference || null,
        chequeNumber,
        amount: Number(amount),
        currencyCode,
        bankName,
        receivedDate,
        purpose,
        notes: notes || undefined,
      };
      if (isEdit) return updateGuaranteeCheque(cheque!.id, payload);
      return createGuaranteeCheque(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Guarantee cheque updated' : 'Guarantee cheque added');
      qc.invalidateQueries({ queryKey: ['guarantee-cheques'] });
      qc.invalidateQueries({ queryKey: ['guarantee-stats'] });
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save'),
  });

  const isValid = customerId && chequeNumber && Number(amount) > 0 && bankName && receivedDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">
            {isEdit ? 'Edit Guarantee Cheque' : 'Add Guarantee Cheque'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEdit && (
          <div className="px-6 pt-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
              Status:{' '}
              <span
                className={`ml-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_BADGE[cheque!.status]}`}
              >
                {cheque!.status}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                Change status via &ldquo;Mark Returned&rdquo;
              </span>
            </div>
          </div>
        )}

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Customer */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer *</label>
            <Select value={customerId} onValueChange={handleCustomerSelect} disabled={isEdit}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Search and select customer…" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract — optional */}
          {customerId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Contract / Invoice <span className="font-normal">(optional)</span>
              </label>
              <Select value={contractInvoiceId || 'none'} onValueChange={handleContractSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None — no contract link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.invoiceNumber} · {c.saleType} · {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cheque Number */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cheque Number *</label>
            <Input
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
              className="mt-1"
              placeholder="e.g. CHQ-00123456"
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="QAR">QAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bank Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Bank Name *
              {customerId && customers.find((c) => c.id === customerId)?.bankName && (
                <span className="ml-2 text-blue-500 font-normal">(auto-filled from customer)</span>
              )}
            </label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="mt-1"
              placeholder="Enter bank name"
            />
          </div>

          {/* Received Date + Purpose */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Received Date *</label>
              <input
                type="date"
                value={receivedDate}
                max={today}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purpose *</label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as GuaranteePurpose)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERFORMANCE_SECURITY">Performance Security</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
              placeholder="Any additional notes…"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!isValid || saveMut.isPending}
            className="bg-primary text-primary-foreground"
          >
            {saveMut.isPending ? 'Saving…' : isEdit ? 'Update' : 'Add Cheque'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Return Confirm Dialog ────────────────────────────────────────────────────

function ReturnDialog({ cheque, onClose }: { cheque: GuaranteeCheque; onClose: () => void }) {
  const [returnedDate, setReturnedDate] = useState(today);
  const qc = useQueryClient();

  const returnMut = useMutation({
    mutationFn: () => returnGuaranteeCheque(cheque.id, returnedDate),
    onSuccess: () => {
      toast.success('Guarantee cheque marked as returned');
      qc.invalidateQueries({ queryKey: ['guarantee-cheques'] });
      qc.invalidateQueries({ queryKey: ['guarantee-stats'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to return cheque'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Mark as Returned</h3>
              <p className="text-xs text-muted-foreground">
                {cheque.chequeNumber} · {cheque.customerName}
              </p>
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold">
                {formatCurrency(Number(cheque.amount), cheque.currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium">{cheque.bankName}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Return Date *</label>
            <input
              type="date"
              value={returnedDate}
              max={today}
              onChange={(e) => setReturnedDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This cheque will be marked RETURNED and removed from the held collateral count.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={returnMut.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => returnMut.mutate()}
            disabled={!returnedDate || returnMut.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {returnMut.isPending ? 'Processing…' : 'Confirm Return'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GuaranteeChequesPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GuaranteeCheque | null>(null);
  const [returning, setReturning] = useState<GuaranteeCheque | null>(null);

  const filters = useMemo(
    (): GuaranteeFilters => ({
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      purpose: purposeFilter !== 'ALL' ? purposeFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
    }),
    [statusFilter, purposeFilter, dateFrom, dateTo, search],
  );

  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['guarantee-cheques', filters],
    queryFn: () => fetchGuaranteeCheques(filters),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['guarantee-stats'],
    queryFn: () => fetchGuaranteeStats(),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: deleteGuaranteeCheque,
    onSuccess: () => {
      toast.success('Guarantee cheque deleted');
      qc.invalidateQueries({ queryKey: ['guarantee-cheques'] });
      qc.invalidateQueries({ queryKey: ['guarantee-stats'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Guarantee Cheques</h3>
          <p className="text-muted-foreground text-sm">
            Security &amp; performance cheques held as collateral — never deposited
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="gap-2 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Guarantee Cheque
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Held"
            value={stats.heldCount.toString()}
            subtitle={formatCurrency(stats.heldAmount)}
          />
          <StatCard
            title="Amount Held"
            value={formatCurrency(stats.heldAmount)}
            subtitle={`${stats.heldCount} cheque${stats.heldCount !== 1 ? 's' : ''}`}
          />
          <StatCard
            title="Returned"
            value={stats.returnedCount.toString()}
            subtitle={formatCurrency(stats.returnedAmount)}
          />
          <StatCard
            title="Pending Return"
            value={stats.pendingReturnCount.toString()}
            subtitle="Contract expired/cancelled"
          />
        </div>
      )}

      {/* Pending Return Alert */}
      {stats && stats.pendingReturnCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{stats.pendingReturnCount}</strong> cheque
            {stats.pendingReturnCount !== 1 ? 's are' : ' is'} still held but the linked contract
            has expired or been cancelled. Consider returning these to the customer.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 bg-muted/50 border-none"
              placeholder="Search by customer, cheque #, bank…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Purposes</SelectItem>
                <SelectItem value="PERFORMANCE_SECURITY">Performance Security</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowFilters((o) => !o)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-700 px-2 py-1 rounded-lg border border-border bg-card"
            >
              Date Range{' '}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Received
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Cheque #
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Bank
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Purpose
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Contract
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ShieldCheck className="h-12 w-12 opacity-30" />
                      <p className="font-medium">No guarantee cheques found</p>
                      <p className="text-sm">Add a guarantee cheque to start tracking collateral</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cheques.map((c) => (
                  <TableRow key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                      {c.receivedDate?.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{c.customerName}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-600 font-bold">
                      {c.chequeNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.bankName}</TableCell>
                    <TableCell className="text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                        {PURPOSE_LABELS[c.purpose] ?? c.purpose}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700">
                      {formatCurrency(Number(c.amount), c.currencyCode)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {c.contractReference ?? <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[c.status]}`}
                      >
                        {c.status === 'RETURNED' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center gap-1">
                        {c.status === 'RECEIVED' && (
                          <button
                            onClick={() => setReturning(c)}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600"
                            title="Mark as Returned"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(c);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this guarantee cheque? This cannot be undone.'))
                              deleteMut.mutate(c.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {showModal && (
        <GuaranteeModal
          cheque={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}

      {returning && <ReturnDialog cheque={returning} onClose={() => setReturning(null)} />}
    </div>
  );
}
