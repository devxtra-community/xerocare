import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getMyInvoices,
  getBranchInvoices,
  Invoice,
  employeeApproveInvoice,
  convertToTransaction,
} from '@/lib/invoice';
import UsageRecordingModal from '../Finance/UsageRecordingModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { formatCurrency } from '@/lib/format';

import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';

const calculateDays = (start: string | Date | undefined, end: string | Date | undefined) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

interface EmployeeLeaseTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
  onRefresh?: () => void;
}

/**
 * Table displaying lease agreements managed by the employee.
 * Features search, creation of new leases, and status tracking (Draft, Sent, Paid).
 */
export default function EmployeeLeaseTable({
  mode = 'EMPLOYEE',
  onRefresh,
}: EmployeeLeaseTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false); // Changed from useState(false) to useState(false) to allow state change
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [editingUsage] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [pendingQuotations, setPendingQuotations] = useState<Invoice[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

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
      } else {
        const myData = await getMyInvoices();
        // Show Proformas, Finals, and any quotations that have been converted to transactions
        data = myData.filter((inv) => inv.type !== 'QUOTATION');
      }
      setInvoices(data.filter((inv) => inv.saleType === 'LEASE'));
    } catch (error) {
      console.error('Failed to fetch lease data:', error);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleViewDetails = (id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setDetailsOpen(true);
    }
  };

  const handleSendForApproval = async () => {
    if (!selectedInvoice) return;
    try {
      await employeeApproveInvoice(selectedInvoice.id);
      toast.success('Sent for Finance Approval');
      setDetailsOpen(false);
      fetchInvoices();
      onRefresh?.();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to send for approval';
      toast.error(msg);
    }
  };

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
          (inv.status === 'FINANCE_APPROVED' || inv.status === 'CUSTOMER_ACCEPTED') &&
          inv.saleType === 'LEASE',
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

  const handleConvertQuotation = async (qId: string) => {
    try {
      await convertToTransaction(qId);
      toast.success('Quotation converted to transaction successfully!');
      setIsConverterOpen(false);
      fetchInvoices();
    } catch (error: unknown) {
      console.error('Conversion failed:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg = err.response?.data?.message || 'Failed to convert quotation';
      toast.error(errorMsg);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    return (
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase()))
    );
  });

  useEffect(() => {
    setTotal(filteredInvoices.length);
  }, [filteredInvoices.length, setTotal]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * limit, page * limit);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading lease data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Lease Management</h2>
        {mode === 'EMPLOYEE' && (
          <Button
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={fetchPendingQuotations}
          >
            <Plus size={16} /> New Lease
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Leases
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice or customer..."
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

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  INV NUMBER
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  CUSTOMER
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  ITEMS
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  CONTRACT PERIOD
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  DURATION
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  AMOUNT
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  STATUS
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap uppercase text-[11px]">
                  DATE
                </TableHead>
                <TableHead className="text-primary font-bold whitespace-nowrap text-center uppercase text-[11px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No leases found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv, index) => (
                  <TableRow key={inv.id} className={index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}>
                    <TableCell className="text-blue-500 font-bold tracking-tight">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {inv.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-xs font-medium text-slate-700 truncate">
                        {inv.items
                          ?.map((item) => getCleanProductName(item.description))
                          .join(', ') || 'No items'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-[10px] font-bold text-slate-600">
                        {inv.startDate ? new Date(inv.startDate).toLocaleDateString() : 'N/A'} —{' '}
                        {inv.endDate ? new Date(inv.endDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {calculateDays(inv.startDate, inv.endDate)} Days
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
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
                        <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                          CONTRACT CLOSED
                        </span>
                      ) : inv.contractStatus === 'ACTIVE' ? (
                        <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                          CONTRACT ONGOING
                        </span>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                          ${
                            inv.status === 'PAID' || inv.status === 'FINANCE_APPROVED'
                              ? 'bg-green-100 text-green-600'
                              : inv.status === 'PENDING' ||
                                  inv.status === 'TRANSACTION_COMPLETED' ||
                                  inv.status === 'EMPLOYEE_APPROVED'
                                ? 'bg-blue-100 text-blue-600'
                                : inv.status === 'FINANCE_REJECTED' || inv.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {inv.status === 'TRANSACTION_COMPLETED' ||
                          inv.status === 'EMPLOYEE_APPROVED'
                            ? 'PENDING FINANCE'
                            : inv.status === 'FINANCE_REJECTED'
                              ? 'FINANCE REJECTED'
                              : inv.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-blue-50"
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
      </div>

      {/* lease form modal removed to prevent scratch creation */}

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
          // Scratch form removed
          title="Convert Quotation to Lease"
        />
      )}
    </div>
  );
}

interface QuotationConverterDialogProps {
  open: boolean;
  onClose: () => void;
  quotations: Invoice[];
  loading: boolean;
  onSelect: (id: string) => void;
  title: string;
}

function QuotationConverterDialog({
  open,
  onClose,
  quotations,
  loading,
  onSelect,
  title,
}: QuotationConverterDialogProps) {
  const [search, setSearch] = useState('');

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
// Local LeaseFormModal removed in favor of shared RentFormModal
