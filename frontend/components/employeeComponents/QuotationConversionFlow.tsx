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
import { getSparePartById, SparePart } from '@/lib/spare-part';
import {
  Invoice,
  convertToTransaction,
  allocateMachinesInvoice,
  activateContractInvoice,
} from '@/lib/invoice';
import { recordPayment } from '@/lib/payment';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
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
  isSparePart?: boolean;
}

export function QuotationConversionFlow({
  quotation,
  onClose,
  onSuccess,
}: QuotationConversionFlowProps) {
  const currency = useBranchCurrency();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Serial number assignment per item
  // Backend stores spare part items as 'SPARE_PART'; frontend type alias is 'SPAREPART'
  const allocatableItems = React.useMemo(
    () =>
      (quotation.items || []).filter(
        (item) =>
          item.itemType === 'PRODUCT' ||
          item.itemType === 'SPAREPART' ||
          (item.itemType as string) === 'SPARE_PART',
      ),
    [quotation.items],
  );

  const [serialUpdates, setSerialUpdates] = useState<SerialUpdate[]>(
    allocatableItems.map((item) => {
      const isSparePart =
        item.itemType === 'SPAREPART' || (item.itemType as string) === 'SPARE_PART';
      // For spare parts, the allocation ID is sparePartId; productId is for physical serial units
      const spId = (item as unknown as { sparePartId?: string }).sparePartId;
      return {
        itemId: item.id || '',
        description: item.description,
        productId: isSparePart ? spId || item.productId || '' : item.productId || '',
        modelId: item.modelId,
        isSparePart,
      };
    }),
  );

  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});
  const [sparePartDetails, setSparePartDetails] = useState<Record<string, SparePart>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoadingProducts(true);
      const productMap: Record<string, Product[]> = {};
      const spareMap: Record<string, SparePart> = {};
      try {
        for (const item of allocatableItems) {
          const isSp = item.itemType === 'SPAREPART' || (item.itemType as string) === 'SPARE_PART';
          if (isSp) {
            // Fetch spare part details for display — ID comes from sparePartId or productId
            const spId =
              (item as unknown as { sparePartId?: string }).sparePartId || item.productId;
            if (spId && !spareMap[spId]) {
              const sp = await getSparePartById(spId).catch(() => null);
              if (sp) spareMap[spId] = sp;
            }
          } else if (item.modelId) {
            const products = await getAvailableProductsByModel(item.modelId);
            productMap[item.modelId] = products;
          }
        }
        setAvailableProducts(productMap);
        setSparePartDetails(spareMap);

        // Auto-clear productId only for non-spare-part items that are no longer available
        setSerialUpdates((prev) =>
          prev.map((update) => {
            if (update.isSparePart) return update; // spare parts are pre-confirmed, don't clear
            const modelProds = update.modelId ? productMap[update.modelId] || [] : [];
            const isAvailable = modelProds.some((p) => p.id === update.productId);
            return {
              ...update,
              productId: isAvailable ? update.productId : '',
            };
          }),
        );
      } catch (err) {
        console.error('Failed to fetch available products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchAvailable();
  }, [quotation, allocatableItems]);

  // Step 2: Advance payment
  const prefilledAdvance = Number(quotation.advanceAmount || 0);
  const [advanceAmount, setAdvanceAmount] = useState(
    prefilledAdvance > 0 ? String(prefilledAdvance) : '',
  );
  const [paymentMode, setPaymentMode] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'
  >('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const paymentDate = new Date().toISOString().split('T')[0];
  const [remarks, setRemarks] = useState('');

  // Step 2: Caution Deposit (Security Deposit)
  const prefilledCaution = Number(quotation.securityDepositAmount || 0);
  const [cautionAmount] = useState(prefilledCaution > 0 ? String(prefilledCaution) : '');
  const [cautionMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'>(
    (quotation.securityDepositMode as unknown as
      | 'CASH'
      | 'BANK_TRANSFER'
      | 'CHEQUE'
      | 'CREDIT_CARD') || 'CASH',
  );
  const [cautionReference] = useState(quotation.securityDepositReference || '');

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
      // 1. Convert Quotation → Proforma (idempotent: backend returns early for PROFORMA/FINAL)
      // Always call so we get the live type and contractStatus back, avoiding stale-prop issues.
      const converted = await convertToTransaction(quotation.id);
      const liveType = converted.type;
      const liveContractStatus = converted.contractStatus;

      // Already fully activated — nothing more to do
      if (liveType === 'FINAL') {
        toast.success('Conversion complete!', {
          description: `Invoice ${quotation.invoiceNumber} is already active.`,
        });
        onSuccess();
        return;
      }

      // 2. Allocate machines (skip if already in PENDING_CONFIRMATION to avoid duplicate allocations)
      if (liveContractStatus !== 'PENDING_CONFIRMATION') {
        const itemsToAllocate = serialUpdates.filter((u) => u.itemId && u.productId);
        if (itemsToAllocate.length > 0) {
          await allocateMachinesInvoice(quotation.id, {
            itemUpdates: itemsToAllocate.map((u) => ({
              id: u.itemId,
              productId: u.productId,
            })),
          });
        }
      }

      // 3. Activate the contract to make it a final sale (only for non-Rent/Lease)
      if (quotation.saleType !== 'RENT' && quotation.saleType !== 'LEASE') {
        await activateContractInvoice(quotation.id, {
          contractConfirmationUrl: '',
          deposit:
            cautionAmount && Number(cautionAmount) > 0
              ? {
                  amount: Number(cautionAmount),
                  mode: cautionMode as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER',
                  reference: cautionReference || undefined,
                  receivedDate: paymentDate || new Date().toISOString().split('T')[0],
                }
              : undefined,
        });
      }

      // 4. Record advance payment in the ledger
      if (advanceAmount && Number(advanceAmount) > 0) {
        await recordPayment({
          invoiceId: quotation.id,
          amountPaid: Number(advanceAmount),
          paymentMode,
          paymentDate,
          referenceNumber: paymentMode === 'CHEQUE' ? undefined : referenceNumber || undefined,
          remarks:
            remarks ||
            `Advance payment collected at conversion — Invoice ${quotation.invoiceNumber}`,
          chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber : undefined,
          chequeBankName: paymentMode === 'CHEQUE' ? chequeBankName : undefined,
          chequeDueDate: paymentMode === 'CHEQUE' ? chequeDueDate : undefined,
          chequeDate: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        });
      }

      let successMsg =
        quotation.saleType === 'RENT' || quotation.saleType === 'LEASE'
          ? `Invoice ${quotation.invoiceNumber} has been converted and sent to Finance for processing.`
          : `Invoice ${quotation.invoiceNumber} is now active.`;
      const hasAdvance = advanceAmount && Number(advanceAmount) > 0;
      const hasCaution = cautionAmount && Number(cautionAmount) > 0;
      if (hasAdvance && hasCaution) {
        successMsg +=
          paymentMode === 'CHEQUE'
            ? ` Cheque (PENDING) ${currency} ${Number(advanceAmount).toFixed(2)} and Caution ${currency} ${Number(cautionAmount).toFixed(2)} recorded.`
            : ` Advance ${currency} ${Number(advanceAmount).toFixed(2)} and Caution ${currency} ${Number(cautionAmount).toFixed(2)} recorded.`;
      } else if (hasAdvance) {
        successMsg +=
          paymentMode === 'CHEQUE'
            ? ` Cheque recorded (PENDING) — go to Accounts → Cheques to deposit when cleared.`
            : ` Advance ${currency} ${Number(advanceAmount).toFixed(2)} recorded.`;
      } else if (hasCaution) {
        successMsg += ` Caution ${currency} ${Number(cautionAmount).toFixed(2)} recorded.`;
      }

      toast.success('Conversion complete!', {
        description: successMsg,
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
              Advance / Deposit
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
                    {update.isSparePart ? (
                      // Spare parts are pre-assigned from the quotation — show confirmation
                      isLoadingProducts ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 size={12} className="animate-spin" />
                          <span className="text-[10px] font-bold">Loading spare part...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <PackageCheck size={16} className="text-emerald-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {sparePartDetails[update.productId]?.part_name || update.description}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              SKU: {sparePartDetails[update.productId]?.sku || update.productId}
                              {sparePartDetails[update.productId]?.lot?.lotNumber
                                ? ` • Lot: ${sparePartDetails[update.productId].lot!.lotNumber}`
                                : sparePartDetails[update.productId]?.lot?.lot_number
                                  ? ` • Lot: ${sparePartDetails[update.productId].lot!.lot_number}`
                                  : ''}
                            </p>
                          </div>
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        </div>
                      )
                    ) : isLoadingProducts ? (
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
                          .filter((p) =>
                            ['AVAILABLE', 'RETURNED', 'DAMAGED'].includes(p.product_status),
                          )
                          .map((p) => {
                            const statusColor =
                              p.product_status === 'DAMAGED'
                                ? 'text-red-600'
                                : p.product_status === 'RETURNED'
                                  ? 'text-green-600'
                                  : 'text-slate-400';
                            const statusLabel =
                              p.product_status && p.product_status !== 'AVAILABLE' ? (
                                <span className={`${statusColor} font-black ml-2`}>
                                  [{p.product_status}]
                                </span>
                              ) : null;
                            return {
                              value: p.id,
                              label: (
                                <span className="flex items-center">
                                  {p.serial_no} — {p.brand?.toUpperCase() || ''} {p.name}
                                  {statusLabel}
                                </span>
                              ),
                              searchText: `${p.serial_no} ${p.brand} ${p.name} ${p.product_status}`,
                              description: p.model?.model_name
                                ? `Model: ${p.model.model_name} • ${currency} ${Number(p.sale_price || 0).toLocaleString()}`
                                : `${currency} ${Number(p.sale_price || 0).toLocaleString()}`,
                            };
                          })}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Step 2: Payment Entry ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Advance Payment / Caution Deposit Card */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Advance Payment / Caution Deposit (Optional)
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                  Record advance payment / caution deposit to initialize the ledger and activate the
                  contract.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      Amount ({currency})
                    </Label>
                    <Input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-10 font-black text-emerald-600 text-sm border-slate-200 focus:border-emerald-300"
                    />
                  </div>
                  {advanceAmount && Number(advanceAmount) > 0 && (
                    <>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                          Payment Mode
                        </Label>
                        <Select
                          value={paymentMode}
                          onValueChange={(
                            val: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD',
                          ) => setPaymentMode(val)}
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
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                          {paymentMode === 'CHEQUE' ? 'Cheque Number *' : 'Reference #'}
                        </Label>
                        <Input
                          value={paymentMode === 'CHEQUE' ? chequeNumber : referenceNumber}
                          onChange={(e) =>
                            paymentMode === 'CHEQUE'
                              ? setChequeNumber(e.target.value)
                              : setReferenceNumber(e.target.value)
                          }
                          placeholder={paymentMode === 'CHEQUE' ? 'e.g., CHQ-001234' : 'Ref No'}
                          required={paymentMode === 'CHEQUE'}
                          className="h-10 border-slate-200 font-bold text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Cheque-specific fields */}
                {advanceAmount && Number(advanceAmount) > 0 && paymentMode === 'CHEQUE' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
                      Cheque Details — PENDING until deposited in Accounts → Cheques
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                          Customer&apos;s Bank *
                        </Label>
                        <Input
                          value={chequeBankName}
                          onChange={(e) => setChequeBankName(e.target.value)}
                          placeholder="e.g., Emirates NBD"
                          required
                          className="h-10 border-slate-200 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                          Cheque Date *
                        </Label>
                        <Input
                          type="date"
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                          required
                          className="h-10 border-slate-200 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                          Due Date *
                        </Label>
                        <Input
                          type="date"
                          value={chequeDueDate}
                          onChange={(e) => setChequeDueDate(e.target.value)}
                          required
                          className="h-10 border-slate-200 font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks Section */}
              <div className="p-3 bg-slate-50/20 rounded-xl border border-slate-100">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                  Remarks / Notes
                </Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional conversion remarks..."
                  className="h-10 border-slate-200 font-bold text-xs"
                />
              </div>
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
                    Advance / Caution Deposit
                  </span>
                  <span className="text-emerald-600 font-black">
                    {currency} {Number(advanceAmount || 0).toFixed(2)}
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
                        const product =
                          !update.isSparePart && update.modelId
                            ? availableProducts[update.modelId]?.find(
                                (p) => p.id === update.productId,
                              )
                            : undefined;
                        const sparePart = update.isSparePart
                          ? sparePartDetails[update.productId]
                          : undefined;
                        return (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1 shadow-sm"
                          >
                            <span
                              className="text-xs font-bold text-slate-700 line-clamp-1"
                              title={sparePart?.part_name || product?.name || update.description}
                            >
                              {sparePart?.part_name || product?.name || update.description}
                            </span>
                            <div className="flex items-center gap-2">
                              {update.isSparePart ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  SKU: {sparePart?.sku || update.productId}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  S/N: {product ? product.serial_no : 'Unknown'}
                                </span>
                              )}
                              {(sparePart?.brand || product?.brand) && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {sparePart?.brand || product?.brand}
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
