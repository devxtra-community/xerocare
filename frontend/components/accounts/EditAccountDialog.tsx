'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Lock } from 'lucide-react';
import { updateChartOfAccount } from '@/lib/finance/accountsApi';
import type { CustomAccountBalance } from '@/lib/finance/accountsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

const GROUP_LABELS: Record<string, string> = {
  CURRENT_ASSET: 'Current Asset',
  NON_CURRENT_ASSET: 'Non-Current Asset',
  CURRENT_LIABILITY: 'Current Liability',
  NON_CURRENT_LIABILITY: 'Non-Current Liability',
  EQUITY: 'Equity',
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

const SOURCE_LABELS: Record<string, string> = {
  CASH_BANK_LINKED: 'Linked to Cash / Bank Account',
  EXPENSE_CATEGORY_LINKED: 'Expense Category',
  INCOME_CATEGORY_LINKED: 'Income Category',
  MANUAL_JOURNAL: 'Manual / Journal',
};

interface Props {
  account: CustomAccountBalance;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditAccountDialog({ account, onClose, onUpdated }: Props) {
  const [accountName, setAccountName] = useState(account.name);
  const [accountNumber, setAccountNumber] = useState(account.code);

  const qc = useQueryClient();
  const updateMut = useMutation({
    mutationFn: () =>
      updateChartOfAccount(account.id, {
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim() !== account.code ? accountNumber.trim() : undefined,
      }),
    onSuccess: () => {
      toast.success('Account updated');
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['chart-of-accounts-structure'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      onUpdated();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update account');
    },
  });

  const isDirty = accountName.trim() !== account.name || accountNumber.trim() !== account.code;
  const canSubmit = accountName.trim().length > 0 && isDirty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">Edit Account</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Name *</label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="mt-1"
              placeholder="Account name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Number</label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1"
              placeholder="Account number"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Lock className="h-3 w-3" /> Locked fields
            </p>
            {account.category && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-slate-700">
                  {CATEGORY_LABELS[account.category] ?? account.category}
                </span>
              </div>
            )}
            {account.accountGroup && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-slate-700">
                  {GROUP_LABELS[account.accountGroup] ?? account.accountGroup}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance Source</span>
              <span className="font-medium text-slate-700">
                {SOURCE_LABELS[account.sourceType] ?? account.sourceType}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Category, type, and balance source cannot be changed after creation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => updateMut.mutate()} disabled={!canSubmit || updateMut.isPending}>
            {updateMut.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
