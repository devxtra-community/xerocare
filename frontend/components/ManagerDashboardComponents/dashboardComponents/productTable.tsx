'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useEffect, useState } from 'react';
import { inventoryService, InventoryItem } from '@/services/inventoryService';

export default function DashbordTable() {
  const [data, setData] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventory = await inventoryService.getBranchInventory();
        setData(inventory);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-primary font-bold">Model</TableHead>
            <TableHead className="text-primary font-bold">Brand</TableHead>
            <TableHead className="text-primary font-bold">Vendor Name</TableHead>
            <TableHead className="text-primary font-bold">Stock</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRow
                key={`${item.model_id}-${item.warehouse_id}-${index}`}
                className={index % 2 ? 'bg-sky-100/60' : ''}
              >
                <TableCell className="font-medium text-primary ">
                  {item.model_name || 'N/A'}
                </TableCell>
                <TableCell>{item.brand || '-'}</TableCell>
                <TableCell>{item.vendor_name || item.vendor_id || 'N/A'}</TableCell>
                <TableCell className="font-bold text-primary">{item.total_qty}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No inventory found for this branch.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
