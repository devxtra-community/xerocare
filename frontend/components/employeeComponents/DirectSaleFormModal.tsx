import React, { useState, useEffect } from 'react';
import { X, Trash2, ShieldCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { SearchableSelect } from '@/components/ui/searchable-select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Product } from '@/lib/product';
import { SparePart } from '@/lib/spare-part';

interface Customer {
  id: string;
  name: string;
  email: string;
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

  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});

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

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = <K extends keyof SaleItem>(idx: number, field: K, value: SaleItem[K]) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleDiscountChange = (idx: number, val: number) => {
    const item = items[idx];
    const maxAllowed = item.maxDiscount || 0;
    if (maxAllowed > 0 && val > maxAllowed) {
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
      if (item.maxDiscount && item.maxDiscount > 0 && item.discount > item.maxDiscount) {
        return toast.error(
          `Discount for ${item.description} cannot exceed max discount QAR ${item.maxDiscount}`,
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
        notes,
      };

      await api.post('/b/invoices/direct-sale', payload);
      toast.success('Direct sale created successfully');
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create direct sale');
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.email,
  }));

  const { subtotal, taxTotal, grandTotal } = calculateTotals();

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

          {/* Item Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500" />
              Items (Products & Spare Parts)
            </h3>

            <div className="flex gap-2">
              <div className="flex-1">
                <ProductSelect
                  onSelect={handleAddItem}
                  mode="BOTH"
                  placeholder="Search product or spare part..."
                  className="rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
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
                      <th className="px-4 py-3 font-semibold w-20">Qty</th>
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
                        <tr key={idx} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 line-clamp-2">
                              {item.description}
                            </p>
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
                                onChange={(e) =>
                                  updateItem(idx, 'quantity', Number(e.target.value))
                                }
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
                  value={paymentAmount}
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
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            {loading ? 'Processing...' : 'Complete Direct Sale'}
          </Button>
        </div>
      </div>
    </div>
  );
}
