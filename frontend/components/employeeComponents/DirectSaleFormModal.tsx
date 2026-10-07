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
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import OnlinePaymentFields, {
  EMPTY_ONLINE_PAYMENT,
  FeeQuote,
  OnlinePaymentDetails,
  onlinePaymentComplete,
} from '@/components/payments/OnlinePaymentFields';
import { toast } from 'sonner';
import { Product } from '@/lib/product';
import { SparePart } from '@/lib/spare-part';
import { Invoice } from '@/lib/invoice';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { formatCurrency, autoReferencePreview } from '@/lib/format';
import CustomerFormDialog from './CustomerFormDialog';
import { createCustomer, CreateCustomerData } from '@/lib/customer';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customerType?: 'B2B' | 'B2C';
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
  wholesalePrice?: number;
  retailPrice?: number;
}

export default function DirectSaleFormModal({ onClose, onSuccess }: DirectSaleFormModalProps) {
  const currency = useBranchCurrency();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  // B2B → wholesale_price, B2C → sale_price/base_price — same tiers and same
  // reasoning as the Quotation form's Transaction Type selector.
  const [transactionType, setTransactionType] = useState<'B2B' | 'B2C'>('B2C');

  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  // ONLINE_PAYMENT only. `cardDetails` never holds a PAN — OnlinePaymentFields derives
  // the last four locally and discards the number.
  const [cardDetails, setCardDetails] = useState<OnlinePaymentDetails>(EMPTY_ONLINE_PAYMENT);
  const [cardQuote, setCardQuote] = useState<FeeQuote | null>(null);
  const [, setCardQuoteError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Warranty states (for product sales) — business default: 2 years + 100,000 copies.
  const [warrantyType, setWarrantyType] = useState<'none' | 'duration' | 'copies' | 'both'>('both');
  const [warrantyDurationValue, setWarrantyDurationValue] = useState('2');
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<'months' | 'years'>('years');
  const [warrantyCopyLimit, setWarrantyCopyLimit] = useState('200000');

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

  const handleCreateCustomer = async (data: Partial<CreateCustomerData>) => {
    try {
      const newCustomer = await createCustomer({ ...data, name: data.name! });
      setCustomers((prev) => [...prev, newCustomer]);
      setCustomerId(newCustomer.id);
      setTransactionType(newCustomer.customerType === 'B2B' ? 'B2B' : 'B2C');
      setAddCustomerOpen(false);
      toast.success('Customer created successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const fetchSparePartStock = async (spId: string) => {
    try {
      const res = await api.get(`/i/spareparts/${spId}/stock`);
      const stockData = res.data.data || res.data;
      setSparePartStocks((prev) => ({ ...prev, [spId]: stockData }));
    } catch (err) {
      console.error('Failed to fetch spare part stock:', err);
    }
  };

  /**
   * Units already on the sale, keyed by product/spare-part id.
   *
   * Feeds ProductSelect so an item already in the cart is shown as "Already added" and
   * greyed out — the Quotation form has always done this; Direct Sale never passed it,
   * so nothing on screen distinguished the unit you had just picked from the rest of an
   * identical-looking list.
   */
  const selectedQuantities = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) {
      const id = it.itemType === 'PRODUCT' ? it.productId : it.sparePartId;
      if (id) map[id] = (map[id] || 0) + (it.itemType === 'PRODUCT' ? 1 : it.quantity);
    }
    return map;
  }, [items]);

  const handleAddItem = async (selected: SelectableItem) => {
    const isSparePart = 'part_name' in selected;

    // A serialized machine is one physical unit — it cannot be on the sale twice. The
    // database enforces this too (unique index on active allocations), but only after
    // submit, as a 500; refusing it here keeps the cart honest while it is being built.
    if (!isSparePart && items.some((it) => it.productId === selected.id)) {
      toast.error('That machine is already on this sale', {
        description: 'Each serial number can only be sold once — pick a different unit.',
      });
      return;
    }
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
      const retailPrice = Number(sp.base_price) || 0;
      const wholesalePrice = Number(sp.wholesale_price) || 0;
      unitPrice = transactionType === 'B2B' && wholesalePrice > 0 ? wholesalePrice : retailPrice;

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
          wholesalePrice,
          retailPrice,
        },
      ]);
    } else {
      const pr = selected as Product;
      description = pr.name || '';
      const retailPrice = pr.sale_price || 0;
      const wholesalePrice = pr.wholesale_price || 0;
      unitPrice = transactionType === 'B2B' && wholesalePrice > 0 ? wholesalePrice : retailPrice;

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
          wholesalePrice,
          retailPrice,
        },
      ]);
    }
  };

  // When Transaction Type is switched after items are already in the cart, reprice
  // every item to its matching tier — same behavior as the Quotation form. Direct
  // Sale has no manual/custom line-item concept (every item comes from the catalog
  // via handleAddItem or barcode scan), so this applies unconditionally.
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const newPrice =
          transactionType === 'B2B' && (item.wholesalePrice ?? 0) > 0
            ? item.wholesalePrice!
            : (item.retailPrice ?? item.unitPrice);
        return { ...item, unitPrice: newPrice, discount: 0 };
      }),
    );
  }, [transactionType]);

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
      toast.warning(
        `Maximum discount allowed for ${item.description} is ${currency} ${maxAllowed}`,
      );
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
      // Tax on the discounted price — must match backend calculation.
      const itemTax = itemSubtotal * (taxRate / 100);
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
          `Discount for ${item.description} cannot exceed max discount ${currency} ${item.maxDiscount || 0}`,
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

    // A payment mode with no amount collects nothing. The sale still saves — it just
    // saves as fully outstanding, with no receipt for Accounts to approve, which looks
    // exactly like a payment that vanished. Catch it here: whoever picked a card and
    // keyed in its details plainly meant to take money.
    if (paymentAmount <= 0 && (paymentMode !== 'CASH' || paymentReference)) {
      return toast.error(
        `You selected ${paymentMode === 'ONLINE_PAYMENT' ? 'Online Payment' : paymentMode.replace('_', ' ').toLowerCase()} but left Amount Paid empty. ` +
          'Enter the amount being collected, or switch the mode back to Cash to save this sale as unpaid.',
      );
    }

    // Card payments need their issuer facts before they can be priced or posted. This
    // mirrors the server's own validation so the salesperson is told here rather than
    // after a failed round-trip.
    if (paymentAmount > 0 && paymentMode === 'ONLINE_PAYMENT') {
      if (!onlinePaymentComplete(cardDetails)) {
        return toast.error(
          'Complete the card details: payment type, issuing bank, network, card holder and the last 4 digits.',
        );
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
        // Card facts only. The commission is deliberately NOT sent: the server
        // recomputes it from the configured agreement and ignores anything we claim.
        ...(paymentAmount > 0 && paymentMode === 'ONLINE_PAYMENT'
          ? {
              cardType: cardDetails.cardType,
              cardNetwork: cardDetails.cardNetwork,
              issuerCountry: cardDetails.issuerCountry,
              issuerBank: cardDetails.issuerBank,
              cardLast4: cardDetails.cardLast4,
              cardHolderName: cardDetails.cardHolderName.trim(),
              transactionReference: cardDetails.transactionReference || undefined,
            }
          : {}),
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

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSendEmail = async () => {
    if (!successInvoice) return;
    if (!notifyEmail) return toast.error('Please enter a recipient email.');
    setNotifyingEmail(true);
    try {
      const pdfRes = await api.get(`/b/invoices/${successInvoice.id}/download-premium`, {
        responseType: 'blob',
      });
      const base64Data = await blobToBase64(new Blob([pdfRes.data]));

      await api.post(`/b/invoices/${successInvoice.id}/notify/email`, {
        recipient: notifyEmail,
        subject: `Your Invoice ${successInvoice.invoiceNumber || ''} from Xerocare`,
        body: `Dear Customer, please find your invoice ${successInvoice.invoiceNumber || ''} details below.\nGrand Total: ${currency} ${successInvoice.totalAmount || 0}`,
        attachments: [
          {
            filename: `Invoice-${successInvoice.invoiceNumber || successInvoice.id}.pdf`,
            content: base64Data,
            encoding: 'base64',
          },
        ],
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
        body: `Dear Customer, here is your invoice ${successInvoice.invoiceNumber || ''} from Xerocare. Grand Total: ${currency} ${successInvoice.totalAmount || 0}`,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fadeIn">
        <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-2xl overflow-y-auto border border-border p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success mb-2">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h2 className="text-xl sm:text-2xl font-medium text-foreground">
              Sale Completed Successfully!
            </h2>
            <p className="text-sm text-muted-foreground">
              Invoice has been generated and recorded.
            </p>
          </div>

          <div className="bg-muted rounded-xl p-5 border border-border space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Invoice Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-foreground">
              <div>
                <span className="font-semibold text-muted-foreground">Invoice Number:</span>
                <p className="font-bold text-foreground">{successInvoice.invoiceNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Grand Total:</span>
                <p className="font-bold text-success">
                  {formatCurrency(successInvoice.totalAmount || grandTotal, currency)}
                </p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Customer:</span>
                <p className="font-bold text-foreground">
                  {customers.find((c) => c.id === customerId)?.name || 'Walk-in'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Payment Status:</span>
                <p className="font-bold text-primary">{successInvoice.status || 'PAID'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-foreground">Share & Download</h3>

            <Button
              onClick={handleDownloadPDF}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
            >
              <Download size={18} />
              Download PDF Invoice
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 border border-border rounded-xl p-4 bg-muted/50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Email Recipient
                  </label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={notifyingEmail}
                  className="w-full mt-3 bg-foreground hover:bg-foreground text-primary-foreground rounded-lg h-9 text-xs flex items-center justify-center gap-2"
                >
                  {notifyingEmail ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send via Email
                </Button>
              </div>

              <div className="space-y-2 border border-border rounded-xl p-4 bg-muted/50 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder="+974xxxxxxxx"
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  onClick={handleSendWhatsapp}
                  disabled={notifyingWhatsapp}
                  className="w-full mt-3 bg-success hover:bg-success/90 text-success-foreground rounded-lg h-9 text-xs flex items-center justify-center gap-2"
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
              className="bg-foreground hover:bg-foreground text-primary-foreground px-6 rounded-lg h-10"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fadeIn">
      <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-6xl max-h-[calc(100dvh-2rem)] overflow-y-auto border border-border">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-foreground">New Direct Sale</h2>
            <p className="text-sm text-muted-foreground">
              Create a final invoice bypassing quotation
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Customer Selection */}
          <div className="bg-muted p-5 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
              Customer Details
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={customerOptions}
                  value={customerId}
                  onValueChange={(id) => {
                    setCustomerId(id);
                    // Pre-fill transaction type from the customer's stored default, same
                    // as the Quotation form — still freely overridable below.
                    const selected = customers.find((c) => c.id === id);
                    setTransactionType(selected?.customerType === 'B2B' ? 'B2B' : 'B2C');
                  }}
                  placeholder="Search and select customer..."
                  className="rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddCustomerOpen(true)}
                className="rounded-lg border-border gap-1.5 shrink-0"
              >
                <Plus size={16} />
                New Customer
              </Button>
            </div>
          </div>

          {/* Transaction Type — B2B uses wholesale_price, B2C uses sale_price/base_price */}
          <div className="bg-muted p-5 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
              Transaction Type
            </h3>
            <Select
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as 'B2B' | 'B2C')}
            >
              <SelectTrigger className="rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B2C">B2C — Business to Customer (Retail Price)</SelectItem>
                <SelectItem value="B2B">B2B — Business to Business (Wholesale Price)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Selection & Barcode Scanner */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Items (Products & Spare Parts)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Search Catalog
                </label>
                <ProductSelect
                  onSelect={handleAddItem}
                  mode="BOTH"
                  selectedQuantities={selectedQuantities}
                  placeholder="Search by name, model or serial — add as many as you need"
                  className="rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Barcode / Serial Scanner
                </label>
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Scan/Type barcode (XC-P-{serial} or XC-S-{sku})"
                      className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      disabled={barcodeLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={barcodeLoading || !barcodeInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-[38px] text-xs font-bold px-4"
                  >
                    {barcodeLoading ? 'Scanning...' : 'Scan'}
                  </Button>
                </form>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted border-b border-border text-foreground">
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
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => {
                      const itemSubtotal = (item.unitPrice - item.discount) * item.quantity;
                      const itemTax = itemSubtotal * ((item.taxRate || 0) / 100);
                      const itemTotal = itemSubtotal + itemTax;

                      return (
                        <tr key={item.key} className="bg-card hover:bg-muted">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground line-clamp-2">
                              {item.description}
                            </p>
                            {/* Warehouse stocks display for spare parts */}
                            {item.itemType === 'SPARE_PART' &&
                              item.sparePartId &&
                              sparePartStocks[item.sparePartId] && (
                                <div className="mt-1.5 text-[10px] text-muted-foreground bg-muted border border-border p-2 rounded-lg space-y-1">
                                  <div className="font-bold flex items-center gap-1 text-foreground">
                                    <Warehouse size={12} className="text-primary" /> Stock by
                                    Warehouse (Total: {sparePartStocks[item.sparePartId].totalStock}
                                    ):
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-3 font-medium">
                                    {sparePartStocks[item.sparePartId].warehouseStock?.map(
                                      (w, wIdx) => (
                                        <div key={wIdx}>
                                          <span className="text-muted-foreground">{w.name}:</span>{' '}
                                          <span className="text-foreground font-bold">
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
                              className={`px-2 py-1 rounded-md whitespace-nowrap ${item.itemType === 'PRODUCT' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-info/10 text-info border border-info/30'}`}
                            >
                              {item.itemType === 'PRODUCT' ? 'Product' : 'Spare Part'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.itemType === 'PRODUCT' ? (
                              <select
                                className="w-full border border-border rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-card"
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
                                {availableProducts[item.key]
                                  ?.filter(
                                    // Hide serials already taken by another line. Two rows
                                    // pointing at one machine passes the form but fails at
                                    // the database's unique active-allocation index, so it
                                    // must not be selectable in the first place.
                                    (p) =>
                                      p.serial_no === item.serialNumber ||
                                      !items.some(
                                        (other) =>
                                          other.key !== item.key &&
                                          other.itemType === 'PRODUCT' &&
                                          other.serialNumber === p.serial_no,
                                      ),
                                  )
                                  .map((p) => (
                                    <option key={p.id} value={p.serial_no}>
                                      {p.serial_no}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <span className="text-foreground font-medium px-2 bg-muted border border-border rounded-md text-xs py-1 select-all font-mono">
                                {item.sku || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.itemType === 'PRODUCT' ? (
                              <input
                                type="number"
                                disabled
                                className="w-full border border-border rounded-lg bg-muted text-muted-foreground text-sm px-2 py-1 cursor-not-allowed text-center"
                                value={item.quantity}
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                            ) : (
                              <input
                                type="number"
                                min="1"
                                className="w-full border border-border rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full border border-border rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full border border-border rounded-lg text-sm px-2 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              value={item.discount}
                              onChange={(e) => handleDiscountChange(idx, Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder={`Max: ${item.maxDiscount || 0}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              disabled
                              className="w-full border border-border rounded-lg bg-muted text-muted-foreground text-sm px-2 py-1 cursor-not-allowed text-center"
                              value={item.taxRate || 0}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {formatCurrency(itemTotal, currency)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="text-destructive hover:text-destructive p-1"
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
          <div className="bg-muted p-5 rounded-xl border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <CreditCard size={16} className="text-success" />
              Immediate Payment (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Amount Paid ({currency})
                </label>
                <input
                  type="number"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Payment Mode
                </label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-card"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE_PAYMENT">Online Payment (Card)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {paymentMode === 'CHEQUE' ? 'Cheque Number' : 'Reference Number'}
                </label>
                {paymentMode === 'CHEQUE' ? (
                  <input
                    type="text"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g., CHQ-001234"
                  />
                ) : (
                  <div className="w-full h-9 flex items-center border border-dashed border-border rounded-lg px-3 text-sm text-muted-foreground italic bg-muted">
                    Auto-generated on save — {autoReferencePreview(paymentMode)}
                  </div>
                )}
              </div>
            </div>

            {/* Shown as soon as the mode is chosen. Gating this on an amount too meant
                picking "Online Payment" appeared to do nothing until a figure was typed,
                which is the wrong order — the card is in hand before the amount is. The
                fee quote inside still waits for an amount, since it cannot be priced
                without one. */}
            {paymentMode === 'ONLINE_PAYMENT' && (
              <OnlinePaymentFields
                value={cardDetails}
                onChange={setCardDetails}
                amount={paymentAmount}
                currency={currency}
                onQuoteChange={(q, err) => {
                  setCardQuote(q);
                  setCardQuoteError(err);
                }}
              />
            )}

            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <div className="flex justify-between items-center text-sm text-foreground">
                <span>Total (Without Tax):</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-foreground">
                <span>Tax Amount:</span>
                <span className="font-medium">{formatCurrency(taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-foreground">
                <span>Grand Total (With Tax):</span>
                <span>{formatCurrency(grandTotal, currency)}</span>
              </div>
              {paymentMode === 'ONLINE_PAYMENT' && cardQuote && paymentAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-muted-foreground pt-1 border-t border-dashed border-border">
                    <span>Card Processing Fee ({cardQuote.ratePercentApplied}%):</span>
                    <span className="font-medium text-destructive">
                      − {formatCurrency(cardQuote.commissionAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-foreground">
                    <span>Merchant Net Settlement:</span>
                    <span className="font-semibold text-success">
                      {formatCurrency(cardQuote.netSettlementAmount, currency)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-sm text-muted-foreground pt-1 border-t border-dashed border-border">
                <span>Pending Balance:</span>
                <span
                  className={`font-bold ${grandTotal - paymentAmount <= 0 ? 'text-success' : 'text-warning'}`}
                >
                  {formatCurrency(Math.max(0, grandTotal - paymentAmount), currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Warranty Section — shown when at least one PRODUCT item */}
          {items.some((it) => it.itemType === 'PRODUCT') && (
            <div className="bg-warning/10 p-5 rounded-xl border border-warning/30 space-y-4">
              <h3 className="text-sm font-semibold text-warning uppercase tracking-wide flex items-center gap-2">
                Warranty Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Warranty Type
                  </label>
                  <select
                    className="w-full border border-warning/30 rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:border-warning/30"
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
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Duration Value
                      </label>
                      <input
                        type="number"
                        className="w-full border border-warning/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-warning/30"
                        placeholder="e.g. 12"
                        value={warrantyDurationValue}
                        onChange={(e) => setWarrantyDurationValue(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Unit
                      </label>
                      <select
                        className="w-full border border-warning/30 rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:border-warning/30"
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
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Warranty Copy Limit (Total)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-warning/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-warning/30"
                      placeholder="e.g. 100000"
                      value={warrantyCopyLimit}
                      onChange={(e) => setWarrantyCopyLimit(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes / Remarks
            </label>
            <textarea
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="bg-success hover:bg-success/90 text-success-foreground rounded-lg font-bold"
          >
            {loading ? 'Processing...' : 'Complete Direct Sale'}
          </Button>
        </div>
      </div>

      <CustomerFormDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        customer={null}
        onSubmit={handleCreateCustomer}
      />
    </div>
  );
}
