'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Pencil, Trash2 } from 'lucide-react';
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
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import EditSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/EditSparePartDialog';
import { toast } from 'sonner';

interface SparePartTableProps {
  showActions?: boolean;
}

export default function SparePartTable({ showActions = true }: SparePartTableProps) {
  const [parts, setParts] = useState<SparePartInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<SparePartInventoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  // Derived filter options
  const brands = Array.from(new Set(parts.map((p) => p.brand).filter(Boolean))).sort();
  const warehouses = Array.from(new Set(parts.map((p) => p.warehouse_name).filter(Boolean))).sort();
  const vendors = Array.from(new Set(parts.map((p) => p.vendor_name).filter(Boolean))).sort();

  const loadParts = async () => {
    try {
      setLoading(true);
      const res = await sparePartService.getSpareParts();
      setParts(res.data || []);
    } catch (error) {
      console.error('Failed to load spare parts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await sparePartService.deleteSparePart(id);
      toast.success('Spare part deleted successfully');
      loadParts();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to delete spare part';
      toast.error(msg);
    }
  };

  const handleEdit = (part: SparePartInventoryItem) => {
    setSelectedPart(part);
    setEditOpen(true);
  };

  const filtered = parts.filter((p) => {
    const matchesSearch =
      (p.lot_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.part_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.brand?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
    const matchesWarehouse = selectedWarehouse === 'all' || p.warehouse_name === selectedWarehouse;
    const matchesVendor = selectedVendor === 'all' || p.vendor_name === selectedVendor;

    return matchesSearch && matchesBrand && matchesWarehouse && matchesVendor;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-blue-100 focus:border-blue-400 focus:ring-blue-50 text-[12px]"
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-[130px] h-9 text-[11px] border-blue-50 bg-white/50">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b || ''}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[140px] h-9 text-[11px] border-blue-50 bg-white/50">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w} value={w || ''}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-[130px] h-9 text-[11px] border-blue-50 bg-white/50">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v} value={v || ''}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedBrand !== 'all' || selectedWarehouse !== 'all' || selectedVendor !== 'all') && (
            <button
              onClick={() => {
                setSelectedBrand('all');
                setSelectedWarehouse('all');
                setSelectedVendor('all');
              }}
              className="text-[11px] text-primary hover:underline font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50/50 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Lot / Order Number
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Part Name
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Brand
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Compatible Model
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Warehouse
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Vendor
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Price
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Qty
                </TableHead>
                {showActions && (
                  <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-right pr-4">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 9 : 8} className="text-center py-8">
                    Loading spare parts...
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <TableRow
                    key={`${item.lot_number}-${i}`}
                    className={`transition-colors h-11 ${i % 2 === 0 ? 'bg-card' : 'bg-blue-50/20'}`}
                  >
                    <TableCell className="px-3 py-1.5 font-medium text-foreground text-[12px]">
                      {item.lot_number}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 font-medium text-primary text-[12px]">
                      {item.part_name}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.brand}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.compatible_model || 'Universal'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.warehouse_name || '-'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.vendor_name || '-'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center text-[12px]">
                      QAR {item.price}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center font-bold text-primary text-[12px]">
                      {item.quantity}
                    </TableCell>
                    {showActions && (
                      <TableCell className="px-3 py-1.5 text-right pr-3">
                        <div className="flex justify-end gap-2 text-primary">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 hover:bg-primary/5 rounded"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.part_name)}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 9 : 8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="bg-gray-100 p-3 rounded-full">
                        <span className="text-2xl">⚙️</span>
                      </div>
                      <p className="font-medium">No spare parts found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {editOpen && selectedPart && (
        <EditSparePartDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          product={selectedPart}
          onSuccess={loadParts}
        />
      )}
    </div>
  );
}
