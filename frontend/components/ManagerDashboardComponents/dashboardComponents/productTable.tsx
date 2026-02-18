'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useEffect, useState } from 'react';
import { inventoryService, InventoryItem } from '@/services/inventoryService';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Dashboard table displaying a snapshot of branch inventory.
 * Lists models, brands, vendors, and their current stock levels.
 * Provides a quick overview of available products.
 */
export default function DashbordTable() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [inventory, spareParts] = await Promise.all([
          inventoryService.getBranchInventory(),
          sparePartService.getSpareParts(),
        ]);

        const machines = inventory.map((m: InventoryItem) => ({
          ...m,
          display_type: 'Machine',
          id: `${m.model_id}-${m.warehouse_id}`,
        }));

        const spares = spareParts.map((s: SparePartInventoryItem) => ({
          ...s,
          display_type: 'Spare Part',
          product_name: s.part_name,
          model_name: s.compatible_model,
          total_qty: s.quantity,
        }));

        setData([...machines, ...spares] as unknown as InventoryItem[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtering logic
  const filteredData = data.filter((item) => {
    const matchesSearch =
      (item.model_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.product_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
    const matchesVendor =
      selectedVendor === 'all' || (item.vendor_name || item.vendor_id || 'N/A') === selectedVendor;

    return matchesSearch && matchesBrand && matchesVendor;
  });

  // Extract unique brands and vendors for filters
  const brands = Array.from(new Set(data.map((item) => item.brand))).filter(Boolean);
  const vendors = Array.from(
    new Set(data.map((item) => item.vendor_name || item.vendor_id || 'N/A')),
  ).filter(Boolean);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('all');
    setSelectedVendor('all');
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by model or product name..."
            className="pl-10 h-10 border-blue-100 focus:border-blue-400 focus:ring-blue-50 bg-white/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="h-10 border-blue-100 bg-white/50">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger className="h-10 border-blue-100 bg-white/50">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || selectedBrand !== 'all' || selectedVendor !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-10 px-3 text-slate-500 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-primary font-bold w-16">Photo</TableHead>
                <TableHead className="text-primary font-bold">Product</TableHead>
                <TableHead className="text-primary font-bold">Model</TableHead>
                <TableHead className="text-primary font-bold">Brand</TableHead>
                <TableHead className="text-primary font-bold">Vendor</TableHead>
                <TableHead className="text-primary font-bold">Quantity</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Loading inventory...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length > 0 ? (
                filteredData.map((item: InventoryItem, index) => (
                  <TableRow
                    key={
                      (item as { id?: string }).id ||
                      `${item.model_id}-${item.warehouse_id}-${index}`
                    }
                    className={index % 2 ? 'bg-blue-50/30' : 'bg-card'}
                  >
                    <TableCell>
                      <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm text-black">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-[8px] text-gray-400 font-bold uppercase">
                            No Image
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary ">
                      {item.product_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-slate-600">{item.model_name || 'N/A'}</TableCell>
                    <TableCell className="text-slate-600">{item.brand || '-'}</TableCell>
                    <TableCell className="text-slate-600">
                      {item.vendor_name || item.vendor_id || 'N/A'}
                    </TableCell>
                    <TableCell className="font-bold text-primary">{item.total_qty}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="bg-gray-100 p-3 rounded-full text-black">
                        <span className="text-2xl">📦</span>
                      </div>
                      <p className="font-medium">No inventory found</p>
                      <p className="text-xs text-gray-400">
                        Try adjusting your filters or search term.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
