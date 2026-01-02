'use client';

import { useState } from 'react';

export default function ProductsTable() {
  const [page, setPage] = useState(1);

  const data = [
    { name: 'Macbook Pro', qty: 2, price: '2999 AZN', date: '20.09.2024' },
    { name: 'Macbook Air', qty: 4, price: '1499 AZN', date: '19.09.2024' },
    { name: 'Iphone 15 Pro', qty: 15, price: '3999 AZN', date: '18.09.2024' },
    {
      name: 'Iphone 15 Pro Max',
      qty: 10,
      price: '4499 AZN',
      date: '19.09.2024',
    },
    { name: 'Iphone 15', qty: 12, price: '1999 AZN', date: '17.09.2024' },
    { name: 'Macbook Pro', qty: 2, price: '2999 AZN', date: '20.09.2024' },
    { name: 'Macbook Air', qty: 4, price: '1499 AZN', date: '19.09.2024' },
    { name: 'Iphone 15 Pro', qty: 15, price: '3999 AZN', date: '18.09.2024' },
    {
      name: 'Iphone 15 Pro Max',
      qty: 10,
      price: '4499 AZN',
      date: '19.09.2024',
    },
    { name: 'Iphone 15', qty: 12, price: '1999 AZN', date: '17.09.2024' },
    { name: 'Iphone 15', qty: 12, price: '1999 AZN', date: '17.09.2024' },
  ];

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-[260px] flex flex-col">
      <div className="flex-1 overflow-hidden">
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
            {currentData.map((item, index) => (
              <tr key={index} className={index % 2 === 1 ? 'bg-sky-100/60' : ''}>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.qty}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.price}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.date}
                </td>
              </tr>
            ))}
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
                page === pageNum ? 'bg-blue-900 text-white' : 'border hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {totalPages > 4 && (
          <button
            onClick={() => setPage(totalPages)}
            className={`px-1.5 sm:px-2 py-0.5 rounded-md border transition ${
              page === totalPages ? 'bg-primary text-white' : 'hover:bg-gray-50'
            }`}
          >
            {totalPages}
          </button>
        )}

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
