'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const data = [
  {
    product: 'HP LaserJet Pro',
    model: 'M404dn',
    quantity: 15,
    amount: '₹45,000',
    date: '2026-01-01',
    employee: 'Rahul Sharma',
    serialNumber: 'SN-001234',
    sellingType: 'Sale',
    billNumber: 'INV/2026/001',
    status: 'Completed',
  },
  {
    product: 'Canon PIXMA',
    model: 'G3010',
    quantity: 8,
    amount: '₹12,800',
    date: '2026-01-01',
    employee: 'Priya Patel',
    serialNumber: 'SN-005678',
    sellingType: 'Rent',
    billNumber: 'INV/2026/002',
    status: 'Pending',
  },
  {
    product: 'Epson EcoTank',
    model: 'L3210',
    quantity: 12,
    amount: '₹31,500',
    date: '2026-01-02',
    employee: 'Amit Verma',
    serialNumber: 'SN-009012',
    sellingType: 'Lease',
    billNumber: 'INV/2026/003',
    status: 'Completed',
  },
  {
    product: 'Brother HL-L2350DW',
    model: 'Monochrome',
    quantity: 5,
    amount: '₹14,400',
    date: '2026-01-03',
    employee: 'Sneha Gupta',
    serialNumber: 'SN-003456',
    sellingType: 'Sale',
    billNumber: 'INV/2026/004',
    status: 'In Progress',
  },
];

export default function SalesSummaryTable() {
  return (
    <div className="rounded-2xl bg-white p-2 sm:p-4 shadow-sm w-full h-full flex flex-col border border-primary/10 overflow-hidden">
      {/* Scrollable Container with Custom Slider Styling */}
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
        <Table className="min-w-[900px] border-collapse relative">
          <TableHeader>
            <TableRow className="border-b border-primary/10 hover:bg-transparent">
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[140px]">
                Product Name
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[90px]">
                Serial Number
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Mode
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[60px]">
                Quantity
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Sales Type
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Amount
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[110px]">
                Assigned Employee
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[100px]">
                Bill Number
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[90px]">
                Sale Status
              </TableHead>
              <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2 w-[80px]">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                className="hover:bg-primary/5 transition-colors border-b border-primary/5"
              >
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm font-semibold text-primary">
                  {row.product}
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.serialNumber}
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.model}
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.quantity}
                </TableCell>
                <TableCell className="py-3 px-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-[10px] px-2 py-0.5 pointer-events-none">
                    {row.sellingType}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm font-bold text-primary">
                  {row.amount}
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.employee}
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.billNumber}
                </TableCell>
                <TableCell className="py-3 px-2">
                  <Badge
                    variant={row.status === 'Completed' ? 'default' : 'secondary'}
                    className={`text-[10px] px-2 py-0.5 pointer-events-none ${
                      row.status === 'Completed'
                        ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                        : row.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                          : 'bg-primary/10 text-primary hover:bg-primary/15 border-primary/20'
                    }`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                  {row.date}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: oklch(var(--muted));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: oklch(var(--primary));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: oklch(var(--primary) / 0.8);
        }
      `}</style>
    </div>
  );
}
