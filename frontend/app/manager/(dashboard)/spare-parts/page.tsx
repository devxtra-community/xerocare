'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Search, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StandardTable } from '@/components/table/StandardTable';
import { usePagination } from '@/hooks/usePagination';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import AddSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/AddSparePartDialog';
import BulkSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/BulkSparePartDialog';
import { toast } from 'sonner';
import EditSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/EditSparePartDialog';

export default function SparePartsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePartInventoryItem | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<{ id: string; name: string } | null>(null);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<SparePartInventoryItem[]>([]);
  const [search, setSearch] = useState('');

  const loadParts = async () => {
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
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadParts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page, limit]);

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
              id: 'lot_number',
              header: 'LOT / ORDER NUMBER',
              accessorKey: 'lot_number' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'part_name',
              header: 'PART NAME',
              accessorKey: 'part_name' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'brand',
              header: 'BRAND',
              accessorKey: 'brand' as keyof SparePartInventoryItem,
              className: 'font-semibold text-[11px] text-primary uppercase',
            },
            {
              id: 'compatible',
              header: 'COMPATIBLE MODEL',
              cell: (item: SparePartInventoryItem) => item.compatible_model || 'Universal',
              className: 'font-semibold text-[11px] text-primary uppercase',
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
              cell: (item: SparePartInventoryItem) => `₹${item.price}`,
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
