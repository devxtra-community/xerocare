'use client';

import { useEffect, useMemo, useState } from 'react';

/** Rows per page across the Accounts tables. */
export const ACCOUNTS_PAGE_SIZE = 6;

export interface TablePagination<T> {
  /** The slice to render. */
  pageRows: T[];
  /** 1-based, already clamped to the available range. */
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  /** Row count across all pages — what the "of N items" label should show. */
  total: number;
  pageSize: number;
}

/**
 * Client-side paging for a table that already has its full row set in memory.
 *
 * Two things here exist to stop the table going blank, which is the usual way paging
 * breaks:
 *
 *  - `resetKey` returns the reader to page 1 whenever the filters change. Without it,
 *    searching while on page 4 leaves you on page 4 of a one-page result — an empty table
 *    that looks like "no records found" when the records are right there.
 *
 *  - the page is clamped on every render as well. The reset above runs in an effect, so
 *    there is a render in between where the old page number meets the new rows; and rows
 *    can shrink without the filters changing at all (a refetch, a settled row dropping
 *    out). Clamping covers both without waiting for an effect.
 */
export function useTablePagination<T>(
  rows: T[],
  resetKey: string,
  pageSize: number = ACCOUNTS_PAGE_SIZE,
): TablePagination<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = rows.length;
  // At least one page, so an empty table still renders "Page 1 of 1" rather than "of 0".
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return { pageRows, page: safePage, setPage, totalPages, total, pageSize };
}
