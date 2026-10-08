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
import { Loader2, Eye, RefreshCw, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getBillsForContract, type BillForContract } from '@/lib/saleWorkflow';
import { BillModal } from './BillModal';
import { UsageBillCollectionDialog, type CollectionTarget } from './UsageBillCollectionDialog';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getApiErrorMessage } from '@/lib/apiError';
import { BillsMark } from '@/components/ui/BrandMarks';

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

const TH =
  'h-11 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap';

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-success/10 text-success border-success/30',
  },
  CUSTOMER_REJECTED: {
    label: 'Disputed',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
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
        {/* `sm:max-w-*`, not `max-w-*`: the base DialogContent sets `sm:max-w-xl`, and
              twMerge treats the two as different groups — a bare `max-w-5xl` here would
              lose to it at every width above the sm breakpoint. */}
        <DialogContent className="sm:max-w-5xl p-0 overflow-hidden rounded-2xl border border-border shadow-2xl max-h-[88vh] flex flex-col">
          <DialogTitle className="sr-only">Bills — {invoiceNumber}</DialogTitle>

          {/* pr-16 keeps Refresh clear of the dialog's own close button, which is
              positioned absolutely at top-6 right-6 and was landing on top of it. */}
          <div className="bg-card border-b border-border px-6 py-5 pr-16 shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <BillsMark size={34} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">
                  Bills
                </p>
                <p className="text-base font-black text-foreground leading-none">{invoiceNumber}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="h-9 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={TH}>Type</TableHead>
                    <TableHead className={TH}>Period</TableHead>
                    <TableHead className={TH}>Status</TableHead>
                    <TableHead className={`${TH} text-right`}>Total</TableHead>
                    <TableHead className={`${TH} text-right`}>Collected</TableHead>
                    <TableHead className={`${TH} text-right`}>Pending</TableHead>
                    <TableHead className={`${TH} text-right pr-5`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : bills.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground text-sm"
                      >
                        No bills recorded yet for this contract.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((b) => {
                      const status = STATUS_META[b.billStatus] || STATUS_META.PENDING_APPROVAL;
                      const isApproved = b.billStatus === 'CUSTOMER_APPROVED';
                      const isAdvance = b.billType === 'ADVANCE';
                      // Same gate as before, named once so the button and its tooltip
                      // can't drift apart.
                      const collectable = isApproved && b.amountPending > 0.01;
                      const collectHint = !isApproved
                        ? 'Blocked until the customer approves this bill'
                        : b.amountPending <= 0.01
                          ? 'Already fully collected'
                          : 'Collect against this bill';
                      return (
                        <TableRow key={b.usageRecordId} className="[&>td]:py-3.5">
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isAdvance
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-muted text-foreground border-border'
                              }`}
                            >
                              {isAdvance ? 'Advance' : 'Usage'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
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
                          <TableCell className="text-right text-sm font-semibold text-foreground whitespace-nowrap">
                            {formatCurrency(b.totalCharge, currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-success font-semibold whitespace-nowrap">
                            {formatCurrency(b.amountGiven, currency)}
                            {Number(b.depositApplied ?? 0) > 0 && (
                              <span className="block text-[10px] font-bold text-primary">
                                incl. {formatCurrency(Number(b.depositApplied), currency)} from
                                deposit
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-warning whitespace-nowrap">
                            {formatCurrency(b.amountPending, currency)}
                          </TableCell>
                          <TableCell className="text-right pr-5">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingBillId(b.usageRecordId)}
                                className="h-8 gap-1.5 border-border bg-muted/50 px-2.5 text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                                title="View this bill"
                                aria-label="View this bill"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setCollectTarget({
                                    usageRecordId: b.usageRecordId,
                                    invoiceNumber,
                                    amountPending: b.amountPending,
                                  })
                                }
                                disabled={!collectable}
                                className="h-8 gap-1.5 border-success/20 bg-success/10 px-2.5 text-xs font-semibold text-success hover:border-success/30 hover:bg-success/15 hover:text-success disabled:opacity-50"
                                title={collectHint}
                                aria-label={collectHint}
                              >
                                <WalletCards className="h-4 w-4" />
                                <span>Collect Amount</span>
                              </Button>
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

          <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between gap-4 shrink-0">
            <p className="text-xs text-muted-foreground">
              {bills.length === 0
                ? ''
                : `${bills.length} bill${bills.length === 1 ? '' : 's'} on this contract`}
            </p>
            <Button variant="outline" onClick={onClose} className="h-9 px-6 text-xs font-bold">
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
