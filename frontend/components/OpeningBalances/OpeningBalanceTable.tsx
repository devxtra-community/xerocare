'use client';

import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { OpeningBalanceEntry } from '@/lib/openingBalance';

interface OpeningBalanceTableProps {
  entries: OpeningBalanceEntry[];
  customerNames: Record<string, string>;
  onSelect: (entry: OpeningBalanceEntry) => void;
  onEdit: (entry: OpeningBalanceEntry) => void;
  onDelete: (id: string) => void;
  userRole: string;
}

export default function OpeningBalanceTable({
  entries,
  customerNames,
  onSelect,
  onEdit,
  onDelete,
  userRole,
}: OpeningBalanceTableProps) {
  const getBalanceTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE_OUTSTANDING':
        return 'Sale Outstanding';
      case 'RENT_CONTRACT':
        return 'Rent Contract Migration';
      case 'LEASE_CONTRACT':
        return 'Lease Contract Migration';
      case 'SERVICE_DEBT':
        return 'Service Ticket Debt';
      case 'OTHER_DEBT':
      default:
        return 'Other Outstanding Debt';
    }
  };

  const getBalanceTypeClass = (type: string) => {
    switch (type) {
      case 'SALE_OUTSTANDING':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'RENT_CONTRACT':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'LEASE_CONTRACT':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'SERVICE_DEBT':
        return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400';
    }
  };

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <th className="py-4 px-6">Entry Number</th>
              <th className="py-4 px-6">Customer</th>
              <th className="py-4 px-6">Branch</th>
              <th className="py-4 px-6">Type</th>
              <th className="py-4 px-6 text-right">Original Value</th>
              <th className="py-4 px-6 text-right">Remaining Balance</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No opening balance entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const canMutate =
                  ['ADMIN', 'MANAGER', 'FINANCE', 'EMPLOYEE'].includes(userRole) &&
                  !entry.isFullySettled &&
                  Number(entry.openingBalance || 0) === Number(entry.remainingBalance || 0);

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-slate-100">
                      <div>{entry.entryNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.migratedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {customerNames[entry.customerId] || 'Loading customer...'}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        ID: {entry.customerId.slice(-6)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {entry.branchName || 'Unknown Branch'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getBalanceTypeClass(entry.balanceType)}`}
                      >
                        {getBalanceTypeLabel(entry.balanceType)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      <div>
                        QAR{' '}
                        {Number(entry.originalTotalAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Paid pre-live: QAR{' '}
                        {Number(entry.alreadyPaidAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-900 dark:text-slate-100">
                      QAR{' '}
                      {Number(entry.remainingBalance).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          entry.isFullySettled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}
                      >
                        {entry.isFullySettled ? 'Fully Settled' : 'Outstanding'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onSelect(entry)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(entry)}
                          disabled={!canMutate}
                          className={`p-1.5 rounded-lg transition ${
                            canMutate
                              ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          }`}
                          title={canMutate ? 'Edit Entry' : 'Cannot edit entry (payments recorded)'}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          disabled={!canMutate}
                          className={`p-1.5 rounded-lg transition ${
                            canMutate
                              ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          }`}
                          title={
                            canMutate ? 'Delete Entry' : 'Cannot delete entry (payments recorded)'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
