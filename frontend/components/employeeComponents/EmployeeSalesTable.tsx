'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Trash2, Eye, FileText, Coins } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getMyInvoices,
  createInvoice,
  Invoice,
  CreateInvoicePayload,
  getInvoiceById,
  employeeApproveInvoice,
} from '@/lib/invoice';
import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';

interface EmployeeSalesTableProps {
  mode?: 'EMPLOYEE' | 'FINANCE';
}

/**
 * Table displaying sales invoices managed by the employee.
 * Features search, creation of new sales, and detailed invoice view.
 */
export default function EmployeeSalesTable({ mode = 'EMPLOYEE' }: EmployeeSalesTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // New state for Finance Approval Dialog

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let data: Invoice[] = [];
      if (mode === 'FINANCE') {
        // Finance sees all branch invoices (or we can use a specific endpoint if needed)
        // Using getBranchInvoices from lib
        const { getBranchInvoices } = await import('@/lib/invoice');
        data = await getBranchInvoices();
        // Filter out unapproved records for Finance View
        data = data.filter((inv) => !['DRAFT', 'SENT'].includes(inv.status));
      } else {
        data = await getMyInvoices();
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
    .filter((inv) => inv.saleType === 'SALE') // Only show SALE type, exclude RENT and LEASE
    .filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filterType === 'All' || inv.saleType === filterType;
      return matchesSearch && matchesFilter;
    });

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCreate = async (data: CreateInvoicePayload) => {
    try {
      const newInvoice = await createInvoice(data);
      setInvoices((prev) => [newInvoice, ...prev]);
      setFormOpen(false);
      toast.success('Invoice created successfully.');
    } catch (error: unknown) {
      console.error('Failed to create invoice:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create invoice.');
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
            onClick={() => {
              setFormOpen(true);
            }}
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
                <SelectItem value="SALE">Sale</SelectItem>
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
                <TableHead className="text-primary font-bold">STATUS</TableHead>
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
                          inv.saleType === 'SALE'
                            ? 'border-blue-200 text-blue-600 bg-blue-50'
                            : inv.saleType === 'RENT'
                              ? 'border-orange-200 text-orange-600 bg-orange-50'
                              : 'border-purple-200 text-purple-600 bg-purple-50'
                        }`}
                      >
                        {inv.saleType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none
                        ${
                          inv.status === 'PAID'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : inv.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleViewDetails(inv.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

      {formOpen && <SaleFormModal onClose={() => setFormOpen(false)} onConfirm={handleCreate} />}

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setDetailsOpen(false)}
          // EMPLOYEE Mode Action
          onApprove={
            mode === 'EMPLOYEE'
              ? handleSendForApproval
              : async () => {
                  // FINANCE Mode Approve
                  try {
                    const { financeApproveInvoice } = await import('@/lib/invoice');
                    await financeApproveInvoice(selectedInvoice.id, {});
                    toast.success('Invoice Approved Successfully');
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
                    toast.success('Invoice Rejected');
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
    </div>
  );
}

function SaleFormModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void>;
}) {
  // Extended Item interface for local state
  interface ExtendedItem {
    description: string;
    quantity: number;
    unitPrice: number; // This is the Net Price (Base - Discount)
    basePrice: number; // Original Price
    discount: number;
    maxDiscount: number;
    isManual: boolean;
    productId?: string; // Product ID for status updates
    isEditable: boolean; // Allow editing price (e.g. for Spare Parts or 0-price items)
  }

  const [form, setForm] = useState<{
    customerId: string;
    saleType: 'SALE';
    items: ExtendedItem[];
  }>({
    customerId: '',
    saleType: 'SALE',
    items: [],
  });

  const [manualItemOpen, setManualItemOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = (item: SelectableItem) => {
    let description = '';
    let basePrice = 0;
    let maxDiscount = 0;
    let productId: string | undefined;

    if ('part_name' in item) {
      // SparePart
      description = item.part_name;
      basePrice = Number(item.base_price) || 0;
      maxDiscount = 0;
      productId = undefined; // Spare parts don't have productId
    } else {
      // Product
      description = item.name;
      basePrice = item.sale_price || 0;
      maxDiscount = item.max_discount_amount || 0;
      productId = item.id; // CRITICAL: Store product ID
    }

    const newItem: ExtendedItem = {
      description,
      quantity: 1,
      basePrice,
      discount: 0,
      unitPrice: basePrice, // Initially same as base
      maxDiscount,
      isManual: false,
      productId, // CRITICAL: Include productId
      isEditable: !productId || basePrice === 0, // Editable if No Product ID (Spare Part) OR Price is 0
    };

    setForm({
      ...form,
      items: [...form.items, newItem],
    });
    toast.success(`Added ${description}`);
  };

  const addManualItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          description: '',
          quantity: 1,
          basePrice: 0,
          discount: 0,
          unitPrice: 0,
          maxDiscount: 999999,
          isManual: true,
          isEditable: true,
        },
      ],
    });
    setManualItemOpen(false);
  };

  const removeItem = (index: number) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const updateItem = (index: number, field: keyof ExtendedItem, value: string | number) => {
    const newItems = [...form.items];
    const prevItem = newItems[index];
    const safeValue = typeof value === 'string' ? value : Number(value);

    if (field === 'quantity') {
      newItems[index] = { ...prevItem, quantity: Number(safeValue) };
    } else if (field === 'description') {
      newItems[index] = { ...prevItem, description: String(safeValue) };
    } else if (field === 'discount') {
      const discountVal = Number(safeValue);
      // Removed strict return to allow showing error state inline

      // Also discount shouldn't be > basePrice
      if (discountVal > prevItem.basePrice) {
        toast.error(`Discount cannot exceed base price`);
        return;
      }

      newItems[index] = {
        ...prevItem,
        discount: discountVal,
        unitPrice: prevItem.basePrice - discountVal,
      };
    } else if (field === 'basePrice' && prevItem.isEditable) {
      const base = Number(safeValue);
      newItems[index] = {
        ...prevItem,
        basePrice: base,
        unitPrice: base - prevItem.discount,
      };
    }

    setForm({ ...form, items: newItems });
  };

  const totalAmount = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-muted/50/50 backdrop-blur-sm h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 bg-card border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
              <Coins size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                New Sale Invoice
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Create a new transaction record
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-8 overflow-y-auto grow scrollbar-hide bg-card/50">
          {/* Customer Section */}
          <div className="space-y-2 bg-card p-5 rounded-xl border border-slate-100 shadow-sm">
            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Customer Details
            </label>
            <div className="w-full">
              <CustomerSelect
                value={form.customerId}
                onChange={(id) => setForm({ ...form, customerId: id })}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Order Items
              </h4>
              {!manualItemOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManualItemOpen(true)}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors h-7"
                >
                  + Manual Entry
                </Button>
              )}
            </div>

            {/* Search Logic */}
            <div className="bg-card p-2 rounded-xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <ProductSelect onSelect={addItem} />
            </div>
            {/* Secondary Manual Add */}
            {manualItemOpen && (
              <div className="flex justify-end mt-2 animate-in fade-in slide-in-from-top-1">
                <Button
                  onClick={addManualItem}
                  size="sm"
                  variant="secondary"
                  className="text-xs font-bold"
                >
                  Add Custom Item Row
                </Button>
              </div>
            )}

            {/* List of Added Items */}
            <div className="space-y-3 mt-4">
              {form.items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm font-bold text-slate-400">No items added.</p>
                  <p className="text-xs text-slate-300 mt-1">Search above to add products.</p>
                </div>
              )}

              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Description */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Description
                      </label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        readOnly={!item.isManual}
                        className={`h-9 font-bold text-sm ${!item.isManual ? 'bg-muted/50 border-transparent' : 'bg-card'}`}
                      />
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase text-center block">
                        Qty
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="h-9 text-center font-bold"
                      />
                    </div>

                    {/* Base Price */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase text-right block">
                        Rate
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={item.basePrice}
                          readOnly={!item.isEditable}
                          onChange={(e) => updateItem(index, 'basePrice', e.target.value)}
                          className={`h-9 text-right font-bold pr-1 ${!item.isManual ? 'bg-muted/50 text-muted-foreground' : ''}`}
                        />
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          QAR
                        </span>
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase text-center block">
                        Discount
                      </label>
                      <div className="relative">
                        {!item.productId && !item.isManual ? (
                          <div className="h-9 flex items-center justify-center text-slate-300 font-bold text-xs bg-slate-50 rounded-md border border-transparent cursor-not-allowed">
                            N/A
                          </div>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            // Remove max attribute to allow typing higher values
                            value={item.discount === 0 ? '' : item.discount}
                            placeholder="0"
                            onChange={(e) => updateItem(index, 'discount', e.target.value)}
                            className={`h-9 text-center font-bold border-2 focus:ring-2 transition-all ${
                              !item.isManual &&
                              item.maxDiscount > 0 &&
                              item.discount > item.maxDiscount
                                ? 'text-red-600 border-red-200 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                : 'text-emerald-600 border-emerald-100 bg-emerald-50/30 focus:border-emerald-400 focus:ring-emerald-200'
                            }`}
                          />
                        )}
                      </div>
                      {/* Warning Text only for non-spare-parts */}
                      {item.productId &&
                        !item.isManual &&
                        item.maxDiscount > 0 &&
                        item.discount > item.maxDiscount && (
                          <p className="text-[9px] font-bold text-red-500 text-center animate-pulse mt-1">
                            Max Allowed: {formatCurrency(item.maxDiscount)}
                          </p>
                        )}
                    </div>

                    {/* Total Row */}
                    <div className="md:col-span-2 flex flex-col items-end justify-center h-9 mt-auto">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Net</p>
                      <p className="font-extrabold text-foreground">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-card border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
              Grand Total
            </p>
            <p className="text-3xl font-black text-primary tracking-tight">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={onClose}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Discard
            </button>
            <Button
              className="h-12 px-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
              onClick={async () => {
                if (!form.customerId) {
                  toast.error('Please select a customer.');
                  return;
                }
                if (form.items.length === 0) {
                  toast.error('Please add at least one item.');
                  return;
                }

                // Validation check for Max Discount
                const hasInvalidDiscount = form.items.some(
                  (item) =>
                    !item.isManual && item.maxDiscount > 0 && item.discount > item.maxDiscount,
                );
                if (hasInvalidDiscount) {
                  toast.error('Please fix invalid discounts before proceeding.');
                  return;
                }

                setIsSubmitting(true);
                try {
                  const finalPayload: CreateInvoicePayload = {
                    customerId: form.customerId,
                    saleType: form.saleType,
                    items: form.items.map((it) => ({
                      description: it.description,
                      quantity: it.quantity,
                      // We send the NET unit price to backend as 'unitPrice' usually (unless backed expects discount field)
                      // Based on previous code, only unitPrice exists in payload.
                      unitPrice: it.unitPrice,
                      productId: it.productId, // CRITICAL: Include productId
                    })),
                  };

                  await onConfirm(finalPayload);
                } catch (error) {
                  console.error(error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Sale'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
