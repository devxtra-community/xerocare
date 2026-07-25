'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, FileText } from 'lucide-react';
import {
  getOutputTax,
  getInputTaxLocal,
  getInputTaxInternational,
  type TaxReportFilters,
  type OutputTaxRow,
  type InputTaxLocalRow,
  type InputTaxInternationalRow,
  type CountryBreakdownRow,
} from '@/lib/finance/accountsApi';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { fetchBranches, type Branch } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import StatementDialog, { type SnapshotStatementData } from '@/components/shared/StatementDialog';
import type { BranchInfo } from '@/components/shared/documentTemplate';
import { TaxLocationFilter } from '@/components/accounts/TaxLocationFilter';
import { TaxPeriodFilter } from '@/components/accounts/TaxPeriodFilter';
import { getTaxPeriodRange, type TaxPeriod } from '@/lib/finance/taxReportPeriod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TaxDocumentDialog from '@/components/finance/TaxDocumentDialog';

type Tab = 'output' | 'local' | 'international';

const TAB_LABELS: Record<Tab, string> = {
  output: 'Output Tax',
  local: 'Input Tax – Local',
  international: 'Input Tax – International',
};

const TAX_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  RECORDED: 'bg-blue-100 text-blue-700',
  FILED: 'bg-green-100 text-green-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TAX_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FilterBar({
  filters,
  onChange,
  isAdmin,
  branches,
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomDateChange,
}: {
  filters: TaxReportFilters;
  onChange: (f: Partial<TaxReportFilters>) => void;
  isAdmin: boolean;
  branches: { id: string; name: string }[];
  period: TaxPeriod;
  onPeriodChange: (p: TaxPeriod) => void;
  customFrom: string;
  customTo: string;
  onCustomDateChange: (delta: { customFrom?: string; customTo?: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TaxPeriodFilter
        period={period}
        onPeriodChange={onPeriodChange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={onCustomDateChange}
      />
      {isAdmin && (
        <select
          value={filters.branchIds ?? ''}
          onChange={(e) => onChange({ branchIds: e.target.value || undefined })}
          className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm h-10"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}
      <TaxLocationFilter
        value={{
          country: filters.country,
          stateProvince: filters.stateProvince,
          city: filters.city,
        }}
        onChange={onChange}
      />
    </div>
  );
}

function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
      <span>{total} records</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
        >
          ‹
        </button>
        <span className="px-3">
          {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function CountryBreakdownPanel({ breakdown }: { breakdown: CountryBreakdownRow[] }) {
  const currency = useBranchCurrency();
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!breakdown.length) return null;
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Bills by Country &amp; State / Emirate
      </div>
      <div className="divide-y">
        {breakdown.map((c) => (
          <div key={c.country}>
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50/40 transition-colors text-sm"
              onClick={() => setExpanded((prev) => (prev === c.country ? null : c.country))}
            >
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  {c.country}
                </span>
                <span className="text-muted-foreground font-normal">
                  {c.count} bill{c.count !== 1 ? 's' : ''}
                </span>
              </span>
              <span className="font-bold tabular-nums text-emerald-700">
                {formatCurrency(c.outputVat, currency)}
              </span>
            </button>
            {expanded === c.country && c.states.length > 0 && (
              <div className="bg-slate-50 divide-y border-t">
                {c.states.map((s) => (
                  <div
                    key={s.state}
                    className="flex items-center justify-between px-8 py-2 text-xs"
                  >
                    <span className="text-slate-600">
                      {s.state} —{' '}
                      <span className="text-muted-foreground">
                        {s.count} bill{s.count !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-700">
                      {formatCurrency(s.outputVat, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputTaxTab({
  filters,
  periodReady,
  onGenerate,
  branchInfo,
}: {
  filters: TaxReportFilters;
  branches: Branch[];
  periodReady: boolean;
  onGenerate: (type: 'output', row: OutputTaxRow) => void;
  branchInfo: BranchInfo;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const [showStatement, setShowStatement] = useState(false);
  const query = useQuery({
    queryKey: ['tax-output', filters, page],
    queryFn: () => getOutputTax({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
    enabled: periodReady,
  });

  const { rows = [], totals, pagination, countryBreakdown = [] } = query.data ?? {};

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Output Tax Report',
    periodFrom: filters.dateFrom,
    periodTo: filters.dateTo,
    sections: [
      {
        title: 'Output Tax — Invoices',
        rows: rows.map((r) => ({
          code: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
          label: `${r.invoiceNumber} — ${r.customerName ?? 'Unknown Customer'}`,
          value: formatCurrency(r.outputVat, r.currencyCode ?? currency),
        })),
      },
    ],
    summary: [
      { label: 'Bills', value: String(totals?.count ?? 0) },
      {
        label: 'Standard-Rated Taxable Amount',
        value: formatCurrency(
          totals?.standardTaxableAmount ?? totals?.totalTaxableAmount ?? 0,
          currency,
        ),
      },
      {
        label: 'Exempt Supplies',
        value: `${totals?.exemptCount ?? 0} bill(s), ${formatCurrency(totals?.exemptTaxableAmount ?? 0, currency)}`,
      },
      {
        label: 'Total Taxable Amount',
        value: formatCurrency(totals?.totalTaxableAmount ?? 0, currency),
      },
      {
        label: 'Total Output VAT',
        value: formatCurrency(totals?.totalOutputVat ?? 0, currency),
        bold: true,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          label="Bills"
          value={String(totals?.count ?? 0)}
          sub="invoices matching filters"
        />
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
        />
        <SummaryCard
          label="Total Output VAT"
          value={formatCurrency(totals?.totalOutputVat ?? 0, currency)}
        />
        <SummaryCard
          label="Exempt Supplies"
          value={formatCurrency(totals?.exemptTaxableAmount ?? 0, currency)}
          sub={`${totals?.exemptCount ?? 0} bill(s) — zero-rated, reported separately`}
        />
        <div className="flex items-center justify-end gap-2 col-span-2 sm:col-span-1">
          <button
            onClick={() => setShowStatement(true)}
            disabled={!rows.length}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </button>
        </div>
      </div>

      <CountryBreakdownPanel breakdown={countryBreakdown} />

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : query.isError ? (
          <p className="text-center py-12 text-red-500">Failed to load — try refreshing</p>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest">
                    Invoice No
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Customer
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    VAT No
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Country
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    State / Emirate
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    City
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Taxable Amt
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Tax %
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Output VAT
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Total
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Currency
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest">
                    Status
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      No output tax records in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: OutputTaxRow, i) => (
                    <TableRow
                      key={i}
                      className={`hover:bg-blue-50/40 ${r.isExempt ? 'bg-amber-50/40' : ''}`}
                    >
                      <TableCell className="pl-4 font-mono text-xs">{r.invoiceNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.customerName ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.customerVatNumber ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.customerCountry ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.customerStateProvince ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.customerCity ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.taxableAmount, r.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {r.isExempt ? (
                          <span className="px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-semibold">
                            Exempt
                          </span>
                        ) : r.taxPercent != null ? (
                          `${r.taxPercent}%`
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-700">
                        {formatCurrency(r.outputVat, r.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold">
                        {formatCurrency(r.totalInvoice, r.currencyCode)}
                      </TableCell>
                      <TableCell className="text-xs">{r.currencyCode ?? '—'}</TableCell>
                      <TableCell className="pr-4">{r.status}</TableCell>
                      <TableCell className="pr-4">
                        <button
                          onClick={() => onGenerate('output', r)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <FileText size={12} /> Generate
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

function InputTaxLocalTab({
  filters,
  periodReady,
  onGenerate,
  branchInfo,
}: {
  filters: TaxReportFilters;
  branches: Branch[];
  periodReady: boolean;
  onGenerate: (type: 'local', row: InputTaxLocalRow) => void;
  branchInfo: BranchInfo;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const [showStatement, setShowStatement] = useState(false);
  const query = useQuery({
    queryKey: ['tax-input-local', filters, page],
    queryFn: () => getInputTaxLocal({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
    enabled: periodReady,
  });

  const { rows = [], totals, pagination } = query.data ?? {};

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Input Tax Report (Local)',
    periodFrom: filters.dateFrom,
    periodTo: filters.dateTo,
    sections: [
      {
        title: 'Input Tax — Local Purchases',
        rows: rows.map((r) => ({
          code: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
          label: `${r.vendorName} — ${r.purchaseCategory ?? ''}`,
          value: formatCurrency(r.inputVatAmount ?? 0, r.currencyCode ?? currency),
        })),
      },
    ],
    summary: [
      { label: 'Bills', value: String(totals?.count ?? 0) },
      {
        label: 'Total Taxable Amount',
        value: formatCurrency(totals?.totalTaxableAmount ?? 0, currency),
      },
      {
        label: 'Total Input VAT',
        value: formatCurrency(totals?.totalInputVat ?? 0, currency),
        bold: true,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Bills"
          value={String(totals?.count ?? 0)}
          sub="purchases matching filters"
        />
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
        />
        <SummaryCard
          label="Total Input VAT"
          value={formatCurrency(totals?.totalInputVat ?? 0, currency)}
        />
        <div className="flex items-center justify-end gap-2 col-span-2 sm:col-span-1">
          <button
            onClick={() => setShowStatement(true)}
            disabled={!rows.length}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : query.isError ? (
          <p className="text-center py-12 text-red-500">Failed to load — try refreshing</p>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Vendor
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    VAT No
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Country
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    State
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    City
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Category
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Taxable Amt
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Tax %
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Input VAT
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Claimable
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest">
                    Status
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      No local input tax records in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: InputTaxLocalRow, i) => (
                    <TableRow key={i} className="hover:bg-blue-50/40">
                      <TableCell className="pl-4 text-xs text-muted-foreground">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.vendorName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.vendorVatNumber ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.vendorCountry ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.vendorStateProvince ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.vendorCity ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.purchaseCategory ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {r.taxableAmount != null
                          ? formatCurrency(r.taxableAmount, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {r.taxPercent != null ? `${r.taxPercent}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-600">
                        {r.inputVatAmount != null
                          ? formatCurrency(r.inputVatAmount, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${r.vatClaimable ? 'text-green-700' : 'text-gray-400'}`}
                        >
                          {r.vatClaimable ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={r.taxStatus} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <button
                          onClick={() => onGenerate('local', r)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <FileText size={12} /> Generate
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

function InputTaxInternationalTab({
  filters,
  periodReady,
  onGenerate,
  branchInfo,
}: {
  filters: TaxReportFilters;
  branches: Branch[];
  periodReady: boolean;
  onGenerate: (type: 'international', row: InputTaxInternationalRow) => void;
  branchInfo: BranchInfo;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const [showStatement, setShowStatement] = useState(false);
  const query = useQuery({
    queryKey: ['tax-input-intl', filters, page],
    queryFn: () => getInputTaxInternational({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
    enabled: periodReady,
  });

  const { rows = [], totals, pagination } = query.data ?? {};

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Input Tax Report (International / Reverse Charge)',
    periodFrom: filters.dateFrom,
    periodTo: filters.dateTo,
    sections: [
      {
        title: 'Input Tax — International Purchases',
        rows: rows.map((r) => ({
          code: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
          label: `${r.supplierName} — ${r.goodsOrService ?? ''}`,
          value: formatCurrency(r.importVatReverseCharge ?? 0, r.currencyCode ?? currency),
        })),
      },
    ],
    summary: [
      { label: 'Bills', value: String(totals?.count ?? 0) },
      {
        label: 'Total Taxable Amount',
        value: formatCurrency(totals?.totalTaxableAmount ?? 0, currency),
      },
      {
        label: 'Total Reverse Charge VAT',
        value: formatCurrency(totals?.totalReverseChargeVat ?? 0, currency),
        bold: true,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Bills"
          value={String(totals?.count ?? 0)}
          sub="purchases matching filters"
        />
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
        />
        <SummaryCard
          label="Total Reverse Charge VAT"
          value={formatCurrency(totals?.totalReverseChargeVat ?? 0, currency)}
        />
        <div className="flex items-center justify-end gap-2 col-span-2 sm:col-span-1">
          <button
            onClick={() => setShowStatement(true)}
            disabled={!rows.length}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : query.isError ? (
          <p className="text-center py-12 text-red-500">Failed to load — try refreshing</p>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest">
                    Import Inv No
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Supplier
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Country
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    State
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    City
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Type
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Taxable Amt
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Rev. Charge VAT
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Customs Entry No
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Customs Duty
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Shipping Cost
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">
                    Labour Cost
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Currency
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Claimable
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest">
                    Status
                  </TableHead>
                  <TableHead className="pr-4 text-[10px] font-bold uppercase tracking-widest"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-12 text-muted-foreground">
                      No international input tax records in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: InputTaxInternationalRow, i) => (
                    <TableRow key={i} className="hover:bg-blue-50/40">
                      <TableCell className="pl-4 font-mono text-xs">
                        {r.importInvoiceNo ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.supplierName}</TableCell>
                      <TableCell className="text-xs">{r.supplierCountry ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.supplierStateProvince ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.supplierCity ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.goodsOrService ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {r.taxableAmount != null
                          ? formatCurrency(r.taxableAmount, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-orange-600">
                        {r.importVatReverseCharge != null
                          ? formatCurrency(r.importVatReverseCharge, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.customsEntryNo ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.customsDuty != null
                          ? formatCurrency(r.customsDuty, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.shippingCost != null
                          ? formatCurrency(r.shippingCost, r.currencyCode)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.labourCost != null ? formatCurrency(r.labourCost, r.currencyCode) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.currencyCode ?? '—'}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${r.vatClaimable ? 'text-green-700' : 'text-gray-400'}`}
                        >
                          {r.vatClaimable ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={r.taxStatus} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <button
                          onClick={() => onGenerate('international', r)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <FileText size={12} /> Generate
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

type DialogState =
  | { type: 'output'; row: OutputTaxRow }
  | { type: 'local'; row: InputTaxLocalRow }
  | { type: 'international'; row: InputTaxInternationalRow }
  | null;

export default function TaxReportPage() {
  const user = getUserFromToken();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('output');
  const [filters, setFilters] = useState<TaxReportFilters>({});
  const [docDialog, setDocDialog] = useState<DialogState>(null);
  // Period preset — same idiom as income-statement / cash-flow. Defaults to
  // This Month, matching the convention on those sibling report pages.
  const [period, setPeriod] = useState<TaxPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 600_000,
  });

  const { from: periodFrom, to: periodTo } = useMemo(
    () => getTaxPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const mergedFilters = useMemo((): TaxReportFilters => {
    const withPeriod: TaxReportFilters = { ...filters, dateFrom: periodFrom, dateTo: periodTo };
    if (!isAdmin && user?.branchId) {
      return { ...withPeriod, branchId: user.branchId, branchIds: undefined };
    }
    return withPeriod;
  }, [filters, periodFrom, periodTo, isAdmin, user?.branchId]);

  const handleFilterChange = (delta: Partial<TaxReportFilters>) => {
    setFilters((f) => ({ ...f, ...delta }));
  };

  const handleCustomDateChange = (delta: { customFrom?: string; customTo?: string }) => {
    if (delta.customFrom !== undefined) setCustomFrom(delta.customFrom);
    if (delta.customTo !== undefined) setCustomTo(delta.customTo);
  };

  // Guard against firing a query with an empty date range while the user is
  // still picking a Custom period — same pattern as income-statement.tsx.
  const periodReady = period !== 'custom' || (!!customFrom && !!customTo);

  const activeBranch = useMemo(() => {
    if (!user?.branchId) return branches[0];
    return branches.find((b) => b.id === user.branchId) ?? branches[0];
  }, [branches, user?.branchId]);

  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
    currency: activeBranch?.currency,
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Tax Report</h3>
          <p className="text-muted-foreground text-sm">
            VAT compliance — Output vs Input tax by period
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          isAdmin={isAdmin}
          branches={branches}
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomDateChange={handleCustomDateChange}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(Object.entries(TAB_LABELS) as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'output' && (
        <OutputTaxTab
          filters={mergedFilters}
          branches={branches}
          periodReady={periodReady}
          onGenerate={(type, row) => setDocDialog({ type, row })}
          branchInfo={branchInfo}
        />
      )}
      {activeTab === 'local' && (
        <InputTaxLocalTab
          filters={mergedFilters}
          branches={branches}
          periodReady={periodReady}
          onGenerate={(type, row) => setDocDialog({ type, row })}
          branchInfo={branchInfo}
        />
      )}
      {activeTab === 'international' && (
        <InputTaxInternationalTab
          filters={mergedFilters}
          branches={branches}
          periodReady={periodReady}
          onGenerate={(type, row) => setDocDialog({ type, row })}
          branchInfo={branchInfo}
        />
      )}

      {docDialog && (
        <TaxDocumentDialog
          open
          onOpenChange={(o) => {
            if (!o) setDocDialog(null);
          }}
          data={docDialog}
          branch={branchInfo}
        />
      )}
    </div>
  );
}
