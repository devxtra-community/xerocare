'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, AlertTriangle, Eye, Layers } from 'lucide-react';
import {
  fetchSegmentedPnl,
  segmentToRevenueCategory,
  type SegmentPnl,
} from '@/lib/finance/segmentedPnlApi';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import { RevenueDetailModal, type DrilldownNode } from '@/components/accounts/RevenueDrilldown';
import {
  SegmentProductModal,
  SegmentContractModal,
  CostBasisBadge,
} from '@/components/accounts/SegmentedPnlDrilldown';

function currentYearFrom() {
  return `${new Date().getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function isSaleSegment(key: string): key is 'PRODUCT_SALE' | 'SPAREPART_SALE' {
  return key === 'PRODUCT_SALE' || key === 'SPAREPART_SALE';
}

function SegmentRow({
  seg,
  currency,
  onViewSource,
  onViewDetail,
}: {
  seg: SegmentPnl;
  currency: string;
  onViewSource: (seg: SegmentPnl) => void;
  onViewDetail: (seg: SegmentPnl) => void;
}) {
  const fmt = (n: number) => formatCurrency(n, currency);
  return (
    <tr className="hover:bg-blue-50/40 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-slate-800">{seg.label}</td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">{fmt(seg.revenue)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <CostBasisBadge basis={seg.directCostBasis} />
          <span className="text-sm tabular-nums">{fmt(seg.directCost)}</span>
        </div>
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${seg.grossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}
      >
        {fmt(seg.grossProfit)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
        {seg.grossMarginPct === null ? '—' : `${seg.grossMarginPct}%`}
      </td>
      <td className="px-4 py-3 text-right text-xs text-amber-700 tabular-nums">
        {fmt(seg.allocatedOverhead)}
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${seg.netProfit < 0 ? 'text-red-600' : 'text-slate-800'}`}
      >
        {fmt(seg.netProfit)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
        {seg.netMarginPct === null ? '—' : `${seg.netMarginPct}%`}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onViewSource(seg)}
            title="View Source — underlying revenue transactions"
            className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
          >
            <Eye className="h-3 w-3" /> Revenue
          </button>
          <button
            onClick={() => onViewDetail(seg)}
            title={isSaleSegment(seg.key) ? 'View by product' : 'View by contract'}
            className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
          >
            <Layers className="h-3 w-3" /> {isSaleSegment(seg.key) ? 'Products' : 'Contracts'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function SegmentTable({
  title,
  accent,
  segments,
  currency,
  onViewSource,
  onViewDetail,
}: {
  title: string;
  accent: string;
  segments: SegmentPnl[];
  currency: string;
  onViewSource: (seg: SegmentPnl) => void;
  onViewDetail: (seg: SegmentPnl) => void;
}) {
  const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);
  const totalDirectCost = segments.reduce((s, seg) => s + seg.directCost, 0);
  const totalGrossProfit = segments.reduce((s, seg) => s + seg.grossProfit, 0);
  const totalOverhead = segments.reduce((s, seg) => s + seg.allocatedOverhead, 0);
  const totalNetProfit = segments.reduce((s, seg) => s + seg.netProfit, 0);
  const fmt = (n: number) => formatCurrency(n, currency);

  return (
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
      <div className={`px-5 py-3.5 border-l-4 ${accent}`}>
        <h3 className="font-bold text-sm text-slate-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left">Segment</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
              <th className="px-4 py-2.5 text-right">Direct Cost</th>
              <th className="px-4 py-2.5 text-right">Gross Profit</th>
              <th className="px-4 py-2.5 text-right">Gross %</th>
              <th className="px-4 py-2.5 text-right">Overhead (est.)</th>
              <th className="px-4 py-2.5 text-right">Net Profit (est.)</th>
              <th className="px-4 py-2.5 text-right">Net %</th>
              <th className="px-4 py-2.5 text-right">View Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {segments.map((seg) => (
              <SegmentRow
                key={seg.key}
                seg={seg}
                currency={currency}
                onViewSource={onViewSource}
                onViewDetail={onViewDetail}
              />
            ))}
          </tbody>
          <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
            <tr>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-800">{title} Total</td>
              <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">
                {fmt(totalRevenue)}
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">
                {fmt(totalDirectCost)}
              </td>
              <td
                className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums ${totalGrossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}
              >
                {fmt(totalGrossProfit)}
              </td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-amber-700 tabular-nums">
                {fmt(totalOverhead)}
              </td>
              <td
                className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums ${totalNetProfit < 0 ? 'text-red-600' : 'text-slate-800'}`}
              >
                {fmt(totalNetProfit)}
              </td>
              <td className="px-4 py-2.5" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SegmentedPnlContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [periodFrom, setPeriodFrom] = useState(currentYearFrom());
  const [periodTo, setPeriodTo] = useState(today());
  const [viewingSourceNode, setViewingSourceNode] = useState<DrilldownNode | null>(null);
  const [viewingDetailSeg, setViewingDetailSeg] = useState<SegmentPnl | null>(null);

  const currentUser = getUserFromToken();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-segmented-pnl', branchIds, periodFrom, periodTo],
    queryFn: () => fetchSegmentedPnl({ periodFrom, periodTo, branchIds: branchIds || undefined }),
    staleTime: 60_000,
  });

  const currency = data?.currency ?? 'AED';
  const saleSegs = data?.segments.filter((s) => s.topCategory === 'SALE') ?? [];
  const rentSegs = data?.segments.filter((s) => s.topCategory === 'RENT') ?? [];
  const leaseSegs = data?.segments.filter((s) => s.topCategory === 'LEASE') ?? [];

  const openSource = (seg: SegmentPnl) =>
    setViewingSourceNode({
      key: segmentToRevenueCategory(seg),
      label: seg.label,
      amount: seg.revenue,
    });

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segmented Profit &amp; Loss</h1>
          <p className="text-sm text-gray-500">
            All branches (or filtered) — by revenue type and product/contract
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            From
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            To
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-40"
            />
          </label>
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="gap-2 mt-4"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <BranchFilterBar />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">
            Failed to load segmented P&amp;L. Please refresh.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              How to read Direct Cost
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <CostBasisBadge basis="ACTUAL" /> the real cost of the exact unit/machine involved —
                trustworthy.
              </span>
              <span className="flex items-center gap-1.5">
                <CostBasisBadge basis="APPROXIMATE" /> an average-cost estimate, not a true per-unit
                cost — useful, not exact.
              </span>
              <span className="flex items-center gap-1.5">
                <CostBasisBadge basis="UNAVAILABLE" /> no linked cost data exists yet (e.g. no
                machine allocated to a contract) — shown as $0, not a confirmed zero cost.
              </span>
            </div>
            <p className="text-xs text-slate-500">
              <strong className="text-amber-700">Allocated Overhead</strong> and{' '}
              <strong>Net Profit (est.)</strong> spread indirect costs (Salary, office Rent,
              Utilities, Marketing, Maintenance, Insurance, etc.) across segments in proportion to
              each segment&apos;s share of revenue — an estimate, not a traced cost.{' '}
              <strong className="text-slate-700">Gross Profit</strong> (Revenue − Direct Cost only)
              is the defensible figure.
            </p>
          </div>

          {(data.dataWarnings.length > 0 || data.currencyWarnings.length > 0) && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Reconciliation notes
              </div>
              <ul className="pl-6 list-disc space-y-1">
                {[...data.dataWarnings, ...data.currencyWarnings].map((w, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(data.totalRevenue, currency)}
              subtitle="Sale + Rent + Lease"
            />
            <StatCard
              title="Total Direct Cost"
              value={formatCurrency(data.totalDirectCost, currency)}
              subtitle="Traced / approximated"
            />
            <StatCard
              title="Total Gross Profit"
              value={formatCurrency(data.totalGrossProfit, currency)}
              subtitle="Defensible figure"
            />
            <StatCard
              title="Allocated Overhead"
              value={formatCurrency(data.totalAllocatedOverhead, currency)}
              subtitle="Estimate, pro-rata by revenue"
            />
            <StatCard
              title="Total Net Profit"
              value={formatCurrency(data.totalNetProfit, currency)}
              subtitle="Gross − Allocated Overhead (est.)"
            />
          </div>

          <SegmentTable
            title="Sale"
            accent="border-l-emerald-500 bg-emerald-50/40"
            segments={saleSegs}
            currency={currency}
            onViewSource={openSource}
            onViewDetail={setViewingDetailSeg}
          />
          <SegmentTable
            title="Rent"
            accent="border-l-blue-500 bg-blue-50/40"
            segments={rentSegs}
            currency={currency}
            onViewSource={openSource}
            onViewDetail={setViewingDetailSeg}
          />
          <SegmentTable
            title="Lease"
            accent="border-l-purple-500 bg-purple-50/40"
            segments={leaseSegs}
            currency={currency}
            onViewSource={openSource}
            onViewDetail={setViewingDetailSeg}
          />

          <p className="text-xs text-muted-foreground text-center">
            Segment Revenue is the exact same figure the Chart of Accounts Revenue drill-down shows
            for each type — reused directly, never recomputed separately. Segment totals here cover
            Sale + Rent + Lease only; the company Income Statement&apos;s Total Revenue also
            includes Other Income, which has no revenue-type segment.
          </p>
        </div>
      )}

      {viewingSourceNode && (
        <RevenueDetailModal
          node={viewingSourceNode}
          periodFrom={periodFrom}
          periodTo={periodTo}
          branchId={branchIds || undefined}
          isAdmin={currentUser?.role === 'ADMIN'}
          onClose={() => setViewingSourceNode(null)}
        />
      )}
      {viewingDetailSeg && isSaleSegment(viewingDetailSeg.key) && (
        <SegmentProductModal
          segmentKey={viewingDetailSeg.key}
          periodFrom={periodFrom}
          periodTo={periodTo}
          branchId={branchIds || undefined}
          isAdmin={currentUser?.role === 'ADMIN'}
          currency={currency}
          onClose={() => setViewingDetailSeg(null)}
        />
      )}
      {viewingDetailSeg && !isSaleSegment(viewingDetailSeg.key) && (
        <SegmentContractModal
          segmentKey={viewingDetailSeg.key}
          segmentLabel={viewingDetailSeg.label}
          periodFrom={periodFrom}
          periodTo={periodTo}
          branchId={branchIds || undefined}
          isAdmin={currentUser?.role === 'ADMIN'}
          currency={currency}
          onClose={() => setViewingDetailSeg(null)}
        />
      )}
    </div>
  );
}

export default function AdminSegmentedPnlPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <SegmentedPnlContent />
    </Suspense>
  );
}
