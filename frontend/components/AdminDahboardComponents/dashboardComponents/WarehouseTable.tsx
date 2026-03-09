'use client';

import { useState, useEffect } from 'react';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

/**
 * Dashboard widget displaying warehouse list and capacity.
 * Shows location, associated branch, and storage capacity for each warehouse.
 */
export default function WarehouseTable({ selectedYear }: { selectedYear: number | 'all' }) {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

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
    setTotal(warehouses.length);
  }, [warehouses.length, setTotal]);

  const currentData = warehouses.slice((page - 1) * limit, page * limit);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[280px] flex flex-col">
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
              {currentData.map((item, index) => (
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
              ))}
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
