'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  FolderTree,
  ChevronRight,
  Settings2,
  FileText,
  ArrowDownNarrowWide,
} from 'lucide-react';

import PageHeader from '@/components/Finance/pageHeader';
import StatusBadge from '@/components/Finance/statusBadge';
import AddAccountDialog from '@/components/Finance/AddAccountDialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ChartAccount, chartOfAccounts as initialAccounts } from '@/lib/finance/finance';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>(initialAccounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);

  /* ---------- Filter Logic ---------- */
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(
        (acc) =>
          acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.code.includes(searchQuery),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, searchQuery]);

  /* ---------- Handlers ---------- */
  const handleAdd = () => {
    setMode('create');
    setSelectedAccount(null);
    setOpen(true);
  };

  const handleEdit = (account: ChartAccount) => {
    setMode('edit');
    setSelectedAccount(account);
    setOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <PageHeader
        title="Chart of Accounts"
        description="Core financial structure for general ledger reporting and transaction mapping."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white border-slate-200 shadow-sm">
              <ArrowDownNarrowWide className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button
              onClick={handleAdd}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Account
            </Button>
          </div>
        }
      />

      {/* 1. Search and Hierarchy Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by code or account name..."
            className="pl-10 bg-slate-50 border-none h-10 ring-1 ring-slate-200 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <FolderTree className="w-3.5 h-3.5" />
          <span>Total Accounts: {accounts.length}</span>
        </div>
      </div>

      {/* 2. Structured Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 w-[120px] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Code
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Account Mapping
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Classification
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
              <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                Operations
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAccounts.map((account) => (
              <TableRow
                key={account.id}
                className={`group hover:bg-slate-50/50 transition-all ${account.isGroup ? 'bg-slate-50/30' : ''}`}
              >
                <TableCell className="pl-6 font-mono text-sm font-bold text-slate-600">
                  {account.code}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-slate-900 ${account.isGroup ? 'text-blue-700 underline underline-offset-4 decoration-blue-200' : ''}`}
                    >
                      {account.name}
                    </span>
                    {account.isGroup && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                        Group
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                    Sub-ledger entry allowed
                  </p>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{account.type}</span>
                    <span className="text-[10px] text-slate-400">
                      Financial Statement Line Item
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>

                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(account)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    {!account.isGroup && (
                      <Link href={`/finance/generalLedger/ledger/${account.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer Disclaimer */}
      <p className="text-center text-[10px] text-slate-400 italic">
        Caution: Changes to account codes may impact historical financial statements.
      </p>

      <AddAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        mode={mode}
        initialData={
          selectedAccount
            ? {
                ...selectedAccount,

                parentId: selectedAccount.parentId ?? null,
              }
            : undefined
        }
        accounts={accounts}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSave={(updatedAccount: any) => {
          if (!updatedAccount.id) return;

          if (mode === 'edit') {
            setAccounts((prev) =>
              prev.map((acc) =>
                acc.id === updatedAccount.id ? (updatedAccount as ChartAccount) : acc,
              ),
            );
          } else {
            setAccounts((prev) => [...prev, updatedAccount as ChartAccount]);
          }
        }}
      />
    </div>
  );
}
