import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { CreateInvoicePayload, Invoice } from '@/lib/invoice';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { Product } from '@/lib/product';

// Helper to strip empty/zero fields for API
const cleanNumber = (val: string | number | undefined | null) =>
  val === '' || val === undefined || val === null ? undefined : Number(val);

const handleNumberInput = (val: string) => {
  // Allow empty string to clear the input
  if (val === '') return '';
  // Check if it's a valid number format (though input type="number" restricts this mostly)
  return val;
};

// ... (imports)

export default function RentFormModal({
  initialData,
  onClose,
  onConfirm,
  defaultSaleType = 'RENT',
  lockSaleType = false,
}: {
  initialData?: Invoice;
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void> | void;
  defaultSaleType?: 'RENT' | 'LEASE';
  lockSaleType?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state. Use '' or undefined for numbers to avoid "0"
  const [form, setForm] = useState<{
    customerId: string;
    saleType: string;
    rentType: string;
    rentPeriod: string;
    monthlyRent: string;
    advanceAmount: string;
    discountPercent: string;
    effectiveFrom: string;
    effectiveTo: string;
    leaseType: 'EMI' | 'FSM';
    leaseTenureMonths: string;
    totalLeaseAmount: string;
    monthlyEmiAmount: string;
    monthlyLeaseAmount: string;
    pricingItems: {
      description: string;
      bwIncludedLimit?: string;
      colorIncludedLimit?: string;
      combinedIncludedLimit?: string;
      bwExcessRate?: string;
      colorExcessRate?: string;
      combinedExcessRate?: string;
    }[];
  }>({
    customerId: initialData?.customerId || '',
    saleType: initialData?.saleType || defaultSaleType,
    rentType: initialData?.rentType || 'FIXED_LIMIT',
    rentPeriod: initialData?.rentPeriod || 'MONTHLY',
    monthlyRent: initialData?.monthlyRent !== undefined ? String(initialData.monthlyRent) : '',
    advanceAmount:
      initialData?.advanceAmount !== undefined ? String(initialData.advanceAmount) : '',
    discountPercent:
      initialData?.discountPercent !== undefined ? String(initialData.discountPercent) : '',
    effectiveFrom: initialData?.effectiveFrom
      ? new Date(initialData.effectiveFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    effectiveTo: initialData?.effectiveTo
      ? new Date(initialData.effectiveTo).toISOString().split('T')[0]
      : '',
    leaseType: 'EMI' as 'EMI' | 'FSM',
    leaseTenureMonths:
      initialData?.leaseTenureMonths !== undefined ? String(initialData.leaseTenureMonths) : '',
    totalLeaseAmount:
      initialData?.totalLeaseAmount !== undefined ? String(initialData.totalLeaseAmount) : '',
    monthlyEmiAmount:
      initialData?.monthlyEmiAmount !== undefined ? String(initialData.monthlyEmiAmount) : '',
    monthlyLeaseAmount:
      initialData?.monthlyLeaseAmount !== undefined ? String(initialData.monthlyLeaseAmount) : '',
    pricingItems: initialData?.items
      ?.filter((i) => i.itemType === 'PRICING_RULE')
      ?.map((i) => ({
        description: i.description,
        bwIncludedLimit: i.bwIncludedLimit !== undefined ? String(i.bwIncludedLimit) : '',
        colorIncludedLimit: i.colorIncludedLimit !== undefined ? String(i.colorIncludedLimit) : '',
        combinedIncludedLimit:
          i.combinedIncludedLimit !== undefined ? String(i.combinedIncludedLimit) : '',
        bwExcessRate: i.bwExcessRate !== undefined ? String(i.bwExcessRate) : '',
        colorExcessRate: i.colorExcessRate !== undefined ? String(i.colorExcessRate) : '',
        combinedExcessRate: i.combinedExcessRate !== undefined ? String(i.combinedExcessRate) : '',
      })) || [
      {
        description: 'Black & White',
        bwIncludedLimit: '',
        bwExcessRate: '',
      },
      {
        description: 'Color',
        colorIncludedLimit: '',
        colorExcessRate: '',
      },
    ],
  });

  // ... (handler methods)

  const handleConfirm = async () => {
    if (!form.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (!form.effectiveFrom) {
      toast.error('Please select effective start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      let cleanPayload: CreateInvoicePayload;

      if (form.saleType === 'LEASE') {
        cleanPayload = {
          customerId: form.customerId,
          saleType: 'LEASE',
          leaseType: form.leaseType,
          leaseTenureMonths: cleanNumber(form.leaseTenureMonths),

          // EMI Fields
          totalLeaseAmount:
            form.leaseType === 'EMI' ? cleanNumber(form.totalLeaseAmount) : undefined,
          monthlyEmiAmount:
            form.leaseType === 'EMI' ? cleanNumber(form.monthlyEmiAmount) : undefined,

          // FSM Fields
          monthlyLeaseAmount:
            form.leaseType === 'FSM' ? cleanNumber(form.monthlyLeaseAmount) : undefined,

          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
          discountPercent: cleanNumber(form.discountPercent),
          advanceAmount: cleanNumber(form.advanceAmount),

          items: selectedProducts.map((p) => ({
            description: `${p.name} - ${p.serial_no}`,
            quantity: p.quantity || 1,
            unitPrice: 0,
            itemType: 'PRODUCT' as const,
          })),

          pricingItems:
            form.leaseType === 'FSM'
              ? form.pricingItems.map((item) => {
                  // Reuse CPC logic for FSM
                  const isCombinedItem = item.description.startsWith('Combined');
                  const isBwItem = item.description.startsWith('Black & White');
                  const isColorItem = item.description.startsWith('Color');
                  return {
                    description: item.description,
                    bwIncludedLimit: undefined, // FSM usually pure CPC or fixed base. Assuming no free limit for FSM unless prompted? Prompt says "monthly lease + CPC". CPC implies pay per copy, usually from 0.
                    colorIncludedLimit: undefined,
                    combinedIncludedLimit: undefined,
                    // FSM Pricing (Excess Rate = CPC Rate)
                    bwExcessRate: isBwItem ? cleanNumber(item.bwExcessRate) : undefined,
                    colorExcessRate: isColorItem ? cleanNumber(item.colorExcessRate) : undefined,
                    combinedExcessRate: isCombinedItem
                      ? cleanNumber(item.combinedExcessRate)
                      : undefined,
                  };
                })
              : undefined,
        };
      } else {
        const isFixed = form.rentType.startsWith('FIXED');

        cleanPayload = {
          customerId: form.customerId,
          saleType: 'RENT',
          // Include selected products as items in invoice
          items: selectedProducts.map((p) => ({
            description: `${p.name} - ${p.serial_no}`,
            quantity: p.quantity || 1,
            unitPrice: 0,
            itemType: 'PRODUCT' as const,
          })),
          rentType: form.rentType as
            | 'FIXED_LIMIT'
            | 'FIXED_COMBO'
            | 'FIXED_FLAT'
            | 'CPC'
            | 'CPC_COMBO',
          rentPeriod: form.rentPeriod as 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY',
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
          monthlyRent: isFixed ? cleanNumber(form.monthlyRent) : undefined,
          advanceAmount: isFixed ? cleanNumber(form.advanceAmount) : undefined,
          discountPercent: cleanNumber(form.discountPercent),
          pricingItems: form.pricingItems.map((item) => {
            const isCombinedItem = item.description.startsWith('Combined');
            const isBwItem = item.description.startsWith('Black & White');
            const isColorItem = item.description.startsWith('Color');

            return {
              description: item.description,

              bwIncludedLimit: isBwItem && isFixed ? cleanNumber(item.bwIncludedLimit) : undefined,
              colorIncludedLimit:
                isColorItem && isFixed ? cleanNumber(item.colorIncludedLimit) : undefined,
              combinedIncludedLimit:
                isCombinedItem && isFixed ? cleanNumber(item.combinedIncludedLimit) : undefined,

              bwExcessRate: isBwItem ? cleanNumber(item.bwExcessRate) : undefined,
              colorExcessRate: isColorItem ? cleanNumber(item.colorExcessRate) : undefined,
              combinedExcessRate: isCombinedItem ? cleanNumber(item.combinedExcessRate) : undefined,
            };
          }),
        };
      }

      await onConfirm(cleanPayload);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [selectedProducts, setSelectedProducts] = useState<(Product & { quantity?: number })[]>(
    () => {
      if (!initialData?.items) return [];

      // 1. Identify Machine Items (assuming non-PRICING_RULE items describe machines)
      // Robust filtering: Check itemType OR infer from description/fields
      // 1. Identify Machine Items
      // Strict separation based on itemType if present
      const machineItems =
        initialData.items?.filter(
          (i) =>
            i.itemType === 'PRODUCT' ||
            (!i.itemType &&
              !i.description.startsWith('Black') &&
              !i.description.startsWith('Color') &&
              !i.description.startsWith('Combined')),
        ) || [];

      const ruleItems =
        initialData.items?.filter(
          (i) =>
            i.itemType === 'PRICING_RULE' ||
            (!i.itemType &&
              (i.description.startsWith('Black') ||
                i.description.startsWith('Color') ||
                i.description.startsWith('Combined'))),
        ) || [];

      // 1. Reconstruct Valid Products
      const reconstructedProducts: (Product & { quantity?: number })[] = [];

      // Helper: Create a mock product from params
      const createMockProduct = (
        name: string,
        serial: string,
        qty: number,
        capability: 'BLACK_WHITE' | 'COLOUR' | 'BOTH',
      ) =>
        ({
          id: `restored_${Math.random()}`,
          name: name,
          serial_no: serial,
          print_colour: capability,
          quantity: qty,
          brand: 'Existing',
          model: '',
          status: 'AVAILABLE',
          category: 'COPIER',
          procurement_price: 0,
          location: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          specifications: {},
          supplierId: '',
          rentals: [],
          latestRental: null,
          vendor_id: '',
          MFD: new Date().toISOString(),
          rent_price_monthly: 0,
          rent_price_yearly: 0,
          image: '',
          features: [],
          total_stock: 0,
          available_stock: 0,
          status_history: [],
        }) as unknown as Product & { quantity?: number };

      // A. Process Explicit Machine Items
      machineItems.forEach((item) => {
        const lastDashIndex = item.description.lastIndexOf(' - ');
        let name = item.description;
        let serial = 'Unknown';

        if (lastDashIndex !== -1) {
          name = item.description.substring(0, lastDashIndex).trim();
          serial = item.description.substring(lastDashIndex + 3).trim();
        }

        // Infer Capability
        const myRules = ruleItems.filter((r) => r.description.includes(`(${serial})`));
        const hasColor = myRules.some(
          (r) => r.description.startsWith('Color') || r.description.startsWith('Combined'),
        );
        const capability = hasColor ? 'BOTH' : 'BLACK_WHITE';

        reconstructedProducts.push(createMockProduct(name, serial, item.quantity || 1, capability));
      });

      // B. Process Orphan Rules (Virtual Machines)
      // Find rules that don't belong to any reconstructed product's serial
      const virtualMachines = new Map<string, typeof ruleItems>();

      ruleItems.forEach((r) => {
        const claimed = reconstructedProducts.some((p) =>
          r.description.includes(`(${p.serial_no})`),
        );
        if (!claimed) {
          // Extract "Name (Serial)" from "Color - Name (Serial)"
          let suffix = r.description;
          if (suffix.startsWith('Black & White - '))
            suffix = suffix.replace('Black & White - ', '');
          else if (suffix.startsWith('Color - ')) suffix = suffix.replace('Color - ', '');
          else if (suffix.startsWith('Combined - ')) suffix = suffix.replace('Combined - ', '');
          else if (suffix.startsWith('Black - ')) suffix = suffix.replace('Black - ', '');

          if (!virtualMachines.has(suffix)) {
            virtualMachines.set(suffix, []);
          }
          virtualMachines.get(suffix)?.push(r);
        }
      });

      // Convert Virtual Machines to Products
      virtualMachines.forEach((rules, suffix) => {
        // Parse "Name (Serial)"
        let name = suffix;
        let serial = 'Unknown';

        const openParen = suffix.lastIndexOf('(');
        const closeParen = suffix.lastIndexOf(')');

        if (openParen !== -1 && closeParen !== -1) {
          name = suffix.substring(0, openParen).trim();
          serial = suffix.substring(openParen + 1, closeParen).trim();
        }

        const hasColor = rules.some(
          (r) => r.description.startsWith('Color') || r.description.startsWith('Combined'),
        );
        const capability = hasColor ? 'BOTH' : 'BLACK_WHITE';

        reconstructedProducts.push(createMockProduct(name, serial, 1, capability));
      });

      return reconstructedProducts;
    },
  );

  const updateUsageRules = (
    products: (Product & { quantity?: number })[],
    overrideRentType?: string,
  ) => {
    const currentRentType = overrideRentType || form.rentType;
    const isCombo = currentRentType.includes('COMBO');

    // Generate rules for each product, preserving existing values
    let newItems: typeof form.pricingItems = [];

    products.forEach((p) => {
      const isBlackWhite = p.print_colour === 'BLACK_WHITE';
      const isColorOnly = p.print_colour === 'COLOUR';
      const isBoth = p.print_colour === 'BOTH';
      const baseDesc = `${p.name} (${p.serial_no})`;

      const createItem = (prefix: string, type: 'BW' | 'COLOR' | 'COMBO') => {
        const desc = `${prefix} - ${baseDesc}`;
        const existing = form.pricingItems.find((i) => i.description === desc);
        if (existing) return existing;

        return {
          description: desc,
          ...(type === 'COMBO' ? { combinedIncludedLimit: '', combinedExcessRate: '' } : {}),
          ...(type === 'BW' ? { bwIncludedLimit: '', bwExcessRate: '' } : {}),
          ...(type === 'COLOR' ? { colorIncludedLimit: '', colorExcessRate: '' } : {}),
        };
      };

      // If Rent Type is COMBO, and product supports BOTH -> Combined Rule
      if (isCombo && isBoth) {
        newItems.push(createItem('Combined', 'COMBO'));
      }
      // Otherwise use Individual Rules
      else {
        if (isBlackWhite || isBoth) {
          newItems.push(createItem('Black & White', 'BW'));
        }
        if (isColorOnly || isBoth) {
          newItems.push(createItem('Color', 'COLOR'));
        }
      }
    });

    if (products.length === 0) {
      newItems = [];
    }

    setForm((prev) => ({
      ...prev,
      pricingItems: newItems,
      ...(overrideRentType ? { rentType: overrideRentType } : {}),
    }));
  };

  const handleProductAdd = (item: SelectableItem) => {
    if ('part_name' in item) return;
    if (selectedProducts.find((p) => p.id === item.id)) return;
    const newProducts = [...selectedProducts, item];
    setSelectedProducts(newProducts);
    updateUsageRules(newProducts);
  };

  const handleProductRemove = (id: string) => {
    const newProducts = selectedProducts.filter((p) => p.id !== id);
    setSelectedProducts(newProducts);
    updateUsageRules(newProducts);
  };

  const updatePricingItem = (index: number, field: string, value: string | number) => {
    const newItems = [...form.pricingItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, pricingItems: newItems });
  };

  const handleRentTypeChange = (newType: string) => {
    // Regenerate rules based on new type
    updateUsageRules(selectedProducts, newType);
  };

  const isFixed = form.rentType.startsWith('FIXED');

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-slate-50/50 backdrop-blur-sm h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Calendar size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                {initialData ? 'Edit Rent Contract' : 'New Rent Contract'}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {initialData ? `Inv #${initialData.invoiceNumber}` : 'Quotation Configuration'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-8 overflow-y-auto grow scrollbar-hide bg-white/50">
          {/* Section 1: Contract Terms */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Contract Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-white border border-slate-100 shadow-sm">
              {/* Contract Type Toggle */}
              <div className="md:col-span-2 flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
                {lockSaleType ? (
                  <button className="px-4 py-1.5 text-xs font-bold rounded-md bg-white text-blue-600 shadow-sm cursor-default">
                    {form.saleType === 'RENT' ? 'Rental Contract' : 'Lease Contract'}
                  </button>
                ) : (
                  <>
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${form.saleType === 'RENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setForm({ ...form, saleType: 'RENT' })}
                    >
                      Rental Contract
                    </button>
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${form.saleType === 'LEASE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setForm({ ...form, saleType: 'LEASE' })}
                    >
                      Lease Contract
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Customer</label>
                {initialData ? (
                  <Input
                    value={initialData.customerName}
                    disabled
                    className="bg-slate-50 font-bold text-slate-700"
                  />
                ) : (
                  <CustomerSelect
                    value={form.customerId}
                    onChange={(id) => setForm({ ...form, customerId: id })}
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  {form.saleType === 'LEASE' ? 'Tenure (Months)' : 'Billing Period'}
                </label>
                {form.saleType === 'LEASE' ? (
                  <Input
                    type="number"
                    value={form.leaseTenureMonths}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leaseTenureMonths: handleNumberInput(e.target.value),
                      })
                    }
                    placeholder="e.g 12, 24, 36"
                    className="font-bold"
                  />
                ) : (
                  <select
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={form.rentPeriod}
                    onChange={(e) => setForm({ ...form, rentPeriod: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Effective From
                </label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  className="font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Effective To
                </label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                  className="font-semibold"
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Product/Machine */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Identify Machine
            </h4>
            <div className="p-5 rounded-xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Select Product
                </label>
                <div className="mb-4">
                  <ProductSelect onSelect={handleProductAdd} />
                </div>

                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs uppercase shrink-0">
                          {product.print_colour === 'BLACK_WHITE' ? 'B&W' : 'CLR'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {product.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide truncate">
                            {product.brand} • {product.serial_no}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-16">
                          <label className="sr-only">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 text-xs font-bold text-center px-1 bg-white border-purple-200 focus:border-purple-400"
                            placeholder="Qty"
                            value={product.quantity ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const qty = val === '' ? undefined : parseInt(val);
                              setSelectedProducts((prev) =>
                                prev.map((p) =>
                                  p.id === product.id ? { ...p, quantity: qty } : p,
                                ),
                              );
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleProductRemove(product.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedProducts.length === 0 && (
                    <div className="text-xs text-slate-400 font-medium text-center py-4 border border-dashed border-slate-200 rounded-lg">
                      No products selected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Pricing Model */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Pricing Model
            </h4>

            <div className="p-5 rounded-xl bg-white border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Model Type
                  </label>
                  {form.saleType === 'LEASE' ? (
                    <select
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={form.leaseType}
                      onChange={(e) =>
                        setForm({ ...form, leaseType: e.target.value as 'EMI' | 'FSM' })
                      }
                    >
                      <option value="EMI">EMI Based Lease</option>
                      <option value="FSM">Lease + Full Service Maintenance (FSM)</option>
                    </select>
                  ) : (
                    <select
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={form.rentType}
                      onChange={(e) => handleRentTypeChange(e.target.value)}
                    >
                      <option value="FIXED_LIMIT">Fixed Rent + Individual Limit</option>
                      <option value="FIXED_COMBO">Fixed Rent + Combined Limit</option>
                      <option value="FIXED_FLAT">Fixed Flat Rent (No Limits)</option>
                      <option value="CPC">CPC (Individual)</option>
                      <option value="CPC_COMBO">CPC (Combined)</option>
                    </select>
                  )}
                </div>
              </div>

              {form.saleType === 'LEASE' && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  {form.leaseType === 'EMI' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          Total Lease Amount
                        </label>
                        <Input
                          type="number"
                          value={form.totalLeaseAmount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              totalLeaseAmount: handleNumberInput(e.target.value),
                            })
                          }
                          className="font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          Monthly EMI
                        </label>
                        <Input
                          type="number"
                          value={form.monthlyEmiAmount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              monthlyEmiAmount: handleNumberInput(e.target.value),
                            })
                          }
                          className="font-bold text-slate-800"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">
                        Monthly Lease Amount
                      </label>
                      <Input
                        type="number"
                        value={form.monthlyLeaseAmount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            monthlyLeaseAmount: handleNumberInput(e.target.value),
                          })
                        }
                        className="font-bold text-slate-800"
                      />
                    </div>
                  )}
                  {/* Advance Amount for Lease */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Advance Amount
                    </label>
                    <Input
                      type="number"
                      value={form.advanceAmount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          advanceAmount: handleNumberInput(e.target.value),
                        })
                      }
                      className="font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {form.saleType === 'RENT' && isFixed && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Monthly Rent (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.monthlyRent}
                      onChange={(e) =>
                        setForm({ ...form, monthlyRent: handleNumberInput(e.target.value) })
                      }
                      className="font-bold text-slate-800 border-slate-200 focus:border-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Advance (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.advanceAmount}
                      onChange={(e) =>
                        setForm({ ...form, advanceAmount: handleNumberInput(e.target.value) })
                      }
                      className="font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Rules (Moved Down) */}
          {(form.saleType === 'RENT' ||
            (form.saleType === 'LEASE' && form.leaseType === 'FSM')) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Usage Rules
                </h4>
                {/* Rules are auto-generated from selected products */}
              </div>

              <div className="space-y-3">
                {form.pricingItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 p-4 rounded-xl border border-dotted border-slate-200 bg-white hover:border-emerald-300 transition-all items-end relative group"
                  >
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Category
                      </label>
                      <Input
                        value={item.description}
                        onChange={(e) => updatePricingItem(index, 'description', e.target.value)}
                        placeholder="e.g. B&W, Color, A3"
                        className="h-9 text-sm font-bold border-slate-200"
                      />
                    </div>

                    {/* Limit Fields */}
                    {isFixed && form.rentType !== 'FIXED_FLAT' && (
                      <div className="col-span-6 md:col-span-3 space-y-1">
                        {/* Logic to Hide B&W fields if COLOR only, etc - REMOVED, showing all */}
                        <>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">
                            {item.description.startsWith('Combined')
                              ? 'Combined Limit'
                              : 'Free Limit'}
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={
                              (item.description.startsWith('Combined')
                                ? item.combinedIncludedLimit
                                : item.description.startsWith('Black & White')
                                  ? item.bwIncludedLimit
                                  : item.colorIncludedLimit) ?? ''
                            }
                            onChange={(e) =>
                              updatePricingItem(
                                index,
                                item.description.startsWith('Combined')
                                  ? 'combinedIncludedLimit'
                                  : item.description.startsWith('Black & White')
                                    ? 'bwIncludedLimit'
                                    : 'colorIncludedLimit',
                                handleNumberInput(e.target.value),
                              )
                            }
                            className={`h-9 border-slate-200`}
                          />
                        </>
                      </div>
                    )}

                    {/* Rate Fields */}
                    {form.rentType !== 'FIXED_FLAT' && (
                      <div
                        className={`col-span-6 ${isFixed ? 'md:col-span-3' : 'md:col-span-4'} space-y-1`}
                      >
                        <label className="text-[9px] font-bold text-slate-400 uppercase">
                          {item.description.startsWith('Combined')
                            ? 'Combined Rate (₹)'
                            : form.rentType.includes('CPC')
                              ? 'Rate/Page (₹)'
                              : 'Excess Rate (₹)'}
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={
                              (item.description.startsWith('Combined')
                                ? item.combinedExcessRate
                                : item.description.startsWith('Black & White')
                                  ? item.bwExcessRate
                                  : item.colorExcessRate) ?? ''
                            }
                            onChange={(e) =>
                              updatePricingItem(
                                index,
                                item.description.startsWith('Combined')
                                  ? 'combinedExcessRate'
                                  : item.description.startsWith('Black & White')
                                    ? 'bwExcessRate'
                                    : 'colorExcessRate',
                                handleNumberInput(e.target.value),
                              )
                            }
                            className={`h-9 font-bold pl-6 ${isFixed ? 'text-red-600 bg-red-50/50 border-red-100' : 'text-emerald-700 bg-emerald-50/50 border-emerald-100'}`}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30">
                            ₹
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="col-span-12 md:col-span-2 flex justify-end pb-1">
                      {/* Delete managed by product removal */}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-bold px-8 shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update Contract' : 'Create Contract'}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
