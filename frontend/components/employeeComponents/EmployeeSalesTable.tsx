'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Eye,
  FileText,
  Calendar,
  IndianRupee,
  User,
  Building,
} from 'lucide-react';
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
  getInvoices,
  createInvoice,
  Invoice,
  CreateInvoicePayload,
  getInvoiceById,
} from '@/lib/invoice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function EmployeeSalesTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      alert('Failed to fetch sales data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleViewDetails = async (invoiceId: string) => {
    try {
      const data = await getInvoiceById(invoiceId);
      setSelectedInvoice(data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      alert('Failed to load invoice details.');
    } finally {
      // Done loading
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.items?.some((item) => item.description.toLowerCase().includes(search.toLowerCase())) ||
      inv.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'All' || inv.saleType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleCreate = async (data: CreateInvoicePayload) => {
    try {
      const newInvoice = await createInvoice(data);
      setInvoices((prev) => [newInvoice, ...prev]);
      setFormOpen(false);
      alert('Invoice created successfully.');
    } catch (error: unknown) {
      console.error('Failed to create invoice:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Failed to create invoice.');
    }
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice # or items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all w-full"
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-lg w-full">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="SALE">Sale</SelectItem>
                <SelectItem value="RENT">Rent</SelectItem>
                <SelectItem value="LEASE">Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="bg-primary text-white gap-2 w-full sm:w-auto mt-2 sm:mt-0 shadow-md hover:shadow-lg transition-all"
          onClick={() => {
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> New Sale
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-primary font-bold">INV NUMBER</TableHead>
                <TableHead className="text-primary font-bold">ITEMS</TableHead>
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No sales found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv, index) => (
                  <TableRow
                    key={inv.id}
                    className={`${index % 2 ? 'bg-blue-50/10' : 'bg-white'} hover:bg-slate-50 transition-colors`}
                  >
                    <TableCell className="text-blue-500 font-bold tracking-tight">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-sm font-medium text-slate-700 truncate">
                        {inv.items?.map((item) => item.description).join(', ') || 'No items'}
                      </div>
                      {inv.items && inv.items.length > 1 && (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          +{inv.items.length - 1} more items
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      ₹{inv.totalAmount.toLocaleString()}
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
                    <TableCell className="text-slate-500 text-sm font-medium">
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
      </div>

      {formOpen && <SaleFormModal onClose={() => setFormOpen(false)} onConfirm={handleCreate} />}

      {detailsOpen && selectedInvoice && (
        <InvoiceDetailsDialog invoice={selectedInvoice} onClose={() => setDetailsOpen(false)} />
      )}
    </div>
  );
}

function InvoiceDetailsDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-xl border border-gray-100 shadow-2xl bg-white">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                {invoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Invoice Details & Summary
              </DialogDescription>
            </div>
          </div>
          <div className="absolute top-8 right-8">
            <Badge
              variant="secondary"
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider shadow-none
                ${
                  invoice.status === 'PAID'
                    ? 'bg-green-50 text-green-600 border-green-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}
            >
              {invoice.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-8 pt-6 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Sold By
                </p>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">{invoice.employeeName}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Branch
                </p>
                <div className="flex items-center gap-2">
                  <Building size={14} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">{invoice.branchName}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">
                    {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</p>
                <Badge
                  variant="outline"
                  className="mt-1 font-bold text-[10px] rounded-lg border-gray-100 text-gray-600"
                >
                  {invoice.saleType}
                </Badge>
              </div>
            </div>
          </div>

          {(invoice.saleType === 'RENT' || invoice.saleType === 'LEASE') &&
            (invoice.startDate || invoice.endDate || invoice.billingCycleInDays) && (
              <>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 p-6 bg-gray-50 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Contract Period
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="opacity-50" />
                      <p className="text-xs font-bold">
                        {invoice.startDate
                          ? new Date(invoice.startDate).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })
                          : 'N/A'}{' '}
                        —{' '}
                        {invoice.endDate
                          ? new Date(invoice.endDate).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Billing Cycle
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <IndianRupee size={14} className="opacity-50" />
                      <p className="text-xs font-bold">
                        Every {invoice.billingCycleInDays || 30} Days
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Order Items
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="text-[10px] font-bold text-gray-400 h-10">
                      DESCRIPTION
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-center h-10">
                      QTY
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-gray-400 text-right h-10">
                      TOTAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item, idx) => (
                    <TableRow key={item.id || idx} className="border-gray-50">
                      <TableCell className="font-bold text-gray-700 py-3 text-sm">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-center font-bold text-gray-500 text-sm">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900 text-sm">
                        ₹{(item.quantity * item.unitPrice).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-primary">
              ₹{invoice.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Close
            </button>
            <Button
              className="rounded-xl h-11 px-8 font-bold bg-primary text-white shadow-lg hover:bg-primary/90 transition-all"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaleFormModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => void;
}) {
  const [form, setForm] = useState<CreateInvoicePayload>({
    saleType: 'SALE',
    items: [{ productId: 'temp-id', description: '', quantity: 1, unitPrice: 0 }],
    startDate: '',
    endDate: '',
    billingCycleInDays: 30,
  });

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { productId: `temp-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const totalAmount = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-white">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <IndianRupee size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                New Sale Invoice
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Create a new transaction record
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 pt-4 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            {['SALE', 'RENT', 'LEASE'].map((type) => (
              <button
                key={type}
                onClick={() => setForm({ ...form, saleType: type as 'SALE' | 'RENT' | 'LEASE' })}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest
                  ${
                    form.saleType === type
                      ? 'bg-white text-primary shadow-sm font-black'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {form.saleType !== 'SALE' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Contract Start Date
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Contract End Date
                </label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Line Items
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={addItem}
                className="h-8 text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 rounded-lg"
              >
                <Plus size={14} className="mr-1" /> Add Another Item
              </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div
                  key={item.productId}
                  className="group relative grid grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 transition-all"
                >
                  <div className="col-span-12 md:col-span-6 space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                      Description
                    </label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="e.g. Printer Model"
                      className="h-10 border-none bg-transparent font-bold text-gray-800 placeholder:text-gray-300 shadow-none focus-visible:ring-0 px-1"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                      Qty
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-10 border-none bg-transparent font-bold text-gray-500 shadow-none focus-visible:ring-0 text-center"
                    />
                  </div>
                  <div className="col-span-8 md:col-span-3 space-y-1 text-right">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pr-1">
                      Unit Price
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="h-10 border-none bg-transparent font-bold text-gray-900 shadow-none focus-visible:ring-0 pl-6 text-right"
                      />
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xs">
                        ₹
                      </span>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-1 flex items-center justify-end">
                    {form.items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
              Estimated Total
            </p>
            <p className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div className="flex gap-6 items-center">
            <button
              onClick={onClose}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Discard
            </button>
            <Button
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg disabled:opacity-70 transition-all"
              onClick={() => {
                const finalPayload: CreateInvoicePayload = {
                  saleType: form.saleType,
                  items: form.items.map((it) => ({
                    productId: it.productId,
                    description: it.description,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                  })),
                };

                if (form.saleType !== 'SALE') {
                  if (form.startDate) finalPayload.startDate = form.startDate;
                  if (form.endDate) finalPayload.endDate = form.endDate;
                  finalPayload.billingCycleInDays = form.billingCycleInDays;
                }

                onConfirm(finalPayload);
              }}
            >
              Finalize Sale
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
