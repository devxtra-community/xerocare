'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import {
  DrilldownModal,
  type DrilldownNode,
  type DrilldownColumn,
  type DrilldownFilters,
} from './RevenueDrilldown';
import {
  fetchEquityEntries,
  fetchRetainedEarningsMonthly,
  type EquityEntry,
  type EquityType,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface CommonModalProps {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}

function filterEquityRows(rows: EquityEntry[], f: DrilldownFilters): EquityEntry[] {
  let out = rows;
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter((r) => r.description?.toLowerCase().includes(needle));
  }
  if (f.dateFrom) out = out.filter((r) => r.date?.slice(0, 10) >= f.dateFrom!);
  if (f.dateTo) out = out.filter((r) => r.date?.slice(0, 10) <= f.dateTo!);
  if (f.amountMin) out = out.filter((r) => Number(r.amount) >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((r) => Number(r.amount) <= Number(f.amountMax));
  return out;
}

const equityColumns: DrilldownColumn<EquityEntry>[] = [
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  { header: 'Type', render: (r) => <span className="text-xs">{r.type.replace(/_/g, ' ')}</span> },
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Recorded By',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.createdBy?.slice(0, 8)}…</span>
    ),
  },
  {
    header: 'Linked Cash/Bank',
    render: (r) => (
      <span className="text-xs text-muted-foreground">
        {r.linkedCashAccountId ? r.linkedCashAccountId.slice(0, 8) + '…' : '—'}
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(r.amount), r.currency)}
      </span>
    ),
  },
];

export function EquityLineModal({
  types,
  title,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: {
  types: EquityType[];
  title: string;
} & CommonModalProps) {
  return (
    <DrilldownModal<EquityEntry>
      title={title}
      queryKey={`equity-line-${types.join('-')}`}
      fetchRows={async (f) => {
        const all = await Promise.all(types.map((type) => fetchEquityEntries({ type })));
        return filterEquityRows(all.flat(), f);
      }}
      columns={equityColumns}
      getAmount={(r) => Number(r.amount)}
      getCurrency={(r) => r.currency}
      searchFilterLabel="Description"
      periodFrom={periodFrom}
      periodTo={periodTo}
      seedDateRangeFromPeriod={false}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 3002 Retained Earnings — period-by-period P&L breakdown, not raw rows ────
// There's no single "retained earnings entry" table (it's a computed cumulative
// figure) — this shows the same monthly net income that accumulates into it.

export function RetainedEarningsModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['retained-earnings-monthly'],
    queryFn: () => fetchRetainedEarningsMonthly({ months: 12 }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">Retained Earnings — Monthly Breakdown</h2>
            <p className="text-xs text-muted-foreground">
              Cumulative net income by month (Revenue − Expenses each month, running total). See the
              Profit &amp; Loss page for the full transaction-level detail behind each month.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Month</th>
                  <th className="text-right px-3 py-2">Revenue</th>
                  <th className="text-right px-3 py-2">Expenses</th>
                  <th className="text-right px-3 py-2">Net Income</th>
                  <th className="text-right px-3 py-2">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.data ?? []).map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2 font-mono text-xs">{row.month}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.revenue, data?.currency ?? 'AED')}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.expenses, data?.currency ?? 'AED')}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-semibold ${row.netIncome < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {formatCurrency(row.netIncome, data?.currency ?? 'AED')}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                      {formatCurrency(row.cumulative, data?.currency ?? 'AED')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end px-6 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Node tree builder ─────────────────────────────────────────────────────────

export function buildEquityTree(equity: {
  ownerCapital: { balance: number };
  retainedEarnings: { balance: number };
  reserves: { balance: number };
  lessWithdrawals: { balance: number };
  lessDividends: { balance: number };
}): DrilldownNode[] {
  return [
    {
      key: 'OWNER_CAPITAL',
      label: "Owner's Capital",
      amount: equity.ownerCapital.balance,
      viewable: true,
    },
    {
      key: 'RETAINED_EARNINGS',
      label: 'Retained Earnings',
      amount: equity.retainedEarnings.balance,
      viewable: true,
      note: 'Computed figure — view shows the monthly P&L breakdown behind it',
    },
    { key: 'RESERVES', label: 'Reserves', amount: equity.reserves.balance, viewable: true },
    {
      key: 'WITHDRAWALS',
      label: 'Less: Withdrawals',
      amount: equity.lessWithdrawals.balance,
      viewable: true,
    },
    {
      key: 'DIVIDENDS',
      label: 'Less: Dividends',
      amount: equity.lessDividends.balance,
      viewable: true,
    },
  ];
}
