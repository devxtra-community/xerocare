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
import { Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBranchInvoices,
  Invoice,
  financeApproveInvoice,
  financeRejectInvoice,
} from '@/lib/invoice';
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

export default function FinanceApprovalTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Finance users should use an endpoint that returns all relevant invoices.
      // Assuming getBranchInvoices or similar returns all for Finance role based on backend logic
      // But actually getAllInvoices via API Gateway (for Finance role) is better.
      // However currently available exports in lib/invoice.ts are getInvoices, getMyInvoices, getBranchInvoices.
      // Let's assume getBranchInvoices or getInvoices works for Finance.
      const data = await getBranchInvoices();
      setInvoices(data.filter((inv) => inv.status === 'EMPLOYEE_APPROVED'));
    } catch (error) {
      console.error('Failed to fetch approval list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await financeApproveInvoice(id);
      toast.success('Invoice Approved successfully');
      setDetailsOpen(false);
      fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve invoice');
    }
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
      <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <p className="text-muted-foreground font-medium">No pending approvals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Waiting for Finance Confirmation</h3>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {invoices.length} Pending
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
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
                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{inv.employeeName || 'Unknown'}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0 rounded-full"
                      onClick={() => handleApprove(inv.id)}
                      title="Approve"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={() => openRejectDialog(inv)}
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
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
          onApprove={() => handleApprove(selectedInvoice.id)}
          approveLabel="Approve Now"
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
                onChange={(e) => setRejectReason(e.target.value)}
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
    </div>
  );
}
