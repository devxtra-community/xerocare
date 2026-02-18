'use client';
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Eye } from 'lucide-react';
import { inventoryService, InventoryItem } from '@/services/inventoryService';

interface InventoryTableProps {
  mode?: 'global' | 'branch' | 'warehouse';
  warehouseId?: string;
}

/**
 * Comprehensive Inventory Table for Managers.
 * Supports viewing inventory globally, by branch, or by warehouse.
 * Displays detailed stock information: Total, Available, Rented, and Damaged quantities along with Model and Brand details.
 */
export default function InventoryTable({ mode = 'global', warehouseId }: InventoryTableProps) {
  // const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let res: InventoryItem[] = [];
        if (mode === 'branch') {
          res = await inventoryService.getBranchInventory();
        } else if (mode === 'warehouse' && warehouseId) {
          res = await inventoryService.getWarehouseInventory(warehouseId);
        } else {
          res = await inventoryService.getGlobalInventory();
        }
        setData(res);
      } catch (error) {
        console.error('InventoryTable: Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode, warehouseId]);

  // Filtering logic
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
    const matchesVendor =
      selectedVendor === 'all' || (item.vendor_name || 'N/A') === selectedVendor;

    return matchesSearch && matchesBrand && matchesVendor;
  });

  // Extract unique brands and vendors for filters
  const brands = Array.from(new Set(data.map((item) => item.brand))).filter(Boolean);
  const vendors = Array.from(new Set(data.map((item) => item.vendor_name || 'N/A'))).filter(
    Boolean,
  );

  const total = filteredData.length;
  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('all');
    setSelectedVendor('all');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by model or product name..."
            className="pl-10 h-10 border-blue-100 focus:border-blue-400 focus:ring-blue-50"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select
              value={selectedBrand}
              onValueChange={(val) => {
                setSelectedBrand(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-blue-100">
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
            <Select
              value={selectedVendor}
              onValueChange={(val) => {
                setSelectedVendor(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-blue-100">
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

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50/50 hover:bg-transparent">
                {mode !== 'warehouse' && (
                  <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                    Warehouse
                  </TableHead>
                )}
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Model Name
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Product Name
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                  Brand
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Total Qty
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Available
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Rented
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                  Damaged
                </TableHead>
                <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-right pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : currentData.length > 0 ? (
                currentData.map((item, idx) => (
                  <TableRow
                    key={idx}
                    className={`transition-colors h-11 ${idx % 2 === 0 ? 'bg-card' : 'bg-blue-50/20'}`}
                  >
                    {mode !== 'warehouse' && (
                      <TableCell className="px-3 py-1.5 font-medium text-foreground text-[12px]">
                        {item.warehouse_name || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell className="px-3 py-1.5 font-medium text-primary text-[12px]">
                      {item.model_name}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.product_name || 'N/A'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                      {item.brand}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center font-bold text-[12px]">
                      {item.total_qty}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {item.available_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {item.rented_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {item.damaged_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right pr-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="bg-gray-100 p-3 rounded-full">
                        <span className="text-2xl">📦</span>
                      </div>
                      <p className="font-medium">No stock found</p>
                      <p className="text-xs text-gray-400">Inventory items will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-card text-xs">
          Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of{' '}
          {total} items
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-muted/50 text-[11px]"
            >
              Prev
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  page === i + 1
                    ? 'bg-primary text-white font-bold'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-muted/50 text-[11px]"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
