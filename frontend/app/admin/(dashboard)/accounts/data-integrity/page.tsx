'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchOrphanedCashbookEntries, CashbookEntry } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';

export default function DataIntegrityPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-orphaned-cashbook'],
    queryFn: fetchOrphanedCashbookEntries,
    staleTime: 120_000,
  });

  const entries: CashbookEntry[] = data?.data ?? [];

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Data Integrity — Orphaned Cashbook Entries
          </h1>
          <p className="text-sm text-gray-500 mt-1">
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
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load data integrity report.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-8 text-center">
          <p className="text-emerald-700 font-semibold">No orphaned entries detected.</p>
          <p className="text-sm text-emerald-600 mt-1">
            All cashbook entries with linked Purchase Orders are pointing to valid records.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {entries.length} orphaned entr{entries.length === 1 ? 'y' : 'ies'} found
            </span>
            <span className="text-xs text-amber-600 ml-auto">
              These entries reference POs that no longer exist in Inventory. Investigate or contact
              the inventory team.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
                  <tr key={e.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {e.referenceNo}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold ${e.entryType === 'RECEIPT' ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {e.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.category}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-amber-700">
                      {e.linkedPoId ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {e.branchId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
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
