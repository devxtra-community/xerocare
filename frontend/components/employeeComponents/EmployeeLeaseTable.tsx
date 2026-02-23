import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus, Clock } from 'lucide-react';
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
  Invoice,
  createInvoice,
  CreateInvoicePayload,
  updateQuotation,
  employeeApproveInvoice,
} from '@/lib/invoice';
import RentFormModal from './RentFormModal';
import UsageRecordingModal from '../Finance/UsageRecordingModal';

import { Badge } from '@/components/ui/badge';
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
}

/**
 * Table displaying lease agreements managed by the employee.
 * Features search, creation of new leases, and status tracking (Draft, Sent, Paid).
 */
export default function EmployeeLeaseTable({ mode = 'EMPLOYEE' }: EmployeeLeaseTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false); // Changed from useState(false) to useState(false) to allow state change
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>(undefined);
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
      } else {
        data = await getMyInvoices();
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

  const handleCreateOrUpdate = async (data: CreateInvoicePayload) => {
    try {
      if (editInvoice) {
        // Update Mode
        const updated = await updateQuotation(editInvoice.id, data);
        setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
        toast.success('Lease updated successfully.');
      } else {
        // Create Mode
        const newInvoice = await createInvoice(data);
        setInvoices((prev) => [newInvoice, ...prev]);
        toast.success('Lease record created successfully.');
      }
      setFormOpen(false);
      setEditInvoice(undefined);
    } catch (error: unknown) {
      console.error('Failed to save lease record:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save lease record.');
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
    } catch (error) {
      console.error(error);
      toast.error('Failed to send for approval');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    return (
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
            onClick={openCreateModal}
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
                      {formatCurrency(inv.displayAmount ?? inv.totalAmount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${
                          inv.status === 'PAID'
                            ? 'bg-green-100 text-green-600'
                            : inv.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {inv.status}
                      </span>
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
      </div>

      {formOpen && (
        <RentFormModal
          initialData={editInvoice}
          defaultSaleType="LEASE"
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
                    toast.success('Lease Agreement Approved');
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
                    toast.success('Lease Agreement Rejected');
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
  );
}
// Local LeaseFormModal removed in favor of shared RentFormModal
