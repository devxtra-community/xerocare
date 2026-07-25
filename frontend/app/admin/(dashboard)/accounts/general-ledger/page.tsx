'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Filter, BookMarked, Eye, FileText } from 'lucide-react';
import {
  fetchARInvoices,
  fetchPayments,
  fetchPurchases,
  fetchPayroll,
  fetchBranches,
  CHART_OF_ACCOUNTS,
  type InvoiceSummary,
  type PaymentRecord,
  type PurchaseOrder,
  type PayrollRecord,
} from '@/lib/finance/accounts';
import {
  fetchCheques,
  fetchExpenseEntries,
  fetchCustomerStatement,
  fetchVendorStatement,
  type Cheque,
  type ExpenseEntry,
} from '@/lib/finance/accountsApi';
import { getMyExpenseRequests, type ExpenseRequest } from '@/lib/employeeExpenses';
import { getCustomers } from '@/lib/customer';
import { getVendors, type Vendor } from '@/lib/vendor';
import {
  buildGlEntries,
  matchesSearch,
  SOURCE_COLORS,
  type GLEntry,
} from '@/lib/finance/generalLedgerEntries';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getUserFromToken } from '@/lib/auth';
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
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import { LedgerEntryDetailModal } from '@/components/accounts/LedgerEntryDetailModal';
import StatementDialog, {
  type RunningBalanceStatementData,
} from '@/components/shared/StatementDialog';

type PeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

function getDateRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'custom') return { from: customFrom, to: customTo };
  if (preset === 'this_month') {
    return {
      from: new Date(y, m, 1).toISOString().slice(0, 10),
      to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === 'last_month') {
    return {
      from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
      to: new Date(y, m, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
      to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
    };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function GeneralLedgerContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  // fetchARInvoices/fetchPayments/fetchPurchases/fetchPayroll/getMyExpenseRequests
  // only accept a single branchId (no IN-list support server-side) — same
  // single-branch-only convention already used by `activeBranch` below.
  const singleBranchId = branchIds && !branchIds.includes(',') ? branchIds : undefined;

  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('custom');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const { from: fromDate, to: toDate } = getDateRange(periodPreset, customFrom, customTo);
  const [showStatement, setShowStatement] = useState(false);
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [statementData, setStatementData] = useState<RunningBalanceStatementData | null>(null);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = useMemo(() => {
    if (branchIds && !branchIds.includes(',')) return branches.find((b) => b.id === branchIds);
    if (currentUser?.branchId) return branches.find((b) => b.id === currentUser.branchId);
    return branches[0];
  }, [branches, branchIds, currentUser?.branchId]);
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

  const queryOptions = { staleTime: 60_000 };

  const {
    data: invoices = [],
    isLoading: invLoading,
    isError: invError,
    refetch: refetchInv,
  } = useQuery<InvoiceSummary[]>({
    queryKey: ['admin-gl-invoices', branchIds],
    queryFn: () => fetchARInvoices({ branchId: singleBranchId }),
    ...queryOptions,
  });
  const {
    data: payments = [],
    isLoading: payLoading,
    isError: payError,
    refetch: refetchPay,
  } = useQuery<PaymentRecord[]>({
    queryKey: ['admin-gl-payments', branchIds],
    queryFn: () => fetchPayments({ branchId: singleBranchId }),
    ...queryOptions,
  });
  const {
    data: purchases = [],
    isLoading: poLoading,
    isError: poError,
    refetch: refetchPo,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ['admin-gl-purchases', branchIds],
    queryFn: () => fetchPurchases({ branchId: singleBranchId }),
    ...queryOptions,
  });
  const {
    data: payroll = [],
    isLoading: prLoading,
    isError: prError,
    refetch: refetchPr,
  } = useQuery<PayrollRecord[]>({
    queryKey: ['admin-gl-payroll', branchIds],
    queryFn: () => fetchPayroll({ branchId: singleBranchId }),
    ...queryOptions,
  });
  const {
    data: vendorPaymentRequests = [],
    isLoading: vprLoading,
    isError: vprError,
    refetch: refetchVpr,
  } = useQuery<ExpenseRequest[]>({
    queryKey: ['admin-gl-vendor-payment-requests', branchIds],
    queryFn: () => getMyExpenseRequests({ status: 'PAID', branchId: singleBranchId }),
    ...queryOptions,
  });
  const {
    data: cheques = [],
    isLoading: chqLoading,
    isError: chqError,
    refetch: refetchChq,
  } = useQuery<Cheque[]>({
    queryKey: ['admin-gl-cheques', branchIds],
    queryFn: () => fetchCheques({ status: 'CLEARED', branchIds: branchIds || undefined }),
    ...queryOptions,
  });
  const {
    data: expenseEntries = [],
    isLoading: expLoading,
    isError: expError,
    refetch: refetchExp,
  } = useQuery<ExpenseEntry[]>({
    queryKey: ['admin-gl-expense-entries', branchIds],
    queryFn: () => fetchExpenseEntries({ status: 'PAID', branchIds: branchIds || undefined }),
    ...queryOptions,
  });
  // Not rendered as dropdowns anymore — kept only to detect when the typed
  // search text uniquely identifies one real customer/vendor by name, so
  // "Generate Statement" can offer that entity's statement directly.
  const { data: customerList = [] } = useQuery({
    queryKey: ['gl-customers'],
    queryFn: getCustomers,
    staleTime: 5 * 60 * 1000,
  });
  const { data: vendorListResp } = useQuery({
    queryKey: ['gl-vendors'],
    queryFn: (): Promise<{ data: Vendor[] }> => getVendors({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const vendorList = useMemo(() => vendorListResp?.data ?? [], [vendorListResp]);

  const isLoading =
    invLoading || payLoading || poLoading || prLoading || vprLoading || chqLoading || expLoading;
  const isError = invError || payError || poError || prError || vprError || chqError || expError;
  const refetchAll = () => {
    refetchInv();
    refetchPay();
    refetchPo();
    refetchPr();
    refetchVpr();
    refetchChq();
    refetchExp();
  };

  const entries: GLEntry[] = useMemo(
    () =>
      buildGlEntries({
        invoices,
        payments,
        purchases,
        payroll,
        vendorPaymentRequests,
        cheques,
        expenseEntries,
        currency,
      }),
    [
      invoices,
      payments,
      purchases,
      payroll,
      vendorPaymentRequests,
      cheques,
      expenseEntries,
      currency,
    ],
  );

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const matchDate = (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate);
        const matchAccount = accountFilter === 'ALL' || e.account.startsWith(accountFilter);
        return matchDate && matchAccount && matchesSearch(e, search);
      }),
    [entries, fromDate, toDate, accountFilter, search],
  );

  const withBalance = useMemo(() => {
    const result = [];
    let balance = 0;
    for (const e of filtered) {
      balance += e.debit - e.credit;
      result.push({ ...e, runningBalance: balance });
    }
    return result;
  }, [filtered]);

  // View action — pairs every line of the same transaction together regardless of
  // the current filters, so the detail modal always shows the complete double
  // entry even if a filter would otherwise hide one side of it.
  const [viewingGroup, setViewingGroup] = useState<{ source: string; sourceId: string } | null>(
    null,
  );
  const viewingData = useMemo(() => {
    if (!viewingGroup) return null;
    const pairedRows = entries.filter(
      (e) => e.source === viewingGroup.source && e.sourceId === viewingGroup.sourceId,
    );
    return {
      pairedRows,
      invoice: invoices.find((i) => i.id === viewingGroup.sourceId),
      payment: payments.find((p) => p.id === viewingGroup.sourceId),
      purchase: purchases.find((p) => p.id === viewingGroup.sourceId),
      payroll: payroll.find((p) => p.id === viewingGroup.sourceId),
      vendorPayment: vendorPaymentRequests.find((r) => r.id === viewingGroup.sourceId),
      expense: expenseEntries.find((e) => e.id === viewingGroup.sourceId),
    };
  }, [
    viewingGroup,
    entries,
    invoices,
    payments,
    purchases,
    payroll,
    vendorPaymentRequests,
    expenseEntries,
  ]);

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  const uniqueAccounts = useMemo(() => {
    const set = new Set(entries.map((e) => e.account.slice(0, 4)));
    return ['ALL', ...Array.from(set).sort()];
  }, [entries]);

  // Does the typed search text uniquely identify one real customer (or vendor)
  // by name? If so, "Generate Statement" targets that entity directly instead
  // of the generic whole-ledger snapshot — the single search bar now does what
  // the old dedicated Customer/Vendor dropdowns used to.
  const narrowedCustomer = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return null;
    const customerMatches = customerList.filter((c) => c.name.toLowerCase().includes(needle));
    const vendorMatches = vendorList.filter((v) => v.name.toLowerCase().includes(needle));
    return customerMatches.length === 1 && vendorMatches.length === 0 ? customerMatches[0] : null;
  }, [search, customerList, vendorList]);
  const narrowedVendor = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return null;
    const vendorMatches = vendorList.filter((v) => v.name.toLowerCase().includes(needle));
    const customerMatches = customerList.filter((c) => c.name.toLowerCase().includes(needle));
    return vendorMatches.length === 1 && customerMatches.length === 0 ? vendorMatches[0] : null;
  }, [search, customerList, vendorList]);

  const openGenericStatement = () => {
    setStatementData({
      kind: 'running-balance',
      title: 'General Ledger',
      subjectName: accountFilter === 'ALL' ? 'All Accounts' : accountFilter,
      periodFrom: fromDate,
      periodTo: toDate,
      currency,
      openingBalance: 0,
      closingBalance:
        withBalance.length > 0 ? withBalance[withBalance.length - 1].runningBalance : 0,
      balanceLabel: 'Net Balance',
      rows: withBalance.map((e) => ({
        date: e.date,
        reference: e.account,
        description: `${e.description} (${e.source})`,
        debit: e.debit || undefined,
        credit: e.credit || undefined,
      })),
    });
    setShowStatement(true);
  };

  const handleGenerateStatement = async () => {
    if (narrowedCustomer) {
      setGeneratingStatement(true);
      try {
        const stmt = await fetchCustomerStatement({
          customerName: narrowedCustomer.name,
          periodFrom: fromDate || undefined,
          periodTo: toDate || undefined,
          branchIds: branchIds || undefined,
        });
        setStatementData({
          kind: 'running-balance',
          title: 'Customer Statement of Account',
          subjectName: stmt.customerName,
          periodFrom: stmt.periodFrom,
          periodTo: stmt.periodTo,
          currency: stmt.currency,
          openingBalance: stmt.openingBalance,
          closingBalance: stmt.closingBalance,
          rows: stmt.rows,
          balanceLabel: 'Closing Balance (Amount Owed)',
        });
        setShowStatement(true);
      } catch {
        toast.error('Failed to generate statement');
      } finally {
        setGeneratingStatement(false);
      }
      return;
    }
    if (narrowedVendor) {
      setGeneratingStatement(true);
      try {
        const stmt = await fetchVendorStatement({
          vendorName: narrowedVendor.name,
          periodFrom: fromDate || undefined,
          periodTo: toDate || undefined,
          branchIds: branchIds || undefined,
        });
        setStatementData({
          kind: 'running-balance',
          title: 'Vendor Statement of Account',
          subjectName: stmt.vendorName,
          periodFrom: stmt.periodFrom,
          periodTo: stmt.periodTo,
          currency: stmt.currency,
          openingBalance: stmt.openingBalance,
          closingBalance: stmt.closingBalance,
          rows: stmt.rows,
          balanceLabel: 'Closing Balance (Amount We Owe)',
        });
        setShowStatement(true);
      } catch {
        toast.error('Failed to generate statement');
      } finally {
        setGeneratingStatement(false);
      }
      return;
    }
    openGenericStatement();
  };

  const statementButtonLabel = narrowedCustomer
    ? `Generate Statement — ${narrowedCustomer.name}`
    : narrowedVendor
      ? `Generate Statement — ${narrowedVendor.name}`
      : 'Generate Statement';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            All financial transactions with double-entry records
          </p>
        </div>
        <Button
          onClick={handleGenerateStatement}
          disabled={generatingStatement}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <FileText className="h-4 w-4" />{' '}
          {generatingStatement ? 'Generating…' : statementButtonLabel}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Entries"
          value={filtered.length.toString()}
          subtitle="In selected period"
        />
        <StatCard
          title="Total Debits"
          value={formatCurrency(totalDebit, currency)}
          subtitle="Debit side"
        />
        <StatCard
          title="Total Credits"
          value={formatCurrency(totalCredit, currency)}
          subtitle="Credit side"
        />
      </div>

      <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 bg-muted/50 border-none"
              placeholder="Search customer, vendor, income/expense type, description, or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-48 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueAccounts.map((a) => {
                  if (a === 'ALL')
                    return (
                      <SelectItem key="ALL" value="ALL">
                        All Accounts
                      </SelectItem>
                    );
                  const acc = CHART_OF_ACCOUNTS.find((c) => c.code === a);
                  return (
                    <SelectItem key={a} value={a}>
                      {a} {acc?.name ?? ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {periodPreset === 'custom' && (
              <>
                <input
                  type="date"
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="date"
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Failed to load ledger data.</p>
          <button
            onClick={refetchAll}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && (
        <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 w-24 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Account
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </TableHead>
                <TableHead className="text-right w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Debit
                </TableHead>
                <TableHead className="text-right w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Credit
                </TableHead>
                <TableHead className="text-right w-32 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Balance
                </TableHead>
                <TableHead className="w-16 pr-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  View
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                    <BookMarked className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No ledger entries found
                  </TableCell>
                </TableRow>
              ) : (
                withBalance.map((e, i) => (
                  <TableRow key={i} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                      {e.date}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{e.account}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {e.description}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${SOURCE_COLORS[e.source] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {e.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-semibold text-sm">
                      {e.debit > 0 ? formatCurrency(e.debit, e.currency) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-semibold text-sm">
                      {e.credit > 0 ? formatCurrency(e.credit, e.currency) : '—'}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-sm ${e.runningBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}
                    >
                      {formatCurrency(Math.abs(e.runningBalance), currency)}
                      {e.runningBalance < 0 ? ' Cr' : ' Dr'}
                    </TableCell>
                    <TableCell className="pr-4">
                      <button
                        onClick={() => setViewingGroup({ source: e.source, sourceId: e.sourceId })}
                        title="View full transaction"
                        className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {withBalance.length > 0 && (
            <div className="border-t bg-muted/30 px-4 py-3 flex items-center gap-8 rounded-b-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
                Totals
              </span>
              <span className="text-sm font-black text-blue-600 w-28 text-right">
                {formatCurrency(totalDebit, currency)}
              </span>
              <span className="text-sm font-black text-emerald-600 w-28 text-right">
                {formatCurrency(totalCredit, currency)}
              </span>
              <span className="text-sm font-black text-slate-800 w-32 text-right pr-4">
                {formatCurrency(Math.abs(totalDebit - totalCredit), currency)}
              </span>
            </div>
          )}
        </div>
      )}

      {viewingGroup && viewingData && (
        <LedgerEntryDetailModal
          source={viewingGroup.source}
          sourceId={viewingGroup.sourceId}
          pairedRows={viewingData.pairedRows}
          currency={currency}
          invoice={viewingData.invoice}
          payment={viewingData.payment}
          purchase={viewingData.purchase}
          payroll={viewingData.payroll}
          vendorPayment={viewingData.vendorPayment}
          expense={viewingData.expense}
          basePath="/admin"
          onClose={() => setViewingGroup(null)}
        />
      )}
      {showStatement && statementData && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

export default function AdminGeneralLedgerPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">General Ledger</h3>
          <p className="text-muted-foreground">All financial transactions — across branches</p>
        </div>
        <Suspense>
          <BranchFilterBar />
        </Suspense>
      </div>
      <Suspense>
        <GeneralLedgerContent />
      </Suspense>
    </div>
  );
}
