'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle2, XCircle, X, Search, FileText, Plus, Wallet } from 'lucide-react';
import {
  getMyExpenseRequests,
  rejectExpenseRequest,
  type ExpenseRequest,
} from '@/lib/employeeExpenses';
import {
  ViewApproveModal,
  PayModal,
  STATUS_CONFIG,
  EXPENSE_CATEGORIES_LIST,
  getExpenseCategoryLabel,
} from '@/components/expenses/EmployeeRequestsTab';
import {
  fetchCashBankAccounts,
  fetchExpenseEntries,
  fetchChartOfAccountsStructure,
  type ExpenseEntry,
} from '@/lib/finance/accountsApi';
import AddExpenseModal from '@/components/Finance/AddExpenseModal';
import { expenseCategoryLabel, expenseCategoryOptions } from '@/lib/finance/expenseCategories';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
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
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Quick Reject Modal ───────────────────────────────────────────────────────

function QuickRejectModal({ expense, onClose }: { expense: ExpenseRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => rejectExpenseRequest(expense.id, reason),
    onSuccess: () => {
      toast.success('Expense request rejected');
      qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
      qc.invalidateQueries({ queryKey: ['expense-requests-summary'] });
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
          <h2 className="font-bold text-slate-800">Reject Expense Request</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Expense request from{' '}
            <span className="font-semibold text-slate-700">{expense.employeeName}</span> for{' '}
            <span className="font-semibold">
              {formatCurrency(Number(expense.amount), expense.currency)}
            </span>{' '}
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

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
];

/**
 * Shared Expenses view used by BOTH Finance and Admin.
 *
 * `branchIds` is the only difference between callers: Finance omits it and the server
 * scopes to the caller's own branch from the JWT; Admin passes the branch filter's
 * selection (empty = all branches). One parameterised component rather than an admin
 * fork — these tabs previously existed only on the Finance side, which is exactly the
 * drift this avoids.
 */
export default function ExpensesTab({ branchIds }: { branchIds?: string } = {}) {
  const currency = useBranchCurrency();
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<ExpenseRequest | null>(null);
  const [paying, setPaying] = useState<ExpenseRequest | null>(null);
  const [rejecting, setRejecting] = useState<ExpenseRequest | null>(null);

  // Data
  const { data: allRequests = [], isLoading } = useQuery<ExpenseRequest[]>({
    queryKey: ['expense-requests-fm', branchIds ?? ''],
    queryFn: () => getMyExpenseRequests(branchIds ? { branchId: branchIds } : undefined),
    staleTime: 30_000,
  });

  const { data: accountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });

  // Expenses Accounts booked directly, which are ExpenseEntry rows rather than employee
  // requests. They are a separate store with no approval step, so they need their own
  // list — without one, an expense recorded here would post to the P&L and the cashbook
  // and then be invisible on the very page that created it.
  const { data: ownExpenses = [], isLoading: loadingOwn } = useQuery<ExpenseEntry[]>({
    queryKey: ['accounts-expense-entries', branchIds ?? ''],
    queryFn: () => fetchExpenseEntries(),
    staleTime: 30_000,
  });

  const { data: coaRows = [] } = useQuery({
    queryKey: ['coa-structure'],
    queryFn: () => fetchChartOfAccountsStructure(),
    staleTime: 5 * 60_000,
  });
  const categoryOptions = useMemo(() => expenseCategoryOptions(coaRows), [coaRows]);
  const accounts = accountsRaw as {
    id: string;
    name: string;
    type: string;
    currentBalance: number;
    currency: string;
  }[];

  // Only EMPLOYEE_EXPENSE requests (not MANAGER_PURCHASE which lives in Payments tab)
  const expenseRequests = useMemo(
    () => allRequests.filter((r) => r.requestSource !== 'MANAGER_PURCHASE'),
    [allRequests],
  );

  // Stats
  const stats = useMemo(() => {
    const submitted = expenseRequests.filter((r) => r.status === 'SUBMITTED');
    const approved = expenseRequests.filter((r) => r.status === 'APPROVED');
    const paid = expenseRequests.filter((r) => r.status === 'PAID');
    const rejected = expenseRequests.filter((r) => r.status === 'REJECTED');
    return {
      submitted: {
        count: submitted.length,
        total: submitted.reduce((s, r) => s + Number(r.amount), 0),
      },
      approved: {
        count: approved.length,
        total: approved.reduce((s, r) => s + Number(r.amount), 0),
      },
      paid: { count: paid.length, total: paid.reduce((s, r) => s + Number(r.amount), 0) },
      rejected: {
        count: rejected.length,
        total: rejected.reduce((s, r) => s + Number(r.amount), 0),
      },
    };
  }, [expenseRequests]);

  // Filtered rows
  const filtered = useMemo(() => {
    return expenseRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (roleFilter !== 'ALL' && r.employeeRole !== roleFilter) return false;
      if (dateFrom && (r.date?.slice(0, 10) ?? '') < dateFrom) return false;
      if (dateTo && (r.date?.slice(0, 10) ?? '') > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.employeeName?.toLowerCase().includes(q) ||
          r.requestNo?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenseRequests, statusFilter, categoryFilter, roleFilter, dateFrom, dateTo, search]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['expense-requests-fm'] });
    qc.invalidateQueries({ queryKey: ['expense-requests-summary'] });
    qc.invalidateQueries({ queryKey: ['cash-bank-accounts'] });
  };

  return (
    <div className="space-y-6">
      {/* Accounts can book an expense directly — this page previously only reviewed what
          employees submitted, so a rent or utility bill Accounts paid themselves had
          nowhere to be entered. */}
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={15} /> Add Expense
        </Button>
      </div>

      {/* Stats */}
      {/* Shared StatCard, matching the Receipts tab — see PaymentsTab for why these
          stopped being hand-rolled colour blocks. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {(
          [
            { label: 'Awaiting Approval', ...stats.submitted },
            { label: 'Approved / Pending Payment', ...stats.approved },
            { label: 'Paid', ...stats.paid },
            { label: 'Rejected', ...stats.rejected },
          ] as { label: string; count: number; total: number }[]
        ).map(({ label, count, total }) => (
          <StatCard
            key={label}
            title={label}
            value={String(count)}
            subtitle={formatCurrency(total, currency)}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 bg-muted/50 border-none"
              placeholder="Search employee, request #, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Awaiting Approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-8 text-xs bg-card border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {EXPENSE_CATEGORIES_LIST.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-card border-border">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-xs bg-card"
            title="Date from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-xs bg-card"
            title="Date to"
          />
          {(search ||
            statusFilter !== 'ALL' ||
            categoryFilter !== 'ALL' ||
            roleFilter !== 'ALL' ||
            dateFrom ||
            dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setRoleFilter('ALL');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-muted-foreground hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Expenses booked by Accounts. Kept as its own table rather than merged into the
          requests list below: these never had a submitter and never go through approval,
          so the columns that matter (which account it posted to, whether it is paid) are
          different ones. */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Wallet size={14} className="text-emerald-600" />
            Expenses Recorded by Accounts
          </h3>
          <span className="text-xs text-muted-foreground">{ownExpenses.length} records</span>
        </div>
        {loadingOwn ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ownExpenses.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-500">No expenses recorded yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use Add Expense to book one directly — rent, utilities, salaries and the like.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Expense #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-4 text-xs font-semibold text-slate-600">
                    {new Date(e.date).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-blue-600">
                    {e.expenseNo}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold text-slate-700">
                      {expenseCategoryLabel(e.category, categoryOptions)}
                    </span>
                    {e.subCategory && (
                      <span className="block text-[10px] text-slate-400">{e.subCategory}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-slate-600">
                    {e.description}
                    {e.isPrepayment && (
                      <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                        PREPAID
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(Number(e.amount), e.currency || currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-500">
                    {Number(e.vatAmount) > 0
                      ? formatCurrency(Number(e.vatAmount), e.currency || currency)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-black text-slate-800">
                    {formatCurrency(Number(e.netAmount), e.currency || currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        e.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : e.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {e.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Employee Expense Requests</h3>
          <span className="text-xs text-muted-foreground">{filtered.length} records</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
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
                  Submitted By
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Category
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                    No expense requests found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <TableRow key={r.id} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString()
                          : r.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600 font-bold whitespace-nowrap">
                        {r.requestNo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.employeeRole} · {r.branchName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {getExpenseCategoryLabel(r.category)}
                        {r.subCategory && (
                          <p className="text-[10px] text-muted-foreground">{r.subCategory}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{r.description}</span>
                          {r.receiptUrl && (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View receipt"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-blue-500 hover:text-blue-700"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
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
                            onClick={() => setViewing(r)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {r.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => setViewing(r)}
                                className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => setRejecting(r)}
                                className="px-2 py-1 rounded-md bg-red-100 text-red-600 text-[11px] font-semibold hover:bg-red-200"
                              >
                                <XCircle className="h-3 w-3 inline mr-0.5" />
                                Reject
                              </button>
                            </>
                          )}
                          {r.status === 'APPROVED' && (
                            <button
                              onClick={() => setPaying(r)}
                              className="px-2 py-1 rounded-md bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700"
                            >
                              Pay
                            </button>
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

      {/* Modals */}
      {viewing && (
        <ViewApproveModal
          expense={viewing}
          accounts={accounts}
          onClose={() => {
            setViewing(null);
            invalidateAll();
          }}
        />
      )}
      {paying && (
        <PayModal
          expense={paying}
          accounts={accounts}
          onClose={() => {
            setPaying(null);
            invalidateAll();
          }}
        />
      )}
      {rejecting && <QuickRejectModal expense={rejecting} onClose={() => setRejecting(null)} />}

      <AddExpenseModal open={addOpen} onOpenChange={setAddOpen} onSuccess={invalidateAll} />
    </div>
  );
}
