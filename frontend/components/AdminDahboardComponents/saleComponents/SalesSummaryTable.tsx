'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const data = [
  {
    productId: 'P-1001',
    product: 'MacBook',
    model: 'Pro',
    quantity: 12,
    price: '2999 AZN',
    month: 'September',
    year: 2024,
  },
  {
    productId: 'P-1002',
    product: 'iPhone',
    model: '15 Pro',
    quantity: 25,
    price: '3999 AZN',
    month: 'September',
    year: 2024,
  },
  {
    productId: 'P-1003',
    product: 'iPhone',
    model: '15',
    quantity: 18,
    price: '1999 AZN',
    month: 'August',
    year: 2024,
  },
  {
    productId: 'P-1004',
    product: 'MacBook',
    model: 'Air',
    quantity: 9,
    price: '1499 AZN',
    month: 'August',
    year: 2024,
  },
];

export default function SalesSummaryTable() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-full flex flex-col space-y-4">
      {/* Search Bar */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by Product, ID, or Model..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT ID
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                NAME
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                MODEL
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                QTY
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRICE
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                MONTH
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                YEAR
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((row, index) => (
              <tr key={index} className={index % 2 === 1 ? 'bg-sky-100/60' : ''}>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">
                  {row.productId}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">
                  {row.product}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.model}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.quantity}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.price}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.month}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
