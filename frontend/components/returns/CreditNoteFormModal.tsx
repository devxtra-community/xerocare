'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getCustomers } from '@/lib/customer';
import { getCustomerById } from '@/lib/customer';
import { getInvoicesByCustomerId, getInvoiceById } from '@/services/invoiceService';
import { getProductById, Product } from '@/lib/product';
import { getSparePartById, SparePart } from '@/lib/spare-part';
import { toast } from 'sonner';
import { CreditNoteRecord, Invoice, InvoiceItem as GlobalInvoiceItem } from '@/lib/invoice';
import { Customer } from '@/lib/customer';
import {
  User,
  Mail,
  Phone,
  Package,
  Tag,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  ExternalLink,
  Loader2,
  ImageIcon,
  RotateCcw,
  CheckCircle2,
  Banknote,
  RefreshCw,
  CreditCard,
  X,
  Wrench,
  Box,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { QuotationViewDialog } from '@/components/employeeComponents/QuotationViewDialog';

interface ReturnInvoiceItem {
  id: string;
  productId?: string;
  sparePartId?: string;
  itemType?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  serialNumber?: string;
  sku?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, string | number | undefined>) => void;
  record?: CreditNoteRecord | null;
}

type ItemCategory = 'PRODUCT' | 'SPARE_PART';

