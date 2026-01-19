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
import { Product, getAllProducts } from '@/lib/product';

export default function DashbordTable() {
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

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-primary font-bold">Printer Name</TableHead>
            <TableHead className="text-primary font-bold">Serial Number</TableHead>
            <TableHead className="text-primary font-bold">Model</TableHead>
            <TableHead className="text-primary font-bold">Manufacture Date</TableHead>
            <TableHead className="text-primary font-bold">Company Name</TableHead>
            <TableHead className="text-primary font-bold">Vendor Name</TableHead>
            <TableHead className="text-primary font-bold">Stock</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRow key={item.id} className={index % 2 ? 'bg-sky-100/60' : ''}>
                <TableCell className="font-medium text-primary ">{item.name}</TableCell>
                <TableCell>{item.serial_no}</TableCell>
                <TableCell>{item.model?.model_name || '-'}</TableCell>
                <TableCell>{new Date(item.MFD).toLocaleDateString()}</TableCell>
                <TableCell>{item.brand}</TableCell>
                <TableCell>{item.vendor_id}</TableCell>
                <TableCell className="font-bold text-primary">{getTotalStock(item)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                No products found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
