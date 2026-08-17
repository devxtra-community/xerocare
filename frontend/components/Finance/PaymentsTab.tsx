'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Search, CheckCircle2, XCircle, X } from 'lucide-react';
import {
  getMyExpenseRequests,
  rejectExpenseRequest,
  type ExpenseRequest,
} from '@/lib/employeeExpenses';
import {
  fetchCheques,
  fetchCashBankAccounts,
  fetchManualPayables,
  type Cheque,
  type ManualPayable,
} from '@/lib/finance/accountsApi';
import { PayableDetailModal } from '@/components/accounts/ReceivablePayableDetail';
import {
  ChequeActionModal,
  ChequeDetailModal,
  CHEQUE_TABLE_STATUS_BADGE as CHEQUE_STATUS_BADGE,
  CHEQUE_STATUS_ICON,
  type ActionType,
} from '@/components/accounts/ChequeDetailModal';
import { ViewApproveModal } from '@/components/expenses/EmployeeRequestsTab';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
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
import { useMutation } from '@tanstack/react-query';

// ─── Purchase Request Stats ───────────────────────────────────────────────────
const REQ_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  SUBMITTED: { label: 'Awaiting Approval', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
  PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// ─── Quick Reject Modal ───────────────────────────────────────────────────────
function RejectModal({ expense, onClose }: { expense: ExpenseRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => rejectExpenseRequest(expense.id, reason),
    onSuccess: () => {
      toast.success('Purchase payment rejected — outstanding balance restored');
      qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reject';
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Reject Payment Request</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Purchase payment for{' '}
            <span className="font-semibold text-slate-700">{expense.vendorName || 'Vendor'}</span>{' '}
            will be rejected.
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rejection Reason *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
              placeholder="Explain why… (min 20 characters)"
            />
            {reason && reason.length < 20 && (
              <p className="text-xs text-red-600 mt-1">Min 20 characters required</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-border gap-3">
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={reason.length < 20 || mut.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {mut.isPending ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * Shared Payments view used by BOTH Finance and Admin.
 *
 * `branchIds` is the only difference between callers: Finance omits it and the server
 * scopes to the caller's own branch from the JWT; Admin passes the branch filter's
 * selection (empty = all branches). One parameterised component rather than an admin
 * fork — these tabs previously existed only on the Finance side, which is exactly the
 * drift this avoids.
 */
export default function PaymentsTab({ branchIds }: { branchIds?: string } = {}) {
  const currency = useBranchCurrency();

  // Filters
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'REQUESTS' | 'CHEQUES'>('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');
  const [chequeStatusFilter, setChequeStatusFilter] = useState('ALL');

  // Modal state
  const [viewingReq, setViewingReq] = useState<ExpenseRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ExpenseRequest | null>(null);
  const [viewCheque, setViewCheque] = useState<Cheque | null>(null);
  const [actionState, setActionState] = useState<{ cheque: Cheque; action: ActionType } | null>(
    null,
  );
  const [viewRefund, setViewRefund] = useState<ManualPayable | null>(null);

  // Data queries
  // Use same query key as EmployeeRequestsTab so ViewApproveModal invalidation triggers a refresh here too
  const { data: allRequests = [], isLoading: reqLoading } = useQuery<ExpenseRequest[]>({
    queryKey: ['expense-requests-fm', branchIds ?? ''],
    queryFn: () => getMyExpenseRequests(branchIds ? { branchId: branchIds } : undefined),
    staleTime: 30_000,
  });

  const { data: customerRefunds = [], isLoading: refundLoading } = useQuery<ManualPayable[]>({
    queryKey: ['payables-customer-refunds', branchIds ?? ''],
    queryFn: () =>
      fetchManualPayables({ type: 'CUSTOMER_REFUND', ...(branchIds ? { branchIds } : {}) }),
    staleTime: 30_000,
  });

  const purchaseRequests = useMemo(
    () => allRequests.filter((r) => r.requestSource === 'MANAGER_PURCHASE'),
    [allRequests],
  );

  const chequeParams = useMemo(() => {
    const p: Record<string, string> = { type: 'ISSUED' };
    if (chequeStatusFilter !== 'ALL') p.status = chequeStatusFilter;
    if (search.trim()) p.search = search.trim();
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (branchIds) p.branchIds = branchIds;
    return p;
  }, [chequeStatusFilter, search, dateFrom, dateTo, branchIds]);

  const { data: issuedCheques = [], isLoading: chequeLoading } = useQuery<Cheque[]>({
    queryKey: ['cheques', chequeParams],
    queryFn: () => fetchCheques(chequeParams),
    staleTime: 30_000,
  });

  const { data: cashAccountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });
  const bankAccounts = (
    cashAccountsRaw as { id: string; name: string; type: string; bankName?: string }[]
  )
    .filter((a) => a.type === 'BANK')
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));

  // Stats
  const reqStats = useMemo(() => {
    const submitted = purchaseRequests.filter((r) => r.status === 'SUBMITTED');
    const approved = purchaseRequests.filter((r) => r.status === 'APPROVED');
    const rejected = purchaseRequests.filter((r) => r.status === 'REJECTED');
    return {
      submitted: {
        count: submitted.length,
        total: submitted.reduce((s, r) => s + Number(r.amount), 0),
      },
      approved: {
        count: approved.length,
        total: approved.reduce((s, r) => s + Number(r.amount), 0),
      },
      rejected: {
        count: rejected.length,
        total: rejected.reduce((s, r) => s + Number(r.amount), 0),
      },
    };
  }, [purchaseRequests]);

  const chequeStats = useMemo(() => {
    const pending = issuedCheques.filter((c) => c.status === 'PENDING');
    const issued = issuedCheques.filter((c) => c.status === 'ISSUED');
    const cleared = issuedCheques.filter((c) => c.status === 'CLEARED');
    return {
      pending: { count: pending.length, total: pending.reduce((s, c) => s + Number(c.amount), 0) },
      issued: { count: issued.length, total: issued.reduce((s, c) => s + Number(c.amount), 0) },
      cleared: { count: cleared.length, total: cleared.reduce((s, c) => s + Number(c.amount), 0) },
    };
  }, [issuedCheques]);

  // Filtered purchase requests
  const filteredRequests = useMemo(() => {
    return purchaseRequests.filter((r) => {
      if (reqStatusFilter !== 'ALL' && r.status !== reqStatusFilter) return false;
      if (dateFrom && (r.createdAt?.slice(0, 10) ?? '') < dateFrom) return false;
      if (dateTo && (r.createdAt?.slice(0, 10) ?? '') > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.vendorName?.toLowerCase().includes(q) ||
          r.requestNo?.toLowerCase().includes(q) ||
          r.purchaseRef?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [purchaseRequests, reqStatusFilter, dateFrom, dateTo, search]);

  const showRequests = sourceFilter === 'ALL' || sourceFilter === 'REQUESTS';
  const showCheques = sourceFilter === 'ALL' || sourceFilter === 'CHEQUES';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border p-3 bg-blue-50 border-blue-200 col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Awaiting Approval
          </p>
          <p className="text-xl font-bold mt-0.5 text-blue-700">{reqStats.submitted.count}</p>
          <p className="text-xs font-semibold text-blue-600">
            {formatCurrency(reqStats.submitted.total, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-3 bg-emerald-50 border-emerald-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Requests Approved
          </p>
          <p className="text-xl font-bold mt-0.5 text-emerald-700">{reqStats.approved.count}</p>
          <p className="text-xs font-semibold text-emerald-600">
            {formatCurrency(reqStats.approved.total, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-3 bg-red-50 border-red-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Requests Rejected
          </p>
          <p className="text-xl font-bold mt-0.5 text-red-700">{reqStats.rejected.count}</p>
          <p className="text-xs font-semibold text-red-600">
            {formatCurrency(reqStats.rejected.total, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-3 bg-yellow-50 border-yellow-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Cheques Pending
          </p>
          <p className="text-xl font-bold mt-0.5 text-yellow-700">{chequeStats.pending.count}</p>
          <p className="text-xs font-semibold text-yellow-600">
            {formatCurrency(chequeStats.pending.total, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-3 bg-purple-50 border-purple-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Cheques Issued
          </p>
          <p className="text-xl font-bold mt-0.5 text-purple-700">{chequeStats.issued.count}</p>
          <p className="text-xs font-semibold text-purple-600">
            {formatCurrency(chequeStats.issued.total, currency)}
          </p>
        </div>
        <div className="rounded-xl border p-3 bg-gray-50 border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Cheques Cleared
          </p>
          <p className="text-xl font-bold mt-0.5 text-gray-700">{chequeStats.cleared.count}</p>
          <p className="text-xs font-semibold text-gray-600">
            {formatCurrency(chequeStats.cleared.total, currency)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 bg-muted/50 border-none"
              placeholder="Search vendor, request #, cheque #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}
          >
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sources</SelectItem>
              <SelectItem value="REQUESTS">Purchase Requests</SelectItem>
              <SelectItem value="CHEQUES">Vendor Cheques</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-card"
            title="Date from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-card"
            title="Date to"
          />
        </div>
        {sourceFilter !== 'CHEQUES' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Request Status:
            </span>
            <Select value={reqStatusFilter} onValueChange={setReqStatusFilter}>
              <SelectTrigger className="w-48 h-8 text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SUBMITTED">Awaiting Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {sourceFilter !== 'REQUESTS' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Cheque Status:
            </span>
            <Select value={chequeStatusFilter} onValueChange={setChequeStatusFilter}>
              <SelectTrigger className="w-48 h-8 text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="CLEARED">Cleared</SelectItem>
                <SelectItem value="BOUNCED">Bounced</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Purchase Requests Table */}
      {showRequests && (
        <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Purchase Payment Requests</h3>
            <span className="text-xs text-muted-foreground">{filteredRequests.length} records</span>
          </div>
          {reqLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Request #
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Vendor
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Mode
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Amount
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
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No purchase payment requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((r) => {
                    const cfg = REQ_STATUS_CONFIG[r.status] ?? REQ_STATUS_CONFIG.PENDING;
                    const isChequeMode = (r.paymentMode ?? '').toLowerCase() === 'cheque';
                    return (
                      <TableRow key={r.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell className="pl-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleDateString()
                            : r.createdAt?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-blue-600 font-bold whitespace-nowrap">
                          {r.requestNo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{r.vendorName || '—'}</p>
                            {r.purchaseRef && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {r.purchaseRef}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isChequeMode
                                ? 'bg-purple-100 text-purple-700'
                                : (r.paymentMode ?? '').toLowerCase().includes('cash')
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {r.paymentMode ?? 'Cash/Bank'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 whitespace-nowrap">
                          {formatCurrency(Number(r.amount), r.currency)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingReq(r)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {r.status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => setViewingReq(r)}
                                  className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                                  {isChequeMode ? 'Approve & Issue' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => setRejectingReq(r)}
                                  className="px-2 py-1 rounded-md bg-red-100 text-red-600 text-[11px] font-semibold hover:bg-red-200"
                                >
                                  <XCircle className="h-3 w-3 inline mr-0.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Vendor Cheques (Issued) Table */}
      {showCheques && (
        <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Vendor Cheques (Issued)</h3>
            <span className="text-xs text-muted-foreground">{issuedCheques.length} records</span>
          </div>
          {chequeLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    {[
                      'Cheque #',
                      'Vendor / Bank',
                      'Amount',
                      'Cheque Date',
                      'Due Date',
                      'Status',
                      'Actions',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {issuedCheques.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No issued vendor cheques found
                      </td>
                    </tr>
                  ) : (
                    issuedCheques.map((c) => {
                      const isOverdue =
                        new Date(c.dueDate) < new Date() &&
                        ['PENDING', 'ISSUED'].includes(c.status);
                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${isOverdue ? 'bg-red-50/40' : 'hover:bg-muted/20'}`}
                        >
                          <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                            {c.chequeNo}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800 max-w-[140px] truncate">
                              {c.partyName}
                            </p>
                            <p className="text-xs text-gray-400">{c.bankName ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(c.amount, currency)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {c.issueDate ? String(c.issueDate).slice(0, 10) : '—'}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}
                          >
                            {String(c.dueDate).slice(0, 10)}
                            {isOverdue && <span className="ml-1 text-red-500">⚠</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHEQUE_STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {CHEQUE_STATUS_ICON[c.status]}
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap items-center">
                              <button
                                onClick={() => setViewCheque(c)}
                                className="text-xs font-medium px-2 py-1 rounded-md transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                              {c.status === 'PENDING' && (
                                <button
                                  onClick={() => setActionState({ cheque: c, action: 'issue' })}
                                  className="text-xs font-medium px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                                >
                                  Issue
                                </button>
                              )}
                              {['ISSUED'].includes(c.status) && (
                                <button
                                  onClick={() => setActionState({ cheque: c, action: 'clear' })}
                                  className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                >
                                  Clear
                                </button>
                              )}
                              {['ISSUED'].includes(c.status) && (
                                <button
                                  onClick={() => setActionState({ cheque: c, action: 'bounce' })}
                                  className="text-xs font-medium px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  Bounce
                                </button>
                              )}
                              {c.status === 'PENDING' && (
                                <button
                                  onClick={() => setActionState({ cheque: c, action: 'cancel' })}
                                  className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Refund Payables Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Customer Refunds (Payable)</h3>
          <span className="text-xs text-muted-foreground">{customerRefunds.length} records</span>
        </div>
        {refundLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Ref #
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Amount
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
              {customerRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No pending customer refunds
                  </TableCell>
                </TableRow>
              ) : (
                customerRefunds.map((r) => {
                  const statusColor =
                    r.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : r.status === 'PARTIAL'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        : r.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200';
                  return (
                    <TableRow key={r.id} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {r.issueDate?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600 font-bold whitespace-nowrap">
                        {r.referenceNo}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.payableTo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {r.description}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 whitespace-nowrap">
                        {formatCurrency(Number(r.amount), currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColor}`}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <button
                          onClick={() => setViewRefund(r)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                          title="View / Record Payment"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      {viewingReq && (
        <ViewApproveModal
          expense={viewingReq}
          accounts={cashAccountsRaw as { id: string; name: string; type: string }[]}
          onClose={() => setViewingReq(null)}
        />
      )}
      {rejectingReq && <RejectModal expense={rejectingReq} onClose={() => setRejectingReq(null)} />}
      {viewCheque && (
        <ChequeDetailModal
          cheque={viewCheque}
          currency={currency}
          onClose={() => setViewCheque(null)}
        />
      )}
      {actionState && (
        <ChequeActionModal
          cheque={actionState.cheque}
          action={actionState.action}
          cashAccounts={bankAccounts}
          onClose={() => setActionState(null)}
        />
      )}
      {viewRefund && (
        <PayableDetailModal
          sourceType="MANUAL"
          id={viewRefund.id}
          onClose={() => setViewRefund(null)}
        />
      )}
    </div>
  );
}
