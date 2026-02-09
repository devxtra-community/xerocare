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
import { ProductSelect } from '@/components/invoice/ProductSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

  // Item Updates State (Product association + Readings)
  const [itemUpdates, setItemUpdates] = useState<
    {
      id: string;
      description: string;
      productId: string;
      productName?: string;
      initialBwCount: string;
      initialColorCount: string;
    }[]
  >([]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
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
    setDetailsOpen(false); // Close details modal if open
    setDepositAmount('0');
    setDepositMode('CASH');
    setDepositReference('');
    setDepositDate(new Date().toISOString().split('T')[0]);

    // Initialize item updates for PRODUCT items or items with productId
    const productItems =
      invoice.items?.filter((item) => item.itemType === 'PRODUCT' || !!item.productId) || [];
    setItemUpdates(
      productItems.map((item) => ({
        id: item.id!,
        description: item.description,
        productId: item.productId || '',
        initialBwCount: '0',
        initialColorCount: '0',
      })),
    );

    setDepositOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedInvoice) return;

    // Validation: All product items must have a productId selected
    if (itemUpdates.some((item) => !item.productId)) {
      toast.error('Please select a serial number for all product items');
      return;
    }

    try {
      const payload = {
        deposit: {
          amount: parseFloat(depositAmount) || 0,
          mode: depositMode,
          reference: depositReference,
          receivedDate: depositDate,
        },
        itemUpdates: itemUpdates.map((item) => ({
          id: item.id,
          productId: item.productId,
          initialBwCount: parseInt(item.initialBwCount) || 0,
          initialColorCount: parseInt(item.initialColorCount) || 0,
        })),
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
      {depositOpen && (
        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Finance Approval & Product Link</DialogTitle>
              <DialogDescription>
                Link actual units and record initial readings before final approval.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto px-1 py-4 space-y-6">
              {/* Product Association & Readings */}
              {itemUpdates.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 border-b pb-2">
                    Product Association
                  </h4>
                  {itemUpdates.map((item, idx) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="font-bold text-blue-600">Item: {item.description}</Label>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                            Assign Unit (Serial Number)
                          </Label>
                          <ProductSelect
                            onSelect={(selected) => {
                              const newUpdates = [...itemUpdates];
                              newUpdates[idx].productId = selected.id;
                              // @ts-expect-error - name exists on Product
                              newUpdates[idx].productName = selected.name;
                              setItemUpdates(newUpdates);
                            }}
                          />
                          {item.productId && (
                            <p className="text-[10px] text-green-600 font-medium">
                              Selected: {item.productName || 'Unit Assigned'}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                              Initial B&W Reading
                            </Label>
                            <Input
                              type="number"
                              value={item.initialBwCount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newUpdates = [...itemUpdates];
                                newUpdates[idx].initialBwCount = e.target.value;
                                setItemUpdates(newUpdates);
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                              Initial Color Reading
                            </Label>
                            <Input
                              type="number"
                              value={item.initialColorCount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newUpdates = [...itemUpdates];
                                newUpdates[idx].initialColorCount = e.target.value;
                                setItemUpdates(newUpdates);
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Security Deposit (Optional) */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-slate-700 border-b pb-2">
                  Security Deposit (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      value={depositAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepositAmount(e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                      Mode
                    </Label>
                    <RadioGroup
                      value={depositMode}
                      onValueChange={(val) => setDepositMode(val as 'CASH' | 'CHEQUE')}
                      className="flex gap-4 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CASH" id="mode-cash" />
                        <Label htmlFor="mode-cash" className="text-xs">
                          Cash
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CHEQUE" id="mode-cheque" />
                        <Label htmlFor="mode-cheque" className="text-xs">
                          Cheque
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                      Reference
                    </Label>
                    <Input
                      value={depositReference}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepositReference(e.target.value)
                      }
                      placeholder="Cheque # / TXN ID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase font-bold text-muted-foreground">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={depositDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepositDate(e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setDepositOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmApprove}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                Confirm Approval & Finalize Contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
