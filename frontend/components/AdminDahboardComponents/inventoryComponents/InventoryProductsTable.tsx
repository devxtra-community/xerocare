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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Edit2, Search, FilterX } from 'lucide-react';
import api from '@/lib/api';

interface InventoryItem {
  id: string;
  model_no: string;
  model_name: string;
  product_name: string;
  brand: string;
  description: string;
  total_quantity: number;
  available_qty: number;
  rented_qty: number;
  lease_qty: number;
  damaged_qty: number;
  sold_qty: number;
  product_cost: number;
  warehouse_name: string;
  branch_name?: string;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
}

/**
 * Comprehensive Inventory Products Table with advanced filtering.
 * Displays all inventory items with filtering by product, warehouse, and branch.
 * Columns include model details, quantities (total/available/rented/damaged), and unit cost.
 * Allows drilling down into specific inventory segments.
 */
export default function InventoryProductsTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const ITEMS_PER_PAGE = 10;

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (productFilter) params.append('product', productFilter);
      if (warehouseFilter) params.append('warehouse', warehouseFilter);
      if (branchFilter) params.append('branch', branchFilter);

      const res = await api.get<InventoryResponse>(`/i/inventory?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    } finally {
      setLoading(false);
    }
  }, [productFilter, warehouseFilter, branchFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = () => {
    setPage(1);
    fetchData();
  };

  const clearFilters = () => {
    setProductFilter('');
    setWarehouseFilter('');
    setBranchFilter('');
    setPage(1);
    // Needed to reset data to initial state, triggering useEffect would be one way,
    // or calling fetchData directly after state updates (which might be async tricky)
    // For simplicity, we can just reload or call fetchData with empty params.
    // Ideally use a separate effect for filters or just call fetch.
    setTimeout(() => {
      // slight delay to ensure state update or just pass empty manually
      api.get<InventoryResponse>('/i/inventory').then((res) => {
        if (res.data.success) setData(res.data.data);
      });
    }, 0);
  };

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Product / Model
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search product..."
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Warehouse
            </label>
            <Input
              placeholder="Filter by warehouse..."
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Branch
            </label>
            <Input
              placeholder="Filter by branch..."
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4 md:pt-0">
          <Button
            size="sm"
            onClick={handleFilter}
            className="h-9 bg-primary text-white hover:bg-primary/90 text-xs px-4"
          >
            Apply Filters
          </Button>
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
                  Model No
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Model Name
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Product Name
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Brand
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                  Warehouse
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Total Qty
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Available
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Rented
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Damaged
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                  Cost
                </TableHead>
                <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : currentData.length > 0 ? (
                currentData.map((item, index) => (
                  <TableRow
                    key={`${item.model_no}-${item.warehouse_name}-${index}`}
                    className={`hover:bg-muted/50/30 transition-colors ${index % 2 ? 'bg-sky-100/60' : ''}`}
                  >
                    <TableCell className="px-6 py-4 font-medium text-foreground">
                      {item.model_no}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-foreground">
                      <div className="font-medium">{item.model_name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-foreground font-medium">
                      {item.product_name || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600">{item.brand || '-'}</TableCell>
                    <TableCell className="px-6 py-4 text-gray-600 font-medium">
                      {item.warehouse_name || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-bold text-blue-600">
                      {item.total_quantity}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {item.available_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {item.rented_qty + item.lease_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.damaged_qty > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-muted-foreground'
                        }`}
                      >
                        {item.damaged_qty}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-semibold text-gray-700">
                      ₹{item.product_cost?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No inventory items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-card">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} of{' '}
            {data.length} models
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
