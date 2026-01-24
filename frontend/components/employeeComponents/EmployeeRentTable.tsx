import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyInvoices, Invoice, createInvoice, CreateInvoicePayload } from '@/lib/invoice';
import RentFormModal from './RentFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';

import { updateQuotation } from '@/lib/invoice'; // Ensure import

// ...

export default function EmployeeRentTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>(undefined); // For Edit Mode
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getMyInvoices();
      // Filter only RENT type invoices
      setInvoices(data.filter((i) => i.saleType === 'RENT'));
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load rent agreements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleViewDetails = (id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setDetailsOpen(true);
    }
  };

  const handleCreateOrUpdate = async (data: CreateInvoicePayload) => {
    try {
      if (editInvoice) {
        // Update Mode
        const updated = await updateQuotation(editInvoice.id, data);
        setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
        toast.success('Quotation updated successfully.');
      } else {
        // Create Mode
        const newInvoice = await createInvoice(data);
        setInvoices((prev) => [newInvoice, ...prev]);
        toast.success('Rent quotation created successfully.');
      }
      setFormOpen(false);
      setEditInvoice(undefined);
    } catch (error: unknown) {
      console.error('Failed to save rent record:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save rent record.');
    }
  };

  const openCreateModal = () => {
    setEditInvoice(undefined);
    setFormOpen(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setFormOpen(true);
  };

  // ...

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          className="bg-primary text-white gap-2 w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
          onClick={openCreateModal}
        >
          <Plus size={16} /> New Rent
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-primary font-bold">INV NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">RENT TYPE</TableHead>
                <TableHead className="text-primary font-bold">PERIOD</TableHead>
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No rent agreements found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                invoices
                  .filter((inv) =>
                    search
                      ? inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
                      : true,
                  )
                  .map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-700">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-medium">{inv.customerName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider
                            ${
                              inv.rentType?.startsWith('FIXED')
                                ? 'border-blue-200 text-blue-600 bg-blue-50'
                                : inv.rentType?.startsWith('CPC')
                                  ? 'border-purple-200 text-purple-600 bg-purple-50'
                                  : 'border-slate-200 text-slate-600 bg-slate-50'
                            }
                          `}
                        >
                          {inv.rentType?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {inv.rentPeriod}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">
                        ₹{inv.totalAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none
                            ${
                              inv.status === 'PAID' ||
                              inv.status === 'APPROVED' ||
                              inv.status === 'ISSUED'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : inv.status === 'SENT'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                  : inv.status === 'REJECTED' || inv.status === 'CANCELLED'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                            }
                          `}
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleViewDetails(inv.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                              onClick={() => openEditModal(inv)}
                            >
                              <FileText className="h-4 w-4" /> {/* Edit Icon replacement */}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        {formOpen && (
          <RentFormModal
            initialData={editInvoice}
            onClose={() => setFormOpen(false)}
            onConfirm={handleCreateOrUpdate}
          />
        )}

        {detailsOpen && selectedInvoice && (
          <InvoiceDetailsDialog
            invoice={selectedInvoice}
            onClose={() => setDetailsOpen(false)}
            onApprove={() => {
              setDetailsOpen(false);
              setApproveOpen(true);
            }}
          />
        )}

        {approveOpen && selectedInvoice && (
          <ApproveQuotationDialog
            invoiceId={selectedInvoice.id}
            onClose={() => setApproveOpen(false)}
            onSuccess={() => {
              setApproveOpen(false);
              fetchInvoices();
            }}
          />
        )}
      </div>
    </div>
  );
}

// RentFormModal has been moved to its own file ./RentFormModal.tsx

