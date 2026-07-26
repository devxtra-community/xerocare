'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/format';
import { useExchangeRateMap, formatDualCurrency } from '@/lib/dualCurrency';
import { CreditCard, Calendar, FileText, Hash, Paperclip, X } from 'lucide-react';
import { createCheque, fetchCashBankAccounts } from '@/lib/finance/accountsApi';
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
  /** Currency totalAmount/remainingAmount are recorded in (purchase.currencyCode) — may differ
   * from the branch currency the payment amount below is actually collected in. */
  purchaseCurrency?: string | null;
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
  purchaseCurrency,
  exchangeRate,
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
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([]);
  const [paidFromAccount, setPaidFromAccount] = useState('');
  const [formData, setFormData] = useState<AddPaymentDto>({
    amount: 0,
    paymentMethod: 'Bank Transfer',
    description: '',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      getMyBranch()
        .then((branch) => setCurrencyCode(branch?.currency_code || 'AED'))
        .catch(() => setCurrencyCode('AED'));
      fetchCashBankAccounts()
        .then((accs) => {
          setAccounts(accs);
          if (accs.length > 0 && !paidFromAccount) setPaidFromAccount(accs[0].id);
        })
        .catch(() => setAccounts([]));
    } else {
      setAttachment(null);
    }
  }, [open, paidFromAccount]);

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

    if (Number(formData.amount) > remainingAmount + 0.01) {
      toast.error(
        `Amount exceeds remaining payable: ${formatCurrency(remainingAmount, currencyCode)}`,
      );
      setLoading(false);
      return;
    }

    const isCheque = formData.paymentMethod === 'Cheque';
    if (isCheque && (!chequeNumber || !chequeBankName || !chequeDueDate)) {
      toast.error('Cheque number, bank name, and due date are required for cheque payments');
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
            referenceNumber: isCheque ? chequeNumber : formData.referenceNumber,
            paymentDate: formData.paymentDate,
            currency: currencyCode,
          },
          attachment,
        );

        if (isCheque) {
          toast.success(
            'PENDING cheque created. Go to Accounts → Cheques to issue when handed to vendor.',
          );
        } else {
          toast.success(
            'Payment request submitted for Finance approval. Funds will be deducted once approved.',
          );
        }
      } else {
        // Finance / Admin — immediate payment, existing flow
        await purchaseService.addPayment(
          purchaseId,
          {
            ...formData,
            referenceNumber: isCheque ? chequeNumber : formData.referenceNumber,
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
      <DialogContent className="sm:max-w-[450px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="bg-slate-900 px-6 py-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="text-blue-400" />
              Add Vendor Payment
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-slate-400 text-xs">
            Remaining to pay:{' '}
            <span className="text-white font-bold">
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
          </div>
          {isForeignPurchase && (
            <p className="mt-1.5 text-[11px] text-amber-300">
              This purchase is recorded in {purchaseCurrency}. Enter the payment amount below in{' '}
              {currencyCode} — the branch&apos;s currency.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase">
              Payment Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currencyCode}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="pl-12 h-11 text-lg font-bold border-slate-200 focus:ring-primary"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                autoFocus
              />
            </div>
            {formData.amount > 0 && formData.amount < remainingAmount && (
              <p className="text-[10px] text-yellow-600 font-medium italic">
                Partial payment recognized
              </p>
            )}
            {formData.amount >= remainingAmount - 0.01 &&
              formData.amount <= remainingAmount + 0.01 && (
                <p className="text-[10px] text-green-600 font-medium italic">
                  Full payment recognized
                </p>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Date
              </Label>
              <Input
                type="date"
                required
                className="h-10 text-xs border-slate-200"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Hash size={12} /> Ref #
              </Label>
              <Input
                placeholder="TRX..."
                className="h-10 text-xs border-slate-200"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
            >
              <SelectTrigger className="h-10 text-xs border-slate-200">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {['Bank Transfer', 'Cash', 'Credit Card', 'Cheque', 'Online Payment'].map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.paymentMethod !== 'Cheque' && accounts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Pay From Account</Label>
              <Select value={paidFromAccount} onValueChange={setPaidFromAccount}>
                <SelectTrigger className="h-10 text-xs border-slate-200">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.paymentMethod === 'Cheque' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-bold text-amber-700">
                Cheque details — creates a PENDING issued cheque. Cash at Bank moves only when
                Finance marks it Cleared.
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  Cheque Number *
                </Label>
                <Input
                  required
                  placeholder="e.g. CHQ-001234"
                  className="h-10 text-xs border-slate-200"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Our Bank *</Label>
                  <Input
                    required
                    placeholder="e.g. Emirates NBD"
                    className="h-10 text-xs border-slate-200"
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Due Date *</Label>
                  <Input
                    type="date"
                    required
                    className="h-10 text-xs border-slate-200"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <FileText size={12} /> Description
            </Label>
            <Input
              placeholder="e.g. Advance payment for shipping"
              className="h-10 text-xs border-slate-200"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
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
              <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs">
                <span className="truncate text-slate-700 font-medium">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-primary hover:text-primary transition-colors"
              >
                Attach receipt image or PDF (optional)
              </button>
            )}
          </div>

          {getUserFromToken()?.role === 'MANAGER' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Payment requests require Finance approval before funds are deducted. Outstanding
              balance updates immediately; cash moves only after approval.
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 font-bold"
              disabled={loading}
            >
              {loading
                ? 'Submitting...'
                : getUserFromToken()?.role === 'MANAGER'
                  ? 'Request Payment Approval'
                  : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
