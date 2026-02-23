import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Coins, Printer, X, Loader2, Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Invoice, getInvoiceById } from '@/lib/invoice';
import { differenceInMonths, differenceInDays } from 'date-fns';
import UsageRecordingModal from '@/components/Finance/UsageRecordingModal';

interface InvoiceDetailsDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
  approveLabel?: string;
  mode?: 'EMPLOYEE' | 'FINANCE';
  onSuccess?: () => void; // Optional callback for internal dialog state if needed
  onApproveNext?: () => Promise<void> | void;
}

const getCleanProductName = (name: string) => {
  // Remove "Black & White - " or "Color - " prefixes
  let clean = name.replace(/^(Black & White - |Color - |Combined - )/i, '');
  // Remove serial number patterns like (SN-...) or - SN-... or (Serial...)
  clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\)|\s*\(Serial[^)]+\))/gi, '');

  // Also remove everything after the last dash if it looks like a serial number (legacy format)
  const lastDashIndex = clean.lastIndexOf(' - ');
  if (lastDashIndex !== -1 && clean.length - lastDashIndex < 25) {
    // Heuristic: if there's a dash and the suffix is short, it's likely a serial number
    clean = clean.substring(0, lastDashIndex).trim();
  }
  return clean.trim();
};

import { generateConsolidatedFinalInvoice } from '@/lib/invoice';

/**
 * Comprehensive dialog for viewing invoice details.
 * improved financial summary, broken down by Rent, Lease, Sale, and Usage.
 * Supports Invoice Approval/Rejection workflows and Contract Completion.
 * Calculates detailed usage breakdown for Rent/Lease contracts including slab-based pricing.
 */
