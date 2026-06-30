'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import { fetchCashBankAccounts, fetchCashbookEntries } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import * as XLSX from 'xlsx';

const TYPE_BADGE: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-700',
  BANK: 'bg-blue-100 text-blue-700',
};

const TXN_BADGE: Record<string, string> = {
  RECEIPT: 'bg-emerald-100 text-emerald-700',
  PAYMENT: 'bg-red-100 text-red-700',
};

function CashBankContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [activeTab, setActiveTab] = useState<'accounts' | 'cashbook'>('accounts');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

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

  const exportExcel = () => {
    const data =
      activeTab === 'accounts'
        ? filteredAccounts.map((a) => ({
            Name: a.name,
            Type: a.type,
            'Account No': a.accountNumber,
            Balance: a.currentBalance,
          }))
        : filteredCashbook.map((e) => ({
            Ref: e.referenceNo,
            Date: e.date,
            Type: e.entryType,
            Description: e.description,
            Amount: e.amount,
          }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Cash & Bank');
    XLSX.writeFile(wb, 'consolidated_cash_bank.xlsx');
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash & Bank — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <BranchFilterBar />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Cash" value={formatCurrency(totalCash)} subtitle="Cash accounts" />
        <StatCard title="Total Bank" value={formatCurrency(totalBank)} subtitle="Bank accounts" />
        <StatCard
          title="Total Receipts"
          value={formatCurrency(totalReceipts)}
          subtitle="All branches"
        />
        <StatCard
          title="Total Payments"
          value={formatCurrency(totalPayments)}
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
                          {formatCurrency(a.currentBalance)}
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
                      <td className="px-4 py-3 max-w-[200px] truncate">{e.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.category}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${e.entryType === 'RECEIPT' ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {e.entryType === 'RECEIPT' ? '+' : '-'}
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
