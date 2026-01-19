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
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { useEffect } from 'react';
import api from '@/lib/api';
import { Product } from '@/lib/product';

interface InventoryItem {
  id: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  sku: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  product: Product;
}

export default function InventoryTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Backend returns all data in { success: true, data: [...] }
        // Pagination is handled client-side for now
        const res = await api.get<{ success: boolean; data: InventoryItem[] }>(`/i/inventory`);
        if (res.data.success) {
          setData(res.data.data);
          setTotal(res.data.data.length);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []); // Run once on mount

  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Image
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Product Name
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Brand / Model
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Category
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                SKU
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Serial No
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-center">
                Qty
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Vendor
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Cost
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Price
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-bold text-primary uppercase py-2 px-3 text-right pr-4">
                Warranty
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length > 0 ? (
              currentData.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className={`transition-colors h-11 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}`}
                >
                  <TableCell className="px-3 py-1.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm relative">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-[8px] text-gray-400 font-bold uppercase">No IMG</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 font-medium text-gray-900 text-[12px]">
                    {item.product.name}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                    {item.product.brand} / {item.product.model?.model_name || '-'}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700`}
                    >
                      Product
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-gray-500 font-mono text-[9px]">
                    {item.sku || '-'}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-gray-500 text-[10px]">
                    {item.product.serial_no}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-center font-bold text-[12px]">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-gray-600 text-[11px]">
                    {item.product.vendor_id}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-gray-900 font-medium text-[11px]">
                    {/* Cost not available in Inventory entity directly, assuming unitPrice */}₹{' '}
                    {item.unitPrice}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-primary font-bold text-[12px]">
                    ₹ {item.product.sale_price}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        item.quantity > 5
                          ? 'bg-green-100 text-green-700'
                          : item.quantity > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right pr-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] text-gray-500">-</span>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5"
                          onClick={() => router.push(`/manager/inventory/${item.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-6 text-gray-500">
                  No inventory items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-white text-xs">
        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total}{' '}
        items
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                page === i + 1
                  ? 'bg-primary text-white font-bold'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
