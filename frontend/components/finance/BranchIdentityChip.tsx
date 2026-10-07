'use client';

import React from 'react';
import { useBranchNameMap } from '@/hooks/useBranchNameMap';

/**
 * "Branch: X" identity chip shown at the top of single-branch Add/Edit forms
 * (Cash & Bank, Expenses, Payable, Receivable) — was duplicated across all four
 * with the same raw-UUID display bug; consolidated here so it's fixed once.
 */
export default function BranchIdentityChip({
  branchId,
  role,
}: {
  branchId?: string;
  role?: string;
}) {
  const { getBranchName, isLoading } = useBranchNameMap();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
      <span className="text-sm text-primary">Branch:</span>
      <span className="text-sm font-medium text-primary">
        {!branchId ? 'Your Branch' : isLoading ? 'Loading…' : getBranchName(branchId)}
      </span>
      {role && <span className="text-xs text-primary ml-auto">{role}</span>}
    </div>
  );
}
