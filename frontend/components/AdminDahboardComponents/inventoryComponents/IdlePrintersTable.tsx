import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/Pagination';

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

/**
 * Table displaying idle printers that are not currently in use.
 * Shows model, location, idle duration in days, and reason for inactivity.
 * Helps identify underutilized assets.
 */
export default function IdlePrintersTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50/50 hover:bg-muted/50/50">
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Current Location</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700 text-center">Idle Days</TableHead>
            <TableHead className="font-semibold text-gray-700">Last Used</TableHead>
            <TableHead className="font-semibold text-gray-700">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50/50 ${idx % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}`}
            >
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
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
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
