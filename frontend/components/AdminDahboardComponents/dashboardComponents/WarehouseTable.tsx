'use client';

import { useState, useEffect } from 'react';
import { getWarehouses, Warehouse } from '@/lib/warehouse';

const ITEMS_PER_PAGE = 5;

/**
 * Dashboard widget displaying warehouse list and capacity.
 * Shows location, associated branch, and storage capacity for each warehouse.
 */
export default function WarehouseTable({ selectedYear }: { selectedYear: number | 'all' }) {
  const [page, setPage] = useState(1);
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

  const totalPages = Math.ceil(warehouses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = warehouses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

      {/* Pagination */}
      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] sm:text-xs">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-2 py-0.5 disabled:opacity-40"
        >
          &lt;
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-2 py-0.5 rounded-md ${
              page === num ? 'bg-primary text-white' : 'border hover:bg-muted/50'
            }`}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-2 py-0.5 disabled:opacity-40"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
