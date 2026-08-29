'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Eye, FileText } from 'lucide-react';
import {
  fetchManualPayables,
  fetchPayableCharts,
  fetchVendorStatement,
} from '@/lib/finance/accountsApi';
import { fetchPurchases, agingBucket, fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getUserFromToken } from '@/lib/auth';
import StatCard from '@/components/StatCard';
import { DonutChart, HorizontalBarChart, SimpleBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import PaymentsTab from '@/components/Finance/PaymentsTab';
import ExpensesTab from '@/components/Finance/ExpensesTab';
import { PayableDetailModal } from '@/components/accounts/ReceivablePayableDetail';
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

function SelectVendorModal({
  vendors,
  onClose,
  onSelect,
}: {
  vendors: string[];
  onClose: () => void;
  onSelect: (vendorName: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">Select Vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">
            A Vendor Statement of Account needs a specific vendor — choose who this statement is
            for.
          </p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
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

function PayableContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchIds = searchParams.get('branchIds') ?? '';
  // Same ?tab= contract as the Finance page, so deep links behave identically on both sides.
  const activeTab = (searchParams.get('tab') ?? 'payable') as 'payable' | 'payments' | 'expenses';
  const switchTab = (t: 'payable' | 'payments' | 'expenses') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`?${params.toString()}`);
  };
  const branchIdList = useMemo(
    () => (branchIds ? branchIds.split(',').filter(Boolean) : []),
    [branchIds],
  );
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [viewingRow, setViewingRow] = useState<{ type: 'PO' | 'MANUAL'; id: string } | null>(null);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
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

  const { data: manualPayables = [], isLoading } = useQuery({
    queryKey: ['admin-payables', branchIds],
    queryFn: () => fetchManualPayables(params),
  });
  // PO-based payables — ven_inv_service's list endpoint doesn't support multi-branch
  // filtering server-side for ADMIN, so branchIds is applied client-side below.
  const { data: purchases = [] } = useQuery({
    queryKey: ['admin-purchases-ap'],
    queryFn: () => fetchPurchases(),
  });
  const { data: charts } = useQuery({
    queryKey: ['admin-pay-charts', branchIds],
    queryFn: () =>
      fetchPayableCharts(params) as Promise<{
        byType: { name: string; value: number }[];
        topVendors: { name: string; value: number }[];
        monthlyPayments: { month: string; amount: number }[];
      }>,
  });

  // Manual payables linked to a PO are excluded — that PO's own outstanding
  // balance already covers it (mirrors the Finance page's guard).
  const combined = useMemo(() => {
    const fromPurchases = purchases
      .filter((p) => branchIdList.length === 0 || branchIdList.includes(p.branchId))
      .filter((p) => (p.remainingAmount ?? p.totalAmount ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        referenceNo: `PO-${p.id?.slice(0, 8)}`,
        payableTo: p.vendor?.name ?? '',
        type: 'VENDOR_INVOICE',
        amount: p.totalAmount ?? 0,
        outstanding: Number(p.remainingAmount ?? p.totalAmount ?? 0),
        aging: p.createdAt ? agingBucket(p.createdAt) : 'Current',
        status: p.status ?? 'PENDING',
        source: 'Purchase Order' as const,
        isPurchase: true,
      }));
    const fromManual = manualPayables
      .filter((p) => !p.linkedPurchaseId)
      .map((p) => ({
        id: p.id,
        referenceNo: p.referenceNo,
        payableTo: p.payableTo,
        type: p.type,
        amount: p.amount,
        outstanding: p.outstanding,
        aging: p.aging,
        status: p.status,
        source: 'Manual Entry' as const,
        isPurchase: false,
      }));
    return [...fromPurchases, ...fromManual];
  }, [purchases, manualPayables, branchIdList]);

  const filtered = useMemo(
    () =>
      combined.filter((p) => {
        const matchSource = sourceFilter === 'ALL' || p.source === sourceFilter;
        const matchSearch =
          !search ||
          p.payableTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.referenceNo?.toLowerCase().includes(search.toLowerCase());
        return matchSource && matchSearch;
      }),
    [combined, sourceFilter, search],
  );

  const totalOutstanding = combined.reduce((s, p) => s + Number(p.outstanding), 0);
  const overdue = combined
    .filter((p) => p.aging && p.aging !== 'Current')
    .reduce((s, p) => s + Number(p.outstanding), 0);

  const vendorNames = useMemo(
    () => [...new Set(combined.map((p) => p.payableTo))].filter(Boolean).sort() as string[],
    [combined],
  );

  const generateVendorStatement = async (vendorName: string) => {
    setShowVendorPicker(false);
    setGeneratingStatement(true);
    try {
      const stmt = await fetchVendorStatement({ vendorName, branchIds: branchIds || undefined });
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
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleGenerateStatementClick = () => {
    const uniqueVisible = [...new Set(filtered.map((p) => p.payableTo))].filter(Boolean);
    if (uniqueVisible.length === 1) {
      generateVendorStatement(uniqueVisible[0] as string);
      return;
    }
    setShowVendorPicker(true);
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payables — Consolidated</h1>
          <p className="text-sm text-gray-500">
            {branchIds ? 'Selected branch(es)' : 'All branches'} · balances, vendor payments and
            expenses
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          {(['payable', 'payments', 'expenses'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'payable' ? 'Payable' : t === 'payments' ? 'Payments' : 'Expenses'}
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

      {/* Payments / Expenses — the same shared components Finance renders, scoped cross-branch. */}
      {activeTab === 'payments' && <PaymentsTab branchIds={branchIds || undefined} />}
      {activeTab === 'expenses' && <ExpensesTab branchIds={branchIds || undefined} />}

      {activeTab === 'payable' && (
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
              subtitle="Past due"
            />
            <StatCard title="Total Entries" value={combined.length.toString()} subtitle="Records" />
            <StatCard title="Shown" value={filtered.length.toString()} subtitle="Filtered" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">By Type</h3>
              <DonutChart data={charts?.byType ?? []} height={220} currency={currency} />
            </div>
            <div className="md:col-span-2 bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Payments</h3>
              <SimpleBarChart
                data={charts?.monthlyPayments ?? []}
                xKey="month"
                bars={[{ key: 'amount', color: '#ef4444', label: 'Payments' }]}
                height={220}
                currency={currency}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Payees by Outstanding</h3>
            <HorizontalBarChart
              data={charts?.topVendors ?? []}
              height={200}
              color="#f59e0b"
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
                  placeholder="Search payee or reference..."
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="text-sm border-orange-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                  <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      {[
                        'Reference',
                        'Payable To',
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
                          No payables found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {p.referenceNo}
                          </td>
                          <td className="px-4 py-3">{p.payableTo}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.source === 'Purchase Order'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {p.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {p.type?.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3">{formatCurrency(p.amount, currency)}</td>
                          <td className="px-4 py-3 font-semibold">
                            {formatCurrency(p.outstanding, currency)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${AGING_COLORS[p.aging ?? 'Current'] ?? 'bg-gray-100 text-gray-700'}`}
                            >
                              {p.aging}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{p.status}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                setViewingRow({ type: p.isPurchase ? 'PO' : 'MANUAL', id: p.id })
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
            )}
          </div>
        </>
      )}
      {viewingRow && (
        <PayableDetailModal
          sourceType={viewingRow.type}
          id={viewingRow.id}
          onClose={() => setViewingRow(null)}
        />
      )}
      {showVendorPicker && (
        <SelectVendorModal
          vendors={vendorNames}
          onClose={() => setShowVendorPicker(false)}
          onSelect={generateVendorStatement}
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

export default function AdminPayablePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <PayableContent />
    </Suspense>
  );
}
