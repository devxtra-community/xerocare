'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { costLineForType } from '@/lib/purchaseCostTypes';
import { PURCHASE_COST_TYPES } from '@/lib/purchaseCostTypes';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseService, AddPaymentDto } from '@/services/purchaseService';
import { getMyBranch } from '@/lib/branch';
import { toast } from 'sonner';
import { formatCurrency, autoReferencePreview } from '@/lib/format';
import { useExchangeRateMap, formatDualCurrency } from '@/lib/dualCurrency';
import { CreditCard, Calendar, FileText, Hash, Paperclip, X } from 'lucide-react';
import {
  createCheque,
  fetchCashBankAccounts,
  filterAccountsByPaymentMode,
  accountTypeForPaymentMode,
  insufficientBalanceError,
} from '@/lib/finance/accountsApi';
import { createManagerPurchasePaymentRequest } from '@/lib/employeeExpenses';
import { getUserFromToken } from '@/lib/auth';

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  purchaseRef?: string; // PO number or description for cheque source label
  vendorName?: string;
  /** Vendor payable amount (purchase.purchaseAmount) — the goods invoice total.
   * Additional lot costs (shipping, handling, documentation, ...) are spend with
   * other parties and are never payable through the vendor, so they must not be
   * included here. */
  payableAmount: number;
  paidAmount: number;
  /** Domestic input VAT inside the invoice that Accounts settles through the Tax Report
   *  rather than by paying the vendor. Shown so the smaller vendor figure is explained
   *  rather than looking like the invoice was mis-entered. */
  taxSettledSeparately?: number;
  /** Currency totalAmount/remainingAmount are recorded in (purchase.currencyCode) — may differ
   * from the branch currency the payment amount below is actually collected in. */
  purchaseCurrency?: string | null;
  /** What the lot already carries per cost category, so the Additional Cost mode can
   *  show the running figure rather than asking for an amount blind. Each line sums the
   *  purchase's typed column and any itemised rows of that kind. */
  existingCostLines?: { label: string; typed: number; itemised: number; total: number }[];
  exchangeRate?: number | null;
  onSuccess: () => void;
}

