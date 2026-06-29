import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus, Send, ClipboardList } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { QuotationConversionFlow } from './QuotationConversionFlow';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyInvoices, getBranchInvoices, Invoice, employeeApproveInvoice } from '@/lib/invoice';
import { Badge } from '@/components/ui/badge';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';
import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { formatCurrency } from '@/lib/format';

import UsageRecordingModal from '../Finance/UsageRecordingModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

// ...

interface EmployeeRentTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
  onRefresh?: () => void;
}

/**
 * Table displaying rental agreements managed by the employee.
 * Features search, creation of new rentals, and status tracking (Draft, Sent, Paid).
 */
export default function EmployeeRentTable({
  mode = 'EMPLOYEE',
  onRefresh,
}: EmployeeRentTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [editingUsage] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [pendingQuotations, setPendingQuotations] = useState<Invoice[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedForConversion, setSelectedForConversion] = useState<Invoice | null>(null);

  const searchParams = useSearchParams();
  const convertId = searchParams.get('convert');

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchPendingQuotations = async () => {
    try {
      setLoadingQuotations(true);
      let data: Invoice[] = [];
      try {
        data = await getBranchInvoices();
      } catch (err) {
        console.error('getBranchInvoices failed, falling back to getMyInvoices:', err);
        data = await getMyInvoices();
      }

      const pending = data.filter(
        (inv) =>
          inv.type === 'QUOTATION' &&
          (inv.status === 'FINANCE_APPROVED' ||
            inv.status === 'CUSTOMER_ACCEPTED' ||
            inv.status === 'SENT_TO_CUSTOMER') &&
          inv.saleType === 'RENT',
      );
      setPendingQuotations(pending);
      setIsConverterOpen(true);
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to fetch pending quotations';
      toast.error(msg);
    } finally {
      setLoadingQuotations(false);
    }
  };

  useEffect(() => {
    if (convertId) {
      fetchPendingQuotations();
    }
  }, [convertId]);

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let data: Invoice[] = [];
      if (mode === 'FINANCE') {
        const { getBranchInvoices } = await import('@/lib/invoice');
        data = await getBranchInvoices();
        // Filter out unapproved records and Quotations for Finance View
        data = data.filter(
          (inv) => !['DRAFT', 'SENT'].includes(inv.status) && inv.type !== 'QUOTATION',
        );
        console.log('Finance Rent Invoices:', data);
      } else {
        const myData = await getMyInvoices();
        // Show Proformas, Finals, and any quotations that have been converted to transactions
        data = myData.filter((inv) => inv.type !== 'QUOTATION');
      }
      setInvoices(data.filter((i) => i.saleType === 'RENT'));
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load rent agreements.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) =>
    search
      ? inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  useEffect(() => {
    setTotal(filteredInvoices.length);
  }, [filteredInvoices.length, setTotal]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * limit, page * limit);

  const handleViewDetails = (id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setDetailsOpen(true);
    }
  };

  const handleConvertQuotation = async (qId: string) => {
    const q = pendingQuotations.find((inv) => inv.id === qId);
    if (q) {
      setSelectedForConversion(q);
      setIsConverterOpen(false);
    }
  };

  const handleConversionSuccess = () => {
    setSelectedForConversion(null);
    fetchInvoices();
  };

  const handleSendForApproval = async () => {
    if (!selectedInvoice) return;
    try {
      await employeeApproveInvoice(selectedInvoice.id);
      toast.success('Sent for Finance Approval');
      setDetailsOpen(false);
      fetchInvoices();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to send for approval';
      toast.error(msg);
    }
  };

  // ...

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Rent Management</h2>
        {mode === 'EMPLOYEE' && (
          <Button
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={fetchPendingQuotations}
          >
            <Plus size={16} /> New Rent
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Agreements
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Actions
            </label>
            <Button
              variant="outline"
              onClick={fetchInvoices}
              className="h-9 text-xs w-full justify-center gap-2 border-gray-200 hover:bg-gray-50"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-muted/50/50">
              <TableRow>
                <TableHead className="text-primary font-bold">INV NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">ITEMS</TableHead>
                <TableHead className="text-primary font-bold uppercase">Contract Period</TableHead>
                <TableHead className="text-primary font-bold uppercase">Duration</TableHead>
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No rent agreements found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/50/50">
                    <TableCell className="font-medium text-slate-700">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-medium">{inv.customerName}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="text-xs font-medium text-slate-700 truncate">
                        {inv.items
                          ?.map((item) => getCleanProductName(item.description))
                          .join(', ') || 'No items'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {inv.startDate ? format(new Date(inv.startDate), 'MMM dd, yyyy') : 'N/A'} -{' '}
                      {inv.endDate ? format(new Date(inv.endDate), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-600">
                      {inv.leaseTenureMonths
                        ? `${inv.leaseTenureMonths} Mo`
                        : inv.startDate && inv.endDate
                          ? (() => {
                              const start = new Date(inv.startDate);
                              const end = new Date(inv.endDate);
                              const months =
                                (end.getFullYear() - start.getFullYear()) * 12 +
                                (end.getMonth() - start.getMonth()) +
                                1;
                              return months > 0 ? `${months} Mo` : 'N/A';
                            })()
                          : 'N/A'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {formatCurrency(
                        inv.displayAmount ||
                          (inv.type === 'PROFORMA'
                            ? (inv.advanceAmount || 0) + (inv.usageRevenue || 0)
                            : inv.totalAmount) ||
                          inv.monthlyRent ||
                          0,
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.contractStatus === 'COMPLETED' ? (
                        <Badge
                          variant="secondary"
                          className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none bg-slate-100 text-slate-700 hover:bg-slate-100"
                        >
                          CONTRACT CLOSED
                        </Badge>
                      ) : inv.contractStatus === 'ACTIVE' ? (
                        <Badge
                          variant="secondary"
                          className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none bg-blue-100 text-blue-700 hover:bg-blue-100"
                        >
                          CONTRACT ONGOING
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none
                              ${
                                inv.status === 'PAID' ||
                                inv.status === 'APPROVED' ||
                                inv.status === 'FINANCE_APPROVED' ||
                                inv.status === 'ISSUED'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                  : inv.status === 'SENT' ||
                                      inv.status === 'TRANSACTION_COMPLETED' ||
                                      inv.status === 'EMPLOYEE_APPROVED'
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                    : inv.status === 'REJECTED' ||
                                        inv.status === 'FINANCE_REJECTED' ||
                                        inv.status === 'CANCELLED'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                              }
                            `}
                        >
                          {inv.status === 'TRANSACTION_COMPLETED' ||
                          inv.status === 'EMPLOYEE_APPROVED'
                            ? 'PENDING FINANCE'
                            : inv.status === 'FINANCE_REJECTED'
                              ? 'FINANCE REJECTED'
                              : inv.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {inv.createdAt ? format(new Date(inv.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(inv.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {inv.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              handleSendForApproval();
                            }}
                            title="Send to Finance"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}

                        {inv.status !== 'DRAFT' && inv.contractStatus !== 'COMPLETED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsUsageModalOpen(true);
                            }}
                            title="Submit Meter Reading"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Edit button removed to enforce quotation-to-transaction workflow */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        )}

        {/* rent form modal explicitly removed so scratch creation isn't allowed */}

        {detailsOpen && selectedInvoice && (
          <InvoiceDetailsDialog
            invoice={selectedInvoice}
            onClose={() => setDetailsOpen(false)}
            onApprove={
              mode === 'EMPLOYEE' &&
              (selectedInvoice.status === 'DRAFT' ||
                selectedInvoice.status === 'SENT' ||
                selectedInvoice.status === 'FINANCE_REJECTED')
                ? handleSendForApproval
                : undefined
            }
            // FINANCE Mode Reject
            onReject={undefined}
            approveLabel={mode === 'EMPLOYEE' ? 'Send to Finance' : 'Approve'}
            mode={mode}
            onSuccess={() => {
              setDetailsOpen(false);
              fetchInvoices();
              onRefresh?.();
            }}
          />
        )}

        {approveOpen && selectedInvoice && (
          <ApproveQuotationDialog
            invoiceId={selectedInvoice.id}
            quotation={selectedInvoice}
            onClose={() => setApproveOpen(false)}
            onSuccess={() => {
              setApproveOpen(false);
              fetchInvoices();
              onRefresh?.();
            }}
          />
        )}

        {isUsageModalOpen && selectedInvoice && (
          <UsageRecordingModal
            isOpen={isUsageModalOpen}
            onClose={() => setIsUsageModalOpen(false)}
            contractId={selectedInvoice.id}
            customerName={selectedInvoice.customerName}
            invoice={editingUsage}
            onSuccess={() => {
              fetchInvoices();
              onRefresh?.();
            }}
          />
        )}

        {isConverterOpen && (
          <QuotationConverterDialog
            open={isConverterOpen}
            onClose={() => setIsConverterOpen(false)}
            quotations={pendingQuotations}
            loading={loadingQuotations}
            onSelect={handleConvertQuotation}
            initialSearch={convertId || ''}
            title="Convert Quotation to Rent"
          />
        )}

        {selectedForConversion && (
          <QuotationConversionFlow
            quotation={selectedForConversion}
            onClose={() => setSelectedForConversion(null)}
            onSuccess={handleConversionSuccess}
          />
        )}
      </div>
    </div>
  );
}

interface QuotationConverterDialogProps {
  open: boolean;
  onClose: () => void;
  quotations: Invoice[];
  loading: boolean;
  onSelect: (id: string) => void;
  initialSearch?: string;
  title: string;
}

function QuotationConverterDialog({
  open,
  onClose,
  quotations,
  loading,
  onSelect,
  initialSearch = '',
  title,
}: QuotationConverterDialogProps) {
  const [search, setSearch] = useState(initialSearch);

  const filtered = quotations.filter(
    (q) =>
      q.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-primary tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an accepted quotation to convert it into a formal transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search quotation number or customer..."
              className="pl-9 h-10 bg-slate-50 border-slate-100 rounded-xl font-bold text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-bold text-slate-900 text-sm">
                {search ? 'No matching quotations found.' : 'No pending quotations found.'}
              </p>
              <p className="text-[11px] mt-1">
                {search
                  ? 'Try a different search term.'
                  : 'Create a quotation first to convert it.'}
              </p>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary"
                  onClick={() => setSearch('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all group cursor-pointer active:scale-95"
                  onClick={() => onSelect(q.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 tracking-tight text-sm group-hover:text-blue-600">
                        {q.invoiceNumber}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] uppercase font-black px-2 py-0 bg-slate-100 text-slate-600 shadow-none border-none"
                      >
                        {q.saleType}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {q.customerName || 'Walk-in'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(q.createdAt || '').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm tracking-tight mb-2">
                      {formatCurrency(q.totalAmount || 0)}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      Convert
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="font-black text-[10px] uppercase tracking-widest text-slate-500"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
