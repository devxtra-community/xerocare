'use client';
import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

/**
 * This "tool" helps us manage long lists of information by breaking them
 * into smaller "pages" (like a book), so we don't overwhelm the user.
 */
export function usePagination(initialLimit = 10) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1, // Start on the first page
    limit: initialLimit, // How many items to show on one page at a time
    total: 0, // Total number of items we have in our database
  });

  /** Go to a specific page number. */
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  /** Change how many items are shown on each page (e.g., show 20 instead of 10). */
  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  /** Update the total count of items we found in our search. */
  const setTotal = useCallback((total: number) => {
    setPagination((prev) => ({ ...prev, total }));
  }, []);

  /** Go back to the very first page. */
  const reset = useCallback(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    setPage,
    setLimit,
    setTotal,
    reset,
    /** Calculate how many pages we need in total based on the item count. */
    totalPages: Math.ceil(pagination.total / pagination.limit) || 1,
  };
}
