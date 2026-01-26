'use client';

import { useState, useEffect } from 'react';
import {} from // Table imports removed as they were unused
'@/components/ui/table';
import { Product, getAllProducts } from '@/lib/product';

export default function ProductsTable() {
  const [page, setPage] = useState(1);
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

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-[260px] flex flex-col">
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
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">
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
                <td colSpan={4} className="text-center py-6 text-xs text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs flex-shrink-0">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &lt;
        </button>

        {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => {
          const pageNum = i + 1;
          if (pageNum === 4 && totalPages > 4) {
            return (
              <span key="ellipsis" className="px-0.5 sm:px-1">
                ...
              </span>
            );
          }
          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={`px-1.5 sm:px-2 py-0.5 rounded-md transition ${
                page === pageNum ? 'bg-primary text-white' : 'border hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {totalPages > 4 && <button onClick={() => setPage(totalPages)}>{totalPages}</button>}

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
