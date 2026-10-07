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
            <TableHead className="font-semibold text-foreground">Date</TableHead>
            <TableHead className="font-semibold text-foreground">Printer Model</TableHead>
            <TableHead className="font-semibold text-foreground">Branch / Warehouse</TableHead>
            <TableHead className="font-semibold text-foreground">Vendor</TableHead>
            <TableHead className="font-semibold text-foreground">Action</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Approved By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50 ${idx % 2 !== 0 ? 'bg-primary/10' : 'bg-card'}`}
            >
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {item.date}
              </TableCell>
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
              <TableCell className="text-foreground">{item.branch}</TableCell>
              <TableCell className="text-foreground">{item.vendor}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.action === 'Rented'
                      ? 'bg-success/10 text-success'
                      : item.action === 'Returned'
                        ? 'bg-muted text-foreground'
                        : item.action === 'Service'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                  }`}
                >
                  {item.action}
                </span>
              </TableCell>
              <TableCell className="text-right text-foreground">{item.approvedBy}</TableCell>
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
