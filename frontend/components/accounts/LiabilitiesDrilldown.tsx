'use client';

import React from 'react';
import {
  DrilldownModal,
  type DrilldownNode,
  type DrilldownColumn,
  type DrilldownFilters,
} from './RevenueDrilldown';
import {
  fetchExpenseEntries,
  fetchManualPayables,
  fetchOutputVatTransactions,
  fetchSecurityDepositTransactions,
  fetchDeferredRevenueTransactions,
  fetchVatRemittances,
  type ExpenseEntry,
  type ManualPayable,
} from '@/lib/finance/accountsApi';
import { fetchPurchases } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';

interface CommonModalProps {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}

// ─── 2001 Accounts Payable — manual payables + outstanding vendor purchases ──
// (accountsShared.ts sums BOTH sources for this line — manual_payables status
// != PAID, plus cross-service purchases with a remaining balance)

interface PayableRow {
  id: string;
  vendorName: string;
  reference: string;
  date: string;
  dueDate: string | null;
  amount: number;
  paid: number;
  outstanding: number;
  aging: string;
  currency: string;
}

function agingBucket(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  return '90+ days';
}

function filterPayableRows(rows: PayableRow[], f: DrilldownFilters): PayableRow[] {
  let out = rows;
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter((r) => r.vendorName.toLowerCase().includes(needle));
  }
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter((r) => r.reference.toLowerCase().includes(needle));
  }
  if (f.dateFrom) out = out.filter((r) => r.date >= f.dateFrom!);
  if (f.dateTo) out = out.filter((r) => r.date <= f.dateTo!);
  if (f.amountMin) out = out.filter((r) => r.outstanding >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((r) => r.outstanding <= Number(f.amountMax));
  return out;
}

