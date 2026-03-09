'use client';

import { useState, useEffect } from 'react';
import {} from // Table imports removed as they were unused
'@/components/ui/table';
import { Product, getAllProducts } from '@/lib/product';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

/**
 * Dashboard widget displaying recent products and their stock levels.
 * Shows product name, total aggregated quantity, price, and creation date.
 */
export default function ProductsTable() {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);
  const [data, setData] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const products = await getAllProducts();
        setData(products);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const getTotalStock = (p: Product) =>
    p.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;

  useEffect(() => {
    setTotal(data.length);
  }, [data.length, setTotal]);

  const currentData = data.slice((page - 1) * limit, page * limit);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[280px] flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
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
                    {getTotalStock(item)}
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
                <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
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
