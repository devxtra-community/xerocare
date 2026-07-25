'use client';

import React from 'react';
import { DrilldownModal, type DrilldownColumn } from './RevenueDrilldown';
import { fetchOtherIncomeTransactions, type OtherIncomeRow } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';

interface CommonModalProps {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}

// ─── 4008 Other Income — income_entries (RECEIVED) not linked to a dedicated
// custom Chart of Accounts income line. Mirrors accountsShared.ts's own
// otherIncome catch-all exactly (see getOtherIncomeTransactions).

const otherIncomeColumns: DrilldownColumn<OtherIncomeRow>[] = [
  {
    header: 'Income #',
    render: (r) => <span className="font-mono text-xs text-blue-600 font-bold">{r.incomeNo}</span>,
  },
  {
    header: 'Category',
    render: (r) => <span className="text-xs">{r.category.replace(/_/g, ' ')}</span>,
  },
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Received Via',
    render: (r) => <span className="text-xs">{r.receivedMode ?? '—'}</span>,
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(r.amount, r.currencyCode)}
      </span>
    ),
  },
];

export function OtherIncomeModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<OtherIncomeRow>
      title="Other Income"
      queryKey="other-income"
      fetchRows={(f) => fetchOtherIncomeTransactions({ ...f, branchId: f.branchId ?? branchId })}
      columns={otherIncomeColumns}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      searchFilterLabel="Income # or description"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}
