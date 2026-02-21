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
import {
  sparePartService,
  SparePartInventoryItem,
  PaginatedResponse,
} from '@/services/sparePartService';
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

import Pagination from '@/components/Pagination';

/**
 * Dashboard table displaying a snapshot of branch inventory.
 * Lists models, brands, vendors, and their current stock levels.
 * Provides a quick overview of available products.
 */
export default function DashbordTable() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setMounted(true);
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

        const sparesRes = (spareParts as PaginatedResponse<SparePartInventoryItem>).data || [];
        const spares = sparesRes.map((s: SparePartInventoryItem) => ({
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrand, selectedVendor]);

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

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Product
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search model or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Filter by Brand
            </label>
            {mounted && (
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                  <SelectValue placeholder="All Brands" />
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
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Filter by Vendor
            </label>
            {mounted && (
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                  <SelectValue placeholder="All Vendors" />
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
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 md:pt-0">
          {(searchQuery || selectedBrand !== 'all' || selectedVendor !== 'all') && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="h-9 text-gray-500 border-gray-200 hover:bg-gray-50 text-xs px-3"
              title="Clear Filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-gray-100 p-4">
        <div className="overflow-x-auto mb-4">
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
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item: InventoryItem, index) => (
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
        {totalPages > 1 && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>
    </div>
  );
}
