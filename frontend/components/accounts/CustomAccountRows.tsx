'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { deleteChartOfAccount } from '@/lib/finance/accountsApi';
import type { CustomAccountBalance } from '@/lib/finance/accountsApi';

interface Props {
  accounts: CustomAccountBalance[];
  negative?: boolean;
  canManage: boolean;
  /** True only for ADMIN role — gates Edit and Delete buttons */
  canAdmin?: boolean;
  onPostJournal?: (account: CustomAccountBalance) => void;
  onEdit?: (account: CustomAccountBalance) => void;
}

// Renders custom (non-system) chart-of-accounts rows alongside the fixed named
// rows in each Chart of Accounts section. Sub-accounts (number contains '-')
// are indented under their Main Account; a "Custom" badge distinguishes them
// from the ~42 built-in accounts.
export default function CustomAccountRows({
  accounts,
  negative,
  canManage,
  canAdmin = false,
  onPostJournal,
  onEdit,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<CustomAccountBalance | null>(null);
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => deleteChartOfAccount(pendingDelete!.id),
    onSuccess: () => {
      toast.success('Account deleted');
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['chart-of-accounts-structure'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      setPendingDelete(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Cannot delete this account');
      setPendingDelete(null);
    },
  });

  if (accounts.length === 0) return null;
  return (
    <>
      {accounts.map((a) => {
        const isSub = a.code.includes('-');
        const val = negative ? -a.balance : a.balance;
        const isNeg = val < 0;
        return (
          <div
            key={a.id}
            className="grid grid-cols-12 px-5 py-3 items-center hover:bg-blue-50/50 transition-colors text-sm"
          >
            <span className="col-span-1 font-mono text-xs text-muted-foreground font-medium">
              {a.code}
            </span>
            <span
              className={`col-span-4 font-medium text-slate-800 flex items-center gap-1.5 ${isSub ? 'pl-4' : ''}`}
            >
              {isSub && <span className="text-muted-foreground">↳</span>}
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                Custom
              </span>
            </span>
            <span className="col-span-5 text-right">
              <span
                className={`font-bold tabular-nums ${isNeg ? 'text-red-600' : 'text-slate-800'}`}
              >
                {formatCurrency(val, a.currency)}
              </span>
            </span>
            <span className="col-span-2 flex items-center justify-end gap-0.5">
              {canManage && a.sourceType === 'MANUAL_JOURNAL' && onPostJournal && (
                <button
                  onClick={() => onPostJournal(a)}
                  title="Post journal entry"
                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && onEdit && (
                <button
                  onClick={() => onEdit(a)}
                  title="Edit account"
                  className="p-1 rounded hover:bg-amber-100 text-amber-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && (
                <button
                  onClick={() => setPendingDelete(a)}
                  title="Delete account"
                  className="p-1 rounded hover:bg-red-100 text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
        );
      })}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="font-bold text-slate-800 text-base mb-1">Delete Account?</h3>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-mono text-xs text-slate-600">{pendingDelete.code}</span>{' '}
                <span className="font-medium text-slate-700">{pendingDelete.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is permanent. Accounts with existing entries or sub-accounts cannot be deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