export function InvoiceDetailsDialog({
  invoice,
  onClose,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  mode = 'EMPLOYEE',
  onApproveNext,
}: InvoiceDetailsDialogProps) {
  const [currentInvoice, setCurrentInvoice] = React.useState<Invoice>(invoice);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmailSending, setIsEmailSending] = React.useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = React.useState(false);
  const historyRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

  const handleSelectInvoice = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await getInvoiceById(id);
      setCurrentInvoice(data);
    } catch {
      toast.error('Failed to load invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteContract = async () => {
    setIsLoading(true);
    try {
      await generateConsolidatedFinalInvoice(currentInvoice.id);
      toast.success('Contract Completed & Final Invoice Generated');
      onClose();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to complete contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveNext = async () => {
    if (!onApproveNext) return;
    setIsLoading(true);
    try {
      await onApproveNext();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsLoading(true);
    try {
      await onApprove();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setIsLoading(true);
    try {
      await onReject(rejectReason);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate Excess Amount for Breakdown
  const excessAmount = React.useMemo(() => {
    let total = 0;
    const items = currentInvoice.items || [];
    const bwRule = items.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Black'),
    );
    const colorRule = items.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Color'),
    );
    const comboRule = items.find(
      (i) => i.itemType === 'PRICING_RULE' && i.description.includes('Combined'),
    );

    if (bwRule) {
      const bwTotal = (currentInvoice.bwA4Count || 0) + (currentInvoice.bwA3Count || 0) * 2;
      const extra = currentInvoice.extraBwA4Count || 0;
      const bwLimit = bwRule.bwIncludedLimit || 0;
      const bwExcess = Math.max(0, bwTotal + extra - bwLimit);
      total += bwExcess * (bwRule.bwExcessRate || 0);
    }
    if (colorRule) {
      const colorTotal =
        (currentInvoice.colorA4Count || 0) + (currentInvoice.colorA3Count || 0) * 2;
      const extra = currentInvoice.extraColorA4Count || 0;
      const colorLimit = colorRule.colorIncludedLimit || 0;
      const colorExcess = Math.max(0, colorTotal + extra - colorLimit);
      total += colorExcess * (colorRule.colorExcessRate || 0);
    }
    if (comboRule) {
      const totalTotal =
        (currentInvoice.bwA4Count || 0) +
        (currentInvoice.bwA3Count || 0) * 2 +
        (currentInvoice.colorA4Count || 0) +
        (currentInvoice.colorA3Count || 0) * 2;
      const extra = (currentInvoice.extraBwA4Count || 0) + (currentInvoice.extraColorA4Count || 0);
      const comboLimit = comboRule.combinedIncludedLimit || 0;
      const comboExcess = Math.max(0, totalTotal + extra - comboLimit);
      total += comboExcess * (comboRule.combinedExcessRate || 0);
    }
    return total;
  }, [currentInvoice]);

  const grandTotal = React.useMemo(() => {
    if (currentInvoice.saleType === 'RENT' || currentInvoice.saleType === 'LEASE') {
      const rent = currentInvoice.monthlyRent || 0;
      const additional = currentInvoice.additionalCharges || 0;
      const advance = Number(currentInvoice.advanceAmount || currentInvoice.advanceAdjusted || 0);

      // Include other order items if any
      const orderItemsTotal = (currentInvoice.items || [])
        .filter(
          (item) =>
            item.itemType !== 'PRICING_RULE' &&
            !item.description.startsWith('Black & White') &&
            !item.description.startsWith('Color') &&
            !item.description.startsWith('Combined'),
        )
        .reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);

      return Math.max(0, rent + additional - advance + excessAmount + orderItemsTotal);
    }
    return currentInvoice.totalAmount || 0;
  }, [currentInvoice, excessAmount]);

  const financialSummary = React.useMemo(() => {
    const history = currentInvoice.invoiceHistory || [];

    // Use the calculated grandTotal for the current invoice instead of the raw totalAmount
    // This ensures that advance adjustments and overrides are reflected in the pending balance
    const currentInvoiceAmt = grandTotal;
    const historyTotal = history.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const totalInvoiced = currentInvoiceAmt + historyTotal;

    // Calculate total paid from history only, as current invoice is usually not paid if we are approving it
    // If current invoice IS paid, it should be in history or handled separately?
    // Usually approved invoice is PENDING.
    const totalPaid =
      history
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) +
      (currentInvoice.status === 'PAID' ? currentInvoiceAmt : 0);

    const pendingBalance = totalInvoiced - totalPaid;

    return {
      totalInvoiced,
      totalPaid,
      pendingBalance,
      monthlyRent: currentInvoice.monthlyRent || 0,
      additionalCharges: currentInvoice.additionalCharges || 0,
      advanceAdjusted: Number(currentInvoice.advanceAmount || currentInvoice.advanceAdjusted || 0),
      extraUsage: excessAmount,
      totalCurrentCharges:
        (currentInvoice.monthlyRent || 0) + excessAmount + (currentInvoice.additionalCharges || 0),
    };
  }, [currentInvoice, excessAmount, grandTotal]);

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-y-auto rounded-xl border border-gray-100 shadow-2xl bg-card flex flex-col max-h-[95vh]">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-info/10 text-info flex items-center justify-center shadow-sm">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                {currentInvoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Invoice Details & Summary
              </DialogDescription>
            </div>
          </div>
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <Badge
              variant="secondary"
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider shadow-none
                ${
                  currentInvoice.status === 'PAID'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                }`}
            >
              {currentInvoice.status}
            </Badge>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-muted text-gray-400 hover:bg-muted-foreground/10 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <div
          className="p-8 pt-6 space-y-8 overflow-y-auto scrollbar-hide flex-1"
          ref={scrollContainerRef}
        >
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(currentInvoice.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</p>
                <Badge
                  variant="outline"
                  className="mt-1 font-bold text-[10px] rounded-lg border-gray-100 text-gray-600"
                >
                  {currentInvoice.saleType}
                </Badge>
              </div>
            </div>
          </div>

          {/* RENT Details */}
          {currentInvoice.saleType === 'RENT' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-rent/10 rounded-xl border border-rent/20">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-rent uppercase tracking-wider">
                  Rent Type
                </p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Printer size={14} className="opacity-50" />
                  <p className="text-xs font-bold">{currentInvoice.rentType?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Monthly Rent Display */}
              {currentInvoice.monthlyRent !== undefined && currentInvoice.monthlyRent > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-rent uppercase tracking-wider">
                    Monthly Rent
                  </p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Coins size={14} className="opacity-50" />
                    <p className="text-xs font-bold">
                      {formatCurrency(currentInvoice.monthlyRent)}
                    </p>
                  </div>
                </div>
              )}

              {/* Show Included Limits / Excess if relevant (simplified view) */}
              {currentInvoice.items?.some((i) => i.itemType === 'PRICING_RULE') && (
                <div className="col-span-2 mt-2 pt-4 border-t border-rent/20">
                  <p className="text-[10px] font-bold text-rent uppercase tracking-wider mb-2">
                    Pricing Rules
                  </p>
                  <div className="text-xs space-y-1 text-gray-600">
                    {currentInvoice.items
                      .filter((i) => i.itemType === 'PRICING_RULE')
                      .map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-1 pb-3 mb-3 border-b border-rent/10 last:border-0 last:pb-0 last:mb-0"
                        >
                          <span className="font-bold text-sm text-gray-800">
                            {rule.description}
                          </span>

                          {/* Included Limits (Fixed Models) */}
                          {rule.bwIncludedLimit || rule.colorIncludedLimit ? (
                            <div className="flex gap-4 opacity-80 text-xs">
                              {rule.bwIncludedLimit && (
                                <span>B/W Included: {rule.bwIncludedLimit}</span>
                              )}
                              {rule.colorIncludedLimit && (
                                <span>Color Included: {rule.colorIncludedLimit}</span>
                              )}
                            </div>
                          ) : null}

                          {/* SLAB RATES DISPLAY */}
                          {/* 1. Black & White Slabs */}
                          {rule.bwSlabRanges && rule.bwSlabRanges.length > 0 && (
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-rent/10">
                              <p className="text-[10px] font-bold text-rent uppercase mb-1">
                                B&W Slabs
                              </p>
                              <div className="text-xs space-y-0.5 text-gray-600">
                                {rule.bwSlabRanges.map((s, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between w-full max-w-[200px]"
                                  >
                                    <span>
                                      {s.from} - {s.to}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(s.rate)}
                                    </span>
                                  </div>
                                ))}
                                {rule.bwExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-rent/10 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(...rule.bwSlabRanges.map((s) => Number(s.to) || 0))}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(rule.bwExcessRate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 2. Color Slabs */}
                          {rule.colorSlabRanges && rule.colorSlabRanges.length > 0 && (
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-rent/10">
                              <p className="text-[10px] font-bold text-rent uppercase mb-1">
                                Color Slabs
                              </p>
                              <div className="text-xs space-y-0.5 text-gray-600">
                                {rule.colorSlabRanges.map((s, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between w-full max-w-[200px]"
                                  >
                                    <span>
                                      {s.from} - {s.to}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(s.rate)}
                                    </span>
                                  </div>
                                ))}
                                {rule.colorExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-rent/10 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(
                                        ...rule.colorSlabRanges.map((s) => Number(s.to) || 0),
                                      )}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(rule.colorExcessRate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. Combined Slabs */}
                          {rule.comboSlabRanges && rule.comboSlabRanges.length > 0 && (
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-rent/10">
                              <p className="text-[10px] font-bold text-rent uppercase mb-1">
                                Combined Slabs
                              </p>
                              <div className="text-xs space-y-0.5 text-gray-600">
                                {rule.comboSlabRanges.map((s, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between w-full max-w-[200px]"
                                  >
                                    <span>
                                      {s.from} - {s.to}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(s.rate)}
                                    </span>
                                  </div>
                                ))}
                                {rule.combinedExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-rent/10 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(
                                        ...rule.comboSlabRanges.map((s) => Number(s.to) || 0),
                                      )}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      {formatCurrency(rule.combinedExcessRate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Fallback Base Rate if NO Slabs */}
                          {!rule.bwSlabRanges?.length &&
                            !rule.colorSlabRanges?.length &&
                            !rule.comboSlabRanges?.length &&
                            (rule.bwExcessRate ||
                              rule.colorExcessRate ||
                              rule.combinedExcessRate) && (
                              <div className="mt-1 text-xs grid grid-cols-2 gap-2 opacity-80">
                                {rule.bwExcessRate && (
                                  <div>
                                    B/W Rate: <strong>{formatCurrency(rule.bwExcessRate)}</strong>
                                  </div>
                                )}
                                {rule.colorExcessRate && (
                                  <div>
                                    Color Rate:{' '}
                                    <strong>{formatCurrency(rule.colorExcessRate)}</strong>
                                  </div>
                                )}
                                {rule.combinedExcessRate && (
                                  <div>
                                    Combined Rate:{' '}
                                    <strong>{formatCurrency(rule.combinedExcessRate)}</strong>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEASE Details */}
          {currentInvoice.saleType === 'LEASE' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-lease/10 rounded-xl border border-lease/20">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-lease uppercase tracking-wider">
                  Lease Type
                </p>
                <p className="text-xs font-bold text-gray-700">{currentInvoice.leaseType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-lease uppercase tracking-wider">Tenure</p>
                <p className="text-xs font-bold text-gray-700">
                  {currentInvoice.leaseTenureMonths} Months
                </p>
              </div>
              {currentInvoice.monthlyEmiAmount && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-lease uppercase tracking-wider">
                    Monthly EMI
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    {formatCurrency(currentInvoice.monthlyEmiAmount)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SALE Details - Warranty placeholder if needed */}
          {currentInvoice.saleType === 'SALE' && (
            <div className="p-4 bg-sale/10 rounded-xl border border-sale/20">
              <p className="text-[10px] font-bold text-sale uppercase tracking-wider">Sale Order</p>
              <p className="text-xs text-muted-foreground mt-1">
                Standard product sale terms apply.
              </p>
            </div>
          )}
          {(currentInvoice.saleType === 'RENT' || currentInvoice.saleType === 'LEASE') &&
            (currentInvoice.startDate ||
              currentInvoice.endDate ||
              currentInvoice.billingCycleInDays) && (
              <>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-muted/30 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Contract Period
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="opacity-50" />
                      <p className="text-xs font-bold flex items-center gap-1">
                        <span>
                          {new Date(
                            currentInvoice.effectiveFrom || currentInvoice.createdAt,
                          ).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </span>
                        <span> — </span>
                        <span>
                          {currentInvoice.effectiveTo
                            ? new Date(currentInvoice.effectiveTo).toLocaleDateString(undefined, {
                                dateStyle: 'medium',
                              })
                            : 'N/A'}
                        </span>
                        {currentInvoice.effectiveTo &&
                          (() => {
                            const start = new Date(
                              currentInvoice.effectiveFrom || currentInvoice.createdAt,
                            );
                            const end = new Date(currentInvoice.effectiveTo);
                            const months = differenceInMonths(end, start);
                            const days = differenceInDays(end, start);

                            if (months > 0) {
                              return (
                                <span className="text-gray-500 font-normal text-[10px] ml-1">
                                  ({months} Month{months !== 1 ? 's' : ''})
                                </span>
                              );
                            }
                            return (
                              <span className="text-gray-500 font-normal text-[10px] ml-1">
                                ({days} Day{days !== 1 ? 's' : ''})
                              </span>
                            );
                          })()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Billing Cycle
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Coins size={14} className="opacity-50" />
                      <p className="text-xs font-bold">
                        Every {currentInvoice.billingCycleInDays || 30} Days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Breakdown for FINAL Invoices */}
                {(currentInvoice.bwA4Count != null || currentInvoice.bwA3Count != null) && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Usage Breakdown
                    </h3>
                    <div className="rounded-xl border border-sale/20 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-sale/10">
                          <TableRow className="hover:bg-transparent border-sale/10">
                            <TableHead className="text-[10px] font-bold text-sale h-10 w-[30%]">
                              METER CATEGORY
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-center h-10">
                              READING
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-center h-10">
                              ALLOWED
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-center h-10">
                              EXTRA
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-center h-10">
                              EXCESS
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-center h-10">
                              EXCESS RATE
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-sale text-right h-10">
                              AMOUNT
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* BW Row */}
                          {(() => {
                            const bwRule = currentInvoice.items?.find(
                              (i) =>
                                i.itemType === 'PRICING_RULE' && i.description.includes('Black'),
                            );
                            const bwTotal =
                              (currentInvoice.bwA4Count || 0) + (currentInvoice.bwA3Count || 0) * 2;
                            const bwLimit = bwRule?.bwIncludedLimit || 0;
                            const bwExcess = Math.max(0, bwTotal - bwLimit);
                            const bwExcessRate = bwRule?.bwExcessRate || 0;
                            const bwExcessAmount = bwExcess * bwExcessRate;

                            if (bwRule) {
                              return (
                                <TableRow className="border-sale/10">
                                  <TableCell className="font-bold text-gray-700 py-3 text-[10px] sm:text-xs">
                                    B&W (A4 + 2x A3)
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-600 text-xs">
                                    {bwTotal.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-400 text-xs">
                                    {bwLimit.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-blue-500 text-xs">
                                    {(currentInvoice.extraBwA4Count || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-sale text-xs">
                                    {bwExcess.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-500 text-xs">
                                    {formatCurrency(bwExcessRate)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary text-xs">
                                    {formatCurrency(bwExcessAmount)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return null;
                          })()}

                          {/* Color Row */}
                          {(() => {
                            const colorRule = currentInvoice.items?.find(
                              (i) =>
                                i.itemType === 'PRICING_RULE' && i.description.includes('Color'),
                            );
                            const colorTotal =
                              (currentInvoice.colorA4Count || 0) +
                              (currentInvoice.colorA3Count || 0) * 2;
                            const colorLimit = colorRule?.colorIncludedLimit || 0;
                            const colorExcess = Math.max(0, colorTotal - colorLimit);
                            const colorExcessRate = colorRule?.colorExcessRate || 0;
                            const colorExcessAmount = colorExcess * colorExcessRate;

                            if (colorRule) {
                              return (
                                <TableRow className="border-sale/10">
                                  <TableCell className="font-bold text-gray-700 py-3 text-[10px] sm:text-xs">
                                    Color (A4 + 2x A3)
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-600 text-xs">
                                    {colorTotal.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-400 text-xs">
                                    {colorLimit.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-rose-500 text-xs">
                                    {(currentInvoice.extraColorA4Count || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-sale text-xs">
                                    {colorExcess.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-500 text-xs">
                                    {formatCurrency(colorExcessRate)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary text-xs">
                                    {formatCurrency(colorExcessAmount)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return null;
                          })()}

                          {/* Combined Row (if any) */}
                          {(() => {
                            const comboRule = currentInvoice.items?.find(
                              (i) =>
                                i.itemType === 'PRICING_RULE' && i.description.includes('Combined'),
                            );
                            if (comboRule) {
                              const totalTotal =
                                (currentInvoice.bwA4Count || 0) +
                                (currentInvoice.bwA3Count || 0) * 2 +
                                (currentInvoice.colorA4Count || 0) +
                                (currentInvoice.colorA3Count || 0) * 2;
                              const comboLimit = comboRule.combinedIncludedLimit || 0;
                              const comboExcess = Math.max(0, totalTotal - comboLimit);
                              const comboExcessRate = comboRule?.combinedExcessRate || 0;
                              const comboExcessAmount = comboExcess * comboExcessRate;

                              return (
                                <TableRow className="border-sale/10">
                                  <TableCell className="font-bold text-gray-700 py-3 text-[10px] sm:text-xs">
                                    Combined Usage
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-600 text-xs">
                                    {totalTotal.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-400 text-xs">
                                    {comboLimit.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-blue-400 text-xs">
                                    {(
                                      (currentInvoice.extraBwA4Count || 0) +
                                      (currentInvoice.extraColorA4Count || 0)
                                    ).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-sale text-xs">
                                    {comboExcess.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-gray-500 text-xs">
                                    {formatCurrency(comboExcessRate)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary text-xs">
                                    {formatCurrency(comboExcessAmount)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return null;
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Order Items
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50/80">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                      DESCRIPTION
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                      LIMITS
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                      EXCESS RATES
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-center h-10">
                      QTY
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-right h-10">
                      TOTAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInvoice.items
                    ?.filter(
                      (item) =>
                        item.itemType !== 'PRICING_RULE' &&
                        !item.description.startsWith('Black & White') &&
                        !item.description.startsWith('Color') &&
                        !item.description.startsWith('Combined'),
                    )
                    .map((item, idx) => (
                      <TableRow key={item.id || idx} className="border-gray-50">
                        <TableCell className="py-3">
                          <div className="space-y-1">
                            <p className="font-bold text-gray-700 text-sm">
                              {getCleanProductName(item.description)}
                            </p>
                            {(item.initialBwCount !== undefined ||
                              item.initialColorCount !== undefined) && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.initialBwCount !== undefined && item.initialBwCount > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-100 px-1.5 py-0"
                                  >
                                    B&W: {item.initialBwCount}
                                  </Badge>
                                )}
                                {item.initialColorCount !== undefined &&
                                  item.initialColorCount > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold bg-purple-50 text-purple-700 border-purple-100 px-1.5 py-0"
                                    >
                                      CLR: {item.initialColorCount}
                                    </Badge>
                                  )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-gray-600 align-top py-3">
                          <div className="flex flex-col gap-1">
                            {item.bwIncludedLimit ? (
                              <span className="whitespace-nowrap">BW: {item.bwIncludedLimit}</span>
                            ) : null}
                            {item.colorIncludedLimit ? (
                              <span className="whitespace-nowrap">
                                CLR: {item.colorIncludedLimit}
                              </span>
                            ) : null}
                            {item.combinedIncludedLimit ? (
                              <span className="whitespace-nowrap">
                                CMB: {item.combinedIncludedLimit}
                              </span>
                            ) : null}
                            {!item.bwIncludedLimit &&
                              !item.colorIncludedLimit &&
                              !item.combinedIncludedLimit && (
                                <span className="text-gray-300">-</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-gray-600 align-top py-3">
                          <div className="flex flex-col gap-1">
                            {item.bwSlabRanges && item.bwSlabRanges.length > 0 ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-500 text-[10px] uppercase">
                                  BW Slabs
                                </span>
                                {item.bwSlabRanges.map(
                                  (s: { from: number; to: number; rate: number }, i: number) => (
                                    <span key={i} className="whitespace-nowrap">
                                      {s.from}-{s.to}: ₹{s.rate}
                                    </span>
                                  ),
                                )}
                                {item.bwExcessRate && (
                                  <span className="whitespace-nowrap">
                                    &gt;{' '}
                                    {Math.max(
                                      ...item.bwSlabRanges.map(
                                        (s: { from: number; to: number; rate: number }) =>
                                          Number(s.to) || 0,
                                      ),
                                    )}
                                    : ₹{item.bwExcessRate}
                                  </span>
                                )}
                              </div>
                            ) : item.bwExcessRate ? (
                              <span className="whitespace-nowrap">BW: ₹{item.bwExcessRate}</span>
                            ) : null}

                            {item.colorSlabRanges && item.colorSlabRanges.length > 0 ? (
                              <div className="flex flex-col mt-1">
                                <span className="font-semibold text-gray-500 text-[10px] uppercase">
                                  Color Slabs
                                </span>
                                {item.colorSlabRanges.map(
                                  (s: { from: number; to: number; rate: number }, i: number) => (
                                    <span key={i} className="whitespace-nowrap">
                                      {s.from}-{s.to}: ₹{s.rate}
                                    </span>
                                  ),
                                )}
                                {item.colorExcessRate && (
                                  <span className="whitespace-nowrap">
                                    &gt;{' '}
                                    {Math.max(
                                      ...item.colorSlabRanges.map(
                                        (s: { from: number; to: number; rate: number }) =>
                                          Number(s.to) || 0,
                                      ),
                                    )}
                                    : ₹{item.colorExcessRate}
                                  </span>
                                )}
                              </div>
                            ) : item.colorExcessRate ? (
                              <span className="whitespace-nowrap mt-1">
                                CLR: ₹{item.colorExcessRate}
                              </span>
                            ) : null}

                            {item.comboSlabRanges && item.comboSlabRanges.length > 0 ? (
                              <div className="flex flex-col mt-1">
                                <span className="font-semibold text-gray-500 text-[10px] uppercase">
                                  Combo Slabs
                                </span>
                                {item.comboSlabRanges.map(
                                  (s: { from: number; to: number; rate: number }, i: number) => (
                                    <span key={i} className="whitespace-nowrap">
                                      {s.from}-{s.to}: ₹{s.rate}
                                    </span>
                                  ),
                                )}
                                {item.combinedExcessRate && (
                                  <span className="whitespace-nowrap">
                                    &gt;{' '}
                                    {Math.max(
                                      ...item.comboSlabRanges.map(
                                        (s: { from: number; to: number; rate: number }) =>
                                          Number(s.to) || 0,
                                      ),
                                    )}
                                    : ₹{item.combinedExcessRate}
                                  </span>
                                )}
                              </div>
                            ) : item.combinedExcessRate ? (
                              <span className="whitespace-nowrap mt-1">
                                CMB: ₹{item.combinedExcessRate}
                              </span>
                            ) : null}

                            {!item.bwExcessRate &&
                              !item.colorExcessRate &&
                              !item.combinedExcessRate &&
                              (!item.bwSlabRanges || item.bwSlabRanges.length === 0) &&
                              (!item.colorSlabRanges || item.colorSlabRanges.length === 0) &&
                              (!item.comboSlabRanges || item.comboSlabRanges.length === 0) && (
                                <span className="text-gray-300">-</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-muted-foreground text-sm align-top py-3">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground text-sm align-top py-3">
                          QAR {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Financial Summary Section */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Financial Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50/50 rounded-xl border border-gray-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {currentInvoice.saleType === 'LEASE'
                    ? 'Monthly EMI'
                    : mode === 'EMPLOYEE'
                      ? 'Monthly Rent Balance'
                      : 'Monthly Rent'}
                </p>
                <p className="text-sm font-bold text-gray-700">
                  ₹
                  {currentInvoice.saleType === 'LEASE'
                    ? (currentInvoice.monthlyEmiAmount || 0).toLocaleString()
                    : financialSummary.monthlyRent.toLocaleString()}
                </p>
              </div>

              {currentInvoice.saleType === 'LEASE' && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Total Lease Amount
                  </p>
                  <p className="text-sm font-bold text-gray-700">
                    ₹{(currentInvoice.totalLeaseAmount || 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {mode === 'EMPLOYEE' ? 'Advance Balance' : 'Advance Adj.'}
                </p>
                <p className="text-sm font-bold text-success">
                  - QAR {financialSummary.advanceAdjusted.toLocaleString()}
                </p>
              </div>
              {mode === 'FINANCE' && (
                <>
                  {financialSummary.extraUsage > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Extra Usage</p>
                      <p className="text-sm font-bold text-warning">
                        + QAR {financialSummary.extraUsage.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {financialSummary.additionalCharges > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Extra Charges</p>
                      <p className="text-sm font-bold text-orange-600">
                        + QAR {financialSummary.additionalCharges.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="col-span-full pt-3 mt-1 border-t border-gray-100 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-primary uppercase">
                      Current Pending Balance
                    </p>
                    <p
                      className={`text-lg font-bold ${financialSummary.pendingBalance > 0 ? 'text-danger' : 'text-success'}`}
                    >
                      QAR
                      {financialSummary.pendingBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Invoice History Section */}
          {currentInvoice.invoiceHistory && currentInvoice.invoiceHistory.length > 0 && (
            <div ref={historyRef} className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Invoice History
              </h3>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                        DATE
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                        INVOICE #
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-gray-400 text-right h-10">
                        AMOUNT
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInvoice.invoiceHistory.map((hist) => (
                      <TableRow
                        key={hist.id}
                        className="border-gray-50 hover:bg-info/10 transition-colors cursor-pointer group"
                        onClick={() => handleSelectInvoice(hist.id)}
                      >
                        <TableCell className="text-xs font-bold text-gray-600">
                          {new Date(hist.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-info group-hover:underline">
                          {hist.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-primary text-right">
                          QAR
                          {(hist.totalAmount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-muted/50/50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-primary">
              QAR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Utility Actions */}
            {/* Utility Actions Removed as requested */}
            <div className="flex-1 md:hidden" />

            {/* Separator on Desktop */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Main Decision Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {mode === 'FINANCE' && currentInvoice.status === 'EMPLOYEE_APPROVED' ? (
                rejecting ? (
                  <div className="flex-1 flex gap-2 items-center animate-in slide-in-from-right-4 w-full sm:w-auto">
                    <input
                      className="flex-1 min-w-[140px] text-xs p-2 h-10 border border-danger/20 rounded-lg bg-danger/10 focus:bg-card focus:border-danger outline-none transition-all placeholder:text-danger/50"
                      placeholder="Reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejecting(false)}
                      className="h-10 text-muted-foreground hover:text-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-10 bg-danger hover:bg-danger/90 text-white shadow-sm border border-danger/20 px-4"
                      onClick={handleReject}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold text-danger border-danger/20 hover:bg-danger/10"
                      onClick={() => setRejecting(true)}
                      disabled={isLoading}
                    >
                      Reject
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none rounded-xl h-10 px-8 font-bold bg-success text-white shadow-lg shadow-success/10 hover:bg-success/90 transition-all"
                      onClick={handleApprove}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Approve
                    </Button>
                  </>
                )
              ) : mode === 'FINANCE' &&
                (currentInvoice.saleType === 'RENT' || currentInvoice.saleType === 'LEASE') &&
                currentInvoice.contractStatus === 'ACTIVE' ? (
                completing ? (
                  <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                    <span className="text-xs font-bold text-slate-500">End Contract?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompleting(false)}
                      className="h-10 text-muted-foreground hover:text-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-10 bg-slate-900 text-white shadow-sm hover:bg-slate-800 px-4"
                      onClick={handleCompleteContract}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Confirm Completion
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                    onClick={() => setCompleting(true)}
                    disabled={isLoading}
                  >
                    Complete Contract
                  </Button>
                )
              ) : mode === 'FINANCE' &&
                (currentInvoice.saleType === 'RENT' ||
                  currentInvoice.saleType === 'LEASE') ? null : onApprove &&
                (currentInvoice.status === 'DRAFT' || currentInvoice.status === 'SENT') ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    className="flex-1 sm:flex-none rounded-xl h-10 px-8 font-bold bg-primary text-white shadow-lg shadow-primary/10 hover:bg-primary/90 transition-all"
                    onClick={handleApprove}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    {approveLabel}
                  </Button>
                  {onApproveNext && (
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold border-primary text-primary hover:bg-primary/10 transition-all"
                      onClick={handleApproveNext}
                      disabled={isLoading}
                    >
                      Generate & Record Next
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold text-muted-foreground hover:bg-gray-100"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}

              {/* Notification Actions for Draft/Sent/Approved Invoices */}
              {(currentInvoice.status === 'DRAFT' ||
                currentInvoice.status === 'SENT' ||
                currentInvoice.status === 'APPROVED' ||
                currentInvoice.status === 'FINANCE_APPROVED') && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="sm:flex-none rounded-xl h-10 px-5 font-bold text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-primary gap-2 transition-all shadow-sm"
                    title="Send via Email"
                    disabled={isLoading || isEmailSending}
                    onClick={async () => {
                      const email = currentInvoice.customerEmail;
                      if (!email) {
                        toast.error('No email address found for this customer');
                        return;
                      }

                      setIsEmailSending(true);
                      try {
                        const { sendEmailNotification } = await import('@/lib/invoice');

                        const generateEmailBody = (inv: Invoice) => {
                          const formatDate = (d: string | undefined) =>
                            d ? new Date(d).toLocaleDateString() : 'N/A';

                          let itemsHtml = '';
                          if (inv.items && inv.items.length > 0) {
                            itemsHtml = `
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: Arial, sans-serif;">
                                      <thead>
                                        <tr style="background-color: #f3f4f6; text-align: left;">
                                          <th style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Description</th>
                                          <th style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Limits</th>
                                          <th style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Excess Rates</th>
                                          <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: center;">Qty</th>
                                          <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: right;">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${inv.items
                                          .map((item) => {
                                            const limits = [];
                                            if (item.bwIncludedLimit)
                                              limits.push(`BW: ${item.bwIncludedLimit}`);
                                            if (item.colorIncludedLimit)
                                              limits.push(`CLR: ${item.colorIncludedLimit}`);
                                            if (item.combinedIncludedLimit)
                                              limits.push(`CMB: ${item.combinedIncludedLimit}`);

                                            const rates = [];
                                            if (item.bwSlabRanges && item.bwSlabRanges.length > 0) {
                                              rates.push(`<strong>BW Slabs:</strong>`);
                                              item.bwSlabRanges.forEach((s) =>
                                                rates.push(`${s.from}-${s.to}: ₹${s.rate}`),
                                              );
                                              if (item.bwExcessRate) {
                                                rates.push(
                                                  `> ${Math.max(...item.bwSlabRanges.map((s) => Number(s.to) || 0))}: ₹${item.bwExcessRate}`,
                                                );
                                              }
                                            } else if (item.bwExcessRate)
                                              rates.push(`BW: ₹${item.bwExcessRate}`);

                                            if (
                                              item.colorSlabRanges &&
                                              item.colorSlabRanges.length > 0
                                            ) {
                                              rates.push(`<strong>Color Slabs:</strong>`);
                                              item.colorSlabRanges.forEach((s) =>
                                                rates.push(`${s.from}-${s.to}: ₹${s.rate}`),
                                              );
                                              if (item.colorExcessRate) {
                                                rates.push(
                                                  `> ${Math.max(...item.colorSlabRanges.map((s) => Number(s.to) || 0))}: ₹${item.colorExcessRate}`,
                                                );
                                              }
                                            } else if (item.colorExcessRate)
                                              rates.push(`CLR: ₹${item.colorExcessRate}`);

                                            if (
                                              item.comboSlabRanges &&
                                              item.comboSlabRanges.length > 0
                                            ) {
                                              rates.push(`<strong>Combo Slabs:</strong>`);
                                              item.comboSlabRanges.forEach((s) =>
                                                rates.push(`${s.from}-${s.to}: ₹${s.rate}`),
                                              );
                                              if (item.combinedExcessRate) {
                                                rates.push(
                                                  `> ${Math.max(...item.comboSlabRanges.map((s) => Number(s.to) || 0))}: ₹${item.combinedExcessRate}`,
                                                );
                                              }
                                            } else if (item.combinedExcessRate)
                                              rates.push(`CMB: ₹${item.combinedExcessRate}`);

                                            return `
                                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                              <td style="padding: 12px; vertical-align: top;">
                                                <strong>${item.description}</strong>
                                                ${item.itemType === 'PRICING_RULE' ? '<br/><span style="font-size: 12px; color: #6b7280;">(Pricing Rule)</span>' : ''}
                                              </td>
                                              <td style="padding: 12px; font-size: 13px; vertical-align: top;">
                                                ${limits.length > 0 ? limits.join('<br/>') : '-'}
                                              </td>
                                              <td style="padding: 12px; font-size: 13px; vertical-align: top; line-height: 1.4;">
                                                ${rates.length > 0 ? rates.join('<br/>') : '-'}
                                              </td>
                                              <td style="padding: 12px; text-align: center;">${item.quantity || 1}</td>
                                              <td style="padding: 12px; text-align: right;">QAR ${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}</td>
                                            </tr>
                                          `;
                                          })
                                          .join('')}
                                      </tbody>
                                    </table>
                                  `;
                          }

                          let detailsHtml = '';
                          if (inv.saleType === 'RENT') {
                            detailsHtml = `
                               <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                 <h3 style="margin-top: 0; color: #111827;">Rental Details</h3>
                                 <p style="margin: 5px 0;"><strong>Plan Type:</strong> ${inv.rentType?.replace('_', ' ')}</p>
                                 <p style="margin: 5px 0;"><strong>Billing Period:</strong> ${inv.rentPeriod}</p>
                                  <p style="margin: 5px 0;"><strong>Monthly Rent:</strong> QAR ${inv.monthlyRent?.toLocaleString()}</p>
                                 <p style="margin: 5px 0;"><strong>Contract Period:</strong> ${formatDate(inv.effectiveFrom)} - ${formatDate(inv.effectiveTo)}</p>
                               </div>
                             `;
                          } else if (inv.saleType === 'LEASE') {
                            detailsHtml = `
                               <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                 <h3 style="margin-top: 0; color: #111827;">Lease Details</h3>
                                 <p style="margin: 5px 0;"><strong>Lease Type:</strong> ${inv.leaseType}</p>
                                 <p style="margin: 5px 0;"><strong>Tenure:</strong> ${inv.leaseTenureMonths} Months</p>
                                 ${inv.monthlyEmiAmount ? `<p style="margin: 5px 0;"><strong>Monthly EMI:</strong> ₹${inv.monthlyEmiAmount.toLocaleString()}</p>` : ''}
                                 ${inv.totalLeaseAmount ? `<p style="margin: 5px 0;"><strong>Total Lease Amount:</strong> ₹${inv.totalLeaseAmount.toLocaleString()}</p>` : ''}
                               </div>
                             `;
                          }

                          return `
                            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #374151;">
                              <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #1d4ed8; margin-bottom: 5px;">Quotation #${inv.invoiceNumber}</h1>
                                <p style="margin: 0; color: #6b7280;">Date: ${formatDate(inv.createdAt)}</p>
                              </div>

                              <p>Dear <strong>${inv.customerName}</strong>,</p>
                              <p>Thank you for your interest in XeroCare. Please find below the details of your quotation.</p>

                              ${detailsHtml}

                              ${itemsHtml}

                              <div style="margin-top: 30px; text-align: right;">
                                <p style="font-size: 18px; margin: 5px 0;">Total Amount: <strong style="color: #1d4ed8;">QAR ${(inv.totalAmount || 0).toLocaleString()}</strong></p>
                                ${inv.advanceAmount ? `<p style="margin: 5px 0; color: #059669;">Advance Required: <strong>QAR ${inv.advanceAmount.toLocaleString()}</strong></p>` : ''}
                              </div>

                              <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                                <p>This is an electronically generated quotation.</p>
                                <p>XeroCare</p>
                              </div>
                            </div>
                          `;
                        };

                        await sendEmailNotification(currentInvoice.id, {
                          recipient: email,
                          subject: `Quotation ${currentInvoice.invoiceNumber} from XeroCare`,
                          body: generateEmailBody(currentInvoice),
                        });
                        toast.success(`Email sent successfully to ${email}`);
                      } catch (e) {
                        toast.error('Failed to send email');
                        console.error(e);
                      } finally {
                        setIsEmailSending(false);
                      }
                    }}
                  >
                    {isEmailSending ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <Mail size={16} />
                    )}
                    Email
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <UsageRecordingModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        contractId={currentInvoice.referenceContractId || currentInvoice.id}
        customerName={currentInvoice.customerName}
        onSuccess={() => {
          handleSelectInvoice(currentInvoice.id); // Refresh current view
        }}
        invoice={undefined}
      />
    </Dialog>
  );
}
