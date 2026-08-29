'use client';

import React from 'react';
import { DrilldownModal, type DrilldownColumn } from './RevenueDrilldown';
import {
  fetchOtherIncomeTransactions,
  fetchAccessoriesRevenueTransactions,
  fetchUsageRevenueTransactions,
  type OtherIncomeRow,
  type AccessoriesRevenueRow,
  type UsageRevenueRow,
} from '@/lib/finance/accountsApi';
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

// ─── 4009 Accessories Sales Revenue — the accessory LINE ITEMS behind the
// headline, one row per line. An accessory is never an invoice of its own (it is a
// priced line on a machine's contract or sale), which is why it needs a line-level
// drill-down rather than the invoice-level one every other revenue account uses.

const accessoriesRevenueColumns: DrilldownColumn<AccessoriesRevenueRow>[] = [
  {
    header: 'Invoice #',
    render: (r) => (
      <span className="font-mono text-xs text-blue-600 font-bold">{r.invoiceNumber}</span>
    ),
  },
  { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
  {
    header: 'Accessory',
    render: (r) => (
      <div className="flex flex-col">
        <span className="text-sm">{r.description}</span>
        {r.serialNumber && (
          <span className="font-mono text-[11px] text-muted-foreground">{r.serialNumber}</span>
        )}
      </div>
    ),
  },
  {
    header: 'Sold On',
    render: (r) => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {r.saleType?.replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    header: 'Qty × Unit Price',
    align: 'right',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {r.quantity} × {formatCurrency(r.unitPrice, r.currencyCode)}
      </span>
    ),
  },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
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

export function AccessoriesRevenueModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<AccessoriesRevenueRow>
      title="Accessories Sales Revenue"
      queryKey="accessories-revenue"
      fetchRows={(f) =>
        fetchAccessoriesRevenueTransactions({ ...f, branchId: f.branchId ?? branchId })
      }
      columns={accessoriesRevenueColumns}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      searchFilterLabel="Invoice #, accessory, customer or serial"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 4005 Usage / Copy Revenue — the per-period overage behind the headline, one
// row per billed period across every Rent and Lease contract. Shows ONLY the excess
// charge, never the base rent: rent is 4001/4002's, and a contract's monthly rent
// appearing here as well would double it. The copy counts sit alongside the money so
// the charge can be read back to the meter readings it came from.

const usageRevenueColumns: DrilldownColumn<UsageRevenueRow>[] = [
  {
    header: 'Contract #',
    render: (r) => (
      <span className="font-mono text-xs text-blue-600 font-bold">{r.invoiceNumber}</span>
    ),
  },
  { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
  {
    header: 'Type',
    render: (r) => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {r.saleType?.replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    header: 'Billing Period',
    render: (r) => (
      <span className="font-mono text-[11px] text-muted-foreground">
        {r.billingPeriodStart} → {r.billingPeriodEnd}
      </span>
    ),
  },
  {
    header: 'Meter Reading',
    align: 'right',
    render: (r) => (
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
        B/W {r.bwA4Count.toLocaleString()}
        {r.bwA3Count ? ` (+${r.bwA3Count.toLocaleString()} A3)` : ''} · Clr{' '}
        {r.colorA4Count.toLocaleString()}
        {r.colorA3Count ? ` (+${r.colorA3Count.toLocaleString()} A3)` : ''}
      </span>
    ),
  },
  {
    header: 'Copies Over Limit',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-amber-700">
        {r.exceededCopies.toLocaleString()}
      </span>
    ),
  },
  {
    header: 'Excess Charge',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(r.amount, r.currencyCode)}
      </span>
    ),
  },
];

export function UsageRevenueModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<UsageRevenueRow>
      title="Usage / Copy Revenue (Overage)"
      queryKey="usage-revenue"
      fetchRows={(f) => fetchUsageRevenueTransactions({ ...f, branchId: f.branchId ?? branchId })}
      columns={usageRevenueColumns}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      searchFilterLabel="Contract # or customer"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}
