import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { FileText, Calendar, IndianRupee, Printer, Mail, Phone } from 'lucide-react';
import { Invoice } from '@/lib/invoice';

interface InvoiceDetailsDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
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
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-xl border border-gray-100 shadow-2xl bg-white flex flex-col max-h-[90vh]">
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
          <div className="absolute top-8 right-8">
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
                        <div key={idx} className="flex flex-col gap-1">
                          <span className="font-bold">{rule.description}</span>
                          <div className="flex gap-4 opacity-80">
                            <span>B/W Included: {rule.bwIncludedLimit || 0}</span>
                            <span>Color Included: {rule.colorIncludedLimit || 0}</span>
                          </div>
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

          {/* SALE Details - Warranty placeholder if needed */}
          {invoice.saleType === 'SALE' && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Sale Order
              </p>
              <p className="text-xs text-gray-500 mt-1">Standard product sale terms apply.</p>
            </div>
          )}
          {(invoice.saleType === 'RENT' || invoice.saleType === 'LEASE') &&
            (invoice.startDate || invoice.endDate || invoice.billingCycleInDays) && (
              <>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-gray-50 rounded-xl">
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
                <TableHeader className="bg-gray-50/80">
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
                        <TableCell className="text-center font-bold text-gray-500 text-sm">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900 text-sm">
                          ₹{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-primary">
              ₹{(invoice.totalAmount || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Close
            </button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleShareWhatsApp}
              title="Share on WhatsApp"
            >
              <Phone size={18} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={handleSendEmail}
              title="Send Email"
            >
              <Mail size={18} />
            </Button>

            <Button
              className="rounded-xl h-11 px-6 font-bold bg-primary text-white shadow-lg hover:bg-primary/90 transition-all"
              onClick={() => window.print()}
            >
              Print
            </Button>

            {mode === 'FINANCE' && invoice.status === 'EMPLOYEE_APPROVED' ? (
              <>
                <div className="relative">
                  {rejecting ? (
                    <div className="absolute bottom-full mb-2 right-0 bg-white p-3 rounded-xl shadow-xl border border-red-100 w-64 animate-in slide-in-from-bottom-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                        Rejection Reason
                      </p>
                      <textarea
                        className="w-full text-xs p-2 border rounded-md mb-2 h-20"
                        placeholder="Why is this being rejected?"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setRejecting(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (onReject && rejectReason) {
                              onReject(rejectReason);
                            } else {
                              alert('Please provide a reason');
                            }
                          }}
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="rounded-xl h-11 px-6 font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                      onClick={() => setRejecting(true)}
                    >
                      Reject
                    </Button>
                  )}
                </div>

                <Button
                  className="rounded-xl h-11 px-6 font-bold bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all"
                  onClick={onApprove}
                >
                  Approve
                </Button>
              </>
            ) : (
              onApprove &&
              (invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
                <Button
                  className="rounded-xl h-11 px-6 font-bold bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
                  onClick={onApprove}
                >
                  {approveLabel}
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
