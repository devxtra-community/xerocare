'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, FileText } from 'lucide-react';
import {
  fetchCashBankAccounts,
  fetchCashbookEntries,
  fetchAccountStatement,
  type CashBankAccount,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getUserFromToken } from '@/lib/auth';
import StatCard from '@/components/StatCard';
import { SimpleBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
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

const TYPE_BADGE: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-700',
  BANK: 'bg-blue-100 text-blue-700',
};

const TXN_BADGE: Record<string, string> = {
  RECEIPT: 'bg-emerald-100 text-emerald-700',
  PAYMENT: 'bg-red-100 text-red-700',
};

function SelectAccountModal({
  accounts,
  onClose,
  onSelect,
}: {
  accounts: CashBankAccount[];
  onClose: () => void;
  onSelect: (accountId: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">Select Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">
            A statement needs one specific account — choose which account this statement is for.
          </p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.type})
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

function CashBankContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [activeTab, setActiveTab] = useState<'accounts' | 'cashbook'>('accounts');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
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

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['admin-cash-bank', branchIds],
    queryFn: () => fetchCashBankAccounts(params),
  });
  const { data: cashbook = [], isLoading: loadingCashbook } = useQuery({
    queryKey: ['admin-cashbook', branchIds],
    queryFn: () => fetchCashbookEntries(params),
  });

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((a) => {
        const matchType = typeFilter === 'ALL' || a.type === typeFilter;
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      }),
    [accounts, typeFilter, search],
  );

  const filteredCashbook = useMemo(
    () =>
      cashbook.filter(
        (e) =>
          !search ||
          e.description?.toLowerCase().includes(search.toLowerCase()) ||
          e.referenceNo?.toLowerCase().includes(search.toLowerCase()),
      ),
    [cashbook, search],
  );

  const totalCash = accounts
    .filter((a) => a.type === 'CASH')
    .reduce((s, a) => s + Number(a.currentBalance), 0);
  const totalBank = accounts
    .filter((a) => a.type === 'BANK')
    .reduce((s, a) => s + Number(a.currentBalance), 0);
  const totalReceipts = cashbook
    .filter((e) => e.entryType === 'RECEIPT')
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalPayments = cashbook
    .filter((e) => e.entryType === 'PAYMENT')
    .reduce((s, e) => s + Number(e.amount), 0);

  const generateStatementForAccount = async (accountId: string) => {
    setShowAccountPicker(false);
    setGeneratingStatement(true);
    try {
      const stmt = await fetchAccountStatement({ accountId });
      setStatementData({
        kind: 'running-balance',
        title: `${stmt.accountType === 'BANK' ? 'Bank' : 'Cash'} Account Statement`,
        subjectName: stmt.accountName,
        subjectMeta: `Current Balance: ${formatCurrency(stmt.currentBalance, stmt.currency)}`,
        periodFrom: stmt.periodFrom,
        periodTo: stmt.periodTo,
        currency: stmt.currency,
        openingBalance: stmt.openingBalance,
        closingBalance: stmt.closingBalance,
        rows: stmt.rows,
        balanceLabel: 'Closing Balance',
      });
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleGenerateStatementClick = () => {
    const candidates = activeTab === 'accounts' ? filteredAccounts : accounts;
    if (candidates.length === 1) {
      generateStatementForAccount(candidates[0].id);
      return;
    }
    setShowAccountPicker(true);
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash & Bank — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Cash"
          value={formatCurrency(totalCash, currency)}
          subtitle="Cash accounts"
        />
        <StatCard
          title="Total Bank"
          value={formatCurrency(totalBank, currency)}
          subtitle="Bank accounts"
        />
        <StatCard
          title="Total Receipts"
          value={formatCurrency(totalReceipts, currency)}
          subtitle="All branches"
        />
        <StatCard
          title="Total Payments"
          value={formatCurrency(totalPayments, currency)}
          subtitle="All branches"
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Account Balances</h3>
        <SimpleBarChart
          data={accounts.map((a) => ({ name: a.name, balance: Number(a.currentBalance) }))}
          xKey="name"
          bars={[{ key: 'balance', color: '#3b82f6', label: 'Balance' }]}
          height={200}
          currency={currency}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b">
          {(['accounts', 'cashbook'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'accounts' ? 'Accounts' : 'Cashbook'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'accounts' ? 'Search accounts...' : 'Search transactions...'
              }
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeTab === 'accounts' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
            </select>
          )}
        </div>

        {activeTab === 'accounts' ? (
          loadingAccounts ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {['Account Name', 'Type', 'Account No', 'Bank', 'Currency', 'Balance'].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No accounts found
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[a.type] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {a.accountNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{a.bankName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{a.currency}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(a.currentBalance, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : loadingCashbook ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {['Reference', 'Date', 'Type', 'Description', 'Category', 'Amount'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCashbook.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredCashbook.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.referenceNo}</td>
                      <td className="px-4 py-3">{String(e.date).slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${TXN_BADGE[e.entryType] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {e.entryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={e.description}>
                        {e.description}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {e.category === 'GUARANTEE_CHEQUE' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[10px]">
                            Guarantee Cheque
                          </span>
                        ) : (
                          e.category
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${e.entryType === 'RECEIPT' ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {e.entryType === 'RECEIPT' ? '+' : '-'}
                        {formatCurrency(e.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAccountPicker && (
        <SelectAccountModal
          accounts={activeTab === 'accounts' ? filteredAccounts : accounts}
          onClose={() => setShowAccountPicker(false)}
          onSelect={generateStatementForAccount}
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

export default function AdminCashBankPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <CashBankContent />
    </Suspense>
  );
}
