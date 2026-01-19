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

import { useEffect } from 'react';
import api from '@/lib/api';
// Using any for stock calculation for now as quick fix, better to import types properly
// import { InventoryItem } from ... (defined locally or imported)

interface InventoryItem {
  id: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  sku: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    model: { model_name: string };
    vendor_id: string;
  };
}

interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
  total: number;
}

export default function InventoryProductsTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryItem[]>([]);

  const ITEMS_PER_PAGE = 5;
  // Use data.length or total from API for pagination. For now using client-side slice on fetched data
  // but better to implement server side pagination.
  // Let's stick to client side pagination on "all" data or page size limit for consistency with previous pattern

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<InventoryResponse>('/i/inventory?limit=50');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                Product Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                Model
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                Active Stock
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-center">
                Damaged
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                Vendor
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6">
                Warehouse
              </TableHead>
              <TableHead className="text-xs font-semibold text-primary uppercase px-6 text-right pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={`hover:bg-gray-50/30 transition-colors ${index % 2 ? 'bg-sky-100/60' : ''}`}
                >
                  <TableCell className="px-6 py-4 font-medium text-gray-900">
                    {item.product.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">
                    {item.product.model?.model_name || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-gray-900">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${'bg-green-100 text-green-700'}`}
                    >
                      0
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">
                    {item.product.vendor_id}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="truncate max-w-[100px]" title={item.warehouseId}>
                        {item.warehouseId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  No inventory items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-white">
        <p className="text-xs text-gray-500">
          Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} of{' '}
          {data.length} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-[11px] flex items-center justify-center transition-colors ${
                  page === i + 1 ? 'bg-primary text-white' : 'hover:bg-blue-50 text-blue-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
