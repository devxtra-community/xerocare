'use client';
import { useState } from 'react';

const ITEMS_PER_PAGE = 5;

export default function WarehouseTable() {
  const [page, setPage] = useState(1);

  const data = [
    {
      wearhouseName: 'First Store',
      branch: 'Ernakulam',
      Location: 'ABC Street',
      productStock: '3456',
    },
    {
      wearhouseName: 'Central Hub',
      branch: 'Kochi',
      Location: 'MG Road',
      productStock: '2890',
    },
    {
      wearhouseName: 'North Depot',
      branch: 'Thrissur',
      Location: 'Round North',
      productStock: '4120',
    },
    {
      wearhouseName: 'South Warehouse',
      branch: 'Trivandrum',
      Location: 'Kazhakkoottam',
      productStock: '1980',
    },
    {
      wearhouseName: 'Metro Store',
      branch: 'Calicut',
      Location: 'SM Street',
      productStock: '3650',
    },
  ];

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-[260px] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-2 px-2">
                WAREHOUSE
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-2 px-2">
                BRANCH
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-2 px-2">
                LOCATION
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-2 px-2">
                STOCK
              </th>
            </tr>
          </thead>

          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} className={index % 2 === 1 ? 'bg-sky-100/60' : ''}>
                <td className="py-2 px-2 text-[10px] sm:text-xs font-medium text-gray-900">
                  {item.wearhouseName}
                </td>
                <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">{item.branch}</td>
                <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">{item.Location}</td>
                <td className="py-2 px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.productStock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              page === num ? 'bg-blue-900 text-white' : 'border hover:bg-gray-50'
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
