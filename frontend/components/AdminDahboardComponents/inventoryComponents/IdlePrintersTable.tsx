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
    branch: 'Main Branch',
    vendor: 'TechSolutions',
    idleDays: 45,
    lastUsed: '2023-11-15',
    reason: 'Project Ended',
  },
  {
    model: 'Xerox WorkCentre 3345',
    branch: 'East Wing',
    vendor: 'Xerox Direct',
    idleDays: 12,
    lastUsed: '2023-12-18',
    reason: 'Newer model preferred',
  },
  {
    model: 'Kyocera Ecosys M2540dw',
    branch: 'West Wing',
    vendor: 'PrintMasters',
    idleDays: 60,
    lastUsed: '2023-10-30',
    reason: 'Frequent jams',
  },
];

export default function IdlePrintersTable() {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Current Location</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center">Idle Days</TableHead>
            <TableHead className="font-semibold text-gray-700">Last Used</TableHead>
            <TableHead className="font-semibold text-gray-700">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-gray-50/50 ${idx % 2 !== 0 ? 'bg-blue-50/20' : 'bg-white'}`}
            >
              <TableCell className="font-medium text-gray-900">{item.model}</TableCell>
              <TableCell className="text-gray-600">{item.branch}</TableCell>
              <TableCell className="text-gray-600">{item.vendor}</TableCell>
              <TableCell className="text-center font-bold text-orange-600">
                {item.idleDays} Days
              </TableCell>
              <TableCell className="text-gray-600">{item.lastUsed}</TableCell>
              <TableCell className="text-gray-600 text-sm italic">{item.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
