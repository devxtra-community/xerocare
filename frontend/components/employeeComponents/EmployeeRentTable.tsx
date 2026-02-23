import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus } from 'lucide-react';
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
import {
  getMyInvoices,
  Invoice,
  createInvoice,
  CreateInvoicePayload,
  employeeApproveInvoice,
} from '@/lib/invoice';
import RentFormModal from './RentFormModal';
import { Badge } from '@/components/ui/badge';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';
import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';
import Pagination from '@/components/Pagination';
import { formatCurrency } from '@/lib/format';

import { updateQuotation } from '@/lib/invoice'; // Ensure import
import UsageRecordingModal from '../Finance/UsageRecordingModal';

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
}

/**
 * Table displaying rental agreements managed by the employee.
 * Features search, creation of new rentals, and status tracking (Draft, Sent, Paid).
 */
export default function EmployeeRentTable({ mode = 'EMPLOYEE' }: EmployeeRentTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>(undefined); // For Edit Mode
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [editingUsage] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let data: Invoice[] = [];
      if (mode === 'FINANCE') {
        const { getBranchInvoices } = await import('@/lib/invoice');
        data = await getBranchInvoices();
        // Filter out unapproved records for Finance View
        data = data.filter((inv) => !['DRAFT', 'SENT'].includes(inv.status));
        console.log('Finance Rent Invoices:', data);
      } else {
        data = await getMyInvoices();
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

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  const handleSendForApproval = async () => {
    if (!selectedInvoice) return;
    try {
      await employeeApproveInvoice(selectedInvoice.id);
      toast.success('Sent for Finance Approval');
      setDetailsOpen(false);
      // Small delay to allow backend/DB to settle or service to recover if restarting
      setTimeout(() => {
        fetchInvoices();
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send for approval');
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
            onClick={openCreateModal}
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
                    <TableCell className="font-bold text-slate-700">
                      {formatCurrency(inv.displayAmount ?? inv.totalAmount ?? 0)}
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

                        {mode === 'EMPLOYEE' && (
                          <>
                            {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                onClick={() => openEditModal(inv)}
                                title="Edit"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </>
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
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}

        {formOpen && (
          <RentFormModal
            initialData={editInvoice}
            defaultSaleType="RENT"
            lockSaleType={true}
            onClose={() => setFormOpen(false)}
            onConfirm={handleCreateOrUpdate}
          />
        )}

        {detailsOpen && selectedInvoice && (
          <InvoiceDetailsDialog
            invoice={selectedInvoice}
            onClose={() => setDetailsOpen(false)}
            // EMPLOYEE Mode
            onApprove={
              mode === 'EMPLOYEE'
                ? handleSendForApproval
                : async () => {
                    // FINANCE Mode Approve
                    try {
                      const { financeApproveInvoice } = await import('@/lib/invoice');
                      await financeApproveInvoice(selectedInvoice.id, {});
                      toast.success('Rent Agreement Approved');
                      setDetailsOpen(false);
                      fetchInvoices();
                    } catch (err: unknown) {
                      console.error(err);
                      const error = err as { response?: { data?: { message?: string } } };
                      toast.error(error.response?.data?.message || 'Failed to approve');
                    }
                  }
            }
            // FINANCE Mode Reject
            onReject={
              mode === 'FINANCE'
                ? async (reason) => {
                    try {
                      const { financeRejectInvoice } = await import('@/lib/invoice');
                      await financeRejectInvoice(selectedInvoice.id, reason);
                      toast.success('Rent Agreement Rejected');
                      setDetailsOpen(false);
                      fetchInvoices();
                    } catch (err: unknown) {
                      console.error(err);
                      const error = err as { response?: { data?: { message?: string } } };
                      toast.error(error.response?.data?.message || 'Failed to reject');
                    }
                  }
                : undefined
            }
            approveLabel={mode === 'EMPLOYEE' ? 'Send for Finance Approval' : 'Approve'}
            mode={mode}
            onSuccess={() => {
              setDetailsOpen(false);
              fetchInvoices();
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

        {isUsageModalOpen && selectedInvoice && (
          <UsageRecordingModal
            isOpen={isUsageModalOpen}
            onClose={() => setIsUsageModalOpen(false)}
            contractId={selectedInvoice.id}
            customerName={selectedInvoice.customerName}
            invoice={editingUsage}
            onSuccess={fetchInvoices}
          />
        )}
      </div>
    </div>
  );
}
