'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const lowStockData = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    currentStock: 120,
    reorderLevel: 200,
    shortage: 80,
    status: 'Warning',
  },
  {
    id: 2,
    name: 'Bandages',
    currentStock: 15,
    reorderLevel: 50,
    shortage: 35,
    status: 'Critical',
  },
  {
    id: 3,
    name: 'Surgical Masks',
    currentStock: 0,
    reorderLevel: 100,
    shortage: 100,
    status: 'Critical',
  },
  {
    id: 4,
    name: 'Antiseptic',
    currentStock: 18,
    reorderLevel: 30,
    shortage: 12,
    status: 'Warning',
  },
];

/**
 * Table displaying inventory items that have fallen below their reorder level.
 * Highlights the shortage amount and classifies status as 'Warning' or 'Critical'.
 * Enables quick identification of stock replenishment needs.
 */
export default function LowStockTable() {
  // Pagination logic removed as buttons are missing from UI
  // const [page, setPage] = useState(1);
  // const ITEMS_PER_PAGE = 5;
  // const totalPages = Math.ceil(lowStockData.length / ITEMS_PER_PAGE);
  // const startIndex = (page - 1) * ITEMS_PER_PAGE;
  // const currentData = lowStockData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const currentData = lowStockData;

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full min-h-[200px] flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                STOCK
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                REORDER
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                SHORTAGE
              </TableHead>
              <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                STATUS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`border-none ${index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}`}
              >
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                  {item.name}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center font-bold">
                  {item.currentStock}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center text-muted-foreground">
                  {item.reorderLevel}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center font-bold text-red-600">
                  -{item.shortage}
                </TableCell>
                <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      item.status === 'Critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
