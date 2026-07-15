'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';

export function useBranchCurrency(): string {
  const user = getUserFromToken();
  const branchId = user?.branchId;

  const { data: branch } = useQuery<Record<string, string> | null>({
    queryKey: ['branch-currency', branchId ?? 'none'],
    queryFn: async () => {
      if (branchId) {
        // GET /i/branch/:id is accessible to any authenticated role
        const res = await api.get(`/i/branch/${branchId}`);
        return res.data?.data ?? res.data ?? null;
      }
      // ADMIN without a fixed branchId: fetch the full list (requires ADMIN/HR/MANAGER)
      const res = await api.get('/i/branch/');
      const raw = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [raw];
      return list[0] ?? null;
    },
    staleTime: 600_000,
  });

  return branch?.currency_code ?? branch?.currency ?? 'AED';
}
