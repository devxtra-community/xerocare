'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download, RefreshCw, FileText } from 'lucide-react';
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
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TaxDocumentDialog from '@/components/finance/TaxDocumentDialog';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';

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
  onGenerate,
}: {
  filters: TaxReportFilters;
  onGenerate: (type: 'output', row: OutputTaxRow) => void;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-tax-output', filters, page],
    queryFn: () => getOutputTax({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const { rows = [], totals, pagination, countryBreakdown = [] } = query.data ?? {};

  const exportExcel = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        'Invoice No': r.invoiceNumber,
        Date: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
        'Customer Name': r.customerName ?? '',
        'Customer VAT No': r.customerVatNumber ?? '',
        Country: r.customerCountry ?? '',
        'State / Emirate': r.customerStateProvince ?? '',
        City: r.customerCity ?? '',
        'Taxable Amount': r.taxableAmount,
        'Tax %': r.taxPercent ?? '',
        'Tax Name': r.taxName ?? '',
        'Output VAT': r.outputVat,
        'Total Invoice': r.totalInvoice,
        Currency: r.currencyCode ?? '',
        Status: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Output Tax');
    XLSX.writeFile(wb, `Output_Tax_${filters.dateFrom ?? ''}_${filters.dateTo ?? ''}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
          sub={`${totals?.count ?? 0} invoices`}
        />
        <SummaryCard
          label="Total Output VAT"
          value={formatCurrency(totals?.totalOutputVat ?? 0, currency)}
        />
        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export Excel
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
                  {[
                    'Invoice No',
                    'Date',
                    'Customer',
                    'VAT No',
                    'Country',
                    'State',
                    'City',
                    'Taxable Amt',
                    'Tax %',
                    'Output VAT',
                    'Total',
                    'Currency',
                    'Status',
                    '',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[10px] font-bold uppercase tracking-widest pl-4"
                    >
                      {h}
                    </TableHead>
                  ))}
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
                    <TableRow key={i} className="hover:bg-blue-50/40">
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
                        {r.taxPercent != null ? `${r.taxPercent}%` : '—'}
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
    </div>
  );
}

function InputTaxLocalTab({
  filters,
  onGenerate,
}: {
  filters: TaxReportFilters;
  onGenerate: (type: 'local', row: InputTaxLocalRow) => void;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-tax-input-local', filters, page],
    queryFn: () => getInputTaxLocal({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const { rows = [], totals, pagination } = query.data ?? {};

  const exportExcel = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Date: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
        Branch: r.branch,
        Vendor: r.vendorName,
        'Vendor VAT No': r.vendorVatNumber ?? '',
        Country: r.vendorCountry ?? '',
        'State / Emirate': r.vendorStateProvince ?? '',
        City: r.vendorCity ?? '',
        Category: r.purchaseCategory ?? '',
        'Taxable Amount': r.taxableAmount ?? '',
        'Tax %': r.taxPercent ?? '',
        'Tax Name': r.taxName ?? '',
        'Input VAT': r.inputVatAmount ?? '',
        'Total Amount': r.totalAmount,
        Currency: r.currencyCode ?? '',
        'VAT Claimable': r.vatClaimable ? 'Yes' : 'No',
        'Tax Status': r.taxStatus,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Input Tax Local');
    XLSX.writeFile(wb, `Input_Tax_Local_${filters.dateFrom ?? ''}_${filters.dateTo ?? ''}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
          sub={`${totals?.count ?? 0} purchases`}
        />
        <SummaryCard
          label="Total Input VAT"
          value={formatCurrency(totals?.totalInputVat ?? 0, currency)}
        />
        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export Excel
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
                  {[
                    'Date',
                    'Vendor',
                    'VAT No',
                    'Country',
                    'State',
                    'City',
                    'Category',
                    'Taxable Amt',
                    'Tax %',
                    'Input VAT',
                    'Claimable',
                    'Status',
                    '',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[10px] font-bold uppercase tracking-widest pl-4"
                    >
                      {h}
                    </TableHead>
                  ))}
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
    </div>
  );
}

function InputTaxInternationalTab({
  filters,
  onGenerate,
}: {
  filters: TaxReportFilters;
  onGenerate: (type: 'international', row: InputTaxInternationalRow) => void;
}) {
  const currency = useBranchCurrency();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-tax-input-intl', filters, page],
    queryFn: () => getInputTaxInternational({ ...filters, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const { rows = [], totals, pagination } = query.data ?? {};

  const exportExcel = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Date: r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString() : '',
        Supplier: r.supplierName,
        Country: r.supplierCountry ?? '',
        'State / Emirate': r.supplierStateProvince ?? '',
        City: r.supplierCity ?? '',
        'Goods/Service': r.goodsOrService ?? '',
        'Taxable Amount': r.taxableAmount ?? '',
        'Import VAT': r.importVatReverseCharge ?? '',
        'Customs Duty': r.customsDuty ?? '',
        Currency: r.currencyCode ?? '',
        'VAT Claimable': r.vatClaimable ? 'Yes' : 'No',
        Status: r.taxStatus,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Input Tax International');
    XLSX.writeFile(
      wb,
      `Input_Tax_International_${filters.dateFrom ?? ''}_${filters.dateTo ?? ''}.xlsx`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Taxable Amount"
          value={formatCurrency(totals?.totalTaxableAmount ?? 0, currency)}
          sub={`${totals?.count ?? 0} bills`}
        />
        <SummaryCard
          label="Total Import VAT"
          value={formatCurrency(totals?.totalImportVat ?? 0, currency)}
        />
        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export Excel
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
                  {[
                    'Date',
                    'Supplier',
                    'Country',
                    'State',
                    'City',
                    'Goods/Service',
                    'Taxable Amt',
                    'Import VAT',
                    'Customs',
                    'Currency',
                    'Claimable',
                    'Status',
                    '',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[10px] font-bold uppercase tracking-widest pl-4"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      No international input tax records in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: InputTaxInternationalRow, i) => (
                    <TableRow key={i} className="hover:bg-blue-50/40">
                      <TableCell className="pl-4 text-xs text-muted-foreground">
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
                      <TableCell className="text-right text-sm">
                        {r.customsDuty != null
                          ? formatCurrency(r.customsDuty, r.currencyCode)
                          : '—'}
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
    </div>
  );
}

type DialogState =
  | { type: 'output'; row: OutputTaxRow }
  | { type: 'local'; row: InputTaxLocalRow }
  | { type: 'international'; row: InputTaxInternationalRow }
  | null;

function TaxContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';

  const [activeTab, setActiveTab] = useState<Tab>('output');
  const [filters, setFilters] = useState<TaxReportFilters>({});
  const [docDialog, setDocDialog] = useState<DialogState>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 600_000,
  });

  const mergedFilters = useMemo((): TaxReportFilters => {
    return { ...filters, branchIds: branchIds || filters.branchIds };
  }, [filters, branchIds]);

  const handleFilterChange = (delta: Partial<TaxReportFilters>) => {
    setFilters((f) => ({ ...f, ...delta }));
  };

  const activeBranch = useMemo(() => {
    if (branchIds && !branchIds.includes(',')) {
      return branches.find((b) => b.id === branchIds) ?? branches[0];
    }
    return branches[0];
  }, [branches, branchIds]);

  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
    currency: activeBranch?.currency,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
            className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
            className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm"
          />
          <input
            type="text"
            value={filters.country ?? ''}
            onChange={(e) =>
              handleFilterChange({
                country: e.target.value || undefined,
                stateProvince: undefined,
                city: undefined,
              })
            }
            placeholder="Country (ISO)"
            maxLength={2}
            className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm w-32 uppercase"
          />
          {filters.country && (
            <input
              type="text"
              value={filters.stateProvince ?? ''}
              onChange={(e) =>
                handleFilterChange({ stateProvince: e.target.value || undefined, city: undefined })
              }
              placeholder="State / Emirate"
              className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm w-36"
            />
          )}
          {filters.country && (
            <input
              type="text"
              value={filters.city ?? ''}
              onChange={(e) => handleFilterChange({ city: e.target.value || undefined })}
              placeholder="City"
              className="rounded-lg border px-3 py-2 text-sm bg-white shadow-sm w-32"
            />
          )}
        </div>
      </div>

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

      {activeTab === 'output' && (
        <OutputTaxTab
          filters={mergedFilters}
          onGenerate={(type, row) => setDocDialog({ type, row })}
        />
      )}
      {activeTab === 'local' && (
        <InputTaxLocalTab
          filters={mergedFilters}
          onGenerate={(type, row) => setDocDialog({ type, row })}
        />
      )}
      {activeTab === 'international' && (
        <InputTaxInternationalTab
          filters={mergedFilters}
          onGenerate={(type, row) => setDocDialog({ type, row })}
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

export default function AdminTaxPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Tax Report</h3>
          <p className="text-muted-foreground text-sm">VAT compliance — across branches</p>
        </div>
        <Suspense>
          <BranchFilterBar />
        </Suspense>
      </div>
      <Suspense>
        <TaxContent />
      </Suspense>
    </div>
  );
}
