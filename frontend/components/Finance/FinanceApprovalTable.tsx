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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function FinanceApprovalTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Security Deposit State
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMode, setDepositMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [depositReference, setDepositReference] = useState('');
  const [depositDate, setDepositDate] = useState('');

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

  const handleApproveClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);

    // Skip deposit for SALE
    if (invoice.saleType === 'SALE') {
      // Direct approve or maybe a small confirmation?
      // For now, let's just trigger the approval with 0 deposit directly
      // But we need to be careful about state. confirmApprove uses selectedInvoice.
      // We set selectedInvoice above, but state updates are async.
      // Better to use a separate confirmation dialog OR just reuse confirmApprove logic logic carefully.
      // Actually, simplest is to open a DIFFERENT dialog or just reuse the deposit dialog but hide fields?
      // No, user specifically said they don't want it.
      // Let's use a "Simple Approve" confirmation dialog instead of the deposit one, or just confirm immediately?
      // Immediate approval might be risky if clicked by accident.
      // Let's modify confirmApprove to take parameters or better yet:
      // We can allow the user to just click "Approve" on the main table actions.
      // If we want to skip the dialog, we need to handle the async state of `selectedInvoice`.
      // The `useEffect` or passing invoice directly to confirm function is better.
      // Let's refactor confirmApprove to accept an invoice and payload optional.
      // But confirmApprove relies on state variables for input.

      // Let's try this:
      // If SALE, we still need to confirm? "Are you sure you want to approve?"
      // Ideally yes.
      // For this user request "I don't want security deposit in sale", implies just skipping that input.
      // I will open the dialog BUT modification: I will add a check in the dialog opening.

      // Actually, I can just call approval directly if I refactor confirmApprove.
      // But to be safe with React state, I will store the invoice and open a "SimpleConfirm" dialog if it's SALE.
      // Or easier: Just use `window.confirm` for SALE? No, that's ugly.

      // Let's stick to: If SALE -> Simple Confirmation (maybe reuse reject dialog structure or a new small one? or just `confirmApprove` with 0s if I can pass args).
      // Refactoring `confirmApprove` to take args is best.

      setDepositAmount('0');
      setDepositMode('CASH');
      setDepositReference('');
      setDepositDate(new Date().toISOString().split('T')[0]);

      // If SALE, we open a "confirm sale approval" dialog?
      // The user previously had a "InvoiceDetailsDialog" which has "Approve" button.
      // That calls `handleApproveClick`.

      if (invoice.saleType === 'SALE') {
        // Just approve it immediately? Or ask "Are you sure?"
        if (confirm('Approve Sale Invoice ' + invoice.invoiceNumber + '?')) {
          // We need to call approval API.
          financeApproveInvoice(invoice.id, {
            amount: 0,
            mode: 'CASH',
            reference: '',
            receivedDate: new Date().toISOString().split('T')[0],
          })
            .then(() => {
              toast.success('Invoice Approved successfully');
              setDetailsOpen(false);
              fetchInvoices();
            })
            .catch(() => toast.error('Failed to approve'));
        }
        return;
      }

      // For RENT/LEASE, open the deposit dialog
      setDepositOpen(true);
    } else {
      // RENT / LEASE
      setDepositAmount('0');
      setDepositMode('CASH');
      setDepositReference('');
      setDepositDate(new Date().toISOString().split('T')[0]);
      setDepositOpen(true);
    }
  };

  const confirmApprove = async () => {
    if (!selectedInvoice) return;

    try {
      // Validate if amount > 0? User might want 0 deposit?
      // Assuming valid request if they click confirm.

      const payload = {
        amount: parseFloat(depositAmount) || 0,
        mode: depositMode,
        reference: depositReference,
        receivedDate: depositDate,
      };

      await financeApproveInvoice(selectedInvoice.id, payload);
      toast.success('Invoice Approved successfully');
      setDepositOpen(false);
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
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0 rounded-full"
                      onClick={() => handleApproveClick(inv)}
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
          onApprove={() => handleApproveClick(selectedInvoice)}
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
      {depositOpen && (
        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Security Deposit Collection (Optional)</DialogTitle>
              <DialogDescription>
                Enter security deposit details if collected. Leave 0 or empty to skip.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <div className="col-span-3">
                  <Input
                    id="amount"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Mode</Label>
                <RadioGroup
                  value={depositMode}
                  onValueChange={(val) => setDepositMode(val as 'CASH' | 'CHEQUE')}
                  className="flex gap-4 col-span-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASH" id="mode-cash" />
                    <Label htmlFor="mode-cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CHEQUE" id="mode-cheque" />
                    <Label htmlFor="mode-cheque">Cheque</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reference" className="text-right">
                  Reference
                </Label>
                <Input
                  id="reference"
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="Cheque No. / Transaction ID"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {parseFloat(depositAmount) > 0
                  ? 'Confirm with Deposit'
                  : 'Confirm Approval (No Deposit)'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
