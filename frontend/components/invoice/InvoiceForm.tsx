'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createInvoice, CreateInvoicePayload } from '@/lib/invoice';
import { CustomerSelect, SelectableCustomer } from './CustomerSelect';
import { ProductSelect, SelectableItem } from './ProductSelect';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Receipt, Users, Package, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvoiceItemRow {
  id: string; // temp id for UI key
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function InvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [customerId, setCustomerId] = useState<string>(preselectedCustomerId || '');

  const [customer, setCustomer] = useState<SelectableCustomer | undefined>();
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  const addItem = (item: SelectableItem) => {
    let description = '';
    let unitPrice = 0;

    if ('part_name' in item) {
      // It's a SparePart
      description = item.part_name;
      unitPrice = Number(item.base_price) || 0;
    } else {
      // It's a Product
      description = item.name;
      unitPrice = item.sale_price || 0;
    }

    const newItem: InvoiceItemRow = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      quantity: 1,
      unitPrice,
    };
    setItems([...items, newItem]);
    toast.info(`Added ${description}`);
  };

  const updateItem = (id: string, field: keyof InvoiceItemRow, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateInvoicePayload = {
        customerId,
        saleType: 'SALE',
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      await createInvoice(payload);

      toast.success('Invoice created successfully');
      router.push('/employee/sales'); // Redirect back to sales table
    } catch (error) {
      console.error('Failed to create invoice', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors mb-2 uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt size={24} />
            </div>
            Create Sale Invoice
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl font-bold h-11"
            onClick={() => router.back()}
          >
            Discard
          </Button>
          <Button
            className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : (
              <span className="flex items-center gap-2">
                <Save size={18} /> Finish & Save
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Selection & Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users size={14} /> Customer Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <CustomerSelect
                value={customerId}
                onChange={(id, cust) => {
                  setCustomerId(id);
                  setCustomer(cust);
                }}
              />
              {customer && (
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-sm font-bold text-slate-900">{customer.name}</div>
                  <div className="text-xs font-medium text-slate-500">{customer.phone}</div>
                  <div className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tight">
                    VIP Status: Active
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Package size={14} /> Add Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProductSelect onSelect={addItem} />
              <p className="text-[10px] text-slate-400 mt-3 font-medium leading-relaxed">
                Search for products by name or SKU. Selected items will be added to the invoice
                table on the right.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Items Table */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Invoice Items
                </CardTitle>
                <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                  {items.length} Items Total
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30 border-none hover:bg-slate-50/30">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 pl-6">
                        Description
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-center">
                        Qty
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right">
                        Unit Price
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right pr-6">
                        Total
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-20">
                            <Package size={48} />
                            <span className="text-sm font-bold">No items added yet.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="group border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className="h-10 border-none bg-transparent font-bold text-slate-900 focus-visible:ring-0 p-0 shadow-none"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                className="h-10 w-16 border-none bg-slate-100/50 rounded-lg font-bold text-center focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end font-bold text-slate-600">
                              <span className="text-[10px] mr-1">₹</span>
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                                className="h-10 w-24 border-none bg-transparent font-bold text-right focus-visible:ring-0 p-0 shadow-none"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-black text-slate-900">
                            ₹{(item.quantity * item.unitPrice).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Section */}
              {items.length > 0 && (
                <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Net Payable
                      </div>
                      <div className="text-xs text-slate-500 font-medium italic">
                        Inclusive of all local taxes
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                        <span className="text-xl text-primary font-bold">₹</span>
                        {calculateTotal().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