const payableColumns: DrilldownColumn<PayableRow>[] = [
  { header: 'Vendor', render: (r) => <span className="text-sm font-medium">{r.vendorName}</span> },
  {
    header: 'Reference',
    render: (r) => <span className="font-mono text-xs text-blue-600">{r.reference}</span>,
  },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Due Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {r.dueDate?.slice(0, 10) ?? '—'}
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="tabular-nums text-xs">{formatCurrency(r.amount, r.currency)}</span>
    ),
  },
  {
    header: 'Paid',
    align: 'right',
    render: (r) => (
      <span className="tabular-nums text-xs text-emerald-600">
        {formatCurrency(r.paid, r.currency)}
      </span>
    ),
  },
  {
    header: 'Outstanding',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(r.outstanding, r.currency)}
      </span>
    ),
  },
  {
    header: 'Aging',
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
          r.aging === 'Current'
            ? 'bg-emerald-50 text-emerald-700'
            : r.aging === '90+ days'
              ? 'bg-red-50 text-red-700'
              : 'bg-amber-50 text-amber-700'
        }`}
      >
        {r.aging}
      </span>
    ),
  },
];

export function AccountsPayableModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<PayableRow>
      title="Accounts Payable"
      queryKey="accounts-payable"
      fetchRows={async (f) => {
        const [payables, purchases] = await Promise.all([
          fetchManualPayables({ branchId: f.branchId ?? branchId }),
          fetchPurchases({ branchId: f.branchId ?? branchId }),
        ]);
        const fromPayables: PayableRow[] = payables
          .filter((p) => p.status !== 'PAID' && !p.linkedPurchaseId)
          .map((p) => ({
            id: p.id,
            vendorName: p.payableTo,
            reference: p.referenceNo,
            date: p.issueDate,
            dueDate: p.dueDate,
            amount: Number(p.amount),
            paid: Number(p.amountPaid),
            outstanding: Number(p.outstanding),
            aging: p.aging || agingBucket(p.dueDate),
            currency: p.currency,
          }));
        const fromPurchases: PayableRow[] = purchases
          .filter((p) => Number(p.remainingAmount ?? 0) > 0)
          .map((p) => ({
            id: p.id,
            vendorName: p.vendor?.name ?? 'Unknown Vendor',
            reference: (p.lotId ?? p.id).slice(0, 8),
            date: p.createdAt,
            dueDate: null,
            amount: Number(p.totalAmount),
            paid: Number(p.paidAmount ?? 0),
            outstanding: Number(p.remainingAmount ?? 0),
            aging: agingBucket(p.createdAt),
            currency: p.currencyCode ?? 'AED',
          }));
        return filterPayableRows([...fromPayables, ...fromPurchases], f);
      }}
      columns={payableColumns}
      getAmount={(r) => r.outstanding}
      getCurrency={(r) => r.currency}
      nameFilterLabel="Vendor name"
      searchFilterLabel="Reference"
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

// ─── 2002 Accrued Expenses — APPROVED but unpaid expense entries ─────────────

const accruedColumns: DrilldownColumn<ExpenseEntry>[] = [
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Category',
    render: (r) => <span className="text-xs">{r.category.replace(/_/g, ' ')}</span>,
  },
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Approval Status',
    render: () => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
        APPROVED
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(r.netAmount), r.currency)}
      </span>
    ),
  },
];

export function AccruedExpensesModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<ExpenseEntry>
      title="Accrued Expenses"
      queryKey="accrued-expenses"
      fetchRows={async (f) => {
        const rows = await fetchExpenseEntries({
          status: 'APPROVED',
          branchId: f.branchId ?? branchId,
        });
        let out = rows;
        if (f.search) {
          const needle = f.search.toLowerCase();
          out = out.filter((r) => r.description?.toLowerCase().includes(needle));
        }
        if (f.dateFrom) out = out.filter((r) => r.date?.slice(0, 10) >= f.dateFrom!);
        if (f.dateTo) out = out.filter((r) => r.date?.slice(0, 10) <= f.dateTo!);
        if (f.amountMin) out = out.filter((r) => Number(r.netAmount) >= Number(f.amountMin));
        if (f.amountMax) out = out.filter((r) => Number(r.netAmount) <= Number(f.amountMax));
        return out;
      }}
      columns={accruedColumns}
      getAmount={(r) => Number(r.netAmount)}
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

// ─── 2003 VAT Payable — Output VAT (owed) minus Input VAT credit minus remittances ──

interface VatRow {
  id: string;
  rowType: 'OUTPUT_VAT' | 'INPUT_VAT_CREDIT' | 'REMITTANCE';
  reference: string;
  date: string;
  description: string;
  amount: number; // signed: +owed, -reduces what's owed
  currency: string;
}

const vatColumns: DrilldownColumn<VatRow>[] = [
  {
    header: 'Type',
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
          r.rowType === 'OUTPUT_VAT'
            ? 'bg-red-50 text-red-700'
            : r.rowType === 'INPUT_VAT_CREDIT'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-50 text-blue-700'
        }`}
      >
        {r.rowType === 'OUTPUT_VAT'
          ? 'Output VAT'
          : r.rowType === 'INPUT_VAT_CREDIT'
            ? 'Input VAT Credit'
            : 'Remitted'}
      </span>
    ),
  },
  {
    header: 'Reference',
    render: (r) => <span className="font-mono text-xs text-blue-600">{r.reference}</span>,
  },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Effect on VAT Payable',
    align: 'right',
    render: (r) => (
      <span
        className={`font-bold tabular-nums ${r.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}
      >
        {r.amount < 0 ? '−' : '+'}
        {formatCurrency(Math.abs(r.amount), r.currency)}
      </span>
    ),
  },
];

export function VatPayableModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<VatRow>
      title="VAT Payable — Reconciliation"
      queryKey="vat-payable"
      showDateRange={false}
      fetchRows={async (f) => {
        const [outputVat, purchases, remittances] = await Promise.all([
          fetchOutputVatTransactions({ branchId: f.branchId ?? branchId }),
          fetchPurchases({ branchId: f.branchId ?? branchId }),
          fetchVatRemittances(),
        ]);
        const output: VatRow[] = outputVat.map((r) => ({
          id: `out-${r.id}`,
          rowType: 'OUTPUT_VAT',
          reference: r.invoiceNumber,
          date: r.date,
          description: `Output VAT — ${r.customerName}`,
          amount: r.amount,
          currency: r.currencyCode,
        }));
        const input: VatRow[] = purchases
          // vatClaimable !== false matches the headline's own SQL filter
          // (WHERE vat_claimable IS NOT FALSE) — a purchase marked non-claimable
          // shouldn't reduce VAT Payable here even if it still has a stored
          // input/reverse-charge amount.
          .filter((p) => p.vatClaimable !== false)
          .filter(
            (p) => Number(p.inputVatAmount ?? 0) > 0 || Number(p.reverseChargeVatAmount ?? 0) > 0,
          )
          .map((p) => ({
            id: `in-${p.id}`,
            rowType: 'INPUT_VAT_CREDIT',
            reference: (p.lotId ?? p.id).slice(0, 8),
            date: p.createdAt,
            description: `Input${p.reverseChargeVatAmount ? '/RC' : ''} VAT credit — ${p.vendor?.name ?? 'Vendor'}`,
            amount: -(Number(p.inputVatAmount ?? 0) + Number(p.reverseChargeVatAmount ?? 0)),
            currency: p.currencyCode ?? 'AED',
          }));
        const remit: VatRow[] = remittances.map((r) => ({
          id: `rem-${r.id}`,
          rowType: 'REMITTANCE',
          reference: r.referenceNo ?? r.id.slice(0, 8),
          date: r.remittedDate,
          description: `Remitted to tax authority (period ${r.periodFrom?.slice(0, 10)} – ${r.periodTo?.slice(0, 10)})`,
          amount: -Number(r.amountRemitted),
          currency: 'AED',
        }));
        let out = [...output, ...input, ...remit];
        if (f.customerName) {
          const needle = f.customerName.toLowerCase();
          out = out.filter((r) => r.description.toLowerCase().includes(needle));
        }
        if (f.search) {
          const needle = f.search.toLowerCase();
          out = out.filter((r) => r.reference.toLowerCase().includes(needle));
        }
        if (f.amountMin) out = out.filter((r) => Math.abs(r.amount) >= Number(f.amountMin));
        if (f.amountMax) out = out.filter((r) => Math.abs(r.amount) <= Number(f.amountMax));
        return out.sort((a, b) => (a.date < b.date ? 1 : -1));
      }}
      columns={vatColumns}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currency}
      nameFilterLabel="Search description"
      searchFilterLabel="Reference"
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

// ─── 2004 Security Deposits Received ───────────────────────────────────────────

export function SecurityDepositsModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal
      title="Security Deposits Received"
      queryKey="security-deposits"
      fetchRows={(f) =>
        fetchSecurityDepositTransactions({ ...f, branchId: f.branchId ?? branchId })
      }
      columns={[
        {
          header: 'Contract Ref',
          render: (r) => <span className="font-mono text-xs text-blue-600">{r.invoiceNumber}</span>,
        },
        { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
        {
          header: 'Date Received',
          render: (r) => (
            <span className="font-mono text-xs text-muted-foreground">
              {(r.depositDate ?? r.date)?.slice(0, 10)}
            </span>
          ),
        },
        { header: 'Mode', render: (r) => <span className="text-xs">{r.depositMode ?? '—'}</span> },
        { header: 'Type', render: (r) => <span className="text-xs">{r.saleType}</span> },
        {
          header: 'Amount',
          align: 'right',
          render: (r) => (
            <span className="font-bold tabular-nums text-slate-800">
              {formatCurrency(r.amount, r.currencyCode)}
            </span>
          ),
        },
      ]}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      nameFilterLabel="Customer name"
      searchFilterLabel="Contract ref"
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

// ─── 2005 Deferred Revenue (memo) ──────────────────────────────────────────────

export function DeferredRevenueModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal
      title="Deferred Revenue (Memo — Unearned Advance)"
      queryKey="deferred-revenue"
      fetchRows={(f) =>
        fetchDeferredRevenueTransactions({ ...f, branchId: f.branchId ?? branchId })
      }
      columns={[
        {
          header: 'Contract Ref',
          render: (r) => <span className="font-mono text-xs text-blue-600">{r.invoiceNumber}</span>,
        },
        { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
        {
          header: 'Signed',
          render: (r) => (
            <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
          ),
        },
        { header: 'Type', render: (r) => <span className="text-xs">{r.saleType}</span> },
        {
          header: 'Advance',
          align: 'right',
          render: (r) => (
            <span className="tabular-nums text-xs">
              {formatCurrency(r.advanceAmount, r.currencyCode)}
            </span>
          ),
        },
        {
          header: 'Applied',
          align: 'right',
          render: (r) => (
            <span className="tabular-nums text-xs text-emerald-600">
              {formatCurrency(r.advanceAdjustedSoFar, r.currencyCode)}
            </span>
          ),
        },
        {
          header: 'Unearned',
          align: 'right',
          render: (r) => (
            <span className="font-bold tabular-nums text-slate-800">
              {formatCurrency(r.amount, r.currencyCode)}
            </span>
          ),
        },
      ]}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      nameFilterLabel="Customer name"
      searchFilterLabel="Contract ref"
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

// ─── 2006 Salary Payable ────────────────────────────────────────────────────────

const salaryPayableColumns: DrilldownColumn<ManualPayable>[] = [
  { header: 'Employee', render: (r) => <span className="text-sm font-medium">{r.payableTo}</span> },
  {
    header: 'Issue Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.issueDate?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Due Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.dueDate?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Status',
    render: (r) => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
        {r.status}
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(r.outstanding), r.currency)}
      </span>
    ),
  },
];

export function SalaryPayableModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<ManualPayable>
      title="Salary Payable"
      queryKey="salary-payable"
      fetchRows={async (f) => {
        const rows = await fetchManualPayables({
          type: 'SALARY_PAYABLE',
          branchId: f.branchId ?? branchId,
        });
        let out = rows.filter((r) => r.status !== 'PAID');
        if (f.customerName) {
          const needle = f.customerName.toLowerCase();
          out = out.filter((r) => r.payableTo.toLowerCase().includes(needle));
        }
        if (f.dateFrom) out = out.filter((r) => r.issueDate?.slice(0, 10) >= f.dateFrom!);
        if (f.dateTo) out = out.filter((r) => r.issueDate?.slice(0, 10) <= f.dateTo!);
        if (f.amountMin) out = out.filter((r) => Number(r.outstanding) >= Number(f.amountMin));
        if (f.amountMax) out = out.filter((r) => Number(r.outstanding) <= Number(f.amountMax));
        return out;
      }}
      columns={salaryPayableColumns}
      getAmount={(r) => Number(r.outstanding)}
      getCurrency={(r) => r.currency}
      nameFilterLabel="Employee name"
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

// ─── Node tree builder ─────────────────────────────────────────────────────────

export function buildLiabilitiesTree(liabilities: {
  accountsPayable: { balance: number };
  accruedExpenses: { balance: number };
  vatPayable: { balance: number };
  securityDepositsReceived: { balance: number };
  deferredRevenue: { balance: number; isMemo?: boolean };
  salaryPayable: { balance: number };
}): DrilldownNode[] {
  return [
    {
      key: 'ACCOUNTS_PAYABLE',
      label: 'Accounts Payable',
      amount: liabilities.accountsPayable.balance,
      viewable: true,
    },
    {
      key: 'ACCRUED_EXPENSES',
      label: 'Accrued Expenses',
      amount: liabilities.accruedExpenses.balance,
      viewable: true,
    },
    {
      key: 'VAT_PAYABLE',
      label: 'VAT Payable',
      amount: liabilities.vatPayable.balance,
      viewable: true,
    },
    {
      key: 'SECURITY_DEPOSITS',
      label: 'Security Deposits Received',
      amount: liabilities.securityDepositsReceived.balance,
      viewable: true,
    },
    {
      key: 'DEFERRED_REVENUE',
      label: 'Deferred Revenue',
      amount: liabilities.deferredRevenue.balance,
      viewable: true,
      note: 'Memo only — unearned advance on active Rent/Lease contracts, excluded from Total Liabilities',
    },
    {
      key: 'SALARY_PAYABLE',
      label: 'Salary Payable',
      amount: liabilities.salaryPayable.balance,
      viewable: true,
    },
  ];
}
