'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getGlobalSalesTotals, type BranchSalesSlice } from '@/lib/invoice';
import { getBranches, type Branch } from '@/lib/branch';
import { getWarehouses, type Warehouse } from '@/lib/warehouse';
import { getAllEmployees } from '@/lib/employee';
import StatCard from '@/components/StatCard';
import ProductsTable from '@/components/AdminDahboardComponents/dashboardComponents/productTable';
import HrTable from '@/components/AdminDahboardComponents/dashboardComponents/HrTable';
import SalesChart from '@/components/AdminDahboardComponents/dashboardComponents/SalesChart';
import EmployeePieChart from '@/components/AdminDahboardComponents/dashboardComponents/employeesPiechart';
import WarehouseTable from '@/components/AdminDahboardComponents/dashboardComponents/WarehouseTable';
import CategoryPieChart from '@/components/AdminDahboardComponents/dashboardComponents/CategoryPieChart';
import DashboardPage from '@/components/DashboardPage';
import { YearSelector } from '@/components/ui/YearSelector';
import { BranchSelector, ALL_BRANCHES } from '@/components/ui/BranchSelector';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

/** One line of the earnings card: a branch and one of its currencies. */
interface EarningsRow {
  key: string;
  branchName: string;
  currency: string;
  total: number;
}

/**
 * Collapses the per-branch/per-currency slices from the API into display rows.
 *
 * A branch whose invoices all share one currency gets a single row labelled with
 * the currency on its branch record (the spec's source of truth). A branch that
 * genuinely holds invoices in several currencies gets one row per currency —
 * amounts are never converted, so blending them into one figure would be wrong.
 */
function buildEarningsRows(slices: BranchSalesSlice[], branches: Branch[]): EarningsRow[] {
  const byBranch = new Map<string, BranchSalesSlice[]>();
  for (const s of slices) {
    if (!s.branchId) continue;
    const list = byBranch.get(s.branchId) ?? [];
    list.push(s);
    byBranch.set(s.branchId, list);
  }

  const rows: EarningsRow[] = [];
  for (const [branchId, list] of byBranch) {
    const branch = branches.find((b) => b.id === branchId);
    const branchName = branch?.name ?? 'Unknown branch';
    const currencies = new Set(list.map((s) => s.currencyCode).filter(Boolean));

    if (currencies.size <= 1) {
      rows.push({
        key: branchId,
        branchName,
        currency: branch?.currency_code ?? (list[0]?.currencyCode || undefined) ?? 'AED',
        total: list.reduce((sum, s) => sum + s.total, 0),
      });
    } else {
      for (const slice of list) {
        rows.push({
          key: `${branchId}:${slice.currencyCode}`,
          branchName,
          currency: slice.currencyCode ?? branch?.currency_code ?? 'AED',
          total: slice.total,
        });
      }
    }
  }

  return rows.sort(
    (a, b) => a.branchName.localeCompare(b.branchName) || a.currency.localeCompare(b.currency),
  );
}

/**
 * Total Earnings. One branch shows a single figure in that branch's currency;
 * "All Branches" lists every branch in its own currency, unconverted.
 */
