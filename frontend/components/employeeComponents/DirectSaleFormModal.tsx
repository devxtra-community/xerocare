import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Download,
  Send,
  Barcode,
  Warehouse,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { SearchableSelect } from '@/components/ui/searchable-select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Product } from '@/lib/product';
import { SparePart } from '@/lib/spare-part';
import { Invoice } from '@/lib/invoice';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface DirectSaleFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  allBrands: unknown[];
  allModels: unknown[];
}

interface SaleItem {
  key: string;
  itemType: 'PRODUCT' | 'SPARE_PART';
  productId?: string;
  sparePartId?: string;
  serialNumber?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  description: string;
  discount: number;
  modelId?: string;
  taxRate?: number;
  maxDiscount?: number;
}

export default function DirectSaleFormModal({ onClose, onSuccess }: DirectSaleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');

  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  // Warranty states (for product sales)
  const [warrantyType, setWarrantyType] = useState<'none' | 'duration' | 'copies' | 'both'>('none');
  const [warrantyDurationValue, setWarrantyDurationValue] = useState('');
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<'months' | 'years'>('months');
  const [warrantyCopyLimit, setWarrantyCopyLimit] = useState('');

  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});
  const [sparePartStocks, setSparePartStocks] = useState<
    Record<
      string,
      {
        totalStock: number;
        warehouseStock: Array<{ name: string; quantity: number }>;
      }
    >
  >({});

  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  // Success Screen States
  const [successInvoice, setSuccessInvoice] = useState<Invoice | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifyingEmail, setNotifyingEmail] = useState(false);
  const [notifyingWhatsapp, setNotifyingWhatsapp] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/c/customers?limit=1000');
        setCustomers(res.data.data?.data || res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    fetchCustomers();
  }, []);

  const fetchSparePartStock = async (spId: string) => {
    try {
      const res = await api.get(`/i/spareparts/${spId}/stock`);
      const stockData = res.data.data || res.data;
      setSparePartStocks((prev) => ({ ...prev, [spId]: stockData }));
    } catch (err) {
      console.error('Failed to fetch spare part stock:', err);
    }
  };

  const handleAddItem = async (selected: SelectableItem) => {
    const isSparePart = 'part_name' in selected;
    let description = '';
    let unitPrice = 0;
    const itemKey = Math.random().toString(36).substring(2, 9);

    if (isSparePart) {
      const sp = selected as SparePart & {
        item_code?: string;
        tax_rate?: string | number;
        max_discount_amount?: string | number;
      };
      description = sp.part_name || '';
      unitPrice = Number(sp.base_price) || 0;

      // Fetch stock for spare part
      fetchSparePartStock(sp.id);

      setItems((prev) => [
        ...prev,
        {
          key: itemKey,
          itemType: 'SPARE_PART',
          sparePartId: sp.id,
          description: description || 'Spare Part',
          quantity: 1,
          unitPrice,
          discount: 0,
          sku: sp.sku || sp.item_code || '',
          taxRate: Number(sp.tax_rate) || 0,
          maxDiscount: Number(sp.max_discount_amount) || 0,
        },
      ]);
    } else {
      const pr = selected as Product;
      description = pr.name || '';
      unitPrice = pr.sale_price || 0;

      // Fetch available serials/products for this model ID
      try {
        if (pr.model?.id) {
          const res = await api.get(
            `/i/products?modelId=${pr.model.id}&status=AVAILABLE&limit=1000`,
          );
          const products: Product[] = res.data.data?.data || res.data.data || [];
          if (!products.some((p) => p.id === pr.id)) {
            products.unshift(pr);
          }
          setAvailableProducts((prev) => ({ ...prev, [itemKey]: products }));
        }
      } catch {
        // ignore error
      }

      setItems((prev) => [
        ...prev,
        {
          key: itemKey,
          itemType: 'PRODUCT',
          productId: pr.id,
          description: description || 'Product',
          quantity: 1,
          unitPrice,
          discount: 0,
          serialNumber: pr.serial_no || '',
          modelId: pr.model?.id,
          taxRate: Number(pr.tax_rate) || 0,
          maxDiscount: Number(pr.max_discount_amount) || 0,
        },
      ]);
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setBarcodeLoading(true);
    try {
      if (code.startsWith('XC-P-')) {
        const serial = code.replace('XC-P-', '');
        const res = await api.get(`/i/products?serialNo=${serial}`);
        const products = res.data.data?.data || res.data.data || [];
        if (products.length === 0) {
          toast.error(`Product with serial "${serial}" not found.`);
          return;
        }
        const pr = products[0];
        if (pr.product_status !== 'AVAILABLE') {
          toast.error(
            `Product ${pr.name} (SN: ${serial}) is not AVAILABLE (Status: ${pr.product_status}).`,
          );
          return;
        }
        handleAddItem(pr);
        setBarcodeInput('');
        toast.success(`Product ${pr.name} (SN: ${serial}) added.`);
      } else if (code.startsWith('XC-S-')) {
        const sku = code.replace('XC-S-', '');
        const res = await api.get(`/i/spare-parts?sku=${sku}`);
        const spares = res.data.data?.data || res.data.data || [];
        if (spares.length === 0) {
          toast.error(`Spare part with SKU "${sku}" not found.`);
          return;
        }
        const sp = spares[0];
        handleAddItem(sp);
        setBarcodeInput('');
        toast.success(`Spare part ${sp.part_name} added.`);
      } else {
        // Fallback search
        const resProd = await api.get(`/i/products?serialNo=${code}`);
        const products = resProd.data.data?.data || resProd.data.data || [];
        if (products.length > 0) {
          const pr = products[0];
          if (pr.product_status === 'AVAILABLE') {
            handleAddItem(pr);
            setBarcodeInput('');
            toast.success(`Product ${pr.name} (SN: ${code}) added.`);
            return;
          }
        }

        const resSpare = await api.get(`/i/spare-parts?sku=${code}`);
        const spares = resSpare.data.data?.data || resSpare.data.data || [];
        if (spares.length > 0) {
          handleAddItem(spares[0]);
          setBarcodeInput('');
          toast.success(`Spare part ${spares[0].part_name} added.`);
          return;
        }

        toast.error('Could not find item with serial or SKU matching scanned barcode.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to query barcode scan');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = <K extends keyof SaleItem>(idx: number, field: K, value: SaleItem[K]) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    const item = items[idx];
    if (item.itemType === 'SPARE_PART' && item.sparePartId) {
      const stock = sparePartStocks[item.sparePartId];
      if (stock) {
        if (qty > stock.totalStock) {
          toast.warning(`Quantity capped to maximum available stock: ${stock.totalStock}`);
          qty = stock.totalStock;
        } else if (qty >= stock.totalStock * 0.8) {
          toast.warning(
            `Low Stock Warning: Requested ${qty} out of ${stock.totalStock} available.`,
          );
        }
      }
    }
    updateItem(idx, 'quantity', qty);
  };

  const handleDiscountChange = (idx: number, val: number) => {
    const item = items[idx];
    const maxAllowed = item.maxDiscount || 0;
    if (val > maxAllowed) {
      toast.warning(`Maximum discount allowed for ${item.description} is QAR ${maxAllowed}`);
      updateItem(idx, 'discount', maxAllowed);
    } else {
      updateItem(idx, 'discount', val);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach((item) => {
      const quantity = item.quantity || 1;
      const discount = item.discount || 0;
      const itemSubtotal = (item.unitPrice - discount) * quantity;
      const taxRate = item.taxRate || 0;
      const itemTax = item.unitPrice * (taxRate / 100) * quantity;
      subtotal += itemSubtotal;
      taxTotal += itemTax;
    });
    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal,
    };
  };

  const handleSubmit = async () => {
    if (!customerId) return toast.error('Please select a customer');
    if (items.length === 0) return toast.error('Please add at least one item');

    // Validations
    for (const item of items) {
      if (item.itemType === 'PRODUCT' && !item.serialNumber) {
        return toast.error(`Please provide a serial number for ${item.description}`);
      }
      if (item.itemType === 'SPARE_PART' && item.quantity <= 0) {
        return toast.error(`Quantity must be > 0 for ${item.description}`);
      }
      if (item.discount > (item.maxDiscount || 0)) {
        return toast.error(
          `Discount for ${item.description} cannot exceed max discount QAR ${item.maxDiscount || 0}`,
        );
      }
      if (item.itemType === 'SPARE_PART' && item.sparePartId) {
        const stock = sparePartStocks[item.sparePartId];
        if (stock && item.quantity > stock.totalStock) {
          return toast.error(
            `Quantity for ${item.description} exceeds total available stock (${stock.totalStock}).`,
          );
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        customerId,
        saleType: 'DIRECT',
        items: items.map((it) => ({
          ...it,
          taxRate: it.taxRate || 0,
        })),
        paymentAmount: Number(paymentAmount) || 0,
        paymentMode: paymentAmount > 0 ? paymentMode : undefined,
        paymentReference: paymentAmount > 0 ? paymentReference : undefined,
        notes,
        // Warranty fields (only when at least one PRODUCT item)
        ...(items.some((it) => it.itemType === 'PRODUCT') && {
          warrantyType,
          warrantyDurationValue:
            (warrantyType === 'duration' || warrantyType === 'both') && warrantyDurationValue
              ? Number(warrantyDurationValue)
              : undefined,
          warrantyDurationUnit:
            warrantyType === 'duration' || warrantyType === 'both'
              ? warrantyDurationUnit
              : undefined,
          warrantyCopyLimit:
            (warrantyType === 'copies' || warrantyType === 'both') && warrantyCopyLimit
              ? Number(warrantyCopyLimit)
              : undefined,
        }),
      };

      const res = await api.post('/b/invoices/direct-sale', payload);
      const createdInvoice = res.data.data || res.data;
      setSuccessInvoice(createdInvoice);

      // Pre-fill customer notifications info
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        setNotifyEmail(cust.email || '');
        setNotifyPhone(cust.phone || '');
      }

      toast.success('Direct sale created successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create direct sale');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!successInvoice) return;
    try {
      const response = await api.get(`/b/invoices/${successInvoice.id}/download-premium`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Invoice-${successInvoice.invoiceNumber || successInvoice.id}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice PDF downloaded successfully.');
    } catch {
      toast.error('Failed to download invoice PDF.');
    }
  };

  const handleSendEmail = async () => {
    if (!successInvoice) return;
    if (!notifyEmail) return toast.error('Please enter a recipient email.');
    setNotifyingEmail(true);
    try {
      await api.post(`/b/invoices/${successInvoice.id}/notify/email`, {
        recipient: notifyEmail,
        subject: `Your Invoice ${successInvoice.invoiceNumber || ''} from Xerocare`,
        body: `Dear Customer, please find your invoice ${successInvoice.invoiceNumber || ''} details below.\nGrand Total: QAR ${successInvoice.totalAmount || 0}`,
      });
      toast.success('Email notification sent successfully!');
    } catch {
      toast.error('Failed to send email notification.');
    } finally {
      setNotifyingEmail(false);
    }
  };

  const handleSendWhatsapp = async () => {
    if (!successInvoice) return;
    if (!notifyPhone) return toast.error('Please enter a recipient phone number.');
    setNotifyingWhatsapp(true);
    try {
      await api.post(`/b/invoices/${successInvoice.id}/notify/whatsapp`, {
        recipient: notifyPhone,
        body: `Dear Customer, here is your invoice ${successInvoice.invoiceNumber || ''} from Xerocare. Grand Total: QAR ${successInvoice.totalAmount || 0}`,
      });
      toast.success('WhatsApp notification sent successfully!');
    } catch {
      toast.error('Failed to send WhatsApp notification.');
    } finally {
      setNotifyingWhatsapp(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.email,
  }));

  const { subtotal, taxTotal, grandTotal } = calculateTotals();

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (successInvoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-y-auto border border-slate-200 p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-600 mb-2">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Sale Completed Successfully!</h2>
            <p className="text-sm text-slate-500">Invoice has been generated and recorded.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Invoice Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div>
                <span className="font-semibold text-slate-500">Invoice Number:</span>
                <p className="font-bold text-slate-900">{successInvoice.invoiceNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Grand Total:</span>
                <p className="font-bold text-green-600">
                  QAR{' '}
                  {(successInvoice.totalAmount || grandTotal).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Customer:</span>
                <p className="font-bold text-slate-900">
                  {customers.find((c) => c.id === customerId)?.name || 'Walk-in'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Payment Status:</span>
                <p className="font-bold text-blue-600">{successInvoice.status || 'PAID'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Share & Download</h3>

            <Button
              onClick={handleDownloadPDF}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
            >
              <Download size={18} />
              Download PDF Invoice
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Email Recipient
                  </label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={notifyingEmail}
                  className="w-full mt-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg h-9 text-xs flex items-center justify-center gap-2"
                >
                  {notifyingEmail ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send via Email
                </Button>
              </div>

              <div className="space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder="+974xxxxxxxx"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <Button
                  onClick={handleSendWhatsapp}
                  disabled={notifyingWhatsapp}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white rounded-lg h-9 text-xs flex items-center justify-center gap-2"
                >
                  {notifyingWhatsapp ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send via WhatsApp
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={() => {
                onSuccess();
              }}
              className="bg-black hover:bg-slate-800 text-white px-6 rounded-lg h-10"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM SCREEN ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">New Direct Sale</h2>
            <p className="text-sm text-slate-500">Create a final invoice bypassing quotation</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 transition-colors rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Customer Selection */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              Customer Details
            </h3>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Search and select customer..."
              className="rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Item Selection & Barcode Scanner */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500" />
              Items (Products & Spare Parts)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Search Catalog
                </label>
                <ProductSelect
                  onSelect={handleAddItem}
                  mode="BOTH"
                  placeholder="Search product or spare part..."
                  className="rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Barcode / Serial Scanner
                </label>
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Scan/Type barcode (XC-P-{serial} or XC-S-{sku})"
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      disabled={barcodeLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={barcodeLoading || !barcodeInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-[38px] text-xs font-bold px-4"
                  >
                    {barcodeLoading ? 'Scanning...' : 'Scan'}
                  </Button>
                </form>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold w-24">Type</th>
                      <th className="px-4 py-3 font-semibold w-40">Serial / SKU</th>
                      <th className="px-4 py-3 font-semibold w-24">Qty</th>
                      <th className="px-4 py-3 font-semibold w-28">Unit Price</th>
                      <th className="px-4 py-3 font-semibold w-24">Discount</th>
                      <th className="px-4 py-3 font-semibold w-20">Tax (%)</th>
                      <th className="px-4 py-3 font-semibold w-28">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, idx) => {
                      const itemSubtotal = (item.unitPrice - item.discount) * item.quantity;
                      const itemTax = item.unitPrice * ((item.taxRate || 0) / 100) * item.quantity;
                      const itemTotal = itemSubtotal + itemTax;

                      return (
                        <tr key={item.key} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 line-clamp-2">
                              {item.description}
                            </p>
                            {/* Warehouse stocks display for spare parts */}
                            {item.itemType === 'SPARE_PART' &&
                              item.sparePartId &&
                              sparePartStocks[item.sparePartId] && (
                                <div className="mt-1.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg space-y-1">
                                  <div className="font-bold flex items-center gap-1 text-slate-700">
                                    <Warehouse size={12} className="text-blue-500" /> Stock by
                                    Warehouse (Total: {sparePartStocks[item.sparePartId].totalStock}
                                    ):
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-3 font-medium">
                                    {sparePartStocks[item.sparePartId].warehouseStock?.map(
                                      (w, wIdx) => (
                                        <div key={wIdx}>
                                          <span className="text-slate-500">{w.name}:</span>{' '}
                                          <span className="text-slate-800 font-bold">
                                            {w.quantity}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">
                            <span
                              className={`px-2 py-1 rounded-md whitespace-nowrap ${item.itemType === 'PRODUCT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}
                            >
                              {item.itemType === 'PRODUCT' ? 'Product' : 'Spare Part'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.itemType === 'PRODUCT' ? (
                              <select
                                className="w-full border border-slate-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
                                value={item.serialNumber || ''}
                                onChange={(e) => {
                                  const selectedSerial = e.target.value;
                                  const matchingProduct = availableProducts[item.key]?.find(
                                    (p) => p.serial_no === selectedSerial,
                                  );
                                  if (matchingProduct) {
                                    const newItems = [...items];
                                    newItems[idx] = {
                                      ...newItems[idx],
                                      serialNumber: selectedSerial,
                                      productId: matchingProduct.id,
                                      modelId:
                                        (matchingProduct as Product & { model_id?: string })
                                          .model_id || matchingProduct.model?.id,
                                      taxRate: Number(matchingProduct.tax_rate) || 0,
                                      maxDiscount: Number(matchingProduct.max_discount_amount) || 0,
                                    };
                                    setItems(newItems);
                                  } else {
                                    updateItem(idx, 'serialNumber', selectedSerial);
                                  }
                                }}
                              >
                                <option value="">Select Serial</option>
                                {availableProducts[item.key]?.map((p) => (
                                  <option key={p.id} value={p.serial_no}>
                                    {p.serial_no}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-700 font-medium px-2 bg-slate-100 border border-slate-200 rounded-md text-xs py-1 select-all font-mono">
                                {item.sku || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.itemType === 'PRODUCT' ? (
                              <input
                                type="number"
                                disabled
                                className="w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm px-2 py-1 cursor-not-allowed text-center"
                                value={item.quantity}
                              />
                            ) : (
                              <input
                                type="number"
                                min="1"
                                className="w-full border border-slate-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-center"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full border border-slate-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full border border-slate-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              value={item.discount}
                              onChange={(e) => handleDiscountChange(idx, Number(e.target.value))}
                              placeholder={`Max: ${item.maxDiscount || 0}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              disabled
                              className="w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm px-2 py-1 cursor-not-allowed text-center"
                              value={item.taxRate || 0}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            QAR{' '}
                            {itemTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <CreditCard size={16} className="text-green-600" />
              Immediate Payment (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount Paid (QAR)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Mode
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Txn ID, Cheque No..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Total (Without Tax):</span>
                <span className="font-medium">
                  QAR{' '}
                  {subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Tax Amount:</span>
                <span className="font-medium">
                  QAR{' '}
                  {taxTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-slate-800">
                <span>Grand Total (With Tax):</span>
                <span>
                  QAR{' '}
                  {grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-500 pt-1 border-t border-dashed border-slate-200">
                <span>Pending Balance:</span>
                <span
                  className={`font-bold ${grandTotal - paymentAmount <= 0 ? 'text-green-600' : 'text-orange-600'}`}
                >
                  QAR{' '}
                  {Math.max(0, grandTotal - paymentAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Warranty Section — shown when at least one PRODUCT item */}
          {items.some((it) => it.itemType === 'PRODUCT') && (
            <div className="bg-amber-50/20 p-5 rounded-xl border border-amber-100 space-y-4">
              <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-2">
                Warranty Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Warranty Type
                  </label>
                  <select
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-400"
                    value={warrantyType}
                    onChange={(e) =>
                      setWarrantyType(e.target.value as 'none' | 'duration' | 'copies' | 'both')
                    }
                  >
                    <option value="none">No Warranty</option>
                    <option value="duration">By Duration (Time-based)</option>
                    <option value="copies">By Count of Copies</option>
                    <option value="both">Both (Duration &amp; Copies, whichever first)</option>
                  </select>
                </div>

                {(warrantyType === 'duration' || warrantyType === 'both') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Duration Value
                      </label>
                      <input
                        type="number"
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        placeholder="e.g. 12"
                        value={warrantyDurationValue}
                        onChange={(e) => setWarrantyDurationValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Unit
                      </label>
                      <select
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-400"
                        value={warrantyDurationUnit}
                        onChange={(e) =>
                          setWarrantyDurationUnit(e.target.value as 'months' | 'years')
                        }
                      >
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>
                )}

                {(warrantyType === 'copies' || warrantyType === 'both') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Warranty Copy Limit (Total)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                      placeholder="e.g. 100000"
                      value={warrantyCopyLimit}
                      onChange={(e) => setWarrantyCopyLimit(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Notes / Remarks
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
          >
            {loading ? 'Processing...' : 'Complete Direct Sale'}
          </Button>
        </div>
      </div>
    </div>
  );
}
