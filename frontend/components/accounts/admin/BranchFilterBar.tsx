'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Building2, ChevronDown, X, Download, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/lib/finance/accounts';

interface BranchFilterBarProps {
  onExport?: () => void;
  showPeriod?: boolean;
}

export default function BranchFilterBar({ onExport, showPeriod = false }: BranchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const p = searchParams.get('branchIds');
    return p ? p.split(',').filter(Boolean) : [];
  });
  const [period, setPeriod] = useState(() => searchParams.get('period') ?? 'this_year');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(),
  });

  const pushParams = useCallback(
    (ids: string[], per?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length) {
        params.set('branchIds', ids.join(','));
      } else {
        params.delete('branchIds');
      }
      if (per !== undefined) params.set('period', per);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const toggleBranch = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    pushParams(next, period);
  };

  const clearAll = () => {
    setSelectedIds([]);
    pushParams([], period);
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    pushParams(selectedIds, p);
  };

  useEffect(() => {
    const ids = searchParams.get('branchIds');
    setSelectedIds(ids ? ids.split(',').filter(Boolean) : []);
    const per = searchParams.get('period');
    if (per) setPeriod(per);
  }, [searchParams]);

  const label =
    selectedIds.length === 0
      ? 'All Branches'
      : selectedIds.length === 1
        ? (branches.find((b) => b.id === selectedIds[0])?.name ?? '1 branch')
        : `${selectedIds.length} branches`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Branch picker */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
        >
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{label}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border bg-white shadow-lg p-2">
              <button
                onClick={clearAll}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 text-blue-600 font-medium"
              >
                All Branches
              </button>
              <div className="my-1 border-t" />
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => toggleBranch(b.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50"
                >
                  <span>{b.name}</span>
                  {selectedIds.includes(b.id) && (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clear selected */}
      {selectedIds.length > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}

      {/* Period picker */}
      {showPeriod && (
        <div className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="border-0 bg-transparent text-sm focus:outline-none"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
          </select>
        </div>
      )}

      {/* Export */}
      {onExport && (
        <button
          onClick={onExport}
          className="ml-auto flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export All
        </button>
      )}
    </div>
  );
}
