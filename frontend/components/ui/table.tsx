'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import Pagination from '@/components/Pagination';

type TablePaginationOptions = { pageSize?: number };
type TablePaginationContextValue = {
  page: number;
  pageSize: number;
  reportRows: (count: number, signature: string) => void;
};
const TablePaginationContext = React.createContext<TablePaginationContextValue | null>(null);

function flattenRows(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      return flattenRows(child.props.children);
    }
    return [child];
  });
}

function Table({
  className,
  pagination,
  children,
  ...props
}: React.ComponentProps<'table'> & { pagination?: TablePaginationOptions }) {
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState({ count: 0, signature: '' });
  const pageSize = Math.max(1, pagination?.pageSize ?? 10);
  const totalPages = Math.max(1, Math.ceil(rows.count / pageSize));
  const safePage = Math.min(page, totalPages);
  const reportRows = React.useCallback((count: number, signature: string) => {
    setRows((current) =>
      current.count === count && current.signature === signature ? current : { count, signature },
    );
  }, []);

  React.useEffect(() => {
    setPage(1);
  }, [rows.signature]);

  const table = (
    <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props}>
      {children}
    </table>
  );

  if (!pagination) {
    return (
      <div data-slot="table-container" className="relative w-full overflow-x-auto">
        {table}
      </div>
    );
  }

  return (
    <TablePaginationContext.Provider value={{ page: safePage, pageSize, reportRows }}>
      <div data-slot="paginated-table-container" className="w-full">
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
          {table}
        </div>
        {rows.count > pageSize && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={rows.count}
            limit={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </TablePaginationContext.Provider>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        // A slightly recessed header band with a firmer rule under it: the header must
        // read as chrome above the data, not as a first row of it.
        '[&_tr]:border-b [&_tr:hover]:bg-transparent bg-muted',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  const pagination = React.useContext(TablePaginationContext);
  const rows = React.useMemo(() => flattenRows(props.children), [props.children]);
  const signature = React.useMemo(
    () =>
      rows
        .map((row, index) => (React.isValidElement(row) ? String(row.key ?? index) : String(index)))
        .join('|'),
    [rows],
  );

  React.useEffect(() => {
    pagination?.reportRows(rows.length, signature);
  }, [pagination, rows.length, signature]);

  const visibleRows = pagination
    ? rows.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
    : props.children;

  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    >
      {visibleRows}
    </tbody>
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-accent data-[state=selected]:bg-accent border-b border-border transition-colors duration-100',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Dense, label-scale header type: uppercase micro-labels are how the eye tells
        // column chrome from cell data without the header needing heavier weight.
        'text-foreground h-9 px-2 text-left align-middle text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-2 py-2 text-[13px] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
