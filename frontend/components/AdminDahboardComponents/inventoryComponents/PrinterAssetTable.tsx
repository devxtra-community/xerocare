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
    model: 'Canon ImageRunner 2630',
    category: 'Lease',
    branch: 'Main Branch',
    vendor: 'TechSolutions',
    total: 10,
    active: 8,
    available: 1,
    service: 0,
    idle: 1,
  },
  {
    model: 'HP LaserJet Pro M404dn',
    category: 'Sale',
    branch: 'North Wing',
    vendor: 'OfficeDepot',
    total: 15,
    active: 12,
    available: 3,
    service: 0,
    idle: 0,
  },
  {
    model: 'Xerox WorkCentre 3345',
    category: 'Rental',
    branch: 'East Wing',
    vendor: 'Xerox Direct',
    total: 8,
    active: 5,
    available: 0,
    service: 2,
    idle: 1,
  },
  {
    model: 'Brother HL-L2350DW',
    category: 'Lease',
    branch: 'Main Branch',
    vendor: 'TechSolutions',
    total: 20,
    active: 18,
    available: 2,
    service: 0,
    idle: 0,
  },
  {
    model: 'Kyocera Ecosys M2540dw',
    category: 'Rental',
    branch: 'West Wing',
    vendor: 'PrintMasters',
    total: 12,
    active: 9,
    available: 1,
    service: 1,
    idle: 1,
  },
];

export default function PrinterAssetTable() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50/50 hover:bg-muted/50/50">
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Category</TableHead>
            <TableHead className="font-semibold text-gray-700">Owning Branch</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center">Total</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center text-blue-600">
              Active
            </TableHead>
            <TableHead className="font-semibold text-gray-700 text-center text-green-600">
              Avail
            </TableHead>
            <TableHead className="font-semibold text-gray-700 text-center text-red-600">
              Svc
            </TableHead>
            <TableHead className="font-semibold text-gray-700 text-center text-orange-500">
              Idle
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
              <TableCell className="text-gray-600">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.category === 'Lease'
                      ? 'bg-purple-100 text-purple-700'
                      : item.category === 'Rental'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.category}
                </span>
              </TableCell>
              <TableCell className="text-gray-600">{item.branch}</TableCell>
              <TableCell className="text-gray-600">{item.vendor}</TableCell>
              <TableCell className="text-center font-bold text-foreground">{item.total}</TableCell>
              <TableCell className="text-center font-medium text-blue-600">{item.active}</TableCell>
              <TableCell className="text-center font-medium text-green-600">
                {item.available}
              </TableCell>
              <TableCell className="text-center font-medium text-red-600">{item.service}</TableCell>
              <TableCell className="text-center font-medium text-orange-500">{item.idle}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
