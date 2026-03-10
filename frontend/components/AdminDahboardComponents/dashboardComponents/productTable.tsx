'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, getAllProducts } from '@/lib/product';
import { getBranches, Branch } from '@/lib/branch';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import { usePagination } from '@/hooks/usePagination';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import Pagination from '@/components/Pagination';

/**
 * Dashboard widget displaying recent products and their stock levels.
 * Shows product name, total aggregated quantity, price, and creation date.
 */
export default function ProductsTable() {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);
  const [data, setData] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [products, branchRes, warehouseRes] = await Promise.all([
          getAllProducts(),
          getBranches(),
          getWarehouses(),
        ]);
        setData(products);
        setBranches(branchRes.data || []);
        setWarehouses(warehouseRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const warehouseToBranchMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach((w) => {
      if (w.id && w.branch?.name) {
        map[w.id] = w.branch.name;
      }
    });
    return map;
  }, [warehouses]);

  const getProductBranches = useCallback(
    (p: Product) => {
      const branchNames = new Set<string>();
      p.inventory?.forEach((inv) => {
        const bName = warehouseToBranchMap[inv.warehouseId];
        if (bName) branchNames.add(bName);
      });
      return Array.from(branchNames);
    },
    [warehouseToBranchMap],
  );

  const getBranchQuantity = (p: Product, branchName: string) => {
    if (branchName === 'all') {
      return p.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;
    }
    return (
      p.inventory?.reduce((sum, inv) => {
        const bName = warehouseToBranchMap[inv.warehouseId];
        return bName === branchName ? sum + inv.quantity : sum;
      }, 0) || 0
    );
  };

  const filteredData = useMemo(() => {
    return data.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const pBranches = getProductBranches(p);
      const matchesBranch = selectedBranch === 'all' || pBranches.includes(selectedBranch);
      return matchesSearch && matchesBranch;
    });
  }, [data, searchTerm, selectedBranch, getProductBranches]);

  useEffect(() => {
    setTotal(filteredData.length);
  }, [filteredData.length, setTotal]);

  const currentData = filteredData.slice((page - 1) * limit, page * limit);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[340px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[340px] flex flex-col">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search product..."
            className="pl-8 h-8 text-[11px] bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-full sm:w-[140px] h-8 text-[11px] bg-background/50 border-muted-foreground/20">
            <div className="flex items-center gap-2">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Branch" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Branches
            </SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.name} className="text-[11px]">
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                BRANCH
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                QTY
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRICE
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                DATE
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={item.id} className={index % 2 === 1 ? 'bg-sky-100/60' : ''}>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                    {item.name}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {selectedBranch === 'all'
                      ? getProductBranches(item).join(', ') || 'N/A'
                      : selectedBranch}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {getBranchQuantity(item, selectedBranch)}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {item.sale_price}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-auto pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
