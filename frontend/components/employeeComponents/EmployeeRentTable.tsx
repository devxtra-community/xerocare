import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Eye, FileText, Plus, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyInvoices, Invoice, createInvoice, CreateInvoicePayload } from '@/lib/invoice';
import RentFormModal from './RentFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { ApproveQuotationDialog } from '@/components/invoice/ApproveQuotationDialog';

import { updateQuotation } from '@/lib/invoice'; // Ensure import

// ...

export default function EmployeeRentTable() {
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
      const data = await getMyInvoices();
      // Filter only RENT type invoices
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
        <Button
          className="bg-primary text-white gap-2 w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
          onClick={openCreateModal}
        >
          <Plus size={16} /> New Rent
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-primary font-bold">INV NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">RENT TYPE</TableHead>
                <TableHead className="text-primary font-bold">PERIOD</TableHead>
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
            onClose={() => setFormOpen(false)}
            onConfirm={handleCreateOrUpdate}
          />
        )}

        {detailsOpen && selectedInvoice && (
          <InvoiceDetailsDialog
            invoice={selectedInvoice}
            onClose={() => setDetailsOpen(false)}
            onApprove={() => {
              setDetailsOpen(false);
              setApproveOpen(true);
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

// RentFormModal has been moved to its own file ./RentFormModal.tsx

function InvoiceDetailsDialog({
  invoice,
  onClose,
  onApprove,
}: {
  invoice: Invoice;
  onClose: () => void;
  onApprove: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-slate-50/50 backdrop-blur-sm">
        {/* Header with Pattern */}
        <DialogHeader className="p-6 bg-gradient-to-br from-white to-slate-50 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                <FileText size={24} className="stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  {invoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  {new Date(invoice.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider shadow-none border
                  ${
                    invoice.status === 'PAID'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : invoice.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
            >
              {invoice.status}
            </Badge>
          </div>

          {invoice.rentType && (
            <div className="mt-4 flex gap-2">
              <Badge
                variant="outline"
                className="bg-white text-slate-600 border-slate-200 text-[10px] font-bold"
              >
                TYPE: {invoice.rentType.replace('_', ' ')}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white text-slate-600 border-slate-200 text-[10px] font-bold"
              >
                BILLING: {invoice.rentPeriod}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Contract Period Card */}
          {(invoice.startDate || invoice.endDate || invoice.effectiveFrom) && (
            <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Effective From
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {invoice.startDate || invoice.effectiveFrom
                    ? new Date(invoice.startDate || invoice.effectiveFrom!).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Effective To
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {invoice.endDate || invoice.effectiveTo
                    ? new Date(invoice.endDate || invoice.effectiveTo!).toLocaleDateString()
                    : 'Active Contract'}
                </p>
              </div>
            </div>
          )}

          {/* Financials Row */}
          <div className="grid grid-cols-2 gap-4">
            {invoice.monthlyRent !== undefined && invoice.monthlyRent > 0 && (
              <div className="p-4 rounded-xl bg-white border border-blue-100 shadow-sm space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar size={40} className="text-blue-600" />
                </div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Monthly Rent
                </p>
                <p className="text-lg font-bold text-slate-800">
                  ₹{invoice.monthlyRent.toLocaleString()}
                </p>
              </div>
            )}

            {invoice.advanceAmount ? (
              <div className="p-4 rounded-xl bg-white border border-purple-100 shadow-sm space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText size={40} className="text-purple-600" />
                </div>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  Advance
                </p>
                <p className="text-lg font-bold text-slate-800">
                  ₹{invoice.advanceAmount.toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>

          {/* Security Deposit (Conditional) */}
          {invoice.securityDepositAmount && invoice.securityDepositAmount > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Security Deposit
                </h4>
                <Badge
                  variant="secondary"
                  className="bg-white text-slate-600 text-[10px] border border-slate-100"
                >
                  {invoice.securityDepositMode}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span className="text-xl font-bold text-slate-900">
                  {invoice.securityDepositAmount.toLocaleString()}
                </span>
              </div>
              {invoice.securityDepositReference && (
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Ref: {invoice.securityDepositReference}
                </p>
              )}
            </div>
          )}

          {/* Machines & Rules */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Configured Machines
            </h3>

            <div className="space-y-4">
              {(() => {
                // Group items by machine (Serial Number)
                // Robust filtering:
                // Machine = itemType is PRODUCT OR (description does NOT indicate a rule)
                const machineItems =
                  invoice.items?.filter((i) => {
                    const isRuleDesc =
                      i.description.startsWith('Black') ||
                      i.description.startsWith('Color') ||
                      i.description.startsWith('Combined');
                    return i.itemType === 'PRODUCT' || !isRuleDesc;
                  }) || [];

                const ruleItems =
                  invoice.items?.filter((i) => {
                    const isRuleDesc =
                      i.description.startsWith('Black') ||
                      i.description.startsWith('Color') ||
                      i.description.startsWith('Combined');
                    return isRuleDesc;
                  }) || [];

                // Virtual Machines from Orphan Rules
                const virtualMachines = new Map<string, typeof ruleItems>();

                ruleItems.forEach((r) => {
                  const claimed = machineItems.some((m) => {
                    // Start searching from the end for ' - ' separator
                    const lastDash = m.description.lastIndexOf(' - ');
                    const serial =
                      lastDash !== -1 ? m.description.substring(lastDash + 3).trim() : '';
                    return r.description.includes(`(${serial})`);
                  });

                  if (!claimed) {
                    let suffix = r.description;
                    if (suffix.startsWith('Black & White - '))
                      suffix = suffix.replace('Black & White - ', '');
                    else if (suffix.startsWith('Color - ')) suffix = suffix.replace('Color - ', '');
                    else if (suffix.startsWith('Combined - '))
                      suffix = suffix.replace('Combined - ', '');
                    else if (suffix.startsWith('Black - ')) suffix = suffix.replace('Black - ', '');

                    if (!virtualMachines.has(suffix)) {
                      virtualMachines.set(suffix, []);
                    }
                    virtualMachines.get(suffix)?.push(r);
                  }
                });

                const allMachines = [
                  ...machineItems.map((m) => ({
                    isVirtual: false,
                    item: m,
                    name: undefined,
                    rules: [] as typeof ruleItems,
                  })),
                  ...Array.from(virtualMachines.entries()).map(([name, rules]) => ({
                    isVirtual: true,
                    item: undefined,
                    name,
                    rules,
                  })),
                ];

                if (allMachines.length === 0) {
                  return (
                    <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No items found
                    </div>
                  );
                }

                return allMachines.map((machineObj, idx) => {
                  let name = '';
                  let serial = '';
                  let myRules = machineObj.rules;
                  let quantity = 1;
                  let unitPrice = 0;

                  if (machineObj.isVirtual && machineObj.name) {
                    const openParen = machineObj.name.lastIndexOf('(');
                    const closeParen = machineObj.name.lastIndexOf(')');
                    if (openParen !== -1 && closeParen !== -1) {
                      name = machineObj.name.substring(0, openParen).trim();
                      serial = machineObj.name.substring(openParen + 1, closeParen).trim();
                    } else {
                      name = machineObj.name;
                      serial = 'Unknown';
                    }
                    quantity = 1;
                  } else if (machineObj.item) {
                    const m = machineObj.item;
                    const lastDash = m.description.lastIndexOf(' - ');
                    name =
                      lastDash !== -1 ? m.description.substring(0, lastDash).trim() : m.description;
                    serial = lastDash !== -1 ? m.description.substring(lastDash + 3).trim() : '';
                    quantity = m.quantity || 1;
                    unitPrice = m.unitPrice || 0;
                    myRules = ruleItems.filter((r) => r.description.includes(`(${serial})`));
                  }

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      {/* Machine Header */}
                      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800">{name}</h4>
                            {machineObj.isVirtual && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700">
                                Virtual
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-500">
                              <span className="text-slate-300">SN:</span> {serial || 'N/A'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[10px] font-bold text-purple-700">
                              Qty: {quantity}
                            </span>
                          </div>
                        </div>
                        {unitPrice > 0 && (
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                              Unit Price
                            </p>
                            <p className="font-bold text-slate-700">
                              ₹{unitPrice.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Rules List */}
                      {myRules.length > 0 ? (
                        <div className="p-3 grid grid-cols-1 gap-2">
                          {myRules.map((rule, rIdx) => {
                            let ruleType = rule.description;
                            if (ruleType.startsWith('Black & White - ')) ruleType = 'Black & White';
                            else if (ruleType.startsWith('Color - ')) ruleType = 'Color';
                            else if (ruleType.startsWith('Combined - ')) ruleType = 'Combined';
                            else if (ruleType.startsWith('Black - ')) ruleType = 'Black & White';

                            const isCombo = ruleType === 'Combined';
                            const isColor = ruleType === 'Color';

                            return (
                              <div
                                key={rIdx}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold 
                                         ${isCombo ? 'bg-blue-100 text-blue-700' : isColor ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-700'}
                                      `}
                                  >
                                    {isCombo ? 'CMB' : isColor ? 'CLR' : 'BW'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-700">{ruleType}</p>
                                    <p className="text-[10px] font-medium text-slate-400">
                                      {invoice.rentType?.startsWith('CPC') ? (
                                        <span className="text-emerald-600">Unlimited Usage</span>
                                      ) : (
                                        <span>
                                          Free Limit:{' '}
                                          <span className="text-slate-700">
                                            {rule.bwIncludedLimit ??
                                              rule.colorIncludedLimit ??
                                              rule.combinedIncludedLimit ??
                                              0}
                                          </span>
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    X-Rate
                                  </p>
                                  <p className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded">
                                    ₹
                                    {rule.bwExcessRate ??
                                      rule.colorExcessRate ??
                                      rule.combinedExcessRate ??
                                      0}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No usage limits configured for this machine.
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)] z-10 relative">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Grand Total
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {invoice.totalAmount?.toLocaleString() || 0}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 font-bold text-slate-600 border-2 h-10 px-4 hover:bg-slate-50"
            >
              <Printer size={16} />
            </Button>

            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 h-10 px-4 shadow-lg shadow-green-100 hover:shadow-green-200 transition-all"
              onClick={() => {
                const message =
                  `*Proforma Invoice #${invoice.invoiceNumber}*\n\n` +
                  `*Customer:* ${invoice.customerName}\n` +
                  `*Rent Type:* ${invoice.rentType || 'N/A'}\n` +
                  `*Total Amount:* ₹${invoice.totalAmount?.toLocaleString()}\n\n` +
                  `Please find the invoice details attached via this summary.\n` +
                  `Thank you for your business!`;

                const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
            >
              <Share2 size={16} /> WhatsApp
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="font-bold text-slate-400 hover:text-slate-600 h-10 px-4"
            >
              Close
            </Button>

            {(invoice.status === 'SENT' || invoice.status === 'DRAFT') && (
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold h-10 px-6 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all"
              >
                Approve Invoice
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
