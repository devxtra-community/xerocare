'use client';
import { useState } from 'react';
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
import Pagination from '@/components/Pagination';

const masterData = [
  {
    id: 'PROD-001',
    name: 'Surgical Gloves',
    sku: 'GLV-L-001',
    category: 'Consumables',
    warehouse: 'Main Wh.',
    totalStock: 5000,
    availableStock: 4800,
    status: 'In Stock',
  },
  {
    id: 'PROD-002',
    name: 'N95 Masks',
    sku: 'MSK-N95-002',
    category: 'PPE',
    warehouse: 'North Wing',
    totalStock: 3200,
    availableStock: 3000,
    status: 'In Stock',
  },
  {
    id: 'PROD-003',
    name: 'Paracetamol',
    sku: 'MED-PARA-003',
    category: 'Medicine',
    warehouse: 'Downtown',
    totalStock: 120,
    availableStock: 120,
    status: 'Low Stock',
  },
  {
    id: 'PROD-004',
    name: 'Syringes 5ml',
    sku: 'SYR-5ML-004',
    category: 'Consumables',
    warehouse: 'Main Wh.',
    totalStock: 2800,
    availableStock: 2500,
    status: 'In Stock',
  },
  {
    id: 'PROD-005',
    name: 'Bandages',
    sku: 'BND-STD-005',
    category: 'Consumables',
    warehouse: 'East Wing',
    totalStock: 15,
    availableStock: 15,
    status: 'Out of Stock',
  },
  // Add more rows if needed to demonstrate scroll or pagination
];

/**
 * Master table for inventory items (paginated view).
 * Displays detailed product information including SKU, category, warehouse location, and stock status.
 * Serves as the central registry for all inventory items.
 */
export default function InventoryMasterTable() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(masterData.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = masterData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full min-h-[260px] flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                SKU
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                CATEGORY
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                WAREHOUSE
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                STOCK
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                STATUS
              </TableHead>
              <TableHead className="text-right text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`border-none ${index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}`}
              >
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                  {item.name}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.sku}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.category}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {item.warehouse}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center font-bold text-gray-800">
                  {item.totalStock}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      item.status === 'Out of Stock'
                        ? 'bg-red-100 text-red-700'
                        : item.status === 'Low Stock'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-transparent">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-transparent">
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
