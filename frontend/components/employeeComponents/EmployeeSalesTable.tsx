'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Eye, FileText, Wallet } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { QuotationConversionFlow } from './QuotationConversionFlow';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import DirectSaleFormModal from './DirectSaleFormModal';
import { getUserFromToken } from '@/lib/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBranchInvoices, getMyInvoices, getInvoiceById, Invoice } from '@/lib/invoice';

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
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import { InvoiceAccountView } from '../invoice/InvoiceAccountView';

interface EmployeeSalesTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
}

/**
 * Table displaying sales invoices managed by the employee.
 * Features search, creation of new sales, and detailed invoice view.
 */
export default function EmployeeSalesTable({ mode = 'EMPLOYEE' }: EmployeeSalesTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectModeOpen, setSelectModeOpen] = useState(false);
  const [directSaleFormOpen, setDirectSaleFormOpen] = useState(false);
  const [allBrands, setAllBrands] = useState<unknown[]>([]);
  const [allModels, setAllModels] = useState<unknown[]>([]);

  const currentUser = getUserFromToken();
  const isManagerOrAdmin =
    currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const { getBrands } = await import('@/lib/brand');
        const { getAllModels } = await import('@/lib/model');
        const [brandsData, modelsData] = await Promise.all([
          getBrands(),
          getAllModels({ limit: 1000 }),
        ]);
        setAllBrands(Array.isArray(brandsData.data) ? brandsData.data : []);
        setAllModels(modelsData.data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };
    if (mode === 'EMPLOYEE') {
      fetchSuggestions();
    }
  }, [mode]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [accountViewOpen, setAccountViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [pendingQuotations, setPendingQuotations] = useState<Invoice[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedForConversion, setSelectedForConversion] = useState<Invoice | null>(null);

  const searchParams = useSearchParams();
  const convertId = searchParams.get('convert');

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  useEffect(() => {
    if (convertId) {
      fetchPendingQuotations();
    }
  }, [convertId]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let data: Invoice[] = [];
      if (mode === 'FINANCE') {
        // Finance sees all branch invoices (or we can use a specific endpoint if needed)
        // Using getBranchInvoices from lib
        const { getBranchInvoices } = await import('@/lib/invoice');
        data = await getBranchInvoices();
        // Only show definitively approved or completed records for the Finance Sales tracker
        data = data.filter(
          (inv) =>
            ['APPROVED', 'FINANCE_APPROVED', 'FINAL', 'TRANSACTION_COMPLETED'].includes(
              inv.status,
            ) && inv.type !== 'QUOTATION',
        );
      } else {
        const myData = await getMyInvoices();
        // Show Proformas, Finals, and any quotations that have been converted to transactions
        data = myData.filter((inv) => inv.type !== 'QUOTATION');
      }
      setInvoices(data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to fetch sales data.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleViewDetails = async (invoiceId: string) => {
    try {
      const data = await getInvoiceById(invoiceId);
      setSelectedInvoice(data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast.error('Failed to load invoice details.');
    } finally {
      // Done loading
    }
  };

  const filteredInvoices = invoices
    .filter(
      (inv) =>
        inv.saleType === 'SALE' ||
        inv.saleType === 'PRODUCT_SALE' ||
        inv.saleType === 'SPAREPART_SALE',
    ) // Show all SALE types
    .filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter =
        filterType === 'All' ||
        inv.saleType === filterType ||
        (filterType === 'SALE' &&
          (inv.saleType === 'PRODUCT_SALE' || inv.saleType === 'SPAREPART_SALE'));
      return matchesSearch && matchesFilter;
    });

  useEffect(() => {
    setTotal(filteredInvoices.length);
  }, [filteredInvoices.length, setTotal]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * limit, page * limit);

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
          (inv.saleType === 'SALE' ||
            inv.saleType === 'PRODUCT_SALE' ||
            inv.saleType === 'SPAREPART_SALE'),
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
        <p className="text-sm text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Sales Management</h2>
        {mode === 'EMPLOYEE' && (
          <Button
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={() => setSelectModeOpen(true)}
          >
            <Plus size={16} /> New Sale
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Sales
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Filter by Type
            </label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="PRODUCT_SALE">Product Sale</SelectItem>
                <SelectItem value="SPAREPART_SALE">Spare Part Sale</SelectItem>
                <SelectItem value="SALE">Legacy Sale</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">PAYMENT STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No sales found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv, index) => (
                  <TableRow
                    key={inv.id}
                    className={`${index % 2 ? 'bg-blue-50/10' : 'bg-card'} hover:bg-muted/50 transition-colors`}
                  >
                    <TableCell className="text-blue-500 font-bold tracking-tight">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {inv.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-sm font-medium text-slate-700 truncate">
                        {inv.items
                          ?.map((item) => getCleanProductName(item.description))
                          .join(', ') || 'No items'}
                      </div>
                      {inv.items && inv.items.length > 1 && (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          +{inv.items.length - 1} more items
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider
                        ${
                          ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(inv.saleType)
                            ? 'border-blue-200 text-blue-600 bg-blue-50'
                            : inv.saleType === 'RENT'
                              ? 'border-orange-200 text-orange-600 bg-orange-50'
                              : 'border-purple-200 text-purple-600 bg-purple-50'
                        }`}
                      >
                        {inv.saleType === 'PRODUCT_SALE'
                          ? 'PRODUCT SALE'
                          : inv.saleType === 'SPAREPART_SALE'
                            ? 'SPARE PART SALE'
                            : inv.saleType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {(() => {
                        // Derive a clean payment status from the invoice status
                        const isPaid = inv.status === 'PAID';
                        const isPartial = inv.status === 'PARTIAL';
                        // Any other active status (TRANSACTION_COMPLETED, EMPLOYEE_APPROVED, FINANCE_APPROVED, etc.)
                        // means no payment received yet → PENDING
                        const label = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING';
                        const cls = isPaid
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : isPartial
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-100';
                        return (
                          <Badge
                            className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none ${cls}`}
                          >
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
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
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(inv.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {['PROFORMA', 'FINAL'].includes(inv.type || '') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 ml-1"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setAccountViewOpen(true);
                            }}
                            title="Sales Finance Account"
                          >
                            <Wallet className="h-4 w-4" />
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

      {/* formOpen rendering logic removed, sale forms now go through quotient conversion only */}

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setDetailsOpen(false)}
          onApprove={undefined}
          onReject={undefined}
          mode={mode}
          onSuccess={() => {
            setDetailsOpen(false);
            fetchInvoices();
          }}
        />
      )}

      {accountViewOpen && selectedInvoice && (
        <InvoiceAccountView
          invoiceId={selectedInvoice.id}
          open={accountViewOpen}
          onClose={() => setAccountViewOpen(false)}
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
          title="Convert Quotation to Sale"
        />
      )}

      {selectedForConversion && (
        <QuotationConversionFlow
          quotation={selectedForConversion}
          onClose={() => setSelectedForConversion(null)}
          onSuccess={handleConversionSuccess}
        />
      )}

      {selectModeOpen && (
        <Dialog open={selectModeOpen} onOpenChange={setSelectModeOpen}>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                New Sale Options
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Choose how you want to initiate this sale transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4">
              <Button
                variant="outline"
                className="flex flex-col items-start p-6 h-auto hover:bg-slate-50 border-2 hover:border-primary transition-all text-left gap-1 rounded-xl"
                onClick={() => {
                  setSelectModeOpen(false);
                  fetchPendingQuotations();
                }}
              >
                <span className="font-bold text-slate-900 text-sm">Convert from Quotation</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Select an approved quotation to finalize as a sale.
                </span>
              </Button>
              {isManagerOrAdmin && (
                <Button
                  variant="outline"
                  className="flex flex-col items-start p-6 h-auto hover:bg-slate-50 border-2 hover:border-primary transition-all text-left gap-1 rounded-xl"
                  onClick={() => {
                    setSelectModeOpen(false);
                    setDirectSaleFormOpen(true);
                  }}
                >
                  <span className="font-bold text-slate-900 text-sm">Direct Sale</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Create a new sale directly without an existing quotation.
                  </span>
                </Button>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectModeOpen(false)}
                className="font-black text-[10px] uppercase tracking-widest text-slate-500"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {directSaleFormOpen && (
        <DirectSaleFormModal
          onClose={() => setDirectSaleFormOpen(false)}
          onSuccess={() => {
            setDirectSaleFormOpen(false);
            fetchInvoices();
          }}
          allBrands={allBrands}
          allModels={allModels}
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
