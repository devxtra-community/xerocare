'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchOrphanedCashbookEntries, CashbookEntry } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { useBranchNameMap } from '@/hooks/useBranchNameMap';
import { Button } from '@/components/ui/button';

export default function DataIntegrityPage() {
  const currency = useBranchCurrency();
  const { getBranchName } = useBranchNameMap();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-orphaned-cashbook'],
    queryFn: fetchOrphanedCashbookEntries,
    staleTime: 120_000,
  });

  const entries: CashbookEntry[] = data?.data ?? [];

  return (
    <div className="bg-muted min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Data Integrity — Orphaned Cashbook Entries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cashbook entries whose linked Purchase Order (linked_po_id) no longer exists in the
            Inventory service. Flagged by the nightly reconciliation job (runs at 2:00 AM).
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load data integrity report.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl bg-success/10 border border-success/30 p-8 text-center">
          <p className="text-success font-semibold">No orphaned entries detected.</p>
          <p className="text-sm text-success mt-1">
            All cashbook entries with linked Purchase Orders are pointing to valid records.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-warning/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-warning/30 bg-warning/10 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-semibold text-warning">
              {entries.length} orphaned entr{entries.length === 1 ? 'y' : 'ies'} found
            </span>
            <span className="text-xs text-warning ml-auto">
              These entries reference POs that no longer exist in Inventory. Investigate or contact
              the inventory team.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    'Reference',
                    'Date',
                    'Type',
                    'Category',
                    'Amount',
                    'Linked PO ID',
                    'Branch',
                    'Created',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-warning/10">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      {e.referenceNo}
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold ${e.entryType === 'RECEIPT' ? 'text-success' : 'text-destructive'}`}
                      >
                        {e.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.category}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatCurrency(Number(e.amount), currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-warning">
                      {e.linkedPoId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">
                      {getBranchName(e.branchId)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
