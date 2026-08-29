'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Eye, X, Search } from 'lucide-react';
import {
  fetchRevenueTransactions,
  RENT_PLAN_TYPES,
  RENT_PLAN_TYPE_LABELS,
  type RevenueBreakdown,
  type RevenueTransactionRow,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Generic expandable drill-down tree ────────────────────────────────────────
// One shared node/tree shape used by every Chart of Accounts section (Revenue,
// Expenses, Liabilities, Equity) — nothing in here is revenue-specific.

export interface DrilldownNode {
  key: string; // opaque identifier the owning section interprets (category param, etc.)
  label: string;
  amount: number;
  children?: DrilldownNode[];
  viewable?: boolean;
  note?: string; // small explanatory sub-text, e.g. for memo/placeholder lines
}

interface DrilldownTreeProps {
  node: DrilldownNode;
  currency: string;
  depth?: number;
  onView: (node: DrilldownNode) => void;
}

export function DrilldownTree({ node, currency, depth = 0, onView }: DrilldownTreeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = !!node.children?.length;

  return (
    <>
      <div
        className="grid grid-cols-12 px-5 py-3 items-center hover:bg-blue-50/50 transition-colors text-sm"
        style={{ paddingLeft: depth > 0 ? `${20 + depth * 20}px` : undefined }}
      >
        <span className="col-span-6 font-medium text-slate-800 flex items-center gap-1.5">
          {hasChildren ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-muted-foreground hover:text-slate-700"
            >
              {open ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}
          <span>
            {node.label}
            {node.note && (
              <span className="block text-[11px] font-normal text-muted-foreground">
                {node.note}
              </span>
            )}
          </span>
        </span>
        <span className="col-span-5 text-right font-bold tabular-nums text-slate-800">
          {formatCurrency(node.amount, currency)}
        </span>
        <span className="col-span-1 text-right">
          {node.viewable && (
            <button
              onClick={() => onView(node)}
              title="View transactions"
              className="p-1 rounded hover:bg-blue-100 text-blue-600 inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
          )}
        </span>
      </div>
      {hasChildren && open && (
        <div className="divide-y divide-border/60 bg-muted/10">
          {node.children!.map((child) => (
            <DrilldownTree
              key={child.key}
              node={child}
              currency={currency}
              depth={depth + 1}
              onView={onView}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Generic filterable transaction-detail modal ───────────────────────────────
// One shared "View" modal shape used by every section's drill-down. Each usage
// site supplies its own row type, fetch function, and column definitions; the
// modal itself owns the filter UI (name search, reference search, date range,
// amount range, admin branch filter) and reactive querying.

export interface DrilldownColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export interface DrilldownFilters {
  customerName?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
  branchId?: string;
}

export interface DrilldownModalProps<T> {
  title: string;
  queryKey: string;
  fetchRows: (filters: DrilldownFilters) => Promise<T[]>;
  columns: DrilldownColumn<T>[];
  getAmount: (row: T) => number;
  getCurrency: (row: T) => string;
  nameFilterLabel?: string; // omit to hide this filter, e.g. "Customer Name", "Vendor Name"
  searchFilterLabel?: string; // omit to hide, e.g. "Invoice #", "PO Reference"
  showDateRange?: boolean;
  showAmountRange?: boolean;
  periodFrom?: string;
  periodTo?: string;
  /**
   * Whether the date-range filter starts pre-filled with periodFrom/periodTo.
   * Default true — correct for income/expense drill-downs, since periodFrom/periodTo
   * is literally "Period for Income & Expenses" on the page these are opened from.
   * Balance-sheet-style lines (assets/liabilities/equity — point-in-time balances,
   * not period activity) must pass false: pre-seeding them with an unrelated period
   * silently excludes real balances the headline figure (which is never period-bound)
   * still counts in full, so the drill-down total quietly stops matching the headline
   * the moment the page's period is narrowed or enough time passes. The date-range
   * inputs (if showDateRange is true) remain available either way — this only
   * controls what they start at.
   */
  seedDateRangeFromPeriod?: boolean;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}

export function DrilldownModal<T>({
  title,
  queryKey,
  fetchRows,
  columns,
  getAmount,
  getCurrency,
  nameFilterLabel,
  searchFilterLabel,
  showDateRange = true,
  showAmountRange = true,
  periodFrom,
  periodTo,
  seedDateRangeFromPeriod = true,
  branchId,
  isAdmin,
  branches = [],
  onClose,
}: DrilldownModalProps<T>) {
  const [customerName, setCustomerName] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(seedDateRangeFromPeriod ? (periodFrom ?? '') : '');
  const [dateTo, setDateTo] = useState(seedDateRangeFromPeriod ? (periodTo ?? '') : '');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [branchFilter, setBranchFilter] = useState(branchId ?? '');

  const { data: rows = [], isLoading } = useQuery<T[]>({
    queryKey: [
      queryKey,
      dateFrom,
      dateTo,
      customerName,
      search,
      amountMin,
      amountMax,
      branchFilter,
    ],
    queryFn: () =>
      fetchRows({
        customerName: customerName || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        amountMin: amountMin || undefined,
        amountMax: amountMax || undefined,
        branchId: isAdmin && branchFilter ? branchFilter : undefined,
      }),
  });

  const total = rows.reduce((s, r) => s + getAmount(r), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-slate-800">{title} — Transactions</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} transaction{rows.length === 1 ? '' : 's'}
              {rows.length > 0 && <> · Total {formatCurrency(total, getCurrency(rows[0]))}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2 items-end bg-muted/20">
          {nameFilterLabel && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={nameFilterLabel}
                className="pl-8 h-9 w-44 text-sm"
              />
            </div>
          )}
          {searchFilterLabel && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchFilterLabel}
              className="h-9 w-36 text-sm"
            />
          )}
          {showDateRange && (
            <>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 px-2 rounded-md border border-border text-sm bg-background"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 px-2 rounded-md border border-border text-sm bg-background"
                />
              </label>
            </>
          )}
          {showAmountRange && (
            <>
              <Input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="Min amount"
                className="h-9 w-28 text-sm"
              />
              <Input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="Max amount"
                className="h-9 w-28 text-sm"
              />
            </>
          )}
          {isAdmin && (
            <Select
              value={branchFilter || '__ALL__'}
              onValueChange={(v) => setBranchFilter(v === '__ALL__' ? '' : v)}
            >
              <SelectTrigger className="h-9 border-orange-200 text-sm bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  {columns.map((c) => (
                    <TableHead
                      key={c.header}
                      className={`text-[10px] font-bold uppercase tracking-widest ${c.align === 'right' ? 'text-right' : ''}`}
                    >
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-16 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell
                          key={c.header}
                          className={c.align === 'right' ? 'text-right' : undefined}
                        >
                          {c.render(r)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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

// ─── Revenue-specific: node tree + column config (one configuration of the
// generic components above — see Expenses/Liabilities/Equity drilldown files
// for the other configurations of the same DrilldownTree/DrilldownModal). ────

export function buildRevenueTree(breakdown: RevenueBreakdown): {
  sale: DrilldownNode;
  rent: DrilldownNode;
  lease: DrilldownNode;
} {
  const rentChildren = (prefix: string, byPlanType: Record<string, number>): DrilldownNode[] =>
    RENT_PLAN_TYPES.map((pt) => ({
      key: `${prefix}${pt}`,
      label: RENT_PLAN_TYPE_LABELS[pt],
      amount: byPlanType[pt] ?? 0,
      viewable: true,
    }));

  return {
    sale: {
      key: 'SALE',
      label: 'Sale Revenue',
      amount: breakdown.sale.total,
      children: [
        {
          key: 'PRODUCT_SALE',
          label: 'Product Sale',
          amount: breakdown.sale.productSale,
          viewable: true,
        },
        {
          key: 'SPAREPART_SALE',
          label: 'Spare Part Sale',
          amount: breakdown.sale.sparePartSale,
          viewable: true,
        },
      ],
    },
    rent: {
      key: 'RENT',
      label: 'Rent Revenue',
      amount: breakdown.rent.total,
      children: rentChildren('RENT_', breakdown.rent.byPlanType),
    },
    lease: {
      key: 'LEASE',
      label: 'Lease Revenue',
      amount: breakdown.lease.total,
      children: [
        { key: 'LEASE_EMI', label: 'EMI', amount: breakdown.lease.emi, viewable: true },
        {
          key: 'LEASE_FSM',
          label: 'FSM (Full Service Maintenance)',
          amount: breakdown.lease.fsm.total,
          children: rentChildren('LEASE_FSM_', breakdown.lease.fsm.byPlanType),
        },
      ],
    },
  };
}

const isRentOrLeaseCategory = (key: string) => key.startsWith('RENT_') || key.startsWith('LEASE_');

const revenueColumns = (isRentLease: boolean): DrilldownColumn<RevenueTransactionRow>[] => [
  {
    header: 'Invoice #',
    render: (r) => (
      <span className="font-mono text-xs text-blue-600 font-bold">{r.invoiceNumber}</span>
    ),
  },
  { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  ...(isRentLease
    ? ([
        {
          header: 'Type / Period',
          render: (r: RevenueTransactionRow) =>
            r.rowType === 'ADVANCE' ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Advance (Signing)
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {r.rentPeriod ?? 'MONTHLY'} · {r.billingPeriodStart?.slice(0, 10)} →{' '}
                {r.billingPeriodEnd?.slice(0, 10)}
              </span>
            ),
        },
        {
          header: 'Usage',
          render: (r: RevenueTransactionRow) =>
            r.rowType === 'USAGE_PERIOD' ? (
              <div className="space-y-0.5 text-xs">
                <div>Base: {formatCurrency(r.baseCharge ?? 0, r.currencyCode)}</div>
                {(r.exceededCharge ?? 0) > 0 && (
                  <div className="text-orange-600">
                    Excess: {formatCurrency(r.exceededCharge ?? 0, r.currencyCode)}
                  </div>
                )}
                {r.meterReadings && (
                  <div className="text-muted-foreground">
                    BW A4/A3: {r.meterReadings.bwA4Count}/{r.meterReadings.bwA3Count} · Color A4/A3:{' '}
                    {r.meterReadings.colorA4Count}/{r.meterReadings.colorA3Count}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
        },
      ] as DrilldownColumn<RevenueTransactionRow>[])
    : []),
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

interface RevenueDetailModalProps {
  node: DrilldownNode;
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}

export function RevenueDetailModal({
  node,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: RevenueDetailModalProps) {
  const isRentLease = isRentOrLeaseCategory(node.key);
  return (
    <DrilldownModal<RevenueTransactionRow>
      title={node.label}
      queryKey="revenue-transactions"
      fetchRows={(f) =>
        fetchRevenueTransactions({
          category: node.key,
          periodFrom: f.dateFrom,
          periodTo: f.dateTo,
          customerName: f.customerName,
          search: f.search,
          amountMin: f.amountMin,
          amountMax: f.amountMax,
          branchId: f.branchId,
        })
      }
      columns={revenueColumns(isRentLease)}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      nameFilterLabel="Customer name"
      searchFilterLabel="Invoice #"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}
