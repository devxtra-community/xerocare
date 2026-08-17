'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/lib/finance/accounts';

/**
 * Resolves branch IDs to their real names. Shares the same `['branches']` query key
 * already used by BranchFilterBar and most admin/finance accounts pages, so calling
 * this hook rarely triggers an extra network request — React Query dedupes the fetch.
 */
export function useBranchNameMap() {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(),
  });

  const branchNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of branches) map[b.id] = b.name;
    return map;
  }, [branches]);

  const getBranchName = (branchId?: string | null): string =>
    (branchId && branchNameMap[branchId]) || 'Unknown Branch';

  return { branches, branchNameMap, getBranchName, isLoading };
}
