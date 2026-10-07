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

/**
 * Summary table for printer assets categorized by model and usage type.
 * Segments printers into Sale, Lease, or Rental categories and tracks their operational status (Active/Available/Service/Idle).
 * Provides a clear overview of fleet composition and utilization.
 */
export default function PrinterAssetTable() {
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
            <TableHead className="font-semibold text-foreground">Category</TableHead>
            <TableHead className="font-semibold text-foreground">Owning Branch</TableHead>
            <TableHead className="font-semibold text-foreground">Vendor</TableHead>
            <TableHead className="font-semibold text-foreground text-center">Total</TableHead>
            <TableHead className="font-semibold text-foreground text-center text-primary">
              Active
            </TableHead>
            <TableHead className="font-semibold text-foreground text-center text-success">
              Avail
            </TableHead>
            <TableHead className="font-semibold text-foreground text-center text-destructive">
              Svc
            </TableHead>
            <TableHead className="font-semibold text-foreground text-center text-warning">
              Idle
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item, idx) => (
            <TableRow
              key={idx}
              className={`hover:bg-muted/50 ${idx % 2 !== 0 ? 'bg-primary/10' : 'bg-card'}`}
            >
              <TableCell className="font-medium text-foreground">{item.model}</TableCell>
              <TableCell className="text-foreground">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.category === 'Lease'
                      ? 'bg-lease/10 text-lease'
                      : item.category === 'Rental'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-foreground'
                  }`}
                >
                  {item.category}
                </span>
              </TableCell>
              <TableCell className="text-foreground">{item.branch}</TableCell>
              <TableCell className="text-foreground">{item.vendor}</TableCell>
              <TableCell className="text-center font-bold text-foreground">{item.total}</TableCell>
              <TableCell className="text-center font-medium text-primary">{item.active}</TableCell>
              <TableCell className="text-center font-medium text-success">
                {item.available}
              </TableCell>
              <TableCell className="text-center font-medium text-destructive">
                {item.service}
              </TableCell>
              <TableCell className="text-center font-medium text-warning">{item.idle}</TableCell>
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
