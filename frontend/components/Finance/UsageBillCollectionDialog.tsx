'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  collectPendingUsagePayment,
  generateSalePaymentReceipt,
  sendReceiptEmail,
  sendReceiptWhatsApp,
  type SalePaymentRequest,
} from '@/lib/saleWorkflow';
import {
  fetchCashBankAccounts,
  filterAccountsByPaymentMode,
  CashBankAccount,
} from '@/lib/finance/accountsApi';
import { Loader2, Coins, Mail, MessageSquare, FileDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, autoReferencePreview } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getApiErrorMessage } from '@/lib/apiError';

export interface CollectionTarget {
  usageRecordId: string;
  invoiceNumber: string;
  amountPending: number;
}

interface Props {
  target: CollectionTarget | null;
  onClose: () => void;
  /** Fires once the collection is submitted for approval — refresh-only. */
  onCollected?: () => void;
}

/**
 * Stage B collection form — shared by UsageHistoryDialog and BillsDrilldownModal (the AR
 * "View Bills" drilldown), so both go through the exact same record → decoupled-receipt
 * flow rather than separate copies of this dialog.
 * "Submit for Approval" creates a PENDING SalePaymentRequest — the server enforces that the
 * bill must be Customer Approved first (see collectPendingUsagePayment's gate).
 */
export function UsageBillCollectionDialog({ target, onClose, onCollected }: Props) {
  const currency = useBranchCurrency();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashAccountId, setCashAccountId] = useState('');
  const [cashAccounts, setCashAccounts] = useState<CashBankAccount[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [justCollected, setJustCollected] = useState<SalePaymentRequest | null>(null);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [sendingReceiptVia, setSendingReceiptVia] = useState<'email' | 'whatsapp' | null>(null);

  useEffect(() => {
    if (!target) return;
    fetchCashBankAccounts({ skipErrorToast: true })
      .then(setCashAccounts)
      .catch(() => setCashAccounts([]));
    setAmount(String(target.amountPending.toFixed(2)));
    setPaymentMode('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setChequeNumber('');
    setChequeBankName('');
    setChequeDueDate('');
    setChequeDate(new Date().toISOString().split('T')[0]);
    setCashAccountId('');
  }, [target]);

  const handleCollect = async () => {
    if (!target || !amount) return;
    const requested = Number(amount);
    if (requested <= 0 || requested > target.amountPending + 0.01) {
      toast.error(`Amount must be between 0 and ${formatCurrency(target.amountPending, currency)}`);
      return;
    }
    setIsSaving(true);
    try {
      const request = await collectPendingUsagePayment(target.usageRecordId, {
        amount: requested,
        paymentMode,
        paymentDate,
        referenceNumber: paymentMode === 'CHEQUE' ? undefined : referenceNumber || undefined,
        cashAccountId: paymentMode === 'CHEQUE' ? undefined : cashAccountId || undefined,
        chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber : undefined,
        chequeBankName: paymentMode === 'CHEQUE' ? chequeBankName : undefined,
        chequeDueDate: paymentMode === 'CHEQUE' ? chequeDueDate : undefined,
        chequeDate: paymentMode === 'CHEQUE' ? chequeDate : undefined,
      });
      toast.success('Collection recorded', { description: 'Submitted to Accounts for approval.' });
      onCollected?.();
      setJustCollected(request);
    } catch (err) {
      toast.error('Failed to record collection', { description: getApiErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!justCollected) return;
    setGeneratingReceipt(true);
    try {
      if (justCollected.receiptUrl) {
        window.open(justCollected.receiptUrl, '_blank');
        return;
      }
      const { receiptUrl } = await generateSalePaymentReceipt(justCollected.id);
      setJustCollected((prev) => (prev ? { ...prev, receiptUrl } : prev));
      window.open(receiptUrl, '_blank');
    } catch (err) {
      toast.error('Failed to generate receipt', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const handleSendReceipt = async (channel: 'email' | 'whatsapp') => {
    if (!justCollected) return;
    setSendingReceiptVia(channel);
    try {
      const result =
        channel === 'email'
          ? await sendReceiptEmail(justCollected.id)
          : await sendReceiptWhatsApp(justCollected.id);
      toast.success(`Receipt sent via ${channel === 'email' ? 'email' : 'WhatsApp'}`, {
        description: `Sent to ${result.recipient}`,
      });
    } catch (err) {
      toast.error(`Failed to send receipt via ${channel}`, {
        description: getApiErrorMessage(err),
      });
    } finally {
      setSendingReceiptVia(null);
    }
  };

  const closeAll = () => {
    setJustCollected(null);
    onClose();
  };

  return (
    <>
      {/* justCollected excluded from this dialog's own open condition so it closes the
          instant the receipt hand-off dialog below opens, instead of stacking both. */}
      <Dialog open={!!target && !justCollected} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Add Collect Amount</DialogTitle>
          <div className="bg-white p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                <Coins size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Add Collect Amount
                </p>
                <p className="text-base font-black text-slate-800">{target?.invoiceNumber}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Amount (max {target ? formatCurrency(target.amountPending, currency) : ''})
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={target?.amountPending}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Date
                </Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-sm font-bold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payment Mode
              </Label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE');
                  setCashAccountId('');
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-bold"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            {paymentMode === 'CHEQUE' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cheque No.
                  </Label>
                  <Input
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Bank Name
                  </Label>
                  <Input
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cheque Date
                  </Label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Reference
                  </Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                    Auto-generated on save — {autoReferencePreview(paymentMode)}
                  </div>
                </div>
                {(() => {
                  const matching = filterAccountsByPaymentMode(cashAccounts, paymentMode);
                  return (
                    matching.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Account (optional)
                        </Label>
                        <select
                          value={cashAccountId}
                          onChange={(e) => setCashAccountId(e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-bold"
                        >
                          <option value="">Select...</option>
                          {matching.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} — {a.currency}{' '}
                              {Number(a.currentBalance).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  );
                })()}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9 text-xs font-black" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-9 text-xs font-black bg-primary hover:bg-primary/90"
                onClick={handleCollect}
                disabled={isSaving || !amount}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Approval'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Immediate receipt option after collecting — decoupled from Accounts approval */}
      {justCollected && (
        <Dialog open={!!justCollected} onOpenChange={(v) => !v && closeAll()}>
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
            <DialogTitle className="sr-only">Collection Recorded</DialogTitle>
            <div className="bg-linear-to-r from-emerald-600 to-emerald-500 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Coins size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                    Collected
                  </p>
                  <p className="text-base font-black">
                    {formatCurrency(justCollected.amount, justCollected.currency)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                {justCollected.requestNo} has been submitted to Accounts for approval. You can send
                the customer a receipt now — it won&apos;t move Cash in Hand/Bank or the
                invoice&apos;s Paid figure until Accounts actually approves it.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs font-bold gap-1"
                  onClick={handleGenerateReceipt}
                  disabled={generatingReceipt}
                >
                  {generatingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : justCollected.receiptUrl ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  {justCollected.receiptUrl ? 'View Receipt' : 'Generate Receipt'}
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handleSendReceipt('email')}
                  disabled={sendingReceiptVia === 'email'}
                  title="Email receipt to customer"
                >
                  {sendingReceiptVia === 'email' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handleSendReceipt('whatsapp')}
                  disabled={sendingReceiptVia === 'whatsapp'}
                  title="WhatsApp receipt to customer"
                >
                  {sendingReceiptVia === 'whatsapp' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                className="w-full h-9 text-xs font-black bg-slate-800 hover:bg-slate-900"
                onClick={closeAll}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
