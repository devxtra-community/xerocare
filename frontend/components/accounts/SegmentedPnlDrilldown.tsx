'use client';

import React from 'react';
import { DrilldownModal, type DrilldownColumn, type DrilldownFilters } from './RevenueDrilldown';
import {
  fetchSegmentProductDetail,
  fetchSegmentContractDetail,
  type ProductSaleRow,
  type ContractPnlRow,
  type CostBasis,
} from '@/lib/finance/segmentedPnlApi';
import { formatCurrency } from '@/lib/format';

export function CostBasisBadge({ basis }: { basis: CostBasis }) {
  const styles: Record<CostBasis, string> = {
    ACTUAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    APPROXIMATE: 'bg-amber-50 text-amber-700 border-amber-200',
    UNAVAILABLE: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const labels: Record<CostBasis, string> = {
    ACTUAL: 'Actual',
    APPROXIMATE: 'Approx.',
    UNAVAILABLE: 'Not available',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${styles[basis]}`}>
      {labels[basis]}
    </span>
  );
}

interface CommonProps {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  currency: string;
  onClose: () => void;
}

// ─── Per-product / per-spare-part drill-down (Product Sale / Spare Part Sale) ──
// One row per invoice line item actually sold — the exact units behind the
// segment's own Direct Cost figure, not a re-aggregation of it.

function filterProductRows(rows: ProductSaleRow[], f: DrilldownFilters): ProductSaleRow[] {
  let out = rows;
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter(
      (r) =>
        r.customerName.toLowerCase().includes(needle) || r.itemLabel.toLowerCase().includes(needle),
    );
  }
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.invoiceNumber.toLowerCase().includes(needle) ||
        (r.serialNumber ?? '').toLowerCase().includes(needle),
    );
  }
  if (f.amountMin) out = out.filter((r) => r.revenue >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((r) => r.revenue <= Number(f.amountMax));
  return out;
}

function buildProductColumns(currency: string): DrilldownColumn<ProductSaleRow>[] {
  return [
    {
      header: 'Item',
      render: (r) => (
        <div>
          <div className="text-sm font-medium">{r.itemLabel}</div>
          {r.serialNumber && (
            <div className="text-[11px] font-mono text-muted-foreground">{r.serialNumber}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Invoice #',
      render: (r) => <span className="font-mono text-xs text-blue-600">{r.invoiceNumber}</span>,
    },
    { header: 'Customer', render: (r) => <span className="text-sm">{r.customerName}</span> },
    {
      header: 'Date',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
      ),
    },
    {
      header: 'Qty',
      align: 'right',
      render: (r) => <span className="text-xs tabular-nums">{r.quantity}</span>,
    },
    {
      header: 'Revenue',
      align: 'right',
      render: (r) => (
        <span className="text-xs tabular-nums">{formatCurrency(r.revenue, currency)}</span>
      ),
    },
    {
      header: 'Cost',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <CostBasisBadge basis={r.costBasis} />
          <span className="text-xs tabular-nums">{formatCurrency(r.cost, currency)}</span>
        </div>
      ),
    },
    {
      header: 'Profit',
      align: 'right',
      render: (r) => (
        <span
          className={`font-bold tabular-nums ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {formatCurrency(r.profit, currency)}
        </span>
      ),
    },
  ];
}

export function SegmentProductModal({
  segmentKey,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  currency,
  onClose,
}: { segmentKey: 'PRODUCT_SALE' | 'SPAREPART_SALE' } & CommonProps) {
  return (
    <DrilldownModal<ProductSaleRow>
      title={
        segmentKey === 'PRODUCT_SALE' ? 'Product Sale — By Unit Sold' : 'Spare Part Sale — By Part'
      }
      queryKey={`segment-products-${segmentKey}`}
      showDateRange={false}
      fetchRows={async (f) => {
        const rows = await fetchSegmentProductDetail({
          segmentKey,
          periodFrom,
          periodTo,
          branchId: f.branchId ?? branchId,
        });
        return filterProductRows(rows, f);
      }}
      columns={buildProductColumns(currency)}
      getAmount={(r) => r.revenue}
      getCurrency={() => currency}
      nameFilterLabel="Product / customer name"
      searchFilterLabel="Invoice # / serial #"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── Per-contract drill-down (Rent / Lease sub-types) ──────────────────────────
// One row per contract in the segment — its own period revenue, allocated
// machine (if any), and that machine's own direct cost.

function filterContractRows(rows: ContractPnlRow[], f: DrilldownFilters): ContractPnlRow[] {
  let out = rows;
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter(
      (r) =>
        r.customerName.toLowerCase().includes(needle) ||
        (r.machineLabel ?? '').toLowerCase().includes(needle),
    );
  }
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.invoiceNumber.toLowerCase().includes(needle) ||
        (r.serialNumber ?? '').toLowerCase().includes(needle),
    );
  }
  if (f.amountMin) out = out.filter((r) => r.revenue >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((r) => r.revenue <= Number(f.amountMax));
  return out;
}

function buildContractColumns(currency: string): DrilldownColumn<ContractPnlRow>[] {
  return [
    {
      header: 'Invoice / Contract #',
      render: (r) => <span className="font-mono text-xs text-blue-600">{r.invoiceNumber}</span>,
    },
    {
      header: 'Customer',
      render: (r) => <span className="text-sm font-medium">{r.customerName}</span>,
    },
    {
      header: 'Allocated Machine',
      render: (r) =>
        r.machineLabel ? (
          <div>
            <div className="text-sm">{r.machineLabel}</div>
            {r.serialNumber && (
              <div className="text-[11px] font-mono text-muted-foreground">{r.serialNumber}</div>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">None allocated</span>
        ),
    },
    {
      header: 'Revenue (period)',
      align: 'right',
      render: (r) => (
        <span className="text-xs tabular-nums">{formatCurrency(r.revenue, currency)}</span>
      ),
    },
    {
      header: 'Direct Cost',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <CostBasisBadge basis={r.costBasis} />
          <span className="text-xs tabular-nums">{formatCurrency(r.directCost, currency)}</span>
        </div>
      ),
    },
    {
      header: 'Profit',
      align: 'right',
      render: (r) => (
        <span
          className={`font-bold tabular-nums ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {formatCurrency(r.profit, currency)}
        </span>
      ),
    },
  ];
}

export function SegmentContractModal({
  segmentKey,
  segmentLabel,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  currency,
  onClose,
}: { segmentKey: string; segmentLabel: string } & CommonProps) {
  return (
    <DrilldownModal<ContractPnlRow>
      title={`${segmentLabel} — By Contract`}
      queryKey={`segment-contracts-${segmentKey}`}
      showDateRange={false}
      fetchRows={async (f) => {
        const rows = await fetchSegmentContractDetail({
          segmentKey,
          periodFrom,
          periodTo,
          branchId: f.branchId ?? branchId,
        });
        return filterContractRows(rows, f);
      }}
      columns={buildContractColumns(currency)}
      getAmount={(r) => r.revenue}
      getCurrency={() => currency}
      nameFilterLabel="Customer / machine name"
      searchFilterLabel="Invoice # / serial #"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}
