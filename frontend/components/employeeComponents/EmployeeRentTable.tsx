import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus } from 'lucide-react';
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
  employeeApproveInvoice,
} from '@/lib/invoice';
import RentFormModal from './RentFormModal';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';
import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';

import { updateQuotation } from '@/lib/invoice'; // Ensure import

const calculateRemainingDays = (end: string | Date | undefined) => {
  if (!end) return null;
  const e = new Date(end);
  const now = new Date();
  const diffTime = e.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ...

interface EmployeeRentTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
}

export default function EmployeeRentTable({ mode = 'EMPLOYEE' }: EmployeeRentTableProps) {
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
      let data: Invoice[] = [];
      if (mode === 'FINANCE') {
        const { getBranchInvoices } = await import('@/lib/invoice');
        data = await getBranchInvoices();
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
        {mode === 'EMPLOYEE' && (
          <Button
            className="bg-primary text-white gap-2 w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
            onClick={openCreateModal}
          >
            <Plus size={16} /> New Rent
          </Button>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-primary font-bold">INV NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">RENT TYPE</TableHead>
                <TableHead className="text-primary font-bold">BILLING</TableHead>
                <TableHead className="text-primary font-bold">DURATION</TableHead>
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
                      <TableCell>
                        {(() => {
                          const remaining = calculateRemainingDays(inv.endDate);
                          const isExpired = remaining !== null && remaining <= 0;
                          return (
                            <Badge
                              variant="secondary"
                              className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap
                                ${isExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}
                              `}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {remaining !== null
                                ? isExpired
                                  ? 'Expired'
                                  : `${remaining} Days Left`
                                : 'N/A'}
                            </Badge>
                          );
                        })()}
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
                      await financeApproveInvoice(selectedInvoice.id);
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
      </div>
    </div>
  );
}
