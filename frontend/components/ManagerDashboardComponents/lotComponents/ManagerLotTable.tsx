'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { StandardTable } from '@/components/table/StandardTable';
import StatCard from '@/components/StatCard';
import { Lot, lotService } from '@/lib/lot';
import { format } from 'date-fns';
import AddLotDialog from './AddLotDialog';
import LotDetailsDialog from './LotDetailsDialog';

/**
 * Manager Lot Management Page.
 * Displays a list of inventory lots with search validation and status tracking.
 * Provides access to create new lots and view detailed lot reports.
 */
export default function ManagerLotTable() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLots: 0, totalAmount: 0 });

  const loadLots = async () => {
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
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadLots();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, page, limit]);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-primary">Lot Management</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Total Lots" value={stats.totalLots.toString()} subtitle="All orders" />
        <StatCard
          title="Total Spending"
          value={`$${stats.totalAmount.toLocaleString()}`}
          subtitle="Lifetime"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Lot # or Vendor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button className="bg-primary text-white gap-2" onClick={() => setAddDialogOpen(true)}>
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
              cell: (lot: Lot) => lot.vendor?.name,
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
              cell: (lot: Lot) => `$${Number(lot.totalAmount).toLocaleString()}`,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'status',
              header: 'STATUS',
              className: 'font-semibold text-[11px] text-primary uppercase',
              cell: (lot: Lot) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${lot.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : lot.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                >
                  {lot.status}
                </span>
              ),
            },
            {
              id: 'actions',
              header: 'ACTION',
              className: 'font-semibold text-[11px] text-primary uppercase text-right',
              cell: (lot: Lot) => (
                <div className="text-right">
                  <button
                    className="text-primary hover:underline font-medium text-[13px]"
                    onClick={() => setSelectedLot(lot)}
                  >
                    View Details
                  </button>
                </div>
              ),
            },
          ]}
          data={lots}
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

      {selectedLot && <LotDetailsDialog lot={selectedLot} onClose={() => setSelectedLot(null)} />}
    </div>
  );
}
