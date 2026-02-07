'use client';

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
    model: 'Xerox WorkCentre 3345',
    vendor: 'Xerox Direct',
    count: 3,
    downtime: 5,
    cost: '$450',
  },
  {
    model: 'Canon ImageRunner 2630',
    vendor: 'TechSolutions',
    count: 1,
    downtime: 1,
    cost: '$120',
  },
  {
    model: 'Kyocera Ecosys M2540dw',
    vendor: 'PrintMasters',
    count: 4,
    downtime: 8,
    cost: '$680',
  },
];

export default function ServiceImpactTable() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50/50 hover:bg-muted/50/50">
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center">Service Count</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center">
              Total Downtime
            </TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">
              Avg Repair Cost
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50/50 ${idx % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}`}
            >
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
              <TableCell className="text-gray-600">{item.vendor}</TableCell>
              <TableCell className="text-center">{item.count}</TableCell>
              <TableCell className="text-center text-red-600 font-medium">
                {item.downtime} Days
              </TableCell>
              <TableCell className="text-right font-medium">{item.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
