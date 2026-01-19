'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import AddSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/AddSparePartDialog';
import BulkSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/BulkSparePartDialog';

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePartInventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const loadParts = async () => {
    try {
      const data = await sparePartService.getSpareParts();
      setParts(data);
    } catch (error) {
      console.error('Failed to load spare parts', error);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const filtered = parts.filter(
    (p) =>
      p.item_code.toLowerCase().includes(search.toLowerCase()) ||
      p.part_name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Spare Parts Inventory</h3>
        <div className="flex gap-2">
          <Button className="bg-primary text-white gap-2" onClick={() => setAddOpen(true)}>
            + Add Item
          </Button>
          <Button
            className="bg-white text-primary border border-primary gap-2 hover:bg-slate-50"
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

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-primary">Item Code</TableHead>
              <TableHead className="font-bold text-primary">Part Name</TableHead>
              <TableHead className="font-bold text-primary">Brand</TableHead>
              <TableHead className="font-bold text-primary">Compatible Model</TableHead>
              <TableHead className="font-bold text-primary">Warehouse</TableHead>
              <TableHead className="font-bold text-primary">Vendor</TableHead>
              <TableHead className="font-bold text-primary">Price</TableHead>
              <TableHead className="font-bold text-primary">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((item, i) => (
                <TableRow key={`${item.item_code}-${i}`} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell>{item.part_name}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>{item.compatible_model || 'Universal'}</TableCell>
                  <TableCell>{item.warehouse_name}</TableCell>
                  <TableCell>{item.vendor_name || '-'}</TableCell>
                  <TableCell>₹{item.price}</TableCell>
                  <TableCell className="font-bold text-primary">{item.quantity}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No spare parts found. Try adding some.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {bulkOpen && (
        <BulkSparePartDialog open={bulkOpen} onOpenChange={setBulkOpen} onSuccess={loadParts} />
      )}

      {addOpen && (
        <AddSparePartDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={loadParts} />
      )}
    </div>
  );
}
