'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';

interface BranchRecord {
  currency_code?: string;
  currency?: string;
  has_tax?: boolean;
  tax_name?: string | null;
  tax_percent?: number | string | null;
  tax_registration_number?: string | null;
}

/**
 * The signed-in user's branch. Shared by useBranchCurrency and useBranchTax so asking for
 * both costs one request, not two — they hit the same react-query key.
 */
function useBranch() {
  const user = getUserFromToken();
  const branchId = user?.branchId;

  return useQuery<BranchRecord | null>({
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
}

export function useBranchCurrency(): string {
  const { data: branch } = useBranch();
  return branch?.currency_code ?? branch?.currency ?? 'AED';
}

export interface BranchTaxConfig {
  /** Whether this branch charges tax at all — set when the branch was created. */
  hasTax: boolean;
  /** "VAT", "GST", … Used to label fields so they read in the branch's own terms. */
  taxName: string;
  taxPercent: number;
  taxRegistrationNumber?: string | null;
  /** False until the branch has loaded, so a form can avoid flashing tax fields it is
   *  about to hide (or hiding ones it is about to show). */
  isLoaded: boolean;
}

/**
 * Whether the signed-in user's branch is configured for tax.
 *
 * A branch in a country with no sales tax is created with tax switched off. Showing a VAT
 * Status / VAT Number field to that branch's staff asks them to answer a question their
 * business does not have — and any value they type is dead data, since every tax
 * calculation is already driven off the branch's own rate.
 *
 * `hasTax` defaults to FALSE while loading and when the field is absent. Defaulting the
 * other way would flash tax fields on a no-tax branch on every page load, which is the
 * exact confusion this is meant to remove; a field that appears a moment late is the
 * safer failure.
 */
export function useBranchTax(): BranchTaxConfig {
  const { data: branch, isSuccess } = useBranch();
  return {
    hasTax: branch?.has_tax === true,
    taxName: branch?.tax_name || 'VAT',
    taxPercent: Number(branch?.tax_percent ?? 0),
    taxRegistrationNumber: branch?.tax_registration_number ?? null,
    isLoaded: isSuccess,
  };
}
