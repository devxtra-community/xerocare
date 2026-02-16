'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getBranchInvoices, Invoice, financeRejectInvoice } from '@/lib/invoice';
import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FinanceApprovalModal } from '@/components/finance/FinanceApprovalModal';

interface FinanceApprovalTableProps {
  saleType?: 'RENT' | 'LEASE' | 'SALE';
}

/**
 * Table displaying invoices pending finance approval.
 * Allows finance team to review, approve, or reject invoices created by employees.
 */
export default function FinanceApprovalTable({ saleType }: FinanceApprovalTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalInvoice, setApprovalInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getBranchInvoices();
      let filtered = data.filter(
        (inv) => inv.status === 'EMPLOYEE_APPROVED' || inv.status === 'APPROVED',
      );

      if (saleType) {
        filtered = filtered.filter(
          (inv) => inv.saleType?.toString().toUpperCase() === saleType.toUpperCase(),
        );
      }

      setInvoices(filtered);
    } catch (error) {
      console.error('Failed to fetch approval list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [saleType]);

  const handleApproveClick = (invoice: Invoice) => {
    setApprovalInvoice(invoice);
    setDetailsOpen(false);
  };

  const handleReject = async () => {
    if (!selectedInvoice) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await financeRejectInvoice(selectedInvoice.id, rejectReason);
      toast.success('Invoice Rejected');
      setRejectOpen(false);
      setDetailsOpen(false);
      setRejectReason('');
      fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject invoice');
    }
  };

  const openRejectDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setRejectOpen(true);
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-border rounded-xl bg-muted/30">
        <p className="text-muted-foreground font-medium">No pending approvals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Waiting for Finance Confirmation</h3>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {invoices.length} Pending
        </Badge>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Advance Paid</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-bold">{inv.invoiceNumber}</TableCell>
                <TableCell>{inv.customerName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{inv.saleType}</Badge>
                </TableCell>
                <TableCell className="font-bold">₹{inv.totalAmount.toLocaleString()}</TableCell>
                <TableCell className="text-blue-600 font-semibold">
                  {inv.advanceAmount ? `₹${inv.advanceAmount.toLocaleString()}` : '₹0'}
                </TableCell>
                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{inv.employeeName || 'Unknown'}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-sm"
                      onClick={() => handleApproveClick(inv)}
                      title="Review & Approve"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Review
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      onClick={() => openRejectDialog(inv)}
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setDetailsOpen(false)}
          onApprove={() => handleApproveClick(selectedInvoice)}
          approveLabel="Approve Now"
          mode="FINANCE"
        />
      )}

      {rejectOpen && (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Invoice</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRejectReason(e.target.value)
                }
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {approvalInvoice && (
        <FinanceApprovalModal
          invoice={approvalInvoice}
          onClose={() => setApprovalInvoice(null)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
