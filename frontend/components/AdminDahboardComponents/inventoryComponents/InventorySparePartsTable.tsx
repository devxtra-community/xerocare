'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, FilterX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sparePartService, SparePartInventoryItem } from '@/services/sparePartService';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Branch } from '@/lib/branch';

interface Warehouse {
  id: string;
  warehouseName: string;
}

interface FilterOption {
  id: string;
  name: string;
}

/**
 * Admin-side Spare Parts Inventory Table.
 * Provides a company-wide view of spare parts with filtering by branch, warehouse, and brand.
 */
export default function InventorySparePartsTable({
  selectedYear,
}: {
  selectedYear: number | 'all';
}) {
  const [data, setData] = useState<SparePartInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter States
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // Options States
  const [warehouses, setWarehouses] = useState<FilterOption[]>([]);
  const [branches, setBranches] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sparePartService.getSpareParts({
        search: search.trim() || undefined,
        branch: branchFilter !== 'all' ? branchFilter : undefined,
        year: selectedYear,
        // Backend listSpareParts doesn't directly support warehouse filter yet,
        // but we can add it to the params and handle it if the API is updated later.
        // For now, we'll implement it as client-side or assume backend might support it.
      });

      let filtered = res.data || [];

      // Client-side filtering for Warehouse since backend getInventory doesn't strictly take warehouseId yet
      if (warehouseFilter !== 'all') {
        filtered = filtered.filter((item) => item.warehouse_name === warehouseFilter);
      }

      // Client-side brand filter if not handled by backend
      if (brandFilter !== 'all') {
        filtered = filtered.filter((item) => item.brand === brandFilter);
      }

      setData(filtered);
    } catch (e) {
      console.error('Failed to fetch spare parts:', e);
    } finally {
      setLoading(false);
    }
  }, [search, branchFilter, warehouseFilter, brandFilter, selectedYear]);

  const fetchOptions = useCallback(async () => {
    try {
      // Repurpose existing endpoints where possible
      const [whRes, brRes] = await Promise.all([api.get('/i/warehouses'), api.get('/i/branch')]);

      if (whRes.data.success) {
        setWarehouses(whRes.data.data.map((w: Warehouse) => ({ id: w.id, name: w.warehouseName })));
      }
      if (brRes.data.success) {
        setBranches(brRes.data.data.map((b: Branch) => ({ id: b.id, name: b.name })));
      }

      // Get unique brands from current data or another endpoint if available
      // For now, we'll derive it from the total set of parts
      const partsRes = await sparePartService.getSpareParts({ limit: 1000 });
      const uniqueBrands = Array.from(
        new Set(partsRes.data.map((p) => p.brand).filter(Boolean)),
      ).sort();
      setBrands(uniqueBrands);
    } catch (e) {
      console.error('Failed to fetch filter options:', e);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearch('');
    setWarehouseFilter('all');
    setBranchFilter('all');
    setBrandFilter('all');
    setPage(1);
  };

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Part Name / Code
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search spare parts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Warehouse
            </label>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Branch
            </label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  // Using name for matching with branch_name from raw results if needed,
                  // but backend getInventory now takes branchId.
                  // We should ideally use ID for the filter and pass it to backend.
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Brand
            </label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4 md:pt-0">
          <Button
            size="sm"
            variant="outline"
            onClick={clearFilters}
            className="h-9 text-gray-500 border-gray-200 hover:bg-gray-50 text-xs px-3"
            title="Clear Filters"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Part Name
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Item Code
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Brand
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Branch
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Warehouse
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  In Stock
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Unit Price
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading spare parts...
                  </TableCell>
                </TableRow>
              ) : currentData.length > 0 ? (
                currentData.map((item, index) => (
                  <TableRow
                    key={`${item.id}-${index}`}
                    className={`hover:bg-muted/50/30 transition-colors ${index % 2 ? 'bg-sky-100/60' : ''}`}
                  >
                    <TableCell className="px-6 py-4 text-foreground font-medium">
                      {item.part_name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600 font-mono text-[11px]">
                      {item.item_code}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600 font-medium">
                      {item.brand}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-blue-700 font-bold text-[11px]">
                      {item.branch_name || 'N/A'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600">
                      {item.warehouse_name || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.quantity > 10
                            ? 'bg-green-100 text-green-700'
                            : item.quantity > 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-semibold text-gray-700">
                      {formatCurrency(item.price || 0)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No spare parts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-card text-primary font-bold">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} of{' '}
            {data.length} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-[11px] flex items-center justify-center transition-colors ${
                    page === i + 1 ? 'bg-primary text-white' : 'hover:bg-blue-50 text-blue-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
