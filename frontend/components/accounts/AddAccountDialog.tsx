'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import {
  createChartOfAccount,
  getNextAccountNumber,
  fetchCashBankAccounts,
  fetchChartOfAccountsStructure,
} from '@/lib/finance/accountsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

const GROUPS_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  ASSET: [
    { value: 'CURRENT_ASSET', label: 'Current Asset' },
    { value: 'NON_CURRENT_ASSET', label: 'Non-Current Asset' },
  ],
  LIABILITY: [
    { value: 'CURRENT_LIABILITY', label: 'Current Liability' },
    { value: 'NON_CURRENT_LIABILITY', label: 'Non-Current Liability' },
  ],
  EQUITY: [{ value: 'EQUITY', label: 'Equity' }],
  INCOME: [{ value: 'INCOME', label: 'Income' }],
  EXPENSE: [{ value: 'EXPENSE', label: 'Expense' }],
};

const SOURCE_TYPES_BY_CATEGORY: Record<string, { value: string; label: string; hint: string }[]> = {
  ASSET: [
    {
      value: 'CASH_BANK_LINKED',
      label: 'Linked to a Cash / Bank Account',
      hint: "Pick an existing cash or bank account — its live balance becomes this account's balance.",
    },
    {
      value: 'MANUAL_JOURNAL',
      label: 'Manual / Journal',
      hint: 'Balance is adjusted by posting journal entries yourself (e.g. a prepaid asset, a custom reserve).',
    },
  ],
  LIABILITY: [
    {
      value: 'MANUAL_JOURNAL',
      label: 'Manual / Journal',
      hint: 'Balance is adjusted by posting journal entries yourself.',
    },
  ],
  EQUITY: [
    {
      value: 'MANUAL_JOURNAL',
      label: 'Manual / Journal',
      hint: 'Balance is adjusted by posting journal entries yourself.',
    },
  ],
  INCOME: [
    {
      value: 'INCOME_CATEGORY_LINKED',
      label: 'New Income Category',
      hint: 'Real income entries tagged with this category automatically feed this account.',
    },
    {
      value: 'MANUAL_JOURNAL',
      label: 'Manual / Journal',
      hint: 'Balance is adjusted by posting journal entries yourself (for one-off, infrequent income).',
    },
  ],
  EXPENSE: [
    {
      value: 'EXPENSE_CATEGORY_LINKED',
      label: 'New Expense Category',
      hint: 'Real expense entries tagged with this category automatically feed this account.',
    },
    {
      value: 'MANUAL_JOURNAL',
      label: 'Manual / Journal',
      hint: 'Balance is adjusted by posting journal entries yourself.',
    },
  ],
};

export interface ParentAccountRef {
  id: string;
  accountNumber: string;
  accountName: string;
  category: string;
  accountGroup: string;
}