export default function AddPaymentModal({
  open,
  onOpenChange,
  purchaseId,
  purchaseRef,
  vendorName,
  payableAmount,
  paidAmount,
  taxSettledSeparately = 0,
  purchaseCurrency,
  exchangeRate,
  existingCostLines = [],
  onSuccess,
}: AddPaymentModalProps) {
  const remainingAmount = Math.max(0, payableAmount - paidAmount);
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('AED');
  const rates = useExchangeRateMap(currencyCode);
  const isForeignPurchase = !!purchaseCurrency && purchaseCurrency !== currencyCode;
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [accounts, setAccounts] = useState<
    { id: string; name: string; type: string; currentBalance: number; currency: string }[]
  >([]);
  const [paidFromAccount, setPaidFromAccount] = useState('');
  // What this payment settles. A vendor payment reduces the vendor's invoice; an
  // additional cost pays a third party (freight forwarder, labourer, broker) and leaves
  // the vendor's outstanding untouched, so the two are capped and posted differently.
  const [payFor, setPayFor] = useState<'VENDOR' | 'COST'>('VENDOR');
  const [costType, setCostType] = useState<string>('Shipping');
  const [customCostType, setCustomCostType] = useState('');
  const [formData, setFormData] = useState<AddPaymentDto>({
    amount: 0,
    paymentMethod: 'Bank Transfer',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      getMyBranch()
        .then((branch) => setCurrencyCode(branch?.currency_code || 'AED'))
        .catch(() => setCurrencyCode('AED'));
      fetchCashBankAccounts()
        .then((accs) => setAccounts(accs))
        .catch(() => setAccounts([]));
    } else {
      setAttachment(null);
      setPaidFromAccount('');
      setPayFor('VENDOR');
      setCostType('Shipping');
      setCustomCostType('');
    }
    // Only re-run on open/close — account selection itself is driven by the
    // payment-method effect below, not by re-fetching.
  }, [open]);

  // Only ever offer accounts that match the selected Payment Method — Cash mode
  // shows Cash-type accounts, everything else shows Bank-type accounts. Whenever the
  // method changes (or the account list first loads), drop a now-invalid selection
  // and default to the first matching account rather than leaving a stale, mismatched
  // one selected.
  // What this lot already carries for the cost type being entered, and across all of
  // them — so the manager adds to a known figure instead of guessing.
  const selectedCostLine = useMemo(() => {
    const label = costType === 'Other' ? costLineForType(customCostType) : costType;
    return existingCostLines.find((l) => l.label === label) ?? null;
  }, [costType, customCostType, existingCostLines]);

  const totalExistingCosts = useMemo(
    () => existingCostLines.reduce((sum, l) => sum + l.total, 0),
    [existingCostLines],
  );

  const matchingAccounts = filterAccountsByPaymentMode(accounts, formData.paymentMethod);
  useEffect(() => {
    if (matchingAccounts.some((a) => a.id === paidFromAccount)) return;
    setPaidFromAccount(matchingAccounts[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentMethod, accounts]);

  const selectedAccount = accounts.find((a) => a.id === paidFromAccount);
  const balanceError =
    formData.paymentMethod !== 'Cheque'
      ? insufficientBalanceError(Number(formData.amount), selectedAccount)
      : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) {
      toast.error('Only images or PDF receipts are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setAttachment(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (Number(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    // Only a vendor payment is capped by the vendor's outstanding. An additional cost is
    // owed to a different party entirely, so capping it against the vendor's invoice
    // would refuse a perfectly real freight bill on a fully-paid lot.
    if (payFor === 'VENDOR' && Number(formData.amount) > remainingAmount + 0.01) {
      toast.error(
        `Amount exceeds remaining payable: ${formatCurrency(remainingAmount, currencyCode)}`,
      );
      setLoading(false);
      return;
    }

    const resolvedCostType =
      payFor === 'COST' ? (costType === 'Other' ? customCostType.trim() : costType) : undefined;

    if (payFor === 'COST' && !resolvedCostType) {
      toast.error('Enter a name for this cost');
      setLoading(false);
      return;
    }

    const isCheque = formData.paymentMethod === 'Cheque';
    if (isCheque && (!chequeNumber || !chequeBankName || !chequeDueDate)) {
      toast.error('Cheque number, bank name, and due date are required for cheque payments');
      setLoading(false);
      return;
    }

    if (balanceError) {
      toast.error(balanceError);
      setLoading(false);
      return;
    }

    const currentUser = getUserFromToken();
    if (!currentUser) {
      toast.error('Session expired. Please refresh and log in again.');
      setLoading(false);
      return;
    }
    const isManager = currentUser.role === 'MANAGER';

    if (isManager && !isCheque && !paidFromAccount) {
      toast.error(
        'No payment account loaded. Please wait for accounts to load or contact Finance to add a Cash/Bank account for your branch.',
      );
      setLoading(false);
      return;
    }

    try {
      if (isManager) {
        // Manager payments always go through the Finance approval queue.
        // PurchasePayment is recorded immediately in ven_inv (outstanding reduces),
        // but cash is held until Finance approves.
        await createManagerPurchasePaymentRequest(
          {
            purchaseId,
            purchaseRef: purchaseRef || undefined,
            vendorName: vendorName || undefined,
            amount: formData.amount,
            paymentMethod: formData.paymentMethod,
            paidFromAccountId: !isCheque && paidFromAccount ? paidFromAccount : undefined,
            chequeNumber: isCheque ? chequeNumber : undefined,
            chequeBankName: isCheque ? chequeBankName : undefined,
            chequeDueDate: isCheque ? chequeDueDate : undefined,
            description: formData.description || undefined,
            // Non-cheque: left undefined so the backend always generates it (Cash/Bank/
            // Card/Online). Cheque: the cheque number is the reference.
            referenceNumber: isCheque ? chequeNumber : undefined,
            paymentDate: formData.paymentDate,
            currency: currencyCode,
            // Set only for an additional cost — its presence is what tells the approval
            // to record a cost line rather than settle the vendor's invoice.
            purchaseCostType: resolvedCostType,
          },
          attachment,
        );

        if (isCheque) {
          toast.success(
            'PENDING cheque created. Go to Accounts → Cheques to issue when handed to vendor.',
          );
        } else if (payFor === 'COST') {
          toast.success(
            `${resolvedCostType} cost submitted for Finance approval. It will be added to the lot and funds deducted once approved.`,
          );
        } else {
          toast.success(
            'Payment request submitted for Finance approval. Funds will be deducted once approved.',
          );
        }
      } else if (payFor === 'COST') {
        // Finance / Admin recording an additional cost directly. Deliberately NOT
        // addPayment: that would settle the vendor's invoice with money paid to a
        // freight forwarder or a labourer, showing the vendor as paid while the debt
        // was still open.
        await purchaseService.addCost(
          purchaseId,
          {
            amount: formData.amount,
            costType: resolvedCostType as string,
            description: formData.description || undefined,
            costDate: formData.paymentDate,
          },
          attachment,
        );
        toast.success(`${resolvedCostType} cost recorded on this lot`);
      } else {
        // Finance / Admin — immediate payment, existing flow
        await purchaseService.addPayment(
          purchaseId,
          {
            ...formData,
            // Non-cheque: left undefined so the backend always generates it (Cash/Bank/
            // Card/Online). Cheque: the cheque number is the reference.
            referenceNumber: isCheque ? chequeNumber : undefined,
            paidFromAccountId: !isCheque && paidFromAccount ? paidFromAccount : undefined,
          },
          attachment,
        );

        if (isCheque) {
          try {
            await createCheque({
              chequeNo: chequeNumber,
              bankName: chequeBankName,
              partyName: vendorName || 'Vendor',
              amount: formData.amount,
              dueDate: chequeDueDate,
              issueDate: formData.paymentDate,
              type: 'ISSUED',
              description: formData.description || undefined,
              sourceType: 'PURCHASE',
              sourceReferenceId: purchaseId,
              sourceLabel: purchaseRef ? `Purchase ${purchaseRef}` : 'Purchase Order',
            });
          } catch {
            console.warn('[AddPaymentModal] Failed to create linked ISSUED cheque record');
          }
          toast.success(
            'Payment recorded — PENDING cheque created. Go to Accounts → Cheques to issue when handed to vendor.',
          );
        } else {
          toast.success('Payment recorded successfully');
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to record payment',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Capped to the viewport and laid out as a column: the header and the action buttons
          stay put while only the field area scrolls. Without the cap this dialog grew past
          the bottom of the screen — `overflow-hidden` then clipped it with nothing to
          scroll, so on shorter windows the submit button was simply unreachable. */}
      <DialogContent className="sm:max-w-[450px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90dvh]">
        <div className="bg-foreground px-6 py-6 text-primary-foreground shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="text-primary" />
              {payFor === 'COST' ? 'Add Purchase Cost' : 'Add Vendor Payment'}
            </DialogTitle>
          </DialogHeader>
          {payFor === 'COST' ? (
            <div className="mt-2 text-muted-foreground text-xs">
              Paid to a third party — the vendor&apos;s outstanding is unchanged.
            </div>
          ) : (
            <div className="mt-2 text-muted-foreground text-xs">
              Remaining to pay:{' '}
              <span className="text-primary-foreground font-bold">
                {isForeignPurchase
                  ? formatDualCurrency(
                      remainingAmount,
                      purchaseCurrency,
                      currencyCode,
                      rates,
                      exchangeRate,
                    )
                  : formatCurrency(remainingAmount, currencyCode)}
              </span>
              {taxSettledSeparately > 0 && (
                <div className="mt-1 text-[11px] leading-relaxed text-warning">
                  Excludes {formatCurrency(taxSettledSeparately, purchaseCurrency || currencyCode)}{' '}
                  input VAT — settled from Accounts → Tax Report, not paid to the vendor.
                </div>
              )}
            </div>
          )}
          {isForeignPurchase && (
            <p className="mt-1.5 text-[11px] text-warning">
              This purchase is recorded in {purchaseCurrency}. Enter the payment amount below in{' '}
              {currencyCode} — the branch&apos;s currency.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
            {/* What this money settles. The vendor's goods invoice and the lot's other
                costs are owed to different parties, so they are capped differently and
                post to different accounts — asking once here keeps the two apart. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Paying For
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      key: 'VENDOR',
                      label: 'Vendor Invoice',
                      hint: 'Reduces what the vendor is owed',
                    },
                    {
                      key: 'COST',
                      label: 'Additional Cost',
                      hint: 'Shipping, labour, documentation…',
                    },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      setPayFor(o.key);
                      // Cheque is not offered for a cost (see the method list below).
                      if (o.key === 'COST' && formData.paymentMethod === 'Cheque') {
                        setFormData({ ...formData, paymentMethod: 'Bank Transfer' });
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      payFor === o.key
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <span className="block text-sm font-bold text-foreground">{o.label}</span>
                    <span className="block text-[10px] leading-tight text-muted-foreground">
                      {o.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {payFor === 'COST' && (
              <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Cost Type
                  </Label>
                  <Select value={costType} onValueChange={setCostType}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_COST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {costType === 'Other' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Cost Name *
                    </Label>
                    <Input
                      value={customCostType}
                      onChange={(e) => setCustomCostType(e.target.value)}
                      placeholder="e.g. Port storage charges"
                      className="bg-card"
                    />
                  </div>
                )}
                <div className="rounded-lg border border-warning/30 bg-card px-2.5 py-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Already on this lot for{' '}
                      <span className="font-semibold text-foreground">
                        {costType === 'Other'
                          ? costLineForType(customCostType) || 'this cost'
                          : costType}
                      </span>
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(selectedCostLine?.total ?? 0, currencyCode)}
                    </span>
                  </div>
                  {formData.amount > 0 && (
                    <div className="mt-1 flex justify-between border-t border-dashed border-border pt-1">
                      <span className="text-muted-foreground">After this cost</span>
                      <span className="font-bold text-success">
                        {formatCurrency(
                          (selectedCostLine?.total ?? 0) + Number(formData.amount),
                          currencyCode,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between text-muted-foreground">
                    <span>All additional costs on the lot</span>
                    <span className="font-semibold">
                      {formatCurrency(totalExistingCosts, currencyCode)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] leading-snug text-warning">
                  This is added to the lot&apos;s additional costs and posted to its own expense
                  account. It does not reduce the vendor&apos;s balance.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground uppercase">
                {payFor === 'COST' ? 'Cost Amount' : 'Payment Amount'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  {currencyCode}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="pl-12 h-11 text-lg font-bold border-border focus:ring-primary"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  autoFocus
                />
              </div>
              {/* Partial/full only describe progress against the vendor's invoice — a
                  third-party cost settles nothing on it. */}
              {payFor === 'VENDOR' && formData.amount > 0 && formData.amount < remainingAmount && (
                <p className="text-[10px] text-warning font-medium italic">
                  Partial payment recognized
                </p>
              )}
              {payFor === 'VENDOR' &&
                formData.amount >= remainingAmount - 0.01 &&
                formData.amount <= remainingAmount + 0.01 && (
                  <p className="text-[10px] text-success font-medium italic">
                    Full payment recognized
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar size={12} /> Date
                </Label>
                <Input
                  type="date"
                  required
                  className="h-10 text-xs border-border"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>
              {formData.paymentMethod !== 'Cheque' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Hash size={12} /> Ref #
                  </Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground italic">
                    Auto-generated — {autoReferencePreview(formData.paymentMethod)}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Payment Method
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
              >
                <SelectTrigger className="h-10 text-xs border-border">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {/* No Cheque for an additional cost: a Manager's cheque skips the Finance
                      approval queue, and a cleared purchase cheque settles the vendor's
                      invoice rather than recording a cost line. */}
                  {['Bank Transfer', 'Cash', 'Credit Card', 'Cheque', 'Online Payment']
                    .filter((m) => !(payFor === 'COST' && m === 'Cheque'))
                    .map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {formData.paymentMethod !== 'Cheque' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Pay From Account
                </Label>
                {matchingAccounts.length === 0 ? (
                  <p className="text-[11px] font-medium text-destructive">
                    No{' '}
                    {accountTypeForPaymentMode(formData.paymentMethod) === 'CASH'
                      ? 'Cash in Hand'
                      : 'Bank'}{' '}
                    account exists for this branch. Add one under Cash &amp; Bank first.
                  </p>
                ) : (
                  <Select value={paidFromAccount} onValueChange={setPaidFromAccount}>
                    <SelectTrigger className="h-10 text-xs border-border">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name} ({a.type}) — {a.currency}{' '}
                          {Number(a.currentBalance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {balanceError && (
                  <p className="text-[11px] font-medium text-destructive">{balanceError}</p>
                )}
              </div>
            )}

            {formData.paymentMethod === 'Cheque' && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-3">
                <p className="text-xs font-bold text-warning">
                  Cheque details — creates a PENDING issued cheque. Cash at Bank moves only when
                  Finance marks it Cleared.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Cheque Number *
                  </Label>
                  <Input
                    required
                    placeholder="e.g. CHQ-001234"
                    className="h-10 text-xs border-border"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Our Bank *
                    </Label>
                    <Input
                      required
                      placeholder="e.g. Emirates NBD"
                      className="h-10 text-xs border-border"
                      value={chequeBankName}
                      onChange={(e) => setChequeBankName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Cheque Date *
                    </Label>
                    <Input
                      type="date"
                      required
                      title="Earliest date the vendor can present this cheque"
                      className="h-10 text-xs border-border"
                      value={chequeDueDate}
                      onChange={(e) => setChequeDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <FileText size={12} /> Description
              </Label>
              <Input
                placeholder="e.g. Advance payment for shipping"
                className="h-10 text-xs border-border"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Paperclip size={12} /> Receipt / Screenshot
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {attachment ? (
                <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-border bg-muted text-xs">
                  <span className="truncate text-foreground font-medium">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-10 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  Attach receipt image or PDF (optional)
                </button>
              )}
            </div>

            {getUserFromToken()?.role === 'MANAGER' && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                Payment requests require Finance approval before funds are deducted. Outstanding
                balance updates immediately; cash moves only after approval.
              </div>
            )}
          </div>

          {/* Pinned action bar — stays visible no matter how long the form gets. */}
          <div className="shrink-0 flex gap-3 border-t border-border bg-card px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Submitting..."
              className="flex-1 bg-primary hover:bg-primary/90 font-bold"
              disabled={
                loading ||
                !!balanceError ||
                (formData.paymentMethod !== 'Cheque' && matchingAccounts.length === 0)
              }
            >
              {getUserFromToken()?.role === 'MANAGER'
                ? payFor === 'COST'
                  ? 'Request Cost Approval'
                  : 'Request Payment Approval'
                : payFor === 'COST'
                  ? 'Record Cost'
                  : 'Record Payment'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