/* ── helpers ── */
function truncate(str: string, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function parseProductLabel(raw: string) {
  if (!raw) return { short: 'Unknown Product', sub: '' };
  const stripped = raw.replace(/^[A-Z]+:/i, '').trim();
  const parts = stripped.split('|');
  const short = truncate(parts[0]?.trim() || stripped, 38);
  const sub = parts[1] ? truncate(parts[1].trim(), 30) : '';
  return { short, sub };
}

function getDisplayInvoiceNumber(inv: Invoice) {
  const rtn = inv.creditNotes?.find((cn) => cn.status === 'PRODUCT_REPLACED');
  if (rtn?.creditNoteNo) {
    const match = rtn.creditNoteNo.match(/(\d+)$/);
    return match
      ? `RTN-INV-${String(parseInt(match[1], 10)).padStart(4, '0')}`
      : `RTN-INV-${rtn.creditNoteNo}`;
  }
  return inv.invoiceNumber || inv.id.slice(0, 8);
}

const RETURN_TYPES = [
  {
    value: 'DIRECT_REFUND',
    label: 'Direct Refund',
    sub: 'Cash back',
    Icon: Banknote,
    base: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400',
    active: 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200',
  },
  {
    value: 'REPLACEMENT',
    label: 'Replacement',
    sub: 'Swap item',
    Icon: RefreshCw,
    base: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
    active: 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200',
  },
  {
    value: 'CREDIT_EXCHANGE',
    label: 'Credit',
    sub: 'Store credit',
    Icon: CreditCard,
    base: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400',
    active: 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-200',
  },
] as const;

/* ─────────────────────────────────── */

export default function CreditNoteFormModal({ open, onClose, onSave, record }: Props) {
  const currency = useBranchCurrency();

  // ── Category toggle ──
  const [itemCategory, setItemCategory] = useState<ItemCategory>('PRODUCT');

  // ── Shared form state ──
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnType, setReturnType] = useState<string>('DIRECT_REFUND');
  const [notes, setNotes] = useState('');
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [viewQuotation, setViewQuotation] = useState(false);

  // ── Product state ──
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ReturnInvoiceItem | null>(null);
  const [productMeta, setProductMeta] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // ── Spare part state ──
  const [selectedSparePartId, setSelectedSparePartId] = useState('');
  const [selectedSparePart, setSelectedSparePart] = useState<ReturnInvoiceItem | null>(null);
  const [sparePartMeta, setSparePartMeta] = useState<SparePart | null>(null);
  const [returnQuantity, setReturnQuantity] = useState<number>(1);

  /* ── reset ── */
  const resetForm = () => {
    setItemCategory('PRODUCT');
    setSelectedCustomer('');
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setSelectedProductId('');
    setSelectedProduct(null);
    setProductMeta(null);
    setCustomerDetails(null);
    setReturnType('DIRECT_REFUND');
    setNotes('');
    setInvoices([]);
    setViewQuotation(false);
    setSelectedSparePartId('');
    setSelectedSparePart(null);
    setSparePartMeta(null);
    setReturnQuantity(1);
  };

  const resetItemSelection = () => {
    setSelectedProductId('');
    setSelectedProduct(null);
    setProductMeta(null);
    setSelectedSparePartId('');
    setSelectedSparePart(null);
    setSparePartMeta(null);
    setReturnQuantity(1);
  };

  /* ── fetchers ── */
  const fetchCustomers = async () => {
    try {
      setCustomers(await getCustomers());
    } catch (e) {
      console.error(e);
      toast.error('Failed to load customers');
    }
  };

  const fetchCustomerDetails = useCallback(async (id: string) => {
    setLoadingCustomer(true);
    try {
      setCustomerDetails(await getCustomerById(id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomer(false);
    }
  }, []);

  const fetchInvoices = useCallback(
    async (customerId: string) => {
      setLoadingInvoices(true);
      if (!record) {
        setSelectedInvoiceId('');
        setSelectedInvoice(null);
        resetItemSelection();
      }
      try {
        const res = await getInvoicesByCustomerId(customerId);
        if (res.data.success) {
          const fetchedInvoices = res.data.data || [];
          setInvoices(fetchedInvoices);

          if (record && !selectedInvoice) {
            const inv = fetchedInvoices.find((i: Invoice) => i.id === record.invoiceId);
            if (inv) {
              setSelectedInvoice(inv);
              if (record.itemCategory === 'SPARE_PART' && record.sparePartId) {
                const item = (inv.items || []).find(
                  (p: GlobalInvoiceItem) => p.sparePartId === record.sparePartId,
                );
                if (item) setSelectedSparePart(item as unknown as ReturnInvoiceItem);
              } else if (record.productId) {
                const item = (inv.items || []).find(
                  (p: GlobalInvoiceItem) => p.productId === record.productId,
                );
                if (item) setSelectedProduct(item as unknown as ReturnInvoiceItem);
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load invoices');
      } finally {
        setLoadingInvoices(false);
      }
    },
    [record, selectedInvoice],
  );

  const handleInvoiceChange = useCallback(async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    resetItemSelection();
    try {
      const res = await getInvoiceById(invoiceId);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load invoice details');
    }
  }, []);

  /* ── lifecycle ── */
  useEffect(() => {
    if (open) {
      fetchCustomers();
      if (record) {
        setItemCategory((record.itemCategory as ItemCategory) || 'PRODUCT');
        setSelectedCustomer(record.customerId);
        setSelectedInvoiceId(record.invoiceId);
        handleInvoiceChange(record.invoiceId);
        if (record.itemCategory === 'SPARE_PART') {
          setSelectedSparePartId(record.sparePartId ?? '');
          setReturnQuantity(record.quantity ?? 1);
        } else {
          setSelectedProductId(record.productId ?? '');
        }
        setReturnType(record.type);
        setNotes(record.notes || '');
      }
    }
  }, [open, record, handleInvoiceChange]);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchInvoices(selectedCustomer);
      fetchCustomerDetails(selectedCustomer);
    }
  }, [selectedCustomer, fetchInvoices, fetchCustomerDetails]);

  // Fetch product metadata
  useEffect(() => {
    if (selectedProduct?.productId) {
      setLoadingProduct(true);
      getProductById(selectedProduct.productId)
        .then(setProductMeta)
        .catch(console.error)
        .finally(() => setLoadingProduct(false));
    } else {
      setProductMeta(null);
    }
  }, [selectedProduct]);

  // Fetch spare part metadata
  useEffect(() => {
    if (selectedSparePart?.sparePartId) {
      getSparePartById(selectedSparePart.sparePartId).then(setSparePartMeta).catch(console.error);
    } else {
      setSparePartMeta(null);
    }
  }, [selectedSparePart]);

  /* ── item selection handlers ── */
  const handleProductChange = (key: string) => {
    setSelectedProductId(key);
    const item = (selectedInvoice?.items || []).find(
      (i: GlobalInvoiceItem) => i.productId === key || i.id === key,
    );
    setSelectedProduct((item as unknown as ReturnInvoiceItem) || null);
  };

  const handleSparePartChange = (key: string) => {
    setSelectedSparePartId(key);
    const item = (selectedInvoice?.items || []).find(
      (i: GlobalInvoiceItem) => i.sparePartId === key || i.id === key,
    );
    if (item) {
      setSelectedSparePart(item as unknown as ReturnInvoiceItem);
      setReturnQuantity(1);
    } else {
      setSelectedSparePart(null);
    }
  };

  /* ── submit ── */
  const handleSubmit = () => {
    const customerObj = customers.find((c) => c.id === selectedCustomer);
    const base = {
      customerId: selectedCustomer,
      customerName: customerObj?.name || customerDetails?.name || 'Customer',
      invoiceId: selectedInvoice!.id,
      invoiceNumber: selectedInvoice!.invoiceNumber || '—',
      itemCategory,
      type: returnType,
      notes,
    };

    if (itemCategory === 'SPARE_PART') {
      if (!selectedCustomer || !selectedInvoice || !selectedSparePart) {
        toast.error('Please complete all required steps');
        return;
      }
      const unitPrice = selectedSparePart.unitPrice || sparePartMeta?.base_price || 0;
      onSave({
        ...base,
        sparePartId: selectedSparePart.sparePartId,
        sku: selectedSparePart.sku || sparePartMeta?.sku || '',
        productName: sparePartMeta?.part_name || selectedSparePart.description || 'Spare Part',
        quantity: returnQuantity,
        productAmount: unitPrice * returnQuantity,
      });
    } else {
      if (!selectedCustomer || !selectedInvoice || !selectedProduct) {
        toast.error('Please complete all required steps');
        return;
      }
      onSave({
        ...base,
        productId: selectedProduct.productId,
        productName: productMeta?.name || selectedProduct.description || 'Product',
        modelName: productMeta?.model?.model_name || selectedProduct.description || '',
        brand: productMeta?.brand || productMeta?.model?.brandRelation?.name || '',
        serialNumber: productMeta?.serial_no || selectedProduct.serialNumber || '',
        productAmount:
          selectedProduct.unitPrice || selectedProduct.totalAmount || productMeta?.sale_price || 0,
      });
    }
  };

  /* ── derived invoice item lists ── */
  const productInvoiceItems: ReturnInvoiceItem[] = (() => {
    if (!selectedInvoice) return [];
    const items = [...(selectedInvoice.items || [])];

    const replacement = selectedInvoice.creditNotes?.find((cn) => cn.status === 'PRODUCT_REPLACED');
    if (replacement?.replacementProductId) {
      const alreadyHas = items.some((i) => i.productId === replacement.replacementProductId);
      if (!alreadyHas) {
        items.push({
          productId: replacement.replacementProductId,
          description: replacement.replacementProductName || 'Replacement Product',
          quantity: 1,
          unitPrice: replacement.replacementAmount || 0,
          totalAmount: replacement.replacementAmount || 0,
          serialNumber: replacement.replacementSerialNumber,
          itemType: 'PRODUCT',
        } as unknown as GlobalInvoiceItem);
      }
    }

    return items
      .filter(
        (i: GlobalInvoiceItem) =>
          (i.quantity || 0) > 0 &&
          (i.itemType === 'PRODUCT' ||
            i.itemType === 'PRICING_RULE' ||
            (i.productId && !i.sparePartId)),
      )
      .map((i) => i as unknown as ReturnInvoiceItem);
  })();

  const sparePartInvoiceItems: ReturnInvoiceItem[] = (() => {
    if (!selectedInvoice) return [];
    return (selectedInvoice.items || [])
      .filter((i: GlobalInvoiceItem) => i.itemType === 'SPAREPART' || i.sparePartId)
      .map((i) => i as unknown as ReturnInvoiceItem);
  })();

  const hasItemSelected = itemCategory === 'SPARE_PART' ? !!selectedSparePart : !!selectedProduct;

  /* ── preview panel values ── */
  const productImageUrl = productMeta?.imageUrl;
  const productBrand = productMeta?.brand || productMeta?.model?.brandRelation?.name || '—';
  const productModel = productMeta?.model?.model_name || '—';
  const productModelNo = productMeta?.model?.model_no || '';
  const productPrice = selectedProduct?.unitPrice || productMeta?.sale_price;
  const productSerial = productMeta?.serial_no || selectedProduct?.serialNumber || '—';
  const soldDate = selectedInvoice?.createdAt
    ? format(new Date(selectedInvoice.createdAt), 'dd MMM yyyy')
    : '—';
  const invoiceNumber = selectedInvoice ? getDisplayInvoiceNumber(selectedInvoice) : '—';

  const spareImageUrl = sparePartMeta?.image_url;
  const spareBrand = sparePartMeta?.brand || '—';
  const sparePrice = sparePartMeta?.base_price;
  const spareSku = sparePartMeta?.sku || selectedSparePart?.sku || '—';

  const canSubmit = !!selectedCustomer && !!selectedInvoice && hasItemSelected;

  /* ── render ── */
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="p-0 overflow-hidden rounded-2xl border-0 shadow-2xl sm:max-w-none"
          style={{ maxWidth: 920, width: '95vw' }}
        >
          <DialogTitle className="sr-only">
            {record ? 'Update Credit Note' : 'Create Credit Note'}
          </DialogTitle>
          <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* ══ HEADER ══ */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
              style={{ background: 'linear-gradient(135deg,#f8faff 0%,#f0f4ff 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <RotateCcw className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-none">
                    {record ? 'Update Credit Note' : 'Create Credit Note'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {record
                      ? 'Modify existing return details'
                      : 'Select customer and invoice to auto-fill'}
                  </p>
                </div>
              </div>

              {/* Step pills */}
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Customer', done: !!selectedCustomer },
                  { label: 'Invoice', done: !!selectedInvoiceId },
                  {
                    label: itemCategory === 'SPARE_PART' ? 'Spare Part' : 'Product',
                    done: hasItemSelected,
                  },
                ].map((s, i) => (
                  <span
                    key={i}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      s.done
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {s.done ? <CheckCircle2 className="h-2.5 w-2.5" /> : <span>{i + 1}</span>}
                    {s.label}
                  </span>
                ))}
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ══ BODY ══ */}
            <div className="flex flex-1 overflow-hidden">
              {/* ── LEFT FORM ── */}
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-6 space-y-5 flex-1">
                  {/* 0. Item Category Toggle */}
                  <section className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Item Category
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setItemCategory('PRODUCT');
                          resetItemSelection();
                        }}
                        disabled={!!record}
                        className={`flex items-center gap-2 flex-1 rounded-xl border-2 py-2.5 px-4 text-xs font-semibold transition-all ${
                          itemCategory === 'PRODUCT'
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Box className="h-4 w-4" />
                        Product
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemCategory('SPARE_PART');
                          resetItemSelection();
                        }}
                        disabled={!!record}
                        className={`flex items-center gap-2 flex-1 rounded-xl border-2 py-2.5 px-4 text-xs font-semibold transition-all ${
                          itemCategory === 'SPARE_PART'
                            ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Wrench className="h-4 w-4" />
                        Spare Part
                      </button>
                    </div>
                  </section>

                  {/* 1. Customer */}
                  <section className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                        1
                      </span>
                      Customer
                    </label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select a customer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCustomer && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                        {loadingCustomer ? (
                          <span className="flex items-center gap-2 text-xs text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                          </span>
                        ) : customerDetails ? (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <div className="col-span-2 flex items-center gap-1.5 text-slate-700 font-semibold">
                              <User className="h-3 w-3 text-blue-400 shrink-0" />
                              {customerDetails.name}
                            </div>
                            {customerDetails.email && (
                              <div className="flex items-center gap-1.5 text-slate-500 truncate">
                                <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                                <span className="truncate">{customerDetails.email}</span>
                              </div>
                            )}
                            {customerDetails.phone && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Phone className="h-3 w-3 text-blue-400 shrink-0" />
                                {customerDetails.phone}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>

                  {/* 2. Invoice */}
                  <section className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                        2
                      </span>
                      Invoice Reference
                    </label>
                    <Select
                      value={selectedInvoiceId}
                      onValueChange={handleInvoiceChange}
                      disabled={!selectedCustomer || loadingInvoices}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20">
                        {loadingInvoices ? (
                          <span className="flex items-center gap-2 text-slate-400 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading invoices…
                          </span>
                        ) : (
                          <SelectValue placeholder="Select an invoice…" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {getDisplayInvoiceNumber(i)} — {i.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedInvoice && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">
                              {invoiceNumber}
                            </span>
                            <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700 border-0 rounded-full font-bold">
                              {selectedInvoice.status}
                            </Badge>
                          </div>
                          <button
                            onClick={() => setViewQuotation(true)}
                            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {soldDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(selectedInvoice.totalAmount, currency)}
                          </span>
                        </div>
                        {/* Spare part count badge */}
                        {sparePartInvoiceItems.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-orange-600">
                            <Wrench className="h-3 w-3" />
                            {sparePartInvoiceItems.length} spare part line item
                            {sparePartInvoiceItems.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* 3. Item selection */}
                  <section className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                        3
                      </span>
                      {itemCategory === 'SPARE_PART' ? 'Spare Part' : 'Product'}
                    </label>

                    {itemCategory === 'SPARE_PART' ? (
                      /* Spare part selector */
                      <>
                        <Select
                          value={selectedSparePartId}
                          onValueChange={handleSparePartChange}
                          disabled={!selectedInvoice || sparePartInvoiceItems.length === 0}
                        >
                          <SelectTrigger className="h-9 rounded-lg border-orange-200 bg-white text-sm focus:ring-2 focus:ring-orange-200">
                            <SelectValue
                              placeholder={
                                selectedInvoice && sparePartInvoiceItems.length === 0
                                  ? 'No spare parts in this invoice'
                                  : 'Select a spare part…'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sparePartInvoiceItems.map((item, idx) => {
                              const { short, sub } = parseProductLabel(item.description || '');
                              return (
                                <SelectItem
                                  key={item.sparePartId || item.id || idx}
                                  value={item.sparePartId || item.id}
                                >
                                  <div className="flex flex-col py-0.5">
                                    <span className="text-xs font-medium text-slate-700">
                                      {short}
                                    </span>
                                    {sub && (
                                      <span className="text-[10px] text-slate-400">{sub}</span>
                                    )}
                                    {item.sku && (
                                      <span className="text-[10px] text-orange-500 font-mono">
                                        SKU: {item.sku}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {selectedSparePart && (
                          <div className="grid gap-2 pt-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Quantity to Return
                            </label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={1}
                                max={selectedSparePart.quantity}
                                value={returnQuantity}
                                onChange={(e) =>
                                  setReturnQuantity(Math.max(1, Number(e.target.value)))
                                }
                                className="h-9 w-28 rounded-lg border-orange-200 text-sm focus:ring-2 focus:ring-orange-200"
                              />
                              <span className="text-[11px] text-slate-400">
                                of {selectedSparePart.quantity} purchased
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Product selector */
                      <Select
                        value={selectedProductId}
                        onValueChange={handleProductChange}
                        disabled={!selectedInvoice || productInvoiceItems.length === 0}
                      >
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20">
                          <SelectValue
                            placeholder={
                              selectedInvoice && productInvoiceItems.length === 0
                                ? 'No products in this invoice'
                                : 'Select a product…'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {productInvoiceItems.map((item: ReturnInvoiceItem, idx: number) => {
                            const { short, sub } = parseProductLabel(item.description || '');
                            return (
                              <SelectItem
                                key={item.productId || item.id || idx}
                                value={item.productId || item.id || String(idx)}
                              >
                                <div className="flex flex-col py-0.5">
                                  <span className="text-xs font-medium text-slate-700">
                                    {short}
                                  </span>
                                  {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </section>

                  {/* 4. Return Type */}
                  <section className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                        4
                      </span>
                      Return Type
                    </label>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}
                    >
                      {RETURN_TYPES.map(({ value, label, sub, Icon, base, active }) => {
                        const isActive = returnType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReturnType(value)}
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3 px-2 transition-all cursor-pointer ${
                              isActive ? active : base
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                            <span className="text-[11px] font-bold leading-tight">{label}</span>
                            <span
                              className={`text-[9px] leading-tight ${isActive ? 'text-white/80' : 'opacity-60'}`}
                            >
                              {sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* 5. Notes */}
                  <section className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Notes <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <Textarea
                      placeholder="Add internal notes or reason for return…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-lg resize-none bg-white border-slate-200 text-sm focus:ring-2 focus:ring-primary/20"
                      rows={3}
                    />
                  </section>
                </div>

                {/* Sticky footer */}
                <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-3 bg-white border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="rounded-lg px-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="rounded-lg px-5 bg-primary text-white gap-1.5 shadow-sm hover:shadow-md transition-all disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {record ? 'Update Record' : 'Save as Draft'}
                  </Button>
                </div>
              </div>

              {/* ── RIGHT PREVIEW PANEL ── */}
              <div
                style={{
                  width: 260,
                  minWidth: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: '1px solid #f1f5f9',
                  background: 'linear-gradient(180deg,#f8faff 0%,#f4f6ff 100%)',
                }}
              >
                <div className="p-4 flex-1 flex flex-col overflow-y-auto">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    {itemCategory === 'SPARE_PART' ? 'Spare Part Preview' : 'Product Preview'}
                  </p>

                  {/* ── Spare part preview ── */}
                  {itemCategory === 'SPARE_PART' && selectedSparePart ? (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl overflow-hidden bg-white border border-slate-200 aspect-square flex items-center justify-center shadow-sm">
                        {spareImageUrl ? (
                          <img
                            src={spareImageUrl}
                            alt="Spare Part"
                            className="object-contain w-full h-full p-3"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-slate-200">
                            <Wrench className="h-10 w-10" />
                            <span className="text-[10px] text-slate-400">No image</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                          {sparePartMeta?.part_name || selectedSparePart.description}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-100 divide-y divide-slate-50 overflow-hidden text-xs">
                        {[
                          { Icon: Tag, label: 'Brand', val: spareBrand },
                          { Icon: Building2, label: 'SKU', val: spareSku, mono: true },
                          ...(sparePrice
                            ? [
                                {
                                  Icon: DollarSign,
                                  label: 'Unit Price',
                                  val: formatCurrency(sparePrice, currency),
                                  accent: true,
                                },
                              ]
                            : []),
                          {
                            Icon: Package,
                            label: 'Return Qty',
                            val: String(returnQuantity),
                            accent: true,
                          },
                          ...(sparePrice
                            ? [
                                {
                                  Icon: DollarSign,
                                  label: 'Return Total',
                                  val: formatCurrency(sparePrice * returnQuantity, currency),
                                  accent: true,
                                },
                              ]
                            : []),
                          { Icon: Calendar, label: 'Sold', val: soldDate },
                          { Icon: FileText, label: 'Invoice', val: invoiceNumber },
                        ].map(
                          ({
                            Icon,
                            label,
                            val,
                            mono,
                            accent,
                          }: {
                            Icon: React.ElementType;
                            label: string;
                            val: string | number;
                            mono?: boolean;
                            accent?: boolean;
                          }) => (
                            <div
                              key={label}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
                                <Icon className="h-3 w-3" />
                                {label}
                              </span>
                              <span
                                className={`block truncate font-semibold text-[10px] max-w-[120px] ${accent ? 'text-emerald-600' : 'text-slate-700'} ${mono ? 'font-mono' : ''}`}
                              >
                                {val}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : itemCategory === 'PRODUCT' && loadingProduct ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                      <span className="text-[10px] text-slate-400">Loading…</span>
                    </div>
                  ) : itemCategory === 'PRODUCT' && selectedProduct && productMeta ? (
                    /* Product preview */
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl overflow-hidden bg-white border border-slate-200 aspect-square flex items-center justify-center shadow-sm">
                        {productImageUrl ? (
                          <img
                            src={productImageUrl}
                            alt="Product"
                            className="object-contain w-full h-full p-3"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-slate-200">
                            <ImageIcon className="h-10 w-10" />
                            <span className="text-[10px] text-slate-400">No image</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                          {productMeta.name || selectedProduct.description}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-100 divide-y divide-slate-50 overflow-hidden text-xs">
                        {[
                          { Icon: Tag, label: 'Brand', val: productBrand },
                          { Icon: Package, label: 'Model', val: productModel, sub: productModelNo },
                          { Icon: Building2, label: 'Serial', val: productSerial, mono: true },
                          ...(productPrice
                            ? [
                                {
                                  Icon: DollarSign,
                                  label: 'Price',
                                  val: formatCurrency(productPrice, currency),
                                  accent: true,
                                },
                              ]
                            : []),
                          { Icon: Calendar, label: 'Sold', val: soldDate },
                          { Icon: FileText, label: 'Invoice', val: invoiceNumber },
                        ].map(
                          ({
                            Icon,
                            label,
                            val,
                            sub,
                            mono,
                            accent,
                          }: {
                            Icon: React.ElementType;
                            label: string;
                            val: string | number;
                            sub?: string;
                            mono?: boolean;
                            accent?: boolean;
                          }) => (
                            <div
                              key={label}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
                                <Icon className="h-3 w-3" />
                                {label}
                              </span>
                              <div className="text-right max-w-[120px]">
                                <span
                                  className={`block truncate font-semibold text-[10px] ${accent ? 'text-emerald-600' : 'text-slate-700'} ${mono ? 'font-mono' : ''}`}
                                >
                                  {val}
                                </span>
                                {sub && (
                                  <span className="text-[9px] text-slate-400 font-mono">{sub}</span>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                      <button
                        onClick={() => setViewQuotation(true)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors py-2 text-xs font-semibold"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Invoice / Quotation
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                        {itemCategory === 'SPARE_PART' ? (
                          <Wrench className="h-5 w-5 text-slate-200" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-200" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed max-w-[160px]">
                        {selectedInvoice
                          ? `Select a ${itemCategory === 'SPARE_PART' ? 'spare part' : 'product'} to preview`
                          : 'Complete the steps to preview details here'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewQuotation && selectedInvoice && (
        <QuotationViewDialog quotation={selectedInvoice} onClose={() => setViewQuotation(false)} />
      )}
    </>
  );
}
