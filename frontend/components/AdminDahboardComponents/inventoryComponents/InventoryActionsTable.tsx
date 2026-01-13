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
    date: '2023-12-30',
    model: 'Canon ImageRunner 2630',
    branch: 'North Wing',
    vendor: 'TechSolutions',
    action: 'Rented',
    approvedBy: 'John Doe',
  },
  {
    date: '2023-12-28',
    model: 'HP LaserJet Pro M404dn',
    branch: 'Main Branch',
    vendor: 'OfficeDepot',
    action: 'Returned',
    approvedBy: 'Jane Smith',
  },
  {
    date: '2023-12-25',
    model: 'Xerox WorkCentre 3345',
    branch: 'East Wing',
    vendor: 'Xerox Direct',
    action: 'Service',
    approvedBy: 'Mike Brown',
  },
  {
    date: '2023-12-20',
    model: 'Brother HL-L2350DW',
    branch: 'Main Branch',
    vendor: 'TechSolutions',
    action: 'Lease Renewed',
    approvedBy: 'Sarah Lee',
  },
];

export default function InventoryActionsTable() {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
            <TableHead className="font-semibold text-gray-700">Date</TableHead>
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Branch / Warehouse</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700">Action</TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">Approved By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-gray-50/50 ${idx % 2 !== 0 ? 'bg-blue-50/20' : 'bg-white'}`}
            >
              <TableCell className="text-gray-500 text-sm whitespace-nowrap">{item.date}</TableCell>
              <TableCell className="font-medium text-gray-900">{item.model}</TableCell>
              <TableCell className="text-gray-600">{item.branch}</TableCell>
              <TableCell className="text-gray-600">{item.vendor}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.action === 'Rented'
                      ? 'bg-green-100 text-green-700'
                      : item.action === 'Returned'
                        ? 'bg-gray-100 text-gray-700'
                        : item.action === 'Service'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.action}
                </span>
              </TableCell>
              <TableCell className="text-right text-gray-600">{item.approvedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
