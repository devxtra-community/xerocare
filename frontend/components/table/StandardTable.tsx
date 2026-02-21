import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Column<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  className?: string; // e.g. 'text-right'
  hidden?: boolean;
}

interface StandardTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string | number;

  // Pagination State
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function StandardTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
  keyExtractor,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: StandardTableProps<T>) {
  const visibleColumns = columns.filter((c) => !c.hidden);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Determine pagination bounds
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b hover:bg-muted/50">
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className={`text-xs font-bold text-primary whitespace-nowrap px-4 py-3 tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading State (Skeletons)
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id} className={`px-4 py-4 ${col.className || ''}`}>
                      <Skeleton className="h-4 w-full max-w-[150px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              data.map((item, rowIndex) => (
                <TableRow
                  key={keyExtractor(item)}
                  className={`hover:bg-blue-50/50 transition-colors ${rowIndex % 2 !== 0 ? 'bg-slate-50/30' : ''}`}
                >
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={`px-4 py-3 text-sm font-medium text-slate-700 ${col.className || ''}`}
                    >
                      {col.cell
                        ? col.cell(item, rowIndex)
                        : String(item[col.accessorKey as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 sm:px-4 sm:py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Rows per page:</span>
          <Select
            value={limit.toString()}
            onValueChange={(val) => onLimitChange(Number(val))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">
            {startItem}-{endItem} of {total}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 hidden sm:flex"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-xs sm:text-sm font-medium w-fit min-w-[30px] text-center">
              {page} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 hidden sm:flex"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
