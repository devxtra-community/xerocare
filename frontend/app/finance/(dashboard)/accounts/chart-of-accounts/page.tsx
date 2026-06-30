'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { CHART_OF_ACCOUNTS, AccountGroup } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GROUP_LABELS: Record<AccountGroup, string> = {
  ASSETS: 'Assets',
  LIABILITIES: 'Liabilities',
  EQUITY: 'Equity',
  INCOME: 'Income / Revenue',
  EXPENSES: 'Expenses',
};

const GROUP_ACCENT: Record<AccountGroup, { header: string; pill: string; dot: string }> = {
  ASSETS: {
    header: 'border-l-blue-500 bg-blue-50/60',
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  LIABILITIES: {
    header: 'border-l-red-500 bg-red-50/60',
    pill: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  EQUITY: {
    header: 'border-l-purple-500 bg-purple-50/60',
    pill: 'bg-purple-100 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  INCOME: {
    header: 'border-l-emerald-500 bg-emerald-50/60',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  EXPENSES: {
    header: 'border-l-orange-500 bg-orange-50/60',
    pill: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
};

const GROUPS: AccountGroup[] = ['ASSETS', 'LIABILITIES', 'EQUITY', 'INCOME', 'EXPENSES'];

export default function ChartOfAccountsPage() {
  const [openGroups, setOpenGroups] = useState<Set<AccountGroup>>(
    new Set(['ASSETS', 'INCOME', 'EXPENSES']),
  );
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    group: 'ASSETS' as AccountGroup,
    description: '',
  });
  const [customAccounts, setCustomAccounts] = useState<typeof CHART_OF_ACCOUNTS>([]);

  const allAccounts = useMemo(() => [...CHART_OF_ACCOUNTS, ...customAccounts], [customAccounts]);

  const filtered = useMemo(() => {
    if (!search) return allAccounts;
    const q = search.toLowerCase();
    return allAccounts.filter(
      (a) =>
        a.code.includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [allAccounts, search]);

  const toggleGroup = (g: AccountGroup) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) {
        next.delete(g);
      } else {
        next.add(g);
      }
      return next;
    });
  };

  const handleAddAccount = () => {
    if (!newAccount.code || !newAccount.name) return;
    setCustomAccounts((prev) => [...prev, { ...newAccount, balance: 0 }]);
    setNewAccount({ code: '', name: '', group: 'ASSETS', description: '' });
    setShowAddModal(false);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Chart of Accounts</h3>
          <p className="text-muted-foreground">Master ledger of all account heads</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {GROUPS.map((g) => (
          <StatCard
            key={g}
            title={GROUP_LABELS[g]}
            value={allAccounts.filter((a) => a.group === g).length.toString()}
            subtitle="accounts"
          />
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 bg-card border-border"
          placeholder="Search account code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Account tree */}
      <div className="space-y-3">
        {GROUPS.map((group) => {
          const accounts = filtered.filter((a) => a.group === group);
          if (search && accounts.length === 0) return null;
          const isOpen = openGroups.has(group) || !!search;
          const accent = GROUP_ACCENT[group];

          return (
            <div
              key={group}
              className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100"
            >
              <button
                onClick={() => toggleGroup(group)}
                className={`w-full flex items-center justify-between px-5 py-3.5 border-l-4 ${accent.header} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-bold text-sm text-slate-800">{GROUP_LABELS[group]}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${accent.pill}`}
                  >
                    {allAccounts.filter((a) => a.group === group).length}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-12 px-5 py-2.5 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="col-span-1">Code</span>
                    <span className="col-span-4">Account Name</span>
                    <span className="col-span-5 hidden md:block">Description</span>
                    <span className="col-span-2 text-right">Balance</span>
                  </div>
                  {accounts.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                      No accounts in this group
                    </p>
                  ) : (
                    accounts.map((acc) => (
                      <div
                        key={acc.code}
                        className="grid grid-cols-12 px-5 py-3 items-center hover:bg-blue-50/50 transition-colors text-sm"
                      >
                        <span className="col-span-1 font-mono text-xs text-muted-foreground font-medium">
                          {acc.code}
                        </span>
                        <span className="col-span-4 font-medium text-slate-800">{acc.name}</span>
                        <span className="col-span-5 hidden md:block text-muted-foreground text-xs">
                          {acc.description}
                        </span>
                        <span className="col-span-2 text-right font-bold text-slate-800">
                          {formatCurrency(acc.balance ?? 0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Add Custom Account</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Account Code
                <Input
                  className="mt-1"
                  placeholder="e.g. 1009"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount((p) => ({ ...p, code: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Account Name
                <Input
                  className="mt-1"
                  placeholder="e.g. Petty Cash"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Group
                <select
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none"
                  value={newAccount.group}
                  onChange={(e) =>
                    setNewAccount((p) => ({ ...p, group: e.target.value as AccountGroup }))
                  }
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {GROUP_LABELS[g]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Description
                <Input
                  className="mt-1"
                  placeholder="Brief description"
                  value={newAccount.description}
                  onChange={(e) => setNewAccount((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddAccount}>
                Add Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