function EarningsCard({
  rows,
  singleCurrency,
  singleTotal,
  subtitle,
}: {
  rows: EarningsRow[];
  singleCurrency?: string;
  singleTotal?: number;
  subtitle: string;
}) {
  const isSingle = singleCurrency !== undefined;

  return (
    <Card className="rounded-2xl min-h-[70px] sm:min-h-[80px] h-full bg-card border-none shadow-sm overflow-hidden flex flex-col p-0">
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-1 text-center p-2 bg-card rounded-2xl w-full">
        <CardTitle className="font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight uppercase w-full">
          Total Earnings
        </CardTitle>

        {isSingle ? (
          <>
            <div
              className="font-bold text-primary leading-snug text-base sm:text-xl md:text-2xl"
              suppressHydrationWarning
            >
              {formatCurrency(singleTotal ?? 0, singleCurrency)}
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground/80 truncate w-full">
              {subtitle}
            </p>
          </>
        ) : rows.length === 0 ? (
          <>
            <div className="font-bold text-primary leading-snug text-base sm:text-xl md:text-2xl">
              —
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground/80">
              No sales recorded
            </p>
          </>
        ) : (
          <div className="w-full max-h-[64px] overflow-y-auto overscroll-contain px-1">
            {rows.map((r) => (
              <div
                key={r.key}
                className="flex items-baseline justify-between gap-2 py-0.5 text-left"
              >
                <span
                  className="truncate text-[9px] sm:text-[10px] font-medium text-muted-foreground"
                  title={r.branchName}
                >
                  {r.branchName}
                </span>
                <span
                  className="shrink-0 text-[11px] sm:text-sm font-bold text-primary"
                  suppressHydrationWarning
                >
                  {formatCurrency(r.total, r.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Branch lives in the URL so a filtered dashboard is shareable and survives a
  // refresh; the year stays local state, as it always has.
  const selectedBranchId = searchParams.get('branchId') || ALL_BRANCHES;
  const isAllBranches = selectedBranchId === ALL_BRANCHES;
  const branchFilter = isAllBranches ? undefined : selectedBranchId;

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  const setBranch = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === ALL_BRANCHES) params.delete('branchId');
      else params.set('branchId', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const { data: branchRes } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
    staleTime: 600_000,
  });
  const branches: Branch[] = useMemo(() => branchRes?.data ?? [], [branchRes]);
  const activeBranch = branches.find((b) => b.id === selectedBranchId);

  // A single branch reports in its own currency, read from the branch record.
  // "All Branches" has no single currency — the earnings card shows each branch's.
  const branchCurrency = activeBranch?.currency_code ?? 'AED';

  const [stats, setStats] = useState({
    totalSales: 0,
    earningsRows: [] as EarningsRow[],
    branchCount: '0',
    warehouseCount: '0',
    employeeCount: '0',
  });

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      // Each stat is fetched independently so one failure cannot blank the row.
      const [salesTotals, branchesRes, warehousesRes, employeeRes] = await Promise.all([
        getGlobalSalesTotals(
          selectedYear === 'all' ? undefined : (selectedYear as number),
          branchFilter,
        ).catch((err) => {
          console.error('Failed to fetch sales totals:', err);
          return null;
        }),
        getBranches().catch((err) => {
          console.error('Failed to fetch branches:', err);
          return null;
        }),
        getWarehouses().catch((err) => {
          console.error('Failed to fetch warehouses:', err);
          return null;
        }),
        // limit=1 — only the pagination total is needed, and that total is the
        // real headcount rather than the length of the first page.
        getAllEmployees(1, 1, undefined, undefined, branchFilter).catch((err) => {
          console.error('Failed to fetch employees:', err);
          return null;
        }),
      ]);

      if (cancelled) return;

      const allBranches: Branch[] = branchesRes?.data ?? [];
      const allWarehouses: Warehouse[] = warehousesRes?.data ?? [];
      const scopedWarehouses = branchFilter
        ? allWarehouses.filter((w) => w.branchId === branchFilter)
        : allWarehouses;

      setStats({
        totalSales: salesTotals?.totalSales ?? 0,
        earningsRows: buildEarningsRows(salesTotals?.byBranch ?? [], allBranches),
        branchCount: (branchFilter ? 1 : allBranches.length).toString(),
        warehouseCount: scopedWarehouses.length.toString(),
        employeeCount: (employeeRes?.data?.pagination?.total ?? 0).toString(),
      });
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, branchFilter]);

  const scopeLabel = isAllBranches ? 'All branches' : (activeBranch?.name ?? 'Selected branch');

  return (
    <DashboardPage>
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Admin Dashboard
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              {isAllBranches
                ? 'Enterprise-wide performance and branch management'
                : `${activeBranch?.name ?? 'Branch'} — branch performance in ${branchCurrency}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BranchSelector value={selectedBranchId} onValueChange={setBranch} />
            <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <EarningsCard
            rows={stats.earningsRows}
            singleCurrency={isAllBranches ? undefined : branchCurrency}
            singleTotal={stats.totalSales}
            subtitle={scopeLabel}
          />
          <StatCard
            title="Branches"
            value={stats.branchCount}
            subtitle={isAllBranches ? 'Active branches' : 'Selected branch'}
          />
          <StatCard title="Warehouses" value={stats.warehouseCount} subtitle={scopeLabel} />
          <StatCard title="Employees" value={stats.employeeCount} subtitle={scopeLabel} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
              Products
            </h3>
            <ProductsTable branchId={branchFilter} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
              {isAllBranches ? 'Global Sales Overview' : 'Branch Sales Overview'}
            </h3>
            <SalesChart
              selectedYear={selectedYear}
              branchId={branchFilter}
              currency={isAllBranches ? undefined : branchCurrency}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
          Human Resources
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Recent Employees
            </h4>
            <HrTable selectedYear={selectedYear} branchId={branchFilter} />
          </div>
          <div className="xl:col-span-1 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Employee Distribution
            </h4>
            <EmployeePieChart selectedYear={selectedYear} branchId={branchFilter} />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
          Warehouse
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              {isAllBranches ? 'All Warehouses' : 'Branch Warehouses'}
            </h4>
            <WarehouseTable selectedYear={selectedYear} branchId={branchFilter} />
          </div>
          <div className="xl:col-span-1 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Product Distribution
            </h4>
            <CategoryPieChart selectedYear={selectedYear} branchId={branchFilter} />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
