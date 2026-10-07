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
import { recordSalePayment } from '@/lib/saleWorkflow';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { autoReferencePreview } from '@/lib/format';
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
  isAccessory?: boolean;
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
          (item.itemType as string) === 'SPARE_PART' ||
          // Accessories can themselves be a real serialized Product (e.g. an add-on
          // unit with its own serial number) — include only those backed by a real
          // catalog model; a manually-typed accessory (no modelId) has no specific
          // unit to assign, so it's left out here (nothing for the employee to pick).
          ((item.itemType as string) === 'ACCESSORY' && !!item.modelId),
      ),
    [quotation.items],
  );

  const [serialUpdates, setSerialUpdates] = useState<SerialUpdate[]>(
    allocatableItems.map((item) => {
      const isSparePart =
        item.itemType === 'SPAREPART' || (item.itemType as string) === 'SPARE_PART';
      const isAccessory = (item.itemType as string) === 'ACCESSORY';
      // For spare parts, the allocation ID is sparePartId; productId is for physical serial units
      const spId = (item as unknown as { sparePartId?: string }).sparePartId;
      return {
        itemId: item.id || '',
        description: item.description,
        productId: isSparePart ? spId || item.productId || '' : item.productId || '',
        modelId: item.modelId,
        isSparePart,
        isAccessory,
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

  // Step 2: Advance payment.
  // Arrears bills each period AFTER it has been used, so there is no first-month advance
  // to collect at signing — the whole card is hidden below and nothing is pre-filled
  // here. handleConfirm already forced the rent portion to 0 for Arrears, so a figure
  // typed into that card was silently discarded: the field looked collectable and wasn't.
  const isArrearsBilling = quotation.paymentTiming === 'ARREARS';
  // This step is shared by every conversion. "First month advance" only means something
  // for a Rent/Lease contract; on a product Sale the same amount is an advance payment
  // against the sale invoice, so the wording must follow the sale type.
  const isRentalContract = quotation.saleType === 'RENT' || quotation.saleType === 'LEASE';
  const advanceLabel = isRentalContract ? 'First Month Advance' : 'Advance Payment';
  const prefilledAdvance = isArrearsBilling ? 0 : Number(quotation.advanceAmount || 0);
  const [advanceAmount, setAdvanceAmount] = useState(
    prefilledAdvance > 0 ? String(prefilledAdvance) : '',
  );
  const [paymentMode, setPaymentMode] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'
  >('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeReceivedDate, setChequeReceivedDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const paymentDate = new Date().toISOString().split('T')[0];
  const [remarks, setRemarks] = useState('');

  // Step 2: Caution Deposit (Security Deposit)
  // Pre-filled from the quotation as a suggestion, but editable — the employee often
  // hasn't actually collected the deposit at signing (customer pays it later, or the
  // technician collects it on-site). Leaving this locked to the quotation's amount used
  // to force-record it as collected on every conversion regardless of reality, which
  // meant the Technician-side "Collect Deposit" flow (SalePaymentCollectionModal) could
  // never trigger — a SalePaymentRequest for it already existed from conversion, whether
  // or not any money had actually changed hands. Clearing it to 0 here now correctly
  // skips creating that record (see handleConfirm's hasCautionDeposit check below),
  // leaving the deposit genuinely outstanding for Technician/Finance to collect later.
  const prefilledCaution = Number(quotation.securityDepositAmount || 0);
  const [cautionAmount, setCautionAmount] = useState(
    prefilledCaution > 0 ? String(prefilledCaution) : '',
  );
  const [cautionMode, setCautionMode] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'
  >(
    (quotation.securityDepositMode as unknown as
      | 'CASH'
      | 'BANK_TRANSFER'
      | 'CHEQUE'
      | 'CREDIT_CARD') || 'CASH',
  );
  const [cautionChequeNumber, setCautionChequeNumber] = useState('');
  const [cautionChequeBankName, setCautionChequeBankName] = useState('');
  const [cautionChequeReceivedDate, setCautionChequeReceivedDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [cautionChequeDate, setCautionChequeDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  /**
   * WHEN the deposit is collected — not a new money path, only which of the two that
   * already exist this conversion takes.
   *
   * Deferring was always possible: a cautionAmount of 0 deliberately skips creating the
   * SalePaymentRequest so the deposit stays outstanding for the Technician's own "Collect
   * Deposit" step at installation (see the note on prefilledCaution above). But it was
   * reachable only by knowing to clear a pre-filled field, which reads like correcting a
   * mistake rather than choosing a plan — so the common case of "the technician will take
   * it on site" was routinely recorded as money already in hand. Stating the choice up
   * front drives the same amount, so nothing downstream changes.
   */
  const [depositTiming, setDepositTiming] = useState<'NOW' | 'ON_INSTALLATION'>('NOW');

  const handleDepositTimingChange = (val: 'NOW' | 'ON_INSTALLATION') => {
    setDepositTiming(val);
    // Restoring the quotation figure on the way back keeps the choice reversible — the
    // employee can flip to installation and back without retyping what the quotation said.
    setCautionAmount(val === 'NOW' ? String(prefilledCaution) : '');
  };

  // Accessories (stand, tray, stapler unit, etc.) added alongside the machine on the
  // quotation — real priced items, never metered, collected once together with the first
  // month advance rather than through a separate payment.
  const accessoryItems = React.useMemo(
    () => (quotation.items || []).filter((item) => (item.itemType as string) === 'ACCESSORY'),
    [quotation.items],
  );
  const accessoryTotal = accessoryItems.reduce(
    (s, item) => s + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );

  // The entered advance is the pre-tax base (mirrors monthlyRent/advanceAmount being
  // tax-exclusive everywhere else on the contract) — VAT is layered on top here purely
  // for display, matching the exact gross-up createSalePaymentRequest applies server-side
  // when this is submitted, so what's shown here never drifts from what actually gets
  // recorded, receipted, and sent to Accounts. Accessories are folded into the same
  // taxable base — they're collected as one lump payment with the advance, not separately.
  const advanceTaxPercent = Number(quotation.taxPercent || 0);
  // Arrears billing collects no rent up front — but accessories are still collected
  // regardless of billing method (see the recordSalePayment call in handleConfirm), so
  // on an Arrears contract this base is the accessories alone.
  const rentAdvancePortion = isArrearsBilling ? 0 : Number(advanceAmount || 0);
  const advanceBase = rentAdvancePortion + accessoryTotal;
  const advanceTaxAmount =
    advanceTaxPercent > 0 && advanceBase > 0 ? (advanceBase * advanceTaxPercent) / 100 : 0;
  const advanceInclTax = advanceBase + advanceTaxAmount;

  const updateSerial = (index: number, productId: string) => {
    setSerialUpdates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId };
      return updated;
    });
  };

  const handleConfirm = async () => {
    // Re-entry guard: state updates are asynchronous, so a second click landing before
    // the first render of `isSubmitting` would otherwise start a whole second
    // conversion — duplicate allocations, duplicate payment requests, duplicate
    // notifications.
    if (isSubmitting) return;
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
                  // Auto-generated server-side for non-Cheque modes (see
                  // billingHelpers.ts's generatePaymentReference) — nothing to send.
                  reference: undefined,
                  receivedDate:
                    (cautionMode === 'CHEQUE' ? cautionChequeReceivedDate : '') ||
                    paymentDate ||
                    new Date().toISOString().split('T')[0],
                }
              : undefined,
        });
      }

      // 4 + 5. Advance and Security Deposit are two independent records against the
      // same invoice. They were submitted one after the other, so every conversion paid
      // for two sequential round-trips that have nothing to do with each other; they now
      // go out together. Both are allowed to settle before anything is reported, so a
      // failure message reflects what actually happened rather than which request
      // happened to reject first.
      const paymentSubmissions: Promise<unknown>[] = [];

      // Skip the RENT advance for Arrears billing — no rent is collected upfront there —
      // but accessories are a separate, one-time charge unrelated to the rent-timing
      // method, so still collect them even on an Arrears contract if any are on file.
      const isArrears = quotation.paymentTiming === 'ARREARS';
      const rentAdvancePortion = isArrears ? 0 : Number(advanceAmount || 0);
      if (rentAdvancePortion > 0 || accessoryTotal > 0) {
        const mode = paymentMode === 'CREDIT_CARD' ? 'BANK_TRANSFER' : paymentMode;
        paymentSubmissions.push(
          recordSalePayment(quotation.id, {
            amount: rentAdvancePortion + accessoryTotal,
            paymentMode: mode as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
            // For a cheque, the date it was received from the customer.
            paymentDate: (mode === 'CHEQUE' ? chequeReceivedDate : '') || paymentDate,
            // Auto-generated server-side for non-Cheque modes (see billingHelpers.ts's
            // generatePaymentReference) — nothing to send from here.
            referenceNumber: undefined,
            remarks:
              remarks ||
              `Advance payment collected at conversion — Invoice ${quotation.invoiceNumber}`,
            chequeNumber: mode === 'CHEQUE' ? chequeNumber : undefined,
            chequeBankName: mode === 'CHEQUE' ? chequeBankName : undefined,
            // dueDate is a deprecated mirror of chequeDate server-side.
            chequeDueDate: mode === 'CHEQUE' ? chequeDate : undefined,
            chequeDate: mode === 'CHEQUE' ? chequeDate : undefined,
          }),
        );
      }

      // Security Deposit — a SEPARATE payment request for Finance approval.
      // This is a distinct financial transaction — never combined with the advance.
      // Skipped if no security deposit is required, or the amount is zero.
      const hasCautionDeposit = cautionAmount && Number(cautionAmount) > 0;
      if (hasCautionDeposit) {
        const cautionPayMode = cautionMode === 'CREDIT_CARD' ? 'BANK_TRANSFER' : cautionMode;
        paymentSubmissions.push(
          recordSalePayment(quotation.id, {
            amount: Number(cautionAmount),
            paymentMode: cautionPayMode as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
            paymentDate:
              (cautionPayMode === 'CHEQUE' ? cautionChequeReceivedDate : '') || paymentDate,
            // Auto-generated server-side for non-Cheque modes — nothing to send from here.
            referenceNumber: undefined,
            remarks: `Security Deposit collected at conversion — Invoice ${quotation.invoiceNumber}`,
            isSecurityDeposit: true,
            chequeNumber: cautionPayMode === 'CHEQUE' ? cautionChequeNumber : undefined,
            chequeBankName: cautionPayMode === 'CHEQUE' ? cautionChequeBankName : undefined,
            chequeDueDate: cautionPayMode === 'CHEQUE' ? cautionChequeDate : undefined,
            chequeDate: cautionPayMode === 'CHEQUE' ? cautionChequeDate : undefined,
          }),
        );
      }

      if (paymentSubmissions.length > 0) {
        const settled = await Promise.allSettled(paymentSubmissions);
        const failed = settled.find((r) => r.status === 'rejected');
        if (failed && failed.status === 'rejected') throw failed.reason;
      }

      let successMsg =
        quotation.saleType === 'RENT' || quotation.saleType === 'LEASE'
          ? `Invoice ${quotation.invoiceNumber} has been converted and sent to Finance for processing.${isArrears && accessoryTotal === 0 ? ' (Arrears/Postpaid billing — no advance collected).' : ''}`
          : `Invoice ${quotation.invoiceNumber} is now active.`;
      const hasAdvance = advanceBase > 0;
      const hasCaution = cautionAmount && Number(cautionAmount) > 0;
      if (hasAdvance && hasCaution) {
        successMsg += ` ${accessoryTotal > 0 ? 'Advance + Accessories' : advanceLabel} ${currency} ${advanceInclTax.toFixed(2)} and Security Deposit ${currency} ${Number(cautionAmount).toFixed(2)} recorded as separate transactions pending Finance approval.`;
      } else if (hasAdvance) {
        successMsg +=
          paymentMode === 'CHEQUE'
            ? ` Cheque recorded (PENDING) — go to Accounts → Cheques to deposit when cleared.`
            : ` ${accessoryTotal > 0 ? 'Advance + Accessories' : advanceLabel} ${currency} ${advanceInclTax.toFixed(2)} recorded.`;
      } else if (hasCaution) {
        successMsg += ` Security Deposit ${currency} ${Number(cautionAmount).toFixed(2)} recorded as a separate transaction pending Finance approval.`;
      }
      if (prefilledCaution > 0 && !hasCaution) {
        successMsg += ` Security Deposit (${currency} ${prefilledCaution.toFixed(2)}) was not collected now — it remains outstanding for the Technician or Finance to collect later.`;
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
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-card shadow-2xl border-0">
        <DialogTitle className="sr-only">Convert to {saleLabel}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-success to-success p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center">
              <ArrowRightLeft size={20} className="text-primary-foreground" />
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
                    step >= i + 1 ? 'bg-card text-success' : 'bg-card text-primary-foreground'
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${step > i + 1 ? 'bg-card' : 'bg-card'}`}
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
              {isRentalContract ? 'Advance & Deposit' : 'Payment'}
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
              <p className="text-xs font-black text-foreground uppercase tracking-wider">
                Assign Serial / Product IDs
              </p>
              {allocatableItems.length === 0 ? (
                <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                  <PackageCheck size={28} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">
                    No physical items to allocate
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This quotation has no products that need serial numbers.
                  </p>
                </div>
              ) : (
                serialUpdates.map((update, idx) => (
                  <div
                    key={`${update.itemId}-${idx}`}
                    className="p-3 bg-muted rounded-xl border border-border"
                  >
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                      {update.description}
                      {update.isAccessory && (
                        <span className="px-1.5 py-0.5 rounded-full bg-lease/10 text-lease border border-lease/30 tracking-wider">
                          Accessory
                        </span>
                      )}
                    </Label>
                    {update.isSparePart ? (
                      // Spare parts are pre-assigned from the quotation — show confirmation
                      isLoadingProducts ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 size={12} className="animate-spin" />
                          <span className="text-[10px] font-bold">Loading spare part...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-xl">
                          <PackageCheck size={16} className="text-success shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {sparePartDetails[update.productId]?.part_name || update.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              SKU: {sparePartDetails[update.productId]?.sku || update.productId}
                              {sparePartDetails[update.productId]?.lot?.lotNumber
                                ? ` • Lot: ${sparePartDetails[update.productId].lot!.lotNumber}`
                                : sparePartDetails[update.productId]?.lot?.lot_number
                                  ? ` • Lot: ${sparePartDetails[update.productId].lot!.lot_number}`
                                  : ''}
                            </p>
                          </div>
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        </div>
                      )
                    ) : isLoadingProducts ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="text-[10px] font-bold">Loading available units...</span>
                      </div>
                    ) : (
                      <SearchableSelect
                        value={update.productId}
                        onValueChange={(val) => updateSerial(idx, val)}
                        placeholder="Search by Serial Number, Brand, or Product Name..."
                        className="h-12 border-border"
                        options={(update.modelId ? availableProducts[update.modelId] || [] : [])
                          .filter((p) =>
                            ['AVAILABLE', 'RETURNED', 'DAMAGED'].includes(p.product_status),
                          )
                          .map((p) => {
                            const statusColor =
                              p.product_status === 'DAMAGED'
                                ? 'text-destructive'
                                : p.product_status === 'RETURNED'
                                  ? 'text-success'
                                  : 'text-muted-foreground';
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
              {/* First Month Advance Payment Card — hidden entirely on Arrears billing,
                  which collects each period only after it has been used. Accessories are
                  a separate one-time charge with nothing to do with rent timing, so when
                  an Arrears contract has any, this card stays (as an accessories-only
                  collection) purely to carry the payment-mode/reference fields. */}
              {(!isArrearsBilling || accessoryTotal > 0) && (
                <div className="p-4 bg-muted/50 rounded-2xl border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-success uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success"></span>
                      {isArrearsBilling
                        ? 'Accessories Collection'
                        : `${isRentalContract ? 'First Month Advance Payment' : 'Advance Payment'} (Optional)`}
                    </h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide leading-relaxed">
                    {isArrearsBilling
                      ? 'This contract bills in arrears — no first month advance is collected. Only the accessories supplied with the machine are charged now.'
                      : isRentalContract
                        ? 'Record first month advance payment to initialize the ledger and activate the contract.'
                        : 'Record any amount the customer pays now towards this sale. Leave it at 0 if nothing is collected yet — the balance stays outstanding on the invoice.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      {!isArrearsBilling && (
                        <>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Amount ({currency})
                          </Label>
                          <Input
                            type="number"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-10 font-black text-success text-sm border-border focus:border-success/30"
                          />
                        </>
                      )}
                      {accessoryTotal > 0 && (
                        <p className="text-[10px] text-info font-bold mt-1">
                          {isArrearsBilling ? '' : '+ '}Accessories ({accessoryItems.length} item
                          {accessoryItems.length === 1 ? '' : 's'}): {currency}{' '}
                          {accessoryTotal.toFixed(2)}
                          {isArrearsBilling ? '' : ' — collected together with this payment'}
                        </p>
                      )}
                      {advanceBase > 0 && advanceTaxAmount > 0 && (
                        <p className="text-[10px] text-success font-bold mt-1">
                          + {quotation.taxName || 'VAT'} ({advanceTaxPercent}%){' '}
                          {advanceTaxAmount.toFixed(2)} = {currency} {advanceInclTax.toFixed(2)}{' '}
                          will be collected
                        </p>
                      )}
                    </div>
                    {advanceBase > 0 && (
                      <>
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Payment Mode
                          </Label>
                          <Select
                            value={paymentMode}
                            onValueChange={(
                              val: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD',
                            ) => setPaymentMode(val)}
                          >
                            <SelectTrigger className="h-10 border-border font-bold text-xs">
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
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            {paymentMode === 'CHEQUE' ? 'Cheque Number *' : 'Reference #'}
                          </Label>
                          {paymentMode === 'CHEQUE' ? (
                            <Input
                              value={chequeNumber}
                              onChange={(e) => setChequeNumber(e.target.value)}
                              placeholder="e.g., CHQ-001234"
                              required
                              className="h-10 border-border font-bold text-xs"
                            />
                          ) : (
                            <div className="h-10 flex items-center px-3 rounded-md border border-dashed border-border bg-muted text-[11px] text-muted-foreground italic">
                              Auto-generated — {autoReferencePreview(paymentMode)}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Cheque-specific fields */}
                  {advanceBase > 0 && paymentMode === 'CHEQUE' && (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-warning">
                        Cheque Details — PENDING until deposited in Accounts → Cheques
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Customer&apos;s Bank *
                          </Label>
                          <Input
                            value={chequeBankName}
                            onChange={(e) => setChequeBankName(e.target.value)}
                            placeholder="e.g., Emirates NBD"
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Cheque Received Date *
                          </Label>
                          <Input
                            type="date"
                            value={chequeReceivedDate}
                            onChange={(e) => setChequeReceivedDate(e.target.value)}
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Cheque Date * (earliest deposit)
                          </Label>
                          <Input
                            type="date"
                            value={chequeDate}
                            onChange={(e) => setChequeDate(e.target.value)}
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Security Deposit Collection Card ──────────────────────────── */}
              {prefilledCaution > 0 && (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                      Security Deposit Collection
                    </h4>
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                      From Quotation
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide leading-relaxed">
                    Security deposit required according to quotation. This amount is refundable.
                  </p>

                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                      Collection Timing
                    </Label>
                    <Select value={depositTiming} onValueChange={handleDepositTimingChange}>
                      <SelectTrigger className="h-10 border-border font-bold text-xs bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOW" className="text-xs font-bold">
                          Collect Now
                        </SelectItem>
                        <SelectItem value="ON_INSTALLATION" className="text-xs font-bold">
                          Collect on Installation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {depositTiming === 'ON_INSTALLATION' && (
                    <div className="p-3 bg-card border border-dashed border-primary/30 rounded-xl">
                      <p className="text-[11px] font-bold text-primary leading-relaxed">
                        {currency} {prefilledCaution.toFixed(2)} will be collected by the Technician
                        at installation. Nothing is recorded now — the deposit stays outstanding
                        against this contract until it is collected.
                      </p>
                    </div>
                  )}

                  {depositTiming === 'NOW' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                          Amount Collected Now ({currency})
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={cautionAmount}
                          onChange={(e) => setCautionAmount(e.target.value)}
                          className="h-10 font-black text-primary text-sm border-border"
                        />
                        <p className="text-[10px] text-primary font-bold mt-1">
                          Pre-filled from the quotation ({currency} {prefilledCaution.toFixed(2)}) —
                          adjust if a different amount was actually handed over.
                        </p>
                      </div>
                      {cautionAmount && Number(cautionAmount) > 0 && (
                        <>
                          <div>
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                              Payment Mode
                            </Label>
                            <Select
                              value={cautionMode}
                              onValueChange={(
                                val: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD',
                              ) => setCautionMode(val)}
                            >
                              <SelectTrigger className="h-10 border-border font-bold text-xs">
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
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                              {cautionMode === 'CHEQUE' ? 'Cheque Number *' : 'Reference'}
                            </Label>
                            {cautionMode === 'CHEQUE' ? (
                              <Input
                                value={cautionChequeNumber}
                                onChange={(e) => setCautionChequeNumber(e.target.value)}
                                placeholder="e.g., CHQ-005678"
                                required
                                className="h-10 border-border font-bold text-xs"
                              />
                            ) : (
                              <div className="h-10 flex items-center px-3 rounded-md border border-dashed border-border bg-muted text-[11px] text-muted-foreground italic">
                                Auto-generated — {autoReferencePreview(cautionMode)}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Cheque-specific fields for Security Deposit */}
                  {cautionAmount && Number(cautionAmount) > 0 && cautionMode === 'CHEQUE' && (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-warning">
                        Cheque Details — Security Deposit Cheque
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Customer&apos;s Bank *
                          </Label>
                          <Input
                            value={cautionChequeBankName}
                            onChange={(e) => setCautionChequeBankName(e.target.value)}
                            placeholder="e.g., QNB"
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Cheque Received Date *
                          </Label>
                          <Input
                            type="date"
                            value={cautionChequeReceivedDate}
                            onChange={(e) => setCautionChequeReceivedDate(e.target.value)}
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                            Cheque Date * (earliest deposit)
                          </Label>
                          <Input
                            type="date"
                            value={cautionChequeDate}
                            onChange={(e) => setCautionChequeDate(e.target.value)}
                            required
                            className="h-10 border-border font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Payment Summary ──────────────────────────────────────────────── */}
              {advanceBase > 0 ||
              (cautionAmount && Number(cautionAmount) > 0) ||
              prefilledCaution > 0 ? (
                <div className="p-4 bg-muted/60 rounded-2xl border border-border/80 space-y-2">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Payment Summary
                  </h4>
                  {rentAdvancePortion > 0 && (
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">{advanceLabel}</span>
                      <span className="text-foreground">
                        {currency} {rentAdvancePortion.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {accessoryTotal > 0 && (
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-info">Accessories ({accessoryItems.length})</span>
                      <span className="text-foreground">
                        {currency} {accessoryTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {advanceTaxAmount > 0 && (
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">
                        {quotation.taxName || 'VAT'} ({advanceTaxPercent}%)
                      </span>
                      <span className="text-foreground">
                        {currency} {advanceTaxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {cautionAmount && Number(cautionAmount) > 0 && (
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="text-foreground">
                        {currency} {Number(cautionAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {/* Deposit required by the quotation but not being collected right now —
                      make that explicit rather than silently saying nothing, so it's clear
                      this is a deliberate deferral (to Technician/Finance) and not a missed
                      step. */}
                  {prefilledCaution > 0 && !(cautionAmount && Number(cautionAmount) > 0) && (
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-warning">Security Deposit</span>
                      <span className="text-warning">
                        {currency} {prefilledCaution.toFixed(2)} —{' '}
                        {depositTiming === 'ON_INSTALLATION'
                          ? 'Technician collects at installation'
                          : 'Not collected now'}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2 flex justify-between text-[12px] font-black">
                    <span className="text-foreground uppercase tracking-wider">
                      Total Initial Collection
                    </span>
                    <span className="text-success">
                      {currency} {(advanceInclTax + Number(cautionAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Remarks Section */}
              <div className="p-3 bg-muted/20 rounded-xl border border-border">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  Remarks / Notes
                </Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional conversion remarks..."
                  className="h-10 border-border font-bold text-xs"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Confirmation ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 py-4 text-center">
              <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-success" />
              </div>
              <h3 className="text-lg font-black text-foreground">Final Confirmation</h3>
              <p className="text-xs font-bold text-muted-foreground px-6 leading-relaxed">
                You are about to convert this quotation into a live
                <span className="text-success uppercase mx-1">{saleLabel}</span>
                contract. Physical inventory will be allocated and the ledger account will be
                initialized.
              </p>

              <div className="bg-muted p-4 rounded-2xl border border-border text-left space-y-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest">Type</span>
                  <span className="text-foreground">{saleLabel}</span>
                </div>
                {rentAdvancePortion > 0 && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">
                      {advanceLabel}
                    </span>
                    <span className="text-success font-black">
                      {currency} {rentAdvancePortion.toFixed(2)}
                    </span>
                  </div>
                )}
                {accessoryTotal > 0 && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">
                      Accessories
                    </span>
                    <span className="text-info font-black">
                      {currency} {accessoryTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                {advanceTaxAmount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">
                      {quotation.taxName || 'VAT'} ({advanceTaxPercent}%)
                    </span>
                    <span className="text-success font-black">
                      {currency} {advanceTaxAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {cautionAmount && Number(cautionAmount) > 0 && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">
                      Security Deposit
                    </span>
                    <span className="text-primary font-black">
                      {currency} {Number(cautionAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                {prefilledCaution > 0 && !(cautionAmount && Number(cautionAmount) > 0) && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">
                      Security Deposit
                    </span>
                    <span className="text-warning font-black">
                      {currency} {prefilledCaution.toFixed(2)} —{' '}
                      {depositTiming === 'ON_INSTALLATION' ? 'At installation' : 'Deferred'}
                    </span>
                  </div>
                )}
                {advanceBase > 0 && cautionAmount && Number(cautionAmount) > 0 && (
                  <div className="flex justify-between text-[11px] font-black border-t border-border pt-2 mt-1">
                    <span className="text-foreground uppercase tracking-widest">
                      Total Initial Collection
                    </span>
                    <span className="text-success">
                      {currency} {(advanceInclTax + Number(cautionAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest">
                    Allocated Units
                  </span>
                  <span className="text-foreground">
                    {serialUpdates.filter((u) => u.productId).length} / {allocatableItems.length}
                  </span>
                </div>

                {serialUpdates.filter((u) => u.productId).length > 0 && (
                  <div className="pt-3 mt-3 border-t border-border/60 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
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
                            className="bg-card p-2.5 rounded-lg border border-border flex flex-col gap-1 shadow-sm"
                          >
                            <span
                              className="text-xs font-bold text-foreground line-clamp-1"
                              title={sparePart?.part_name || product?.name || update.description}
                            >
                              {sparePart?.part_name || product?.name || update.description}
                            </span>
                            <div className="flex items-center gap-2">
                              {update.isSparePart ? (
                                <span className="text-[10px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  SKU: {sparePart?.sku || update.productId}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  S/N: {product ? product.serial_no : 'Unknown'}
                                </span>
                              )}
                              {(sparePart?.brand || product?.brand) && (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
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
        <div className="p-5 bg-muted border-t border-border flex justify-between gap-3">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            disabled={isSubmitting}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={step === 3 ? handleConfirm : () => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={
              isSubmitting ||
              (step === 1 && allocatableItems.length > 0 && serialUpdates.some((u) => !u.productId))
            }
            className="bg-success hover:bg-success/90 text-success-foreground font-black text-[10px] uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-success/10"
          >
            {/* Keep a word next to the spinner: an icon-only button reads as "stuck", not
                "working", and invites the second click this whole flow is guarding against. */}
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Processing…
              </>
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
