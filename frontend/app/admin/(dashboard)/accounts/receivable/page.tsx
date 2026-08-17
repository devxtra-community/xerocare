'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Eye, FileText } from 'lucide-react';
import {
  fetchManualReceivables,
  fetchReceivableCharts,
  fetchAccountsReceivableTransactions,
  fetchCustomerStatement,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getUserFromToken } from '@/lib/auth';
import StatCard from '@/components/StatCard';
import { DonutChart, SimpleLineChart, HorizontalBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import ReceiptsTab from '@/components/Finance/ReceiptsTab';
import { ReceivableDetailModal } from '@/components/accounts/ReceivablePayableDetail';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import StatementDialog, {
  type RunningBalanceStatementData,
} from '@/components/shared/StatementDialog';

const AGING_COLORS: Record<string, string> = {
  Current: 'bg-emerald-100 text-emerald-700',
  '1-30 days': 'bg-yellow-100 text-yellow-700',
  '31-60 days': 'bg-orange-100 text-orange-700',
  '61-90 days': 'bg-red-100 text-red-700',
  '90+ days': 'bg-red-200 text-red-800',
};

function SelectCustomerModal({
  customers,
  onClose,
  onSelect,
}: {
  customers: string[];
  onClose: () => void;
  onSelect: (customerName: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">Select Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">
            A Customer Statement of Account needs a specific customer — choose who this statement is
            for.
          </p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => chosen && onSelect(chosen)} disabled={!chosen} className="flex-1">
            Generate Statement
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceivableContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchIds = searchParams.get('branchIds') ?? '';
  // Same ?tab= contract as the Finance page, so deep links behave identically on both sides.
  const activeTab = (searchParams.get('tab') ?? 'receivable') as 'receivable' | 'receipts';
  const switchTab = (t: 'receivable' | 'receipts') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`?${params.toString()}`);
  };
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [viewingRow, setViewingRow] = useState<{ type: 'INVOICE' | 'MANUAL'; id: string } | null>(
    null,
  );
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [statementData, setStatementData] = useState<RunningBalanceStatementData | null>(null);
  const [generatingStatement, setGeneratingStatement] = useState(false);

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

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: manual = [] } = useQuery({
    queryKey: ['admin-receivables', branchIds],
    queryFn: () => fetchManualReceivables(params),
  });
  // Correctly-filtered invoice-based AR — same population as Chart of Accounts 1003.
  // Previously this page showed manual receivables only, understating consolidated
  // AR by the entire invoice-based share. includeSettled widens this to full AR
  // history (fully-paid invoices included) rather than outstanding-only — mirrors
  // the Finance Receivable page's same change.
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['admin-ar-invoices', branchIds],
    queryFn: () => fetchAccountsReceivableTransactions({ ...params, includeSettled: true }),
  });
  const { data: charts } = useQuery({
    queryKey: ['admin-rcv-charts', branchIds],
    queryFn: () =>
      fetchReceivableCharts(params) as Promise<{
        collectionRate: { month: string; issued: number; collected: number }[];
        byType: { name: string; value: number }[];
        topCustomers: { name: string; value: number }[];
      }>,
  });

  // Manual receivables linked to an invoice are excluded — that invoice's own
  // outstanding balance already covers it (mirrors the Finance page's guard).
  const combined = useMemo(() => {
    const fromInvoices = arInvoices.map((inv) => ({
      id: inv.id,
      referenceNo: inv.invoiceNumber,
      customerName: inv.customerName,
      type: inv.saleType,
      amount: inv.totalAmount,
      outstanding: inv.amount,
      aging: inv.aging,
      status: inv.status,
      source: 'Invoice' as const,
      isInvoice: true,
    }));
    const fromManual = manual
      .filter((r) => !r.linkedInvoiceId)
      .map((r) => ({
        id: r.id,
        referenceNo: r.referenceNo,
        customerName: r.customerName ?? '',
        type: r.type,
        amount: r.amount,
        outstanding: r.outstanding,
        aging: r.aging,
        status: r.status,
        source: 'Manual Entry' as const,
        isInvoice: false,
      }));
    return [...fromInvoices, ...fromManual];
  }, [arInvoices, manual]);

  const filtered = useMemo(
    () =>
      combined.filter((r) => {
        const matchSource = sourceFilter === 'ALL' || r.source === sourceFilter;
        const matchSearch =
          !search ||
          r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          r.referenceNo?.toLowerCase().includes(search.toLowerCase());
        return matchSource && matchSearch;
      }),
    [combined, sourceFilter, search],
  );

  const totalOutstanding = combined.reduce((s, r) => s + Number(r.outstanding), 0);
  const overdue = combined
    .filter((r) => r.aging !== 'Current')
    .reduce((s, r) => s + Number(r.outstanding), 0);

  const customerNames = useMemo(
    () => [...new Set(combined.map((r) => r.customerName).filter(Boolean))].sort() as string[],
    [combined],
  );

  const generateCustomerStatement = async (customerName: string) => {
    setShowCustomerPicker(false);
    setGeneratingStatement(true);
    try {
      const stmt = await fetchCustomerStatement({
        customerName,
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
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleGenerateStatementClick = () => {
    const uniqueVisible = [...new Set(filtered.map((r) => r.customerName).filter(Boolean))];
    if (uniqueVisible.length === 1) {
      generateCustomerStatement(uniqueVisible[0] as string);
      return;
    }
    setShowCustomerPicker(true);
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receivables — Consolidated</h1>
          <p className="text-sm text-gray-500">
            {branchIds ? 'Selected branch(es)' : 'All branches'} · balances, aging and payment
            receipts
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          {(['receivable', 'receipts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'receivable' ? 'Receivable' : 'Receipts'}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerateStatementClick}
          disabled={generatingStatement}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />{' '}
          {generatingStatement ? 'Generating…' : 'Generate Statement'}
        </button>
      </div>

      <BranchFilterBar />

      {/* Receipts — the same shared component Finance renders, scoped cross-branch. */}
      {activeTab === 'receipts' && <ReceiptsTab branchIds={branchIds || undefined} />}

      {activeTab === 'receivable' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Total Outstanding"
              value={formatCurrency(totalOutstanding, currency)}
              subtitle="All branches"
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(overdue, currency)}
              subtitle="Past due date"
            />
            <StatCard title="Total Entries" value={combined.length.toString()} subtitle="Records" />
            <StatCard title="Shown" value={filtered.length.toString()} subtitle="Filtered" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Collection Rate Trend</h3>
              <SimpleLineChart
                data={charts?.collectionRate ?? []}
                xKey="month"
                lines={[
                  { key: 'issued', color: '#3b82f6', label: 'Issued' },
                  { key: 'collected', color: '#10b981', label: 'Collected' },
                ]}
                height={220}
                currency={currency}
              />
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">By Type</h3>
              <DonutChart data={charts?.byType ?? []} height={220} currency={currency} />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Customers</h3>
            <HorizontalBarChart
              data={charts?.topCustomers ?? []}
              height={200}
              color="#8b5cf6"
              currency={currency}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b flex-wrap">
              <div className="relative flex-1 min-w-50">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer or reference..."
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="ALL">All Sources</option>
                <option value="Invoice">Invoice</option>
                <option value="Manual Entry">Manual Entry</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      'Reference',
                      'Customer',
                      'Source',
                      'Type',
                      'Amount',
                      'Outstanding',
                      'Aging',
                      'Status',
                      '',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400">
                        No receivables found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {r.referenceNo}
                        </td>
                        <td className="px-4 py-3">{r.customerName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.source === 'Invoice'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {r.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(r.amount, currency)}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(r.outstanding, currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${AGING_COLORS[r.aging] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {r.aging}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.status}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setViewingRow({ type: r.isInvoice ? 'INVOICE' : 'MANUAL', id: r.id })
                            }
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                            title="View full details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {viewingRow && (
        <ReceivableDetailModal
          sourceType={viewingRow.type}
          id={viewingRow.id}
          onClose={() => setViewingRow(null)}
        />
      )}
      {showCustomerPicker && (
        <SelectCustomerModal
          customers={customerNames}
          onClose={() => setShowCustomerPicker(false)}
          onSelect={generateCustomerStatement}
        />
      )}
      {statementData && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setStatementData(null)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

export default function AdminReceivablePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <ReceivableContent />
    </Suspense>
  );
}
