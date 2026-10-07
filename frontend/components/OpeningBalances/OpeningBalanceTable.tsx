'use client';

import React from 'react';
import { Eye, Edit2, Trash2, CreditCard } from 'lucide-react';
import { OpeningBalanceEntry } from '@/lib/openingBalance';

import { getActiveCurrency } from '@/lib/currency';
interface OpeningBalanceTableProps {
  entries: OpeningBalanceEntry[];
  customerNames: Record<string, string>;
  onSelect: (entry: OpeningBalanceEntry) => void;
  onEdit: (entry: OpeningBalanceEntry) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (entry: OpeningBalanceEntry) => void;
  userRole: string;
}

export default function OpeningBalanceTable({
  entries,
  customerNames,
  onSelect,
  onEdit,
  onDelete,
  onRecordPayment,
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
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      case 'RENT_CONTRACT':
        return 'bg-lease/10 text-lease dark:bg-lease/20 dark:text-lease';
      case 'LEASE_CONTRACT':
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      case 'SERVICE_DEBT':
        return 'bg-info/10 text-info dark:bg-info/20 dark:text-info';
      default:
        return 'bg-muted text-foreground dark:bg-foreground/20 dark:text-muted-foreground';
    }
  };

  return (
    <div className="w-full overflow-hidden bg-card dark:bg-foreground rounded-2xl shadow-sm border border-border dark:border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border dark:border-border bg-muted/50 dark:bg-foreground/50 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
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
          <tbody className="divide-y divide-border dark:divide-border text-sm text-foreground dark:text-muted-foreground">
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
                    className="hover:bg-muted/50 dark:hover:bg-foreground/20 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-foreground dark:text-muted-foreground">
                      <div>{entry.entryNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.migratedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-foreground dark:text-muted-foreground">
                        {customerNames[entry.customerId] || 'Loading customer...'}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        ID: {entry.customerId.slice(-6)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-foreground dark:text-muted-foreground">
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
                        {getActiveCurrency()}{' '}
                        {Number(entry.originalTotalAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Paid pre-live: {getActiveCurrency()}{' '}
                        {Number(entry.alreadyPaidAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-foreground dark:text-muted-foreground">
                      {getActiveCurrency()}{' '}
                      {Number(entry.remainingBalance).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          entry.isFullySettled
                            ? 'bg-success/10 text-success dark:bg-success/30 dark:text-success'
                            : 'bg-warning/10 text-warning dark:bg-warning/30 dark:text-warning'
                        }`}
                      >
                        {entry.isFullySettled ? 'Fully Settled' : 'Outstanding'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onSelect(entry)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-foreground transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {['ADMIN', 'FINANCE'].includes(userRole) && !entry.isFullySettled && (
                          <button
                            onClick={() => onRecordPayment(entry)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 dark:hover:bg-success/20 transition"
                            title="Record Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(entry)}
                          disabled={!canMutate}
                          className={`p-1.5 rounded-lg transition ${
                            canMutate
                              ? 'text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20'
                              : 'text-muted-foreground dark:text-foreground cursor-not-allowed'
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
                              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20'
                              : 'text-muted-foreground dark:text-foreground cursor-not-allowed'
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
