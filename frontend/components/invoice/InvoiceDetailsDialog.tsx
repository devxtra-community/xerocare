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
import { FileText, Calendar, IndianRupee, Printer, Mail, Phone, X, Loader2 } from 'lucide-react';
import { Invoice } from '@/lib/invoice';

interface InvoiceDetailsDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
  approveLabel?: string;
  mode?: 'EMPLOYEE' | 'FINANCE';
  onSuccess?: () => void; // Optional callback for internal dialog state if needed
}

export function InvoiceDetailsDialog({
  invoice,
  onClose,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  mode = 'EMPLOYEE',
}: InvoiceDetailsDialogProps) {
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

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
  const handleShareWhatsApp = () => {
    if (!invoice.customerPhone) {
      alert('Customer phone number not available.');
      return;
    }
    const message = `Hello ${invoice.customerName}, here is your invoice ${invoice.invoiceNumber} for ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}.`;
    const url = `https://wa.me/${invoice.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    if (!invoice.customerEmail) {
      alert('Customer email not available.');
      return;
    }
    const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.branchName || 'XeroCare'}`;
    const body = `Hello ${invoice.customerName},\n\nPlease find attached the details for invoice ${invoice.invoiceNumber}.\n\nTotal Amount: ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}\n\nRegards,\nTeam XeroCare`;
    const url = `mailto:${invoice.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-xl border border-gray-100 shadow-2xl bg-card flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                {invoice.invoiceNumber}
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
                  invoice.status === 'PAID'
                    ? 'bg-green-50 text-green-600 border-green-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}
            >
              {invoice.status}
            </Badge>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-muted/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <div className="p-8 pt-6 space-y-8 overflow-y-auto scrollbar-hide flex-1">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(invoice.createdAt).toLocaleDateString(undefined, {
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
                  {invoice.saleType}
                </Badge>
              </div>
            </div>
          </div>

          {/* RENT Details */}
          {invoice.saleType === 'RENT' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-orange-50/50 rounded-xl border border-orange-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  Rent Type
                </p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Printer size={14} className="opacity-50" />
                  <p className="text-xs font-bold">{invoice.rentType?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  Contract Period
                </p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={14} className="opacity-50" />
                  <p className="text-xs font-bold">
                    {new Date(invoice.startDate || invoice.createdAt).toLocaleDateString(
                      undefined,
                      {
                        dateStyle: 'medium',
                      },
                    )}{' '}
                    -{' '}
                    {invoice.endDate
                      ? new Date(invoice.endDate).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Monthly Rent Display */}
              {invoice.monthlyRent !== undefined && invoice.monthlyRent > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    Monthly Rent
                  </p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <IndianRupee size={14} className="opacity-50" />
                    <p className="text-xs font-bold">
                      ₹{invoice.monthlyRent.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Advance Amount Display */}
              {invoice.advanceAmount !== undefined && invoice.advanceAmount > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    Advance Amount
                  </p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <IndianRupee size={14} className="opacity-50" />
                    <p className="text-xs font-bold">
                      ₹{invoice.advanceAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}
              {/* Show Included Limits / Excess if relevant (simplified view) */}
              {invoice.items?.some((i) => i.itemType === 'PRICING_RULE') && (
                <div className="col-span-2 mt-2 pt-4 border-t border-orange-200/50">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2">
                    Pricing Rules
                  </p>
                  <div className="text-xs space-y-1 text-gray-600">
                    {invoice.items
                      .filter((i) => i.itemType === 'PRICING_RULE')
                      .map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-1 pb-3 mb-3 border-b border-orange-200/30 last:border-0 last:pb-0 last:mb-0"
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
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-orange-100">
                              <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">
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
                                    <span className="font-bold text-gray-800">₹{s.rate}</span>
                                  </div>
                                ))}
                                {rule.bwExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-orange-100 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(...rule.bwSlabRanges.map((s) => Number(s.to) || 0))}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      ₹{rule.bwExcessRate}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 2. Color Slabs */}
                          {rule.colorSlabRanges && rule.colorSlabRanges.length > 0 && (
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-orange-100">
                              <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">
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
                                    <span className="font-bold text-gray-800">₹{s.rate}</span>
                                  </div>
                                ))}
                                {rule.colorExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-orange-100 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(
                                        ...rule.colorSlabRanges.map((s) => Number(s.to) || 0),
                                      )}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      ₹{rule.colorExcessRate}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. Combined Slabs */}
                          {rule.comboSlabRanges && rule.comboSlabRanges.length > 0 && (
                            <div className="mt-1 p-2 bg-card/50 rounded-lg border border-orange-100">
                              <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">
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
                                    <span className="font-bold text-gray-800">₹{s.rate}</span>
                                  </div>
                                ))}
                                {rule.combinedExcessRate && (
                                  <div className="flex justify-between w-full max-w-[200px] border-t border-orange-100 pt-0.5 mt-0.5">
                                    <span>
                                      &gt;{' '}
                                      {Math.max(
                                        ...rule.comboSlabRanges.map((s) => Number(s.to) || 0),
                                      )}
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      ₹{rule.combinedExcessRate}
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
                                    B/W Rate: <strong>₹{rule.bwExcessRate}</strong>
                                  </div>
                                )}
                                {rule.colorExcessRate && (
                                  <div>
                                    Color Rate: <strong>₹{rule.colorExcessRate}</strong>
                                  </div>
                                )}
                                {rule.combinedExcessRate && (
                                  <div>
                                    Combined Rate: <strong>₹{rule.combinedExcessRate}</strong>
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
          {invoice.saleType === 'LEASE' && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Lease Type
                </p>
                <p className="text-xs font-bold text-gray-700">{invoice.leaseType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Tenure
                </p>
                <p className="text-xs font-bold text-gray-700">
                  {invoice.leaseTenureMonths} Months
                </p>
              </div>
              {invoice.monthlyEmiAmount && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    Monthly EMI
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    ₹{invoice.monthlyEmiAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Security Deposit Display */}
          {invoice.securityDepositAmount !== undefined && invoice.securityDepositAmount > 0 && (
            <div className="p-6 bg-emerald-50/50 rounded-xl border border-emerald-100 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-full border-b border-emerald-100 pb-2 mb-2">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                  <IndianRupee size={12} /> Security Deposit Collected
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Amount</p>
                <p className="text-sm font-bold text-gray-800">
                  ₹{invoice.securityDepositAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Mode</p>
                <p className="text-sm font-bold text-gray-800">
                  {invoice.securityDepositMode || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Reference</p>
                <p className="text-sm font-bold text-gray-800">
                  {invoice.securityDepositReference || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Date</p>
                <p className="text-sm font-bold text-gray-800">
                  {invoice.securityDepositReceivedDate
                    ? new Date(invoice.securityDepositReceivedDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>
          )}

          {/* SALE Details - Warranty placeholder if needed */}
          {invoice.saleType === 'SALE' && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Sale Order
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Standard product sale terms apply.
              </p>
            </div>
          )}
          {(invoice.saleType === 'RENT' || invoice.saleType === 'LEASE') &&
            (invoice.startDate || invoice.endDate || invoice.billingCycleInDays) && (
              <>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-muted/50 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Contract Period
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="opacity-50" />
                      <p className="text-xs font-bold">
                        {new Date(invoice.startDate || invoice.createdAt).toLocaleDateString(
                          undefined,
                          {
                            dateStyle: 'medium',
                          },
                        )}{' '}
                        —{' '}
                        {invoice.endDate
                          ? new Date(invoice.endDate).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Billing Cycle
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <IndianRupee size={14} className="opacity-50" />
                      <p className="text-xs font-bold">
                        Every {invoice.billingCycleInDays || 30} Days
                      </p>
                    </div>
                  </div>
                </div>
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
                    <TableHead className="text-[10px] font-bold text-gray-400 text-center h-10">
                      QTY
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-right h-10">
                      TOTAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items
                    ?.filter(
                      (item) =>
                        item.itemType !== 'PRICING_RULE' &&
                        !item.description.startsWith('Black & White') &&
                        !item.description.startsWith('Color') &&
                        !item.description.startsWith('Combined'),
                    )
                    .map((item, idx) => (
                      <TableRow key={item.id || idx} className="border-gray-50">
                        <TableCell className="font-bold text-gray-700 py-3 text-sm">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-center font-bold text-muted-foreground text-sm">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground text-sm">
                          ₹{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/50/50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-primary">
              ₹{(invoice.totalAmount || 0).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Utility Actions */}
            <div className="flex items-center gap-2 p-1 bg-card rounded-xl border border-gray-100 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg h-9 w-9 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                onClick={handleShareWhatsApp}
                title="Share on WhatsApp"
              >
                <Phone size={16} />
              </Button>
              <div className="w-px h-4 bg-gray-100" />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg h-9 w-9 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                onClick={handleSendEmail}
                title="Send Email"
              >
                <Mail size={16} />
              </Button>
              <div className="w-px h-4 bg-gray-100" />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg h-9 w-9 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => window.print()}
                title="Print Invoice"
              >
                <Printer size={16} />
              </Button>
            </div>

            {/* Separator on Desktop */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Main Decision Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {mode === 'FINANCE' && invoice.status === 'EMPLOYEE_APPROVED' ? (
                rejecting ? (
                  <div className="flex-1 flex gap-2 items-center animate-in slide-in-from-right-4 w-full sm:w-auto">
                    <input
                      className="flex-1 min-w-[140px] text-xs p-2 h-10 border border-red-200 rounded-lg bg-red-50 focus:bg-card focus:border-red-400 outline-none transition-all placeholder:text-red-300"
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
                      className="h-10 bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-700 px-4"
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
                      className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      onClick={() => setRejecting(true)}
                      disabled={isLoading}
                    >
                      Reject
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none rounded-xl h-10 px-8 font-bold bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700 hover:shadow-green-200 transition-all"
                      onClick={handleApprove}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Approve
                    </Button>
                  </>
                )
              ) : onApprove && (invoice.status === 'DRAFT' || invoice.status === 'SENT') ? (
                <Button
                  className="flex-1 sm:flex-none rounded-xl h-10 px-8 font-bold bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all"
                  onClick={handleApprove}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {approveLabel}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none rounded-xl h-10 px-6 font-bold text-muted-foreground hover:bg-gray-100"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
