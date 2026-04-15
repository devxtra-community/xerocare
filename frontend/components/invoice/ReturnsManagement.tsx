'use client';

import { useState, useEffect, useMemo } from 'react';
import { getInvoices, Invoice, processReturn } from '@/lib/invoice';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export default function ReturnsManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Return form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [returnAmount, setReturnAmount] = useState<string>('');
  const [returnNote, setReturnNote] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      // Only show PAID or ISSUED invoices for returns
      setInvoices(
        data.filter(
          (inv) => inv.saleType === 'SALE' && (inv.status === 'PAID' || inv.status === 'ISSUED'),
        ),
      );
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [invoices, searchTerm]);

  const handleOpenReturn = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedItemId('');
    setReturnAmount('');
    setReturnNote('');
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = async () => {
    if (!selectedInvoice || !selectedItemId || !returnAmount || !returnNote) {
      toast.error('Please fill all required fields');
      return;
    }

    const item = selectedInvoice.items?.find((i) => i.id === selectedItemId);
    const itemType = item?.itemType === 'PRODUCT' ? 'PRODUCT' : 'SPARE_PART';

    try {
      setProcessing(true);
      await processReturn(selectedInvoice.id, {
        itemId: selectedItemId,
        itemType,
        amount: Number(returnAmount),
        note: returnNote,
      });
      toast.success('Return processed successfully');
      setIsReturnModalOpen(false);
      fetchInvoices(); // Refresh list
    } catch (error) {
      console.error('Return processing failed:', error);
      toast.error('Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  const selectedItem = selectedInvoice?.items?.find((i) => i.id === selectedItemId);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Process Returns</h3>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-sm space-y-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer..."
            className="pl-8 bg-background/50 border-muted-foreground/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-semibold text-primary py-3 px-2">
                    INVOICE #
                  </th>
                  <th className="text-left text-xs font-semibold text-primary py-3 px-2">
                    CUSTOMER
                  </th>
                  <th className="text-left text-xs font-semibold text-primary py-3 px-2">DATE</th>
                  <th className="text-left text-xs font-semibold text-primary py-3 px-2">TOTAL</th>
                  <th className="text-left text-xs font-semibold text-primary py-3 px-2">STATUS</th>
                  <th className="text-right text-xs font-semibold text-primary py-3 px-2">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv, index) => (
                    <tr key={inv.id} className={index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}>
                      <td className="py-3 px-2 text-xs font-medium text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-700">{inv.customerName}</td>
                      <td className="py-3 px-2 text-xs text-gray-700">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-xs font-bold text-gray-700">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => handleOpenReturn(inv)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Process Return
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No returnable invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Item Return</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Select Item
              </label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose item to return" />
                </SelectTrigger>
                <SelectContent>
                  {selectedInvoice?.items?.map((item) => (
                    <SelectItem key={item.id} value={item.id || ''}>
                      {item.description} ({formatCurrency(item.unitPrice || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItem && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Return Credit Amount
                </label>
                <Input
                  type="number"
                  placeholder="Amount to credit back"
                  value={returnAmount}
                  onChange={(e) => setReturnAmount(e.target.value)}
                  max={selectedItem.unitPrice || 0}
                />
                <p className="text-[10px] text-muted-foreground">
                  Max possible: {formatCurrency(selectedItem.unitPrice || 0)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Return Note / Reason
              </label>
              <Textarea
                placeholder="Why is this being returned?"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={processing || !selectedItemId || !returnAmount || !returnNote}
              onClick={handleProcessReturn}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
