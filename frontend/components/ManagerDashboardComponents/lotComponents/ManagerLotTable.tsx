'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { StandardTable } from '@/components/table/StandardTable';
import StatCard from '@/components/StatCard';
import { Lot, lotService } from '@/lib/lot';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { PurchaseOriginBadge } from '@/components/PurchaseOriginBadge';
import { PurchaseOrigin } from '@/lib/purchaseOrigin';
import AddLotDialog from './AddLotDialog';

/**
 * Manager Lot Management Page.
 * Displays a list of inventory lots with search validation and status tracking.
 * Provides access to create new lots and view detailed lot reports.
 */
export default function ManagerLotTable() {
  const currency = useBranchCurrency();
  const router = useRouter();
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<'ALL' | PurchaseOrigin>('ALL');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLots: 0, totalAmount: 0 });

  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lotService.getAllLots({ page, limit, search });
      setLots(res.data || []);
      setTotal(res.total || res.data.length);

      // Calculate stats based on fetched page (as backend doesn't offer global stats yet)
      setStats({
        totalLots: res.total || res.data.length,
        totalAmount: res.data.reduce((sum, lot) => sum + Number(lot.totalAmount), 0),
      });
    } catch (error) {
      console.error('Failed to load lots:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, setTotal]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadLots();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [loadLots]);

  return (
    <div className="bg-card min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-medium text-foreground">Lot Management</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Total Lots" value={stats.totalLots.toString()} subtitle="All orders" />
        <StatCard
          title="Total Spending"
          value={formatCurrency(stats.totalAmount, currency)}
          subtitle="Lifetime"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Lot # or Vendor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value as 'ALL' | PurchaseOrigin)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-sm ml-3"
          aria-label="Filter by purchase origin"
        >
          <option value="ALL">All Origins</option>
          <option value={PurchaseOrigin.DOMESTIC}>Domestic</option>
          <option value={PurchaseOrigin.INTERNATIONAL}>International</option>
        </select>

        <Button
          className="bg-primary text-primary-foreground gap-2 ml-auto"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus size={16} /> Add Lot
        </Button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
        <StandardTable
          columns={[
            {
              id: 'lotNumber',
              header: 'LOT NUMBER',
              accessorKey: 'lotNumber' as keyof Lot,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'vendor',
              header: 'VENDOR',
              cell: (lot: Lot) =>
                lot.vendor?.id ? (
                  <button
                    className="text-primary hover:underline font-semibold text-[11px] uppercase"
                    onClick={() => router.push(`/manager/vendors/${lot.vendor!.id}`)}
                  >
                    {lot.vendor.name}
                  </button>
                ) : (
                  (lot.vendor?.name ?? (lot.transferOrigin ? 'Internal Transfer' : '—'))
                ),
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'date',
              header: 'DATE',
              cell: (lot: Lot) => format(new Date(lot.purchaseDate), 'MMM dd, yyyy'),
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'items',
              header: 'ITEMS',
              cell: (lot: Lot) => `${lot.items.length} items`,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'total',
              header: 'TOTAL AMOUNT',
              // Transfer lots carry the (converted) purchase value of the moved stock
              cell: (lot: Lot) => formatCurrency(Number(lot.totalAmount), currency),
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'status',
              header: 'STATUS',
              className: 'font-semibold text-[11px] text-primary uppercase',
              cell: (lot: Lot) => {
                const statusStyles: Record<string, string> = {
                  RECEIVED: 'bg-success/10 text-success',
                  COMPLETED: 'bg-success/10 text-success',
                  RECEIVING: 'bg-primary/10 text-primary',
                  PENDING: 'bg-warning/10 text-warning',
                  CANCELLED: 'bg-destructive/10 text-destructive',
                };
                return (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[lot.status] ?? 'bg-muted text-foreground'}`}
                  >
                    {lot.status}
                  </span>
                );
              },
            },
            {
              id: 'origin',
              header: 'ORIGIN',
              className: 'font-semibold text-[11px] text-primary uppercase',
              cell: (lot: Lot) => <PurchaseOriginBadge origin={lot.purchaseOrigin} />,
            },
            {
              id: 'actions',
              header: 'ACTION',
              className: 'font-semibold text-[11px] text-primary uppercase text-right',
              cell: (lot: Lot) => (
                <div className="text-right">
                  <button
                    className="text-primary hover:underline font-medium text-[13px]"
                    onClick={() => router.push(`/manager/lots/${lot.id}`)}
                  >
                    View Details
                  </button>
                </div>
              ),
            },
          ]}
          data={
            originFilter === 'ALL'
              ? lots
              : lots.filter((lot) => lot.purchaseOrigin === originFilter)
          }
          loading={loading}
          emptyMessage="No lots found matching your search."
          keyExtractor={(lot) => lot.id}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {addDialogOpen && (
        <AddLotDialog
          onClose={() => setAddDialogOpen(false)}
          onSuccess={() => {
            loadLots();
            setAddDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
