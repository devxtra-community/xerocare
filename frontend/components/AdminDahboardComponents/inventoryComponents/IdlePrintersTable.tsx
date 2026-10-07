import { useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
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
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  useEffect(() => {
    setTotal(data.length);
  }, [setTotal]);

  const currentData = data.slice((page - 1) * limit, page * limit);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-foreground">Printer Model</TableHead>
            <TableHead className="font-semibold text-foreground">Current Location</TableHead>
            <TableHead className="font-semibold text-foreground">Vendor</TableHead>
            <TableHead className="font-semibold text-foreground text-center">Idle Days</TableHead>
            <TableHead className="font-semibold text-foreground">Last Used</TableHead>
            <TableHead className="font-semibold text-foreground">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50 ${idx % 2 !== 0 ? 'bg-primary/10' : 'bg-card'}`}
            >
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
              <TableCell className="text-foreground">{item.branch}</TableCell>
              <TableCell className="text-foreground">{item.vendor}</TableCell>
              <TableCell className="text-center font-bold text-warning">
                {item.idleDays} Days
              </TableCell>
              <TableCell className="text-foreground">{item.lastUsed}</TableCell>
              <TableCell className="text-foreground text-sm italic">{item.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
