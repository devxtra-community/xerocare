'use client';
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Edit2 } from 'lucide-react';

const mockData = [
  {
    id: '1',
    name: 'HP LaserJet Pro',
    brandModel: 'HP / M404n',
    category: 'Printer',
    sku: 'PRN-HP-M404',
    serialNumber: 'SN12345678',
    quantity: 15,
    vendor: 'HP India',
    purchaseCost: '₹ 12,000',
    sellingPrice: '₹ 15,500',
    status: 'In Stock',
    warranty: '2026-12-31',
  },
  {
    id: '2',
    name: 'Canon Toner Cartridge',
    brandModel: 'Canon / G-27',
    category: 'Consumable',
    sku: 'CON-CAN-G27',
    serialNumber: 'N/A',
    quantity: 5,
    vendor: 'Canon Sales',
    purchaseCost: '₹ 2,500',
    sellingPrice: '₹ 3,200',
    status: 'Low Stock',
    warranty: 'N/A',
  },
  {
    id: '3',
    name: 'Printer Fuser Unit',
    brandModel: 'Brother / B-FU',
    category: 'Spare',
    sku: 'SPR-BRT-FU',
    serialNumber: 'SN98765432',
    quantity: 0,
    vendor: 'Brother Corp',
    purchaseCost: '₹ 4,500',
    sellingPrice: '₹ 6,000',
    status: 'Out of Stock',
    warranty: '2025-06-15',
  },
  // Add more mock data as needed
];

export default function InventoryTable() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(mockData.length / itemsPerPage);
  const currentData = mockData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Product Name</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Brand / Model</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Category</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">SKU</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Serial No</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3 text-center">Qty</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Vendor</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Cost</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Price</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3">Status</TableHead>
              <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-2 px-3 text-right pr-4">Warranty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, idx) => (
              <TableRow key={item.id} className={`transition-colors h-11 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}`}>
                <TableCell className="px-3 py-1.5 font-medium text-gray-900 text-[12px]">{item.name}</TableCell>
                <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">{item.brandModel}</TableCell>
                <TableCell className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                    item.category === 'Printer' ? 'bg-purple-100 text-purple-700' :
                    item.category === 'Consumable' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-gray-500 font-mono text-[9px]">{item.sku}</TableCell>
                <TableCell className="px-3 py-1.5 text-gray-500 text-[10px]">{item.serialNumber}</TableCell>
                <TableCell className="px-3 py-1.5 text-center font-bold text-[12px]">{item.quantity}</TableCell>
                <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">{item.vendor}</TableCell>
                <TableCell className="px-3 py-1.5 text-gray-900 font-medium text-[11px]">{item.purchaseCost}</TableCell>
                <TableCell className="px-3 py-1.5 text-primary font-bold text-[12px]">{item.sellingPrice}</TableCell>
                <TableCell className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    item.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                    item.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right pr-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] text-gray-500">{item.warranty}</span>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-white text-xs">
        <p className="text-gray-500">
          Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, mockData.length)} of {mockData.length} items
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-gray-50 text-[11px]"
          >
            Prev
          </Button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                page === i + 1 ? 'bg-primary text-white font-bold' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-gray-50 text-[11px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
