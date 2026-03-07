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
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBranchInvoices,
  Invoice,
  financeRejectInvoice,
  sendEmailNotification,
  InvoiceItem,
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
import { FinanceApprovalModal } from './FinanceApprovalModal';
import { ActivateContractModal } from './ActivateContractModal';
import { formatCurrency } from '@/lib/format';

interface FinanceApprovalTableProps {
  saleType?: 'RENT' | 'LEASE' | 'SALE';
  onSuccess?: () => void;
}

/**
 * Table for finance department to review and approve/reject branch invoices.
 * Supports filtering by sale type and detailed invoice inspection.
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
  const [activateInvoice, setActivateInvoice] = useState<Invoice | null>(null);

  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const fetchInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBranchInvoices();
      let filtered = data.filter(
        (inv) =>
          inv.status === 'EMPLOYEE_APPROVED' ||
          inv.status === 'APPROVED' ||
          inv.contractStatus === 'PENDING_CONFIRMATION',
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
  }, [saleType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleAllocateClick = (invoice: Invoice) => {
    setApprovalInvoice(invoice);
    setDetailsOpen(false);
  };

  const handleActivateClick = (invoice: Invoice) => {
    setActivateInvoice(invoice);
    setDetailsOpen(false);
  };

  const generateContractEmailHtml = (invoice: Invoice) => {
    const rentalItems =
      invoice.items?.filter((i: InvoiceItem) => i.itemType === 'PRODUCT' && i.productId) || [];

    const formatCurrency = (amount: number) =>
      `QAR ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    let allocatedMachinesHtml = '';
    if (rentalItems.length > 0) {
      allocatedMachinesHtml = `
                <div style="margin-bottom: 24px;">
                    <h3 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Allocated Equipment</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e5e7eb;">Model Description</th>
                                <th style="padding: 10px; text-align: left; font-size: 14px; border: 1px solid #e5e7eb;">Serial Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                              const activeAllocations =
                                invoice.productAllocations?.filter(
                                  (a) => a.status === 'ALLOCATED',
                                ) || [];
                              if (activeAllocations.length > 0) {
                                return activeAllocations
                                  .map((alloc) => {
                                    const item = rentalItems.find(
                                      (i) =>
                                        i.modelId === alloc.modelId ||
                                        i.productId === alloc.productId,
                                    );
                                    return `
                                    <tr>
                                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 14px;">${item?.description || 'Equipment'}</td>
                                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 14px; font-weight: bold;">${alloc.serialNumber}</td>
                                    </tr>
                                `;
                                  })
                                  .join('');
                              }
                              return rentalItems
                                .map((item) => {
                                  const serialNo =
                                    (item as unknown as { product?: { serial_no: string } }).product
                                      ?.serial_no || 'Pending Allocation';
                                  return `
                                    <tr>
                                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 14px;">${item.description}</td>
                                        <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 14px; font-weight: bold;">${serialNo}</td>
                                    </tr>
                                `;
                                })
                                .join('');
                            })()}
                        </tbody>
                    </table>
                </div>
            `;
    }

    let pricingRulesHtml = '';
    const rules = invoice.items?.filter((i) => i.itemType === 'PRICING_RULE') || [];
    if (rules.length > 0) {
      pricingRulesHtml = `
                <div style="margin-bottom: 24px;">
                    <h3 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Slabs & Usage Rates</h3>
                    ${rules
                      .map((rule) => {
                        let ruleHtml = `<div style="margin-top: 15px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">`;
                        ruleHtml += `<h4 style="margin: 0 0 10px 0;">${rule.description}</h4>`;

                        const renderRateTable = (
                          title: string,
                          slabs?: Array<{ from: number; to: number; rate: number }>,
                          excessRate?: number,
                        ) => {
                          if (!slabs?.length && !excessRate) return '';
                          let tbl = `<div style="margin-top: 10px;"><strong style="font-size: 13px; color: #4b5563;">${title} Rates:</strong>`;
                          tbl += `<table style="width: 100%; border-collapse: collapse; margin-top: 5px;">`;
                          if (slabs && slabs.length > 0) {
                            slabs.forEach((s) => {
                              tbl += `<tr><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${s.from} - ${s.to}</td><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: bold;">QAR ${s.rate}</td></tr>`;
                            });
                            if (excessRate) {
                              const maxTo = Math.max(...slabs.map((s) => Number(s.to) || 0));
                              tbl += `<tr><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">> ${maxTo}</td><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: bold;">QAR ${excessRate}</td></tr>`;
                            }
                          } else if (excessRate) {
                            tbl += `<tr><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">Base Rate</td><td style="padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: bold;">QAR ${excessRate}</td></tr>`;
                          }
                          tbl += `</table></div>`;
                          return tbl;
                        };

                        ruleHtml += renderRateTable(
                          'Black & White',
                          rule.bwSlabRanges,
                          rule.bwExcessRate,
                        );
                        ruleHtml += renderRateTable(
                          'Color',
                          rule.colorSlabRanges,
                          rule.colorExcessRate,
                        );
                        ruleHtml += renderRateTable(
                          'Combined',
                          rule.comboSlabRanges,
                          rule.combinedExcessRate,
                        );

                        return ruleHtml + `</div>`;
                      })
                      .join('')}
                </div>
            `;
    }

    return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
                <h2 style="color: #111827;">Contract Details: ${invoice.invoiceNumber}</h2>
                <p>Dear <strong>${invoice.customerName}</strong>,</p>
                <p>Please find the details of your service contract below. Kindly review the information and upload the signed confirmation document.</p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0;"><strong>Contract Type:</strong></td><td style="padding: 6px 0;">${
                          invoice.saleType
                        } ${invoice.rentType ? `(${invoice.rentType.replace('_', ' ')})` : ''}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Rent Duration:</strong></td><td style="padding: 6px 0;">${
                          invoice.rentPeriod || 'N/A'
                        }</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Monthly Rent:</strong></td><td style="padding: 6px 0;">${formatCurrency(
                          invoice.monthlyRent || 0,
                        )}</td></tr>
                        ${
                          invoice.grossAmount
                            ? `<tr><td style="padding: 6px 0;"><strong>Total Gross Amount:</strong></td><td style="padding: 6px 0;">${formatCurrency(
                                invoice.grossAmount,
                              )}</td></tr>`
                            : ''
                        }
                        <tr><td style="padding: 6px 0;"><strong>Start Date:</strong></td><td style="padding: 6px 0;">${
                          invoice.startDate
                            ? new Date(invoice.startDate).toLocaleDateString()
                            : 'Pending Activation'
                        }</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>End Date:</strong></td><td style="padding: 6px 0;">${
                          invoice.endDate ? new Date(invoice.endDate).toLocaleDateString() : 'N/A'
                        }</td></tr>
                    </table>
                </div>

                ${allocatedMachinesHtml}
                ${pricingRulesHtml}

                <p style="margin-top: 32px; font-size: 14px; color: #4b5563;">Thank you for your business. Please reach out if you have any questions.</p>
                <p style="font-size: 14px;">Best regards,<br><strong>XeroCare Team</strong></p>
            </div>
        `;
  };

  const handleSendEmail = async (invoice: Invoice) => {
    if (!invoice.customerEmail) {
      toast.error('Customer email is missing. Please update customer details.');
      return;
    }
    setSendingEmailId(invoice.id);
    try {
      await sendEmailNotification(invoice.id, {
        recipient: invoice.customerEmail,
        subject: `Contract Details - ${invoice.invoiceNumber}`,
        body: generateContractEmailHtml(invoice),
      });
      toast.success('Contract details sent to customer successfully!');
      fetchInvoices();
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email to customer');
    } finally {
      setSendingEmailId(null);
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
                <TableCell className="font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                <TableCell className="text-blue-600 font-semibold">
                  {formatCurrency(inv.advanceAmount || 0)}
                </TableCell>
                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{inv.employeeName || 'Unknown'}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    {inv.contractStatus === 'PENDING_CONFIRMATION' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingEmailId === inv.id}
                          className={
                            inv.emailSentAt
                              ? 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 gap-1.5 shadow-sm'
                              : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 gap-1.5 shadow-sm'
                          }
                          onClick={() => handleSendEmail(inv)}
                          title={
                            inv.emailSentAt
                              ? 'Resend Contract Email'
                              : 'Send Contract Email to Customer'
                          }
                        >
                          {sendingEmailId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : inv.emailSentAt ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {sendingEmailId === inv.id
                              ? 'Sending...'
                              : inv.emailSentAt
                                ? 'Resend Mail'
                                : 'Send Mail'}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-sm"
                          onClick={() => handleActivateClick(inv)}
                          title="Upload Confirmation & Activate"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Activate
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-sm"
                        onClick={() => handleAllocateClick(inv)}
                        title="Allocate Machines"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Allocate
                      </Button>
                    )}
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
          onApprove={() =>
            selectedInvoice.contractStatus === 'PENDING_CONFIRMATION'
              ? handleActivateClick(selectedInvoice)
              : handleAllocateClick(selectedInvoice)
          }
          approveLabel={
            selectedInvoice.contractStatus === 'PENDING_CONFIRMATION' ? 'Activate' : 'Allocate now'
          }
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

      {activateInvoice && (
        <ActivateContractModal
          invoice={activateInvoice}
          onClose={() => setActivateInvoice(null)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