interface Props {
  /** Pre-picked parent — when set, the dialog opens straight into Sub-Account mode for it. */
  parent?: ParentAccountRef | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddAccountDialog({ parent: fixedParent, onClose, onCreated }: Props) {
  const [kind, setKind] = useState<'MAIN' | 'SUB'>(fixedParent ? 'SUB' : 'MAIN');
  const [parentId, setParentId] = useState(fixedParent?.id ?? '');
  const [category, setCategory] = useState(fixedParent?.category ?? 'ASSET');
  const [accountGroup, setAccountGroup] = useState(fixedParent?.accountGroup ?? 'CURRENT_ASSET');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [sourceType, setSourceType] = useState(SOURCE_TYPES_BY_CATEGORY[category][0].value);
  const [linkedCashBankAccountId, setLinkedCashBankAccountId] = useState('');
  const [categoryKey, setCategoryKey] = useState('');

  const { data: structure = [] } = useQuery({
    queryKey: ['chart-of-accounts-structure'],
    queryFn: fetchChartOfAccountsStructure,
    enabled: kind === 'SUB' && !fixedParent,
  });
  // Any account can take a sub-account (system or custom, main or itself already nested).
  const parentOptions = useMemo(
    () =>
      structure
        .filter((a) => a.isActive)
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
    [structure],
  );
  const selectedParent = fixedParent ?? parentOptions.find((a) => a.id === parentId) ?? null;
  const isSubAccount = kind === 'SUB' && !!selectedParent;
  const effectiveCategory = isSubAccount ? selectedParent!.category : category;

  useEffect(() => {
    if (!isSubAccount) {
      setAccountGroup(GROUPS_BY_CATEGORY[category][0].value);
    }
    setSourceType(SOURCE_TYPES_BY_CATEGORY[effectiveCategory][0].value);
  }, [category, isSubAccount, effectiveCategory]);

  const { data: suggestedNumber } = useQuery({
    queryKey: ['next-account-number', category, selectedParent?.id],
    queryFn: () =>
      getNextAccountNumber(isSubAccount ? { parentAccountId: selectedParent!.id } : { category }),
    enabled: !isSubAccount || !!selectedParent,
  });

  const { data: cashBankAccounts = [] } = useQuery({
    queryKey: ['cash-bank-accounts-for-coa'],
    queryFn: () => fetchCashBankAccounts(),
    enabled: sourceType === 'CASH_BANK_LINKED',
  });

  const qc = useQueryClient();
  const createMut = useMutation({
    mutationFn: () =>
      createChartOfAccount({
        accountName,
        category: isSubAccount ? undefined : category,
        accountGroup: isSubAccount ? undefined : accountGroup,
        accountNumber: accountNumber || undefined,
        parentAccountId: isSubAccount ? selectedParent!.id : undefined,
        sourceType,
        linkedCashBankAccountId:
          sourceType === 'CASH_BANK_LINKED' ? linkedCashBankAccountId : undefined,
        categoryKey:
          sourceType === 'EXPENSE_CATEGORY_LINKED' || sourceType === 'INCOME_CATEGORY_LINKED'
            ? categoryKey
            : undefined,
      }),
    onSuccess: () => {
      toast.success(isSubAccount ? 'Sub-account created' : 'Account created');
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['chart-of-accounts-structure'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      onCreated();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create account');
    },
  });

  const sourceOptions = SOURCE_TYPES_BY_CATEGORY[effectiveCategory];
  const canSubmit =
    accountName.trim().length > 0 &&
    (kind === 'MAIN' || !!selectedParent) &&
    (sourceType !== 'CASH_BANK_LINKED' || !!linkedCashBankAccountId) &&
    ((sourceType !== 'EXPENSE_CATEGORY_LINKED' && sourceType !== 'INCOME_CATEGORY_LINKED') ||
      categoryKey.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Add Account</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {!fixedParent && (
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
              <button
                onClick={() => setKind('MAIN')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  kind === 'MAIN' ? 'bg-card shadow-sm text-slate-800' : 'text-muted-foreground'
                }`}
              >
                New Main Account
              </button>
              <button
                onClick={() => setKind('SUB')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  kind === 'SUB' ? 'bg-card shadow-sm text-slate-800' : 'text-muted-foreground'
                }`}
              >
                Sub-Account of...
              </button>
            </div>
          )}
          {kind === 'SUB' && !fixedParent && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Parent Account</label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a parent account" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.accountNumber} — {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === 'MAIN' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === 'MAIN' && GROUPS_BY_CATEGORY[category].length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={accountGroup} onValueChange={setAccountGroup}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS_BY_CATEGORY[category].map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Name *</label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="mt-1"
              placeholder="e.g. Petty Cash - Branch 2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Number</label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={suggestedNumber ? `Suggested: ${suggestedNumber}` : 'Auto-suggested'}
              className="mt-1"
            />
          </div>
          {(kind === 'MAIN' || selectedParent) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Balance Source</label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {sourceOptions.find((s) => s.value === sourceType)?.hint}
              </p>
            </div>
          )}
          {sourceType === 'CASH_BANK_LINKED' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Cash / Bank Account *
              </label>
              <Select value={linkedCashBankAccountId} onValueChange={setLinkedCashBankAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {cashBankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(sourceType === 'EXPENSE_CATEGORY_LINKED' ||
            sourceType === 'INCOME_CATEGORY_LINKED') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category Key *</label>
              <Input
                value={categoryKey}
                onChange={(e) => setCategoryKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. SOFTWARE_SUBSCRIPTIONS"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to tag {sourceType === 'EXPENSE_CATEGORY_LINKED' ? 'expense' : 'income'}{' '}
                entries so they roll up into this account.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => createMut.mutate()} disabled={!canSubmit || createMut.isPending}>
            {createMut.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
