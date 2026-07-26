'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUserFromToken } from '@/lib/auth';
import { getAllBranches, type Branch } from '@/lib/branch';
import { getActingBranchId, setActingBranch, subscribeActingBranch } from '@/lib/adminBranch';
import { initBranchCurrency } from '@/lib/currency';

const ALL_BRANCHES = '__all__';

/**
 * Branch context picker, rendered in the dashboard header for ADMIN only.
 *
 * An admin's token carries no branch, so organisation-wide reads work but no
 * write can decide which branch owns the record it creates. Picking a branch
 * here sets the `X-Acting-Branch` header on every subsequent request, which the
 * backend turns into `req.user.branchId` for admins — making every branch-scoped
 * page and action behave exactly as it does for that branch's own staff.
 *
 * "All branches" is the default: consolidated reads, no branch-scoped writes.
 */
export default function AdminBranchSwitcher() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<string>(ALL_BRANCHES);

  useEffect(() => {
    if (getUserFromToken()?.role !== 'ADMIN') return;

    setIsAdmin(true);
    setSelected(getActingBranchId() ?? ALL_BRANCHES);

    getAllBranches()
      .then((list) => setBranches(list.filter((b) => b.status === 'ACTIVE')))
      .catch(() => {
        /* the switcher stays on "All branches" — reads are unaffected */
      });

    return subscribeActingBranch(() => setSelected(getActingBranchId() ?? ALL_BRANCHES));
  }, []);

  if (!isAdmin) return null;

  const handleChange = (value: string) => {
    if (value === ALL_BRANCHES) {
      setActingBranch(null, null);
    } else {
      const branch = branches.find((b) => b.id === value);
      setActingBranch(value, branch?.name ?? null);
    }

    // The acting branch decides which currency and tax rules the pages format
    // with, so refresh the cached branch currency before anything re-renders.
    void initBranchCurrency().finally(() => window.location.reload());
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger
          className="h-9 w-[190px] text-sm"
          aria-label="Acting branch"
          title="Branch the admin acts in. Admin pages stay organisation-wide; the sales, HR and finance desks follow this selection."
        >
          <SelectValue placeholder="All branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_BRANCHES}>All branches (read-only)</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
