'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, Eye, PlusCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getBillsForContract, type BillForContract } from '@/lib/saleWorkflow';
import { BillModal } from './BillModal';
import { UsageBillCollectionDialog, type CollectionTarget } from './UsageBillCollectionDialog';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getApiErrorMessage } from '@/lib/apiError';

const safeFormatDate = (
  dateVal: string | number | Date | null | undefined,
  formatStr: string = 'MMM dd, yyyy',
) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return 'N/A';
    }
    return format(d, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

interface Props {
  contractId: string;
  invoiceNumber: string;
  onClose: () => void;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CUSTOMER_REJECTED: { label: 'Disputed', className: 'bg-red-50 text-red-700 border-red-200' },
};

/**
 * "View Bills" drilldown for a Rent/Lease contract's Receivable row — deliberately a
 * drilldown, not a restructure of the AR table's own headline row: Invoice.totalAmount
 * isn't guaranteed to equal the sum of per-period totalCharge after a final-month
 * settlement, and the headline figure is what reconciles with the Balance Sheet's AR
 * line, so it stays untouched. This is where "View Bill" and "Add Collect Amount"
 * (gated on Customer Approved) actually live, per bill/period.
 */
export function BillsDrilldownModal({ contractId, invoiceNumber, onClose }: Props) {
  const currency = useBranchCurrency();
  const [bills, setBills] = useState<BillForContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingBillId, setViewingBillId] = useState<string | null>(null);
  const [collectTarget, setCollectTarget] = useState<CollectionTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBillsForContract(contractId);
      setBills(data);
    } catch (err) {
      toast.error('Failed to load bills', { description: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl max-h-[85vh] flex flex-col">
          <DialogTitle className="sr-only">Bills — {invoiceNumber}</DialogTitle>

          <div className="bg-white border-b border-slate-200 px-5 py-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                  Bills
                </p>
                <p className="text-sm font-black text-slate-800 leading-none">{invoiceNumber}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>TYPE</TableHead>
                    <TableHead>PERIOD</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">TOTAL</TableHead>
                    <TableHead className="text-right">COLLECTED</TableHead>
                    <TableHead className="text-right">PENDING</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                        No bills recorded yet for this contract.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((b) => {
                      const status = STATUS_META[b.billStatus] || STATUS_META.PENDING_APPROVAL;
                      const isApproved = b.billStatus === 'CUSTOMER_APPROVED';
                      const isAdvance = b.billType === 'ADVANCE';
                      return (
                        <TableRow key={b.usageRecordId}>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isAdvance
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                  : 'bg-slate-50 text-slate-600 border-slate-100'
                              }`}
                            >
                              {isAdvance ? 'Advance' : 'Usage'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {isAdvance
                              ? safeFormatDate(b.billingPeriodStart, 'MMM dd, yyyy')
                              : (() => {
                                  const startStr = safeFormatDate(
                                    b.billingPeriodStart,
                                    'MMM dd, yyyy',
                                  );
                                  const endStr = safeFormatDate(b.billingPeriodEnd, 'MMM dd, yyyy');
                                  if (startStr === 'N/A' || endStr === 'N/A') return 'N/A';
                                  return (
                                    <>
                                      {startStr} -<br />
                                      {endStr}
                                    </>
                                  );
                                })()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-700">
                            {formatCurrency(b.totalCharge, currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-600 font-medium">
                            {formatCurrency(b.amountGiven, currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-amber-600">
                            {formatCurrency(b.amountPending, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingBillId(b.usageRecordId)}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                                title="View Bill"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  isApproved &&
                                  setCollectTarget({
                                    usageRecordId: b.usageRecordId,
                                    invoiceNumber,
                                    amountPending: b.amountPending,
                                  })
                                }
                                disabled={!isApproved || b.amountPending <= 0.01}
                                className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={
                                  !isApproved
                                    ? 'Blocked until the customer approves this bill'
                                    : b.amountPending <= 0.01
                                      ? 'Already fully collected'
                                      : 'Add Collect Amount'
                                }
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewingBillId && (
        <BillModal
          usageRecordId={viewingBillId}
          open={!!viewingBillId}
          onClose={() => setViewingBillId(null)}
          onUpdated={load}
        />
      )}

      <UsageBillCollectionDialog
        target={collectTarget}
        onClose={() => setCollectTarget(null)}
        onCollected={load}
      />
    </>
  );
}