function InvoiceDetailsDialog({
  invoice,
  onClose,
  onApprove,
}: {
  invoice: Invoice;
  onClose: () => void;
  onApprove: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl border border-gray-100 shadow-2xl bg-white">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <FileText size={20} />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold text-primary tracking-tight">
                {invoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Details
              </DialogDescription>

              {/* Show Rent Type info */}
              {invoice.rentType && (
                <Badge
                  variant="outline"
                  className="mt-2 text-[10px] tracking-wide border-blue-200 text-blue-700"
                >
                  {invoice.rentType.replace('_', ' ')} • {invoice.rentPeriod}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
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
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
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
          </div>

          {(invoice.startDate || invoice.endDate || invoice.effectiveFrom) && (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-gray-50 rounded-xl">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Contract Period
                </p>
                <p className="text-xs font-bold text-gray-600">
                  {invoice.startDate || invoice.effectiveFrom
                    ? new Date(invoice.startDate || invoice.effectiveFrom!).toLocaleDateString()
                    : 'N/A'}{' '}
                  —{' '}
                  {invoice.endDate || invoice.effectiveTo
                    ? new Date(invoice.endDate || invoice.effectiveTo!).toLocaleDateString()
                    : 'Active'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Billing Cycle
                </p>
                <p className="text-xs font-bold text-gray-600">{invoice.rentPeriod || 'MONTHLY'}</p>
              </div>
            </div>
          )}

          {/* Rent & Advance Info */}
          {invoice.monthlyRent !== undefined && invoice.monthlyRent > 0 && (
            <div className="p-4 rounded-lg bg-blue-50/50 flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Rent</p>
                <p className="font-bold text-slate-800">₹{invoice.monthlyRent}</p>
              </div>
              {invoice.advanceAmount ? (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Advance</p>
                  <p className="font-bold text-slate-800">₹{invoice.advanceAmount}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Security Deposit Section (Read Only) */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
              Security Deposit
            </h4>
            {invoice.securityDepositAmount && invoice.securityDepositAmount > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-slate-500">Amount</p>
                  <p className="text-sm font-bold text-slate-900">
                    ₹{invoice.securityDepositAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-500">Mode</p>
                  <p className="text-sm font-bold text-slate-900">{invoice.securityDepositMode}</p>
                </div>
                {invoice.securityDepositReference && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-medium text-slate-500">Reference</p>
                    <p className="text-sm font-bold text-slate-900">
                      {invoice.securityDepositReference}
                    </p>
                  </div>
                )}
                {invoice.securityDepositReceivedDate && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-medium text-slate-500">Received Date</p>
                    <p className="text-sm font-bold text-slate-900">
                      {new Date(invoice.securityDepositReceivedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-500 italic">
                No security deposit collected.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Rules / Items
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-gray-400">
                      DESCRIPTION
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-center">
                      LIMIT/QTY
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-right">
                      RATE/PRICE
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-gray-700 py-3 text-sm">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-center font-bold text-gray-500 text-sm">
                        {/* Display Limit if exists, else Qty */}
                        {invoice.rentType?.startsWith('CPC') ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 bg-emerald-50"
                          >
                            Unlimited
                          </Badge>
                        ) : item.bwIncludedLimit !== undefined ||
                          item.colorIncludedLimit !== undefined ||
                          item.combinedIncludedLimit !== undefined ? (
                          `Free: ${item.bwIncludedLimit ?? item.colorIncludedLimit ?? item.combinedIncludedLimit ?? 0}`
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900 text-sm">
                        {item.bwExcessRate !== undefined ||
                        item.colorExcessRate !== undefined ||
                        item.combinedExcessRate !== undefined
                          ? `${invoice.rentType?.startsWith('CPC') ? 'Rate' : 'Excess'}: ₹${item.bwExcessRate ?? item.colorExcessRate ?? item.combinedExcessRate}/pg`
                          : `₹${(item.quantity || 0) * (item.unitPrice || 0)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              Total
            </p>
            <p className="text-xl font-bold text-primary">
              ₹{invoice.totalAmount?.toLocaleString() || 0}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 font-bold text-gray-600 h-9 px-3"
            >
              <Printer size={14} /> Print
            </Button>

            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 h-9 px-3"
              onClick={() => {
                const message =
                  `*Proforma Invoice #${invoice.invoiceNumber}*\n\n` +
                  `*Customer:* ${invoice.customerName}\n` +
                  `*Rent Type:* ${invoice.rentType || 'N/A'}\n` +
                  `*Total Amount:* ₹${invoice.totalAmount?.toLocaleString()}\n\n` +
                  `Please find the invoice details attached via this summary.\n` +
                  `Thank you for your business!`;

                const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
            >
              <Share2 size={14} /> WhatsApp
            </Button>

            <Button variant="outline" size="sm" onClick={onClose} className="font-bold h-9 px-3">
              Close
            </Button>

            {(invoice.status === 'SENT' || invoice.status === 'DRAFT') && (
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-green-600 text-white hover:bg-green-700 font-bold h-9 px-3"
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
