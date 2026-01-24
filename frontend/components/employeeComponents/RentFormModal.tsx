import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { CreateInvoicePayload, Invoice } from '@/lib/invoice';

// Helper to strip empty/zero fields for API
const cleanNumber = (val: string | number | undefined | null) =>
  val === '' || val === undefined || val === null ? undefined : Number(val);

export default function RentFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData?: Invoice;
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => void;
}) {
  // Initialize state. Use '' or undefined for numbers to avoid "0"
  const [form, setForm] = useState<{
    customerId: string;
    saleType: string;
    rentType: string;
    rentPeriod: string;
    monthlyRent: string | number;
    advanceAmount: string | number;
    discountPercent: string | number;
    effectiveFrom: string;
    effectiveTo: string;
    pricingItems: {
      description: string;
      bwIncludedLimit?: string | number;
      colorIncludedLimit?: string | number;
      combinedIncludedLimit?: string | number;
      bwExcessRate?: string | number;
      colorExcessRate?: string | number;
      combinedExcessRate?: string | number;
    }[];
  }>({
    customerId: initialData?.customerId || '',
    saleType: 'RENT',
    rentType: initialData?.rentType || 'FIXED_LIMIT',
    rentPeriod: initialData?.rentPeriod || 'MONTHLY',
    monthlyRent: initialData?.monthlyRent || '',
    advanceAmount: initialData?.advanceAmount || '',
    discountPercent: initialData?.discountPercent || '',
    effectiveFrom: initialData?.effectiveFrom
      ? new Date(initialData.effectiveFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    effectiveTo: initialData?.effectiveTo
      ? new Date(initialData.effectiveTo).toISOString().split('T')[0]
      : '',
    pricingItems: initialData?.items
      ?.filter((i) => i.itemType === 'PRICING_RULE')
      .map((i) => ({
        description: i.description,
        bwIncludedLimit: i.bwIncludedLimit ?? '',
        colorIncludedLimit: i.colorIncludedLimit ?? '',
        combinedIncludedLimit: i.combinedIncludedLimit ?? '',
        bwExcessRate: i.bwExcessRate ?? '',
        colorExcessRate: i.colorExcessRate ?? '',
        combinedExcessRate: i.combinedExcessRate ?? '',
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

  const updatePricingItem = (index: number, field: string, value: string | number) => {
    const newItems = [...form.pricingItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, pricingItems: newItems });
  };

  const removePricingItem = (index: number) => {
    const newItems = form.pricingItems.filter((_: unknown, i: number) => i !== index);
    setForm({ ...form, pricingItems: newItems });
  };

  const addPricingItem = () => {
    setForm({
      ...form,
      pricingItems: [...form.pricingItems, { description: '', bwExcessRate: '' }],
    });
  };

  const handleRentTypeChange = (newType: string) => {
    const isNewCombo = newType.includes('COMBO');
    const wasCombo = form.rentType.includes('COMBO');

    if (isNewCombo && !wasCombo) {
      // Switch from Individual -> Combo: Show single 'Combined' item
      setForm({
        ...form,
        rentType: newType,
        pricingItems: [
          {
            description: 'Combined',
            combinedIncludedLimit: '',
            combinedExcessRate: '',
          },
        ],
      });
    } else if (!isNewCombo && wasCombo) {
      // Switch from Combo -> Individual: Show 'Black & White' and 'Color'
      setForm({
        ...form,
        rentType: newType,
        pricingItems: [
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
    } else {
      // Just update type if structure doesn't change
      setForm({ ...form, rentType: newType });
    }
  };

  const handleConfirm = () => {
    if (!form.customerId) return alert('Please select a customer.');
    if (!form.effectiveFrom) return alert('Please select effective start date.');

    const isCombo = form.rentType.includes('COMBO');
    const isFixed = form.rentType.startsWith('FIXED');

    const cleanPayload: CreateInvoicePayload = {
      customerId: form.customerId,
      saleType: 'RENT',
      rentType: form.rentType as 'FIXED_LIMIT' | 'FIXED_COMBO' | 'CPC' | 'CPC_COMBO',
      rentPeriod: form.rentPeriod as 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY',
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || undefined,
      monthlyRent: isFixed ? cleanNumber(form.monthlyRent) : undefined,
      advanceAmount: isFixed ? cleanNumber(form.advanceAmount) : undefined,
      discountPercent: cleanNumber(form.discountPercent),
      pricingItems: form.pricingItems.map((item) => ({
        description: item.description,
        // Map fields based on Combo vs Individual
        bwIncludedLimit: !isCombo && isFixed ? cleanNumber(item.bwIncludedLimit) : undefined,
        colorIncludedLimit: !isCombo && isFixed ? cleanNumber(item.colorIncludedLimit) : undefined,
        combinedIncludedLimit:
          isCombo && isFixed ? cleanNumber(item.combinedIncludedLimit) : undefined,

        bwExcessRate: !isCombo ? cleanNumber(item.bwExcessRate) : undefined,
        colorExcessRate: !isCombo ? cleanNumber(item.colorExcessRate) : undefined,
        combinedExcessRate: isCombo ? cleanNumber(item.combinedExcessRate) : undefined,
      })),
    };
    onConfirm(cleanPayload);
  };

  const isCombo = form.rentType.includes('COMBO');
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
          {/* Section 1: Customer & Terms */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Contract Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-white border border-slate-100 shadow-sm">
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
                  Billing Period
                </label>
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

          {/* Section 2: Pricing Model */}
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
                  <select
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={form.rentType}
                    onChange={(e) => handleRentTypeChange(e.target.value)}
                  >
                    <option value="FIXED_LIMIT">Fixed Rent + Individual Limit</option>
                    <option value="FIXED_COMBO">Fixed Rent + Combined Limit</option>
                    <option value="CPC">CPC (Individual)</option>
                    <option value="CPC_COMBO">CPC (Combined)</option>
                  </select>
                </div>
              </div>

              {isFixed && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">
                      Monthly Rent (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.monthlyRent}
                      onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
                      className="font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Rules */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Usage Rules
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={addPricingItem}
                className="h-8 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:bg-emerald-50"
              >
                <Plus size={14} className="mr-1" /> Add Rule
              </Button>
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
                  {isFixed && (
                    <div className="col-span-6 md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        {isCombo ? 'Combined Limit' : 'Free Limit'}
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={
                          (isCombo
                            ? item.combinedIncludedLimit
                            : index === 0
                              ? item.bwIncludedLimit
                              : item.colorIncludedLimit) ?? ''
                        }
                        onChange={(e) =>
                          updatePricingItem(
                            index,
                            isCombo
                              ? 'combinedIncludedLimit'
                              : index === 0
                                ? 'bwIncludedLimit'
                                : 'colorIncludedLimit',
                            e.target.value,
                          )
                        }
                        className="h-9 border-slate-200"
                      />
                    </div>
                  )}

                  {/* Rate Fields */}
                  <div
                    className={`col-span-6 ${isFixed ? 'md:col-span-3' : 'md:col-span-4'} space-y-1`}
                  >
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      {isCombo
                        ? 'Combined Rate (₹)'
                        : form.rentType === 'CPC'
                          ? 'Rate/Page (₹)'
                          : 'Excess Rate (₹)'}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={
                          (isCombo
                            ? item.combinedExcessRate
                            : index === 0
                              ? item.bwExcessRate
                              : item.colorExcessRate) ?? ''
                        }
                        onChange={(e) =>
                          updatePricingItem(
                            index,
                            isCombo
                              ? 'combinedExcessRate'
                              : index === 0
                                ? 'bwExcessRate'
                                : 'colorExcessRate',
                            e.target.value,
                          )
                        }
                        className={`h-9 font-bold pl-6 ${isFixed ? 'text-red-600 bg-red-50/50 border-red-100' : 'text-emerald-700 bg-emerald-50/50 border-emerald-100'}`}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30">
                        ₹
                      </span>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-2 flex justify-end pb-1">
                    {form.pricingItems.length > 1 && (
                      <button
                        onClick={() => removePricingItem(index)}
                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-blue-600 text-white font-bold px-8 shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all"
            >
              {initialData ? 'Update Contract' : 'Create Contract'}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
