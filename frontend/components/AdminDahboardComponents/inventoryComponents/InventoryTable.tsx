'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const criticalStockData = [
  {
    id: 'PROD-001',
    productName: 'Surgical Gloves (Latex)',
    branch: 'Main Warehouse',
    currentStock: 120,
    reorderLevel: 200,
    status: 'Low Stock',
  },
  {
    id: 'PROD-002',
    productName: 'Paracetamol 500mg',
    branch: 'Downtown Clinic',
    currentStock: 0,
    reorderLevel: 100,
    status: 'Out of Stock',
  },
  {
    id: 'PROD-003',
    productName: 'N95 Masks',
    branch: 'North Wing',
    currentStock: 45,
    reorderLevel: 50,
    status: 'Low Stock',
  },
  {
    id: 'PROD-004',
    productName: 'Syringes 5ml',
    branch: 'Main Warehouse',
    currentStock: 5000,
    reorderLevel: 1000,
    status: 'Overstock',
  },
  {
    id: 'PROD-005',
    productName: 'Bandages',
    branch: 'East Wing',
    currentStock: 15,
    reorderLevel: 30,
    status: 'Low Stock',
  },
];

export default function InventoryTable() {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50/50">
        <h3 className="font-semibold text-lg">Critical Stock Alerts</h3>
        <p className="text-xs text-muted-foreground">Items requiring immediate attention</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
            <TableHead className="font-medium text-gray-500">Product Name</TableHead>
            <TableHead className="font-medium text-gray-500">Branch</TableHead>
            <TableHead className="font-medium text-gray-500 text-center">Current Stock</TableHead>
            <TableHead className="font-medium text-gray-500 text-center">Reorder Level</TableHead>
            <TableHead className="font-medium text-gray-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criticalStockData.map((item) => (
            <TableRow key={item.id} className="hover:bg-gray-50/50">
              <TableCell className="font-medium text-gray-900">{item.productName}</TableCell>
              <TableCell className="text-gray-600">{item.branch}</TableCell>
              <TableCell className="text-center font-medium">{item.currentStock}</TableCell>
              <TableCell className="text-center text-gray-600">{item.reorderLevel}</TableCell>
              <TableCell>
                <div
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    item.status === 'Out of Stock'
                      ? 'bg-red-100 text-red-800'
                      : item.status === 'Low Stock'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {item.status}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
