'use client';

import React from 'react';
import { Calendar, CreditCard, X, DollarSign } from 'lucide-react';
import { OpeningBalanceEntry } from '@/lib/openingBalance';
import ContractProgressBar from './ContractProgressBar';

interface OpeningBalanceDetailPanelProps {
  entry: OpeningBalanceEntry | null;
  customerName: string;
  onClose: () => void;
  onNavigateToInvoice: (invoiceId: string) => void;
}

export default function OpeningBalanceDetailPanel({
  entry,
  customerName,
  onClose,
  onNavigateToInvoice,
}: OpeningBalanceDetailPanelProps) {
  if (!entry) return null;

  const isContract = ['RENT_CONTRACT', 'LEASE_CONTRACT'].includes(entry.balanceType);
  const hasMachineDetails =
    entry.productBrand || entry.productModel || entry.serialNumber || entry.productId;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-6 overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Migration Entry Details
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {entry.entryNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 py-6 space-y-6">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 ${
              entry.isFullySettled
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
            }`}
          >
            <div className="mt-0.5">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {entry.isFullySettled ? 'Migration Fully Settled' : 'Outstanding Balance Pending'}
              </h4>
              <p className="text-xs mt-1 leading-relaxed">
                {entry.isFullySettled
                  ? 'This entry has been fully paid off. No further collection required.'
                  : `QAR ${Number(entry.remainingBalance).toLocaleString()} is outstanding post go-live. Payments must be recorded against standard invoice #${entry.invoice?.invoiceNumber || ''}.`}
              </p>
            </div>
          </div>

          {/* Customer & General Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              General Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
              <div>
                <span className="text-xs text-muted-foreground block">Customer Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {customerName}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Balance Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {getBalanceTypeLabel(entry.balanceType)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Migrated At (Go-Live)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(entry.migratedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Branch ID</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {entry.branchId.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Financial Context
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Original Contract Value
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  QAR {Number(entry.originalTotalAmount).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Paid Pre-Go-Live
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  QAR {Number(entry.alreadyPaidAmount).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl text-center">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase block font-medium">
                  Remaining Outstanding
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  QAR {Number(entry.remainingBalance).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Contract Billing Details */}
          {isContract && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Contract Details
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Monthly Billing Rate
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      QAR {Number(entry.monthlyBillingAmount || 0).toLocaleString()} / Month
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Billing Cycle</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {entry.billingCycleInDays || 30} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Next Payment Due</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {entry.nextPaymentDueDate
                        ? new Date(entry.nextPaymentDueDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Remaining Value</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      QAR {Number(entry.remainingContractValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {entry.totalContractMonths && entry.monthsCompleted !== undefined && (
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <ContractProgressBar
                      completed={entry.monthsCompleted}
                      total={entry.totalContractMonths}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Machine / Asset Details */}
          {hasMachineDetails && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Machine / Asset details
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-muted-foreground block">Brand</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {entry.productBrand || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Model</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {entry.productModel || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Serial Number</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                    {entry.serialNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Product/Asset ID</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                    {entry.productId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Migration Notes
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl leading-relaxed whitespace-pre-line">
                {entry.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {entry.invoiceId && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={() => onNavigateToInvoice(entry.invoiceId!)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-sm transition shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              Reconcile Payments / View Invoice Ledger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
