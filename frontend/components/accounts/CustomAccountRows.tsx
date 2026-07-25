'use client';

import React from 'react';
import { BookPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { CustomAccountBalance } from '@/lib/finance/accountsApi';

interface Props {
  accounts: CustomAccountBalance[];
  negative?: boolean;
  canManage: boolean;
  onPostJournal?: (account: CustomAccountBalance) => void;
}

// Renders custom (non-system) chart-of-accounts rows alongside the fixed named
// rows in each Chart of Accounts section. Sub-accounts (number contains '-')
// are indented under their Main Account; a "Custom" badge distinguishes them
// from the ~42 built-in accounts.
export default function CustomAccountRows({ accounts, negative, canManage, onPostJournal }: Props) {
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
            <span className="col-span-6 text-right">
              <span
                className={`font-bold tabular-nums ${isNeg ? 'text-red-600' : 'text-slate-800'}`}
              >
                {formatCurrency(val, a.currency)}
              </span>
            </span>
            <span className="col-span-1 text-right">
              {canManage && a.sourceType === 'MANUAL_JOURNAL' && onPostJournal && (
                <button
                  onClick={() => onPostJournal(a)}
                  title="Post journal entry"
                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
        );
      })}
    </>
  );
}
