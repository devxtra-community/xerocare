'use client';

import { useState, useEffect, useMemo } from 'react';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import { getBranches, Branch } from '@/lib/branch';
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
 * Dashboard widget displaying warehouse list and capacity.
 * Shows location, associated branch, and storage capacity for each warehouse.
 */
export default function WarehouseTable({ selectedYear }: { selectedYear: number | 'all' }) {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        const res = await getWarehouses();
        let data = res.data || [];

        // Filter by year if not 'all'
        if (selectedYear !== 'all') {
          data = data.filter((w: Warehouse) => {
            const date = new Date(w.createdAt);
            return date.getFullYear() === selectedYear;
          });
        }

        setWarehouses(data);
      } catch (error) {
        console.error('Failed to fetch warehouses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, [selectedYear]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getBranches();
        setBranches(res.data || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    fetchBranches();
  }, []);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const matchesSearch =
        w.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = selectedBranch === 'all' || w.branch?.name === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [warehouses, searchTerm, selectedBranch]);

  useEffect(() => {
    setTotal(filteredWarehouses.length);
  }, [filteredWarehouses.length, setTotal]);

  const currentData = filteredWarehouses.slice((page - 1) * limit, page * limit);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[340px] flex flex-col">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search warehouse or location..."
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
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            Loading...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-2 px-2">
                  WAREHOUSE
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-2 px-2">
                  BRANCH
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-2 px-2">
                  LOCATION
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-2 px-2">
                  CAPACITY
                </th>
              </tr>
            </thead>

            <tbody>
              {currentData.length > 0 ? (
                currentData.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}>
                    <td className="py-2 px-2 text-[10px] sm:text-xs font-medium text-foreground">
                      {item.warehouseName}
                    </td>
                    <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">
                      {item.branch?.name || 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">
                      {item.location}
                    </td>
                    <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">
                      {item.capacity}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    No warehouses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
