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

interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
  total: number;
}

/**
 * Inventory Table focused on critical stock alerts.
 * Identifies items with stock levels below a reorder threshold (e.g., < 20).
 * Helps prioritize restocking actions to prevent stockouts.
 */
export default function InventoryTable() {
  const [data, setData] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch inventory items, assuming we want to see general stock not just critical
        // Filtering for critical stock could be done here or via backend query
        const res = await api.get<InventoryResponse>(`/i/inventory?limit=50`);
        if (res.data.success) {
          // Filter for low stock for this specific "Critical Stock" view if desired,
          // but usually users want to see everything unless specified.
          // The mock was "Critical Stock Alerts", so let's filter for quantity < 20 (arbitrary threshold)
          // or just show all sorted by quantity.
          // For now showing all to ensure data visibility.
          const allItems = res.data.data;
          const lowStockItems = allItems.filter((item) => item.quantity < 20); // Example logic
          setData(lowStockItems.length > 0 ? lowStockItems : allItems); // Fallback to all if no low stock
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/50/50">
        <h3 className="font-semibold text-lg">Critical Stock Alerts</h3>
        <p className="text-xs text-muted-foreground">
          Items requiring immediate attention (Stock &lt; 20)
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50/50 hover:bg-muted/50/50">
            <TableHead className="font-medium text-muted-foreground">Product Name</TableHead>
            <TableHead className="font-medium text-muted-foreground">Warehouse ID</TableHead>
            <TableHead className="font-medium text-muted-foreground text-center">
              Current Stock
            </TableHead>
            <TableHead className="font-medium text-muted-foreground text-center">
              Reorder Level
            </TableHead>
            <TableHead className="font-medium text-muted-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50/50">
              <TableCell className="font-medium text-foreground">{item.product.name}</TableCell>
              <TableCell className="text-gray-600 truncate max-w-[150px]" title={item.warehouseId}>
                {item.warehouseId}
              </TableCell>
              <TableCell className="text-center font-medium">{item.quantity}</TableCell>
              <TableCell className="text-center text-gray-600">20</TableCell>
              <TableCell>
                <div
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    item.quantity === 0
                      ? 'bg-red-100 text-red-800'
                      : item.quantity < 20
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {item.quantity === 0
                    ? 'Out of Stock'
                    : item.quantity < 20
                      ? 'Low Stock'
                      : 'In Stock'}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                No inventory items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
