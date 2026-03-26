'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Search, Pencil, Trash2, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StandardTable } from '@/components/table/StandardTable';
import { usePagination } from '@/hooks/usePagination';
import { formatCurrency } from '@/lib/format';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import AddSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/AddSparePartDialog';
import BulkSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/BulkSparePartDialog';
import { toast } from 'sonner';
import EditSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/EditSparePartDialog';
import SparePartDetailDialog from '@/components/ManagerDashboardComponents/spareParts/SparePartDetailDialog';

export default function SparePartsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePartInventoryItem | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<{ id: string; name: string } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPartForDetail, setSelectedPartForDetail] = useState<SparePartInventoryItem | null>(
    null,
  );

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<SparePartInventoryItem[]>([]);
  const [search, setSearch] = useState('');

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sparePartService.getSpareParts({ page, limit, search });
      setParts(res.data || []);
      setTotal(res.total || res.data.length);
    } catch (error) {
      console.error('Failed to load spare parts', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, setTotal]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadParts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [loadParts]);

  const confirmDelete = async () => {
    if (!partToDelete) return;
    try {
      await sparePartService.deleteSparePart(partToDelete.id);
      toast.success('Spare part deleted successfully');
      loadParts();
    } catch (error: unknown) {
      console.error(error);
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete spare part';
      toast.error(msg);
    } finally {
      setDeleteDialogOpen(false);
      setPartToDelete(null);
    }
  };

  const handleRefresh = () => {
    loadParts();
  };

  const handleEdit = (part: SparePartInventoryItem) => {
    setSelectedPart(part);
    setEditOpen(true);
  };

  const handleOpenDetail = (part: SparePartInventoryItem) => {
    setSelectedPartForDetail(part);
    setDetailOpen(true);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Spare Parts Inventory</h3>
        <div className="flex gap-2">
          <Button className="bg-primary text-white gap-2" onClick={() => setAddOpen(true)}>
            + Add Item
          </Button>
          <Button
            className="bg-card text-primary border border-primary gap-2 hover:bg-muted/50"
            onClick={() => setBulkOpen(true)}
          >
            <Upload size={16} /> Bulk Upload
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by code, name or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <StandardTable
          columns={[
            {
              id: 'brand',
              header: 'BRAND',
              accessorKey: 'brand' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'part_name',
              header: 'PART NAME',
              accessorKey: 'part_name' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
              cell: (item: SparePartInventoryItem) => (
                <button
                  onClick={() => handleOpenDetail(item)}
                  className="hover:text-blue-600 hover:underline transition-colors text-left font-bold"
                >
                  {item.part_name}
                </button>
              ),
            },
            {
              id: 'lotNumber',
              header: 'LOT ID',
              accessorKey: 'lotNumber' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
              cell: (item: SparePartInventoryItem) => (
                <div className="flex items-center gap-2 group">
                  <span className="font-mono text-[11px]">{item.lotNumber}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(item.lotNumber);
                      toast.success('Copied to clipboard');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary"
                    title="Copy Lot ID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ),
            },
            {
              id: 'warehouse',
              header: 'WAREHOUSE',
              accessorKey: 'warehouse_name' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'vendor',
              header: 'VENDOR',
              cell: (item: SparePartInventoryItem) => item.vendor_name || '-',
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'price',
              header: 'PRICE',
              cell: (item: SparePartInventoryItem) => formatCurrency(item.price || 0),
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'qty',
              header: 'QTY',
              cell: (item: SparePartInventoryItem) => item.quantity,
              className: 'font-bold text-primary text-[11px] uppercase',
            },
            {
              id: 'action',
              header: 'ACTION',
              className: 'font-semibold text-[11px] text-primary uppercase text-right w-[80px]',
              cell: (item: SparePartInventoryItem) => (
                <div className="flex justify-end gap-2 text-primary">
                  <button
                    onClick={() => handleEdit(item)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setPartToDelete({ id: item.id, name: item.part_name });
                      setDeleteDialogOpen(true);
                    }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </div>
              ),
            },
          ]}
          data={parts}
          loading={loading}
          emptyMessage="No spare parts found. Try adding some."
          keyExtractor={(item) => item.id}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {bulkOpen && (
        <BulkSparePartDialog open={bulkOpen} onOpenChange={setBulkOpen} onSuccess={handleRefresh} />
      )}

      {addOpen && (
        <AddSparePartDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={loadParts} />
      )}

      {editOpen && selectedPart && (
        <EditSparePartDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          product={selectedPart}
          onSuccess={loadParts}
        />
      )}

      {detailOpen && selectedPartForDetail && (
        <SparePartDetailDialog part={selectedPartForDetail} onClose={() => setDetailOpen(false)} />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Spare Part?"
        itemName={partToDelete?.name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
