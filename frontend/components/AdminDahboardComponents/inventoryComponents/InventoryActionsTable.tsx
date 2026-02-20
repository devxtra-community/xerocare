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

/**
 * Table displaying recent actionable inventory events.
 * Tracks printer rentals, returns, service requests, and lease renewals along with approvals.
 * Monitors operational activities related to inventory assets.
 */
export default function InventoryActionsTable() {
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
            <TableHead className="font-semibold text-gray-700">Date</TableHead>
            <TableHead className="font-semibold text-gray-700">Printer Model</TableHead>
            <TableHead className="font-semibold text-gray-700">Branch / Warehouse</TableHead>
            <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
            <TableHead className="font-semibold text-gray-700">Action</TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">Approved By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50/50 ${idx % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}`}
            >
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {item.date}
              </TableCell>
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
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
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
