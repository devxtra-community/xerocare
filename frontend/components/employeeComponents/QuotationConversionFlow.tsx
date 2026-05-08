'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ArrowRightLeft, CheckCircle2, PackageCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getAvailableProductsByModel, Product } from '@/lib/product';
import {
  Invoice,
  convertToTransaction,
  allocateMachinesInvoice,
  activateContractInvoice,
} from '@/lib/invoice';
import { recordPayment } from '@/lib/payment';
import { toast } from 'sonner';

interface QuotationConversionFlowProps {
  quotation: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

interface SerialUpdate {
  itemId: string;
  description: string;
  productId: string;
  modelId?: string;
}

export function QuotationConversionFlow({
  quotation,
  onClose,
  onSuccess,
}: QuotationConversionFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Serial number assignment per item
  const allocatableItems = (quotation.items || []).filter(
    (item) => item.itemType === 'PRODUCT' || item.itemType === 'SPAREPART',
  );
  const [serialUpdates, setSerialUpdates] = useState<SerialUpdate[]>(
    allocatableItems.map((item) => ({
      itemId: item.id || '',
      description: item.description,
      productId: item.productId || '',
      modelId: item.modelId,
    })),
  );

  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoadingProducts(true);
      const productMap: Record<string, Product[]> = {};
      try {
        for (const item of allocatableItems) {
          if (item.modelId) {
            const products = await getAvailableProductsByModel(item.modelId);
            productMap[item.modelId] = products;
          }
        }
        setAvailableProducts(productMap);
      } catch (err) {
        console.error('Failed to fetch available products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchAvailable();
  }, [quotation]);

  // Step 2: Advance payment
  const prefilledAdvance = Number(quotation.advanceAmount || 0);
  const [advanceAmount, setAdvanceAmount] = useState(
    prefilledAdvance > 0 ? String(prefilledAdvance) : '',
  );
  const [paymentMode, setPaymentMode] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'
  >('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const paymentDate = new Date().toISOString().split('T')[0];
  const [remarks, setRemarks] = useState('');
  const [skipAdvance, setSkipAdvance] = useState(false);

  const updateSerial = (index: number, productId: string) => {
    setSerialUpdates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId };
      return updated;
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // 1. Convert Quotation → Proforma (Starts Ledger)
      if (quotation.type !== 'PROFORMA' && quotation.type !== 'FINAL') {
        await convertToTransaction(quotation.id);
      }

      // 2. Allocate machines (assign serial numbers)
      const itemsToAllocate = serialUpdates.filter((u) => u.itemId && u.productId);
      if (itemsToAllocate.length > 0) {
        await allocateMachinesInvoice(quotation.id, {
          itemUpdates: itemsToAllocate.map((u) => ({
            id: u.itemId,
            productId: u.productId,
          })),
        });
      }

      // 3. Activate the contract to make it a final sale
      await activateContractInvoice(quotation.id, {
        contractConfirmationUrl: '',
        deposit:
          !skipAdvance && advanceAmount && Number(advanceAmount) > 0
            ? {
                amount: Number(advanceAmount),
                mode: paymentMode as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER',
                receivedDate: paymentDate || new Date().toISOString().split('T')[0],
              }
            : undefined,
      });

      // 4. Record advance payment in the ledger
      if (!skipAdvance && advanceAmount && Number(advanceAmount) > 0) {
        await recordPayment({
          invoiceId: quotation.id,
          amountPaid: Number(advanceAmount),
          paymentMode,
          paymentDate,
          referenceNumber: referenceNumber || undefined,
          remarks:
            remarks ||
            `Advance payment collected at conversion — Invoice ${quotation.invoiceNumber}`,
        });
      }

      toast.success('Conversion complete!', {
        description: `Invoice ${quotation.invoiceNumber} is now active${!skipAdvance && Number(advanceAmount) > 0 ? ` with advance QAR ${Number(advanceAmount).toFixed(2)} recorded` : ''}.`,
      });
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Conversion failed';
      toast.error('Conversion failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saleLabel =
    quotation.saleType === 'RENT' ? 'Rent' : quotation.saleType === 'LEASE' ? 'Lease' : 'Sale';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border-0">
        <DialogTitle className="sr-only">Convert to {saleLabel}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRightLeft size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                Convert Quotation
              </p>
              <p className="text-lg font-black tracking-tight">
                {quotation.invoiceNumber} → {saleLabel}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {(['1', '2', '3'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    step >= i + 1 ? 'bg-white text-emerald-600' : 'bg-white/30 text-white'
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${step > i + 1 ? 'bg-white' : 'bg-white/30'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Serial Numbers
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Advance Payment
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Confirm
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* ── Step 1: Serial Numbers ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Assign Serial / Product IDs
              </p>
              {allocatableItems.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <PackageCheck size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">No physical items to allocate</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This quotation has no products that need serial numbers.
                  </p>
                </div>
              ) : (
                serialUpdates.map((update, idx) => (
                  <div
                    key={`${update.itemId}-${idx}`}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      {update.description}
                    </Label>
                    {isLoadingProducts ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="text-[10px] font-bold">Loading available units...</span>
                      </div>
                    ) : (
                      <SearchableSelect
                        value={update.productId}
                        onValueChange={(val) => updateSerial(idx, val)}
                        placeholder="Search by Serial Number, Brand, or Product Name..."
                        className="h-12 border-slate-200"
                        options={(update.modelId ? availableProducts[update.modelId] || [] : [])
                          .filter((p) => p.product_status === 'AVAILABLE')
                          .map((p) => ({
                            value: p.id,
                            label: `${p.serial_no} — ${p.brand?.toUpperCase() || ''} ${p.name}`,
                            description: p.model?.model_name
                              ? `Model: ${p.model.model_name}`
                              : undefined,
                          }))}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Step 2: Advance Payment ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Advance Ledger Entry
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skip"
                    checked={skipAdvance}
                    onChange={(e) => setSkipAdvance(e.target.checked)}
                    className="h-3 w-3 rounded accent-emerald-600"
                  />
                  <Label
                    htmlFor="skip"
                    className="text-[10px] font-black uppercase text-slate-400 cursor-pointer"
                  >
                    No Advance Taken
                  </Label>
                </div>
              </div>

              {!skipAdvance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                      Amount (QAR)
                    </Label>
                    <Input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-10 font-black text-emerald-600 text-lg border-emerald-100 focus:border-emerald-300"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                      Payment Mode
                    </Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(val: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD') =>
                        setPaymentMode(val)
                      }
                    >
                      <SelectTrigger className="h-10 border-slate-200 font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH" className="text-xs font-bold">
                          Cash
                        </SelectItem>
                        <SelectItem value="BANK_TRANSFER" className="text-xs font-bold">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="CHEQUE" className="text-xs font-bold">
                          Cheque
                        </SelectItem>
                        <SelectItem value="CREDIT_CARD" className="text-xs font-bold">
                          Credit Card
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                      Reference #
                    </Label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Ref/Cheque No"
                      className="h-10 border-slate-200 font-bold text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                      Remarks
                    </Label>
                    <Input
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Additional notes..."
                      className="h-10 border-slate-200 font-bold text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirmation ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 py-4 text-center">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Final Confirmation</h3>
              <p className="text-xs font-bold text-slate-500 px-6 leading-relaxed">
                You are about to convert this quotation into a live
                <span className="text-emerald-600 uppercase mx-1">{saleLabel}</span>
                contract. Physical inventory will be allocated and the ledger account will be
                initialized.
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">Type</span>
                  <span className="text-slate-700">{saleLabel}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">
                    Advance Collected
                  </span>
                  <span className="text-emerald-600">
                    QAR {skipAdvance ? '0.00' : Number(advanceAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">Allocated Units</span>
                  <span className="text-slate-700">
                    {serialUpdates.filter((u) => u.productId).length} / {allocatableItems.length}
                  </span>
                </div>

                {serialUpdates.filter((u) => u.productId).length > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-200/60 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Assigned Inventory
                    </span>
                    {serialUpdates
                      .filter((u) => u.productId)
                      .map((update, idx) => {
                        const product = update.modelId
                          ? availableProducts[update.modelId]?.find(
                              (p) => p.id === update.productId,
                            )
                          : undefined;
                        return (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1 shadow-sm"
                          >
                            <span
                              className="text-xs font-bold text-slate-700 line-clamp-1"
                              title={product ? product.name : update.description}
                            >
                              {product ? product.name : update.description}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                S/N: {product ? product.serial_no : 'Unknown'}
                              </span>
                              {product?.brand && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {product.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={step === 3 ? handleConfirm : () => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={
              isSubmitting ||
              (step === 1 && allocatableItems.length > 0 && serialUpdates.some((u) => !u.productId))
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-emerald-100"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : step === 3 ? (
              'Activate Contract'
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
