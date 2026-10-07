'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookPlus, Pencil, Trash2, PowerOff, Power } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { deleteChartOfAccount, setChartOfAccountActive } from '@/lib/finance/accountsApi';
import type { CustomAccountBalance } from '@/lib/finance/accountsApi';

interface Props {
  accounts: CustomAccountBalance[];
  negative?: boolean;
  canManage: boolean;
  /** True only for ADMIN role — gates Edit, Delete, Deactivate, and Reactivate buttons */
  canAdmin?: boolean;
  onPostJournal?: (account: CustomAccountBalance) => void;
  onEdit?: (account: CustomAccountBalance) => void;
}

export default function CustomAccountRows({
  accounts,
  negative,
  canManage,
  canAdmin = false,
  onPostJournal,
  onEdit,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<CustomAccountBalance | null>(null);
  const [pendingToggle, setPendingToggle] = useState<CustomAccountBalance | null>(null);
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    qc.invalidateQueries({ queryKey: ['admin-chart-of-accounts'] });
    qc.invalidateQueries({ queryKey: ['chart-of-accounts-structure'] });
    qc.invalidateQueries({ queryKey: ['balance-sheet'] });
    qc.invalidateQueries({ queryKey: ['profit-loss'] });
  };

  const deleteMut = useMutation({
    mutationFn: () => deleteChartOfAccount(pendingDelete!.id),
    onSuccess: () => {
      toast.success('Account deleted');
      invalidateAll();
      setPendingDelete(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Cannot delete this account');
      setPendingDelete(null);
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: () => setChartOfAccountActive(pendingToggle!.id, !pendingToggle!.isActive),
    onSuccess: () => {
      const action = pendingToggle?.isActive ? 'deactivated' : 'reactivated';
      toast.success(`Account ${action}`);
      invalidateAll();
      setPendingToggle(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not update account status');
      setPendingToggle(null);
    },
  });

  if (accounts.length === 0) return null;
  return (
    <>
      {accounts.map((a) => {
        const isSub = a.code.includes('-');
        const val = negative ? -a.balance : a.balance;
        const isNeg = val < 0;
        const inactive = a.isActive === false;
        return (
          <div
            key={a.id}
            className={`grid grid-cols-12 px-5 py-3 items-center hover:bg-primary/10 transition-colors text-sm ${inactive ? 'opacity-50' : ''}`}
          >
            <span className="col-span-1 font-mono text-xs text-muted-foreground font-medium">
              {a.code}
            </span>
            <span
              className={`col-span-4 font-medium text-foreground flex items-center gap-1.5 ${isSub ? 'pl-4' : ''}`}
            >
              {isSub && <span className="text-muted-foreground">↳</span>}
              <span className={`truncate ${inactive ? 'line-through text-muted-foreground' : ''}`}>
                {a.name}
              </span>
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Custom
              </span>
              {inactive && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </span>
            <span className="col-span-5 text-right">
              <span
                className={`font-bold tabular-nums ${isNeg ? 'text-destructive' : 'text-foreground'}`}
              >
                {formatCurrency(val, a.currency)}
              </span>
            </span>
            <span className="col-span-2 flex items-center justify-end gap-0.5">
              {canManage && !inactive && a.sourceType === 'MANUAL_JOURNAL' && onPostJournal && (
                <button
                  onClick={() => onPostJournal(a)}
                  title="Post journal entry"
                  className="p-1 rounded hover:bg-primary/10 text-primary"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && !inactive && onEdit && (
                <button
                  onClick={() => onEdit(a)}
                  title="Edit account"
                  className="p-1 rounded hover:bg-warning/10 text-warning"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && !inactive && (
                <button
                  onClick={() => setPendingDelete(a)}
                  title="Delete account"
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && !inactive && (
                <button
                  onClick={() => setPendingToggle(a)}
                  title="Deactivate account"
                  className="p-1 rounded hover:bg-warning/10 text-warning"
                >
                  <PowerOff className="h-3.5 w-3.5" />
                </button>
              )}
              {canAdmin && inactive && (
                <button
                  onClick={() => setPendingToggle(a)}
                  title="Reactivate account"
                  className="p-1 rounded hover:bg-success/10 text-success"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
        );
      })}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="font-bold text-foreground text-base mb-1">Delete Account?</h3>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-mono text-xs text-foreground">{pendingDelete.code}</span>{' '}
                <span className="font-medium text-foreground">{pendingDelete.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is permanent. Accounts with existing entries or sub-accounts cannot be deleted
                — use Deactivate instead.
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
                className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate confirmation */}
      {pendingToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="font-bold text-foreground text-base mb-1">
                {pendingToggle.isActive ? 'Deactivate Account?' : 'Reactivate Account?'}
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-mono text-xs text-foreground">{pendingToggle.code}</span>{' '}
                <span className="font-medium text-foreground">{pendingToggle.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingToggle.isActive
                  ? 'This account will be hidden from transaction pickers. All historical entries and report figures remain intact. You can reactivate it at any time.'
                  : 'This account will become available again for new journal entries and transactions.'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setPendingToggle(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleActiveMut.mutate()}
                disabled={toggleActiveMut.isPending}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-primary-foreground disabled:opacity-50 transition-colors ${
                  pendingToggle.isActive
                    ? 'bg-warning hover:bg-warning/90'
                    : 'bg-success hover:bg-success/90'
                }`}
              >
                {toggleActiveMut.isPending
                  ? pendingToggle.isActive
                    ? 'Deactivating…'
                    : 'Reactivating…'
                  : pendingToggle.isActive
                    ? 'Deactivate'
                    : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
