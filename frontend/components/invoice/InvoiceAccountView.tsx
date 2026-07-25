'use client';

import React, { useEffect, useState } from 'react';
import { PaymentSummary, recordPayment, getAccountSummary } from '@/lib/payment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Receipt, AlertCircle, Paperclip, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getCustomerById, type CustomerBankAccount } from '@/lib/customer';
import { useExchangeRateMap, convertAmount, formatDualCurrency } from '@/lib/dualCurrency';
import { currencyOptions } from '@/lib/currencyList';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

interface InvoiceAccountViewProps {
  invoiceId: string;
  onClose: () => void;
  open: boolean;
}

export function InvoiceAccountView({ invoiceId, onClose, open }: InvoiceAccountViewProps) {
  const currency = useBranchCurrency();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const invoiceCurrency = summary?.currency || currency;
  const rates = useExchangeRateMap(invoiceCurrency);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Customer bank account + currency (Part 4: pay-from-customer-bank-account,
  // currency defaults from the selected account but stays overridable)
  const [customerBankAccounts, setCustomerBankAccounts] = useState<CustomerBankAccount[]>([]);
  const [selectedBankAccountIdx, setSelectedBankAccountIdx] = useState<string>('');
  const [paidCurrency, setPaidCurrency] = useState('');

  useEffect(() => {
    if (!open || !summary?.customerId) {
      setCustomerBankAccounts([]);
      return;
    }
    getCustomerById(summary.customerId)
      .then((c) => setCustomerBankAccounts(c.bankAccounts || []))
      .catch(() => setCustomerBankAccounts([]));
  }, [open, summary?.customerId]);

  useEffect(() => {
    if (summary?.currency && !paidCurrency) setPaidCurrency(summary.currency);
  }, [summary?.currency, paidCurrency]);

  const fetchSummary = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccountSummary(invoiceId);
      setSummary(data);
    } catch (error) {
      toast.error('Failed to load account summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (open && invoiceId) {
      fetchSummary();
      setShowForm(false);
    }
  }, [open, invoiceId, fetchSummary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const isForeignCurrency = paidCurrency && paidCurrency !== invoiceCurrency;
    let exchangeRate: number | undefined;
    if (isForeignCurrency) {
      exchangeRate = rates.get(paidCurrency);
      if (!exchangeRate) {
        toast.error(
          `No exchange rate on file for ${paidCurrency} → ${invoiceCurrency}. Add one under Accounts → Exchange Rates first.`,
        );
        return;
      }
    }
    const amountInInvoiceCurrency = isForeignCurrency
      ? Number(amountPaid) * (exchangeRate as number)
      : Number(amountPaid);

    if (summary && amountInInvoiceCurrency > summary.pendingBalance + 0.01) {
      toast.error('Amount cannot exceed pending balance');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment({
        invoiceId,
        amountPaid: Number(amountPaid),
        paymentMode,
        paymentDate,
        referenceNumber,
        remarks,
        receiptFile,
        chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber : undefined,
        chequeBankName: paymentMode === 'CHEQUE' ? chequeBankName : undefined,
        chequeDueDate: paymentMode === 'CHEQUE' ? chequeDueDate : undefined,
        chequeDate: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        currency: paidCurrency || undefined,
        exchangeRate,
      });
      toast.success(
        paymentMode === 'CHEQUE'
          ? 'Cheque recorded (PENDING). Go to Accounts → Cheques to deposit when cleared.'
          : 'Payment recorded successfully',
      );
      setShowForm(false);
      setAmountPaid('');
      setReferenceNumber('');
      setRemarks('');
      setReceiptFile(null);
      setChequeNumber('');
      setChequeBankName('');
      setChequeDueDate('');
      setChequeDate(new Date().toISOString().split('T')[0]);
      setSelectedBankAccountIdx('');
      setPaidCurrency(summary?.currency || invoiceCurrency);
      fetchSummary();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Receipt className="text-primary" />
            Sales Finance Account
          </DialogTitle>
          <DialogDescription>Track advances and partial payments for this sale.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading account details...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-500 uppercase">Total Amount</p>
                <p className="text-xl font-bold text-slate-800">
                  {formatCurrency(summary.totalAmount, invoiceCurrency)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Invoice: {summary.invoiceNumber}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-green-600 uppercase">Total Paid</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(summary.totalPaid, invoiceCurrency)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-orange-600 uppercase">Pending Balance</p>
                <p className="text-xl font-bold text-orange-700">
                  {formatCurrency(summary.pendingBalance, invoiceCurrency)}
                </p>
              </div>
            </div>

            {summary.currencyWarnings && summary.currencyWarnings.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {summary.currencyWarnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-card border rounded-lg p-3">
              <h3 className="font-bold text-slate-700 px-2">Payment Ledger</h3>
              {summary.pendingBalance > 0 && (
                <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-primary">
                  <Plus size={16} /> Record Payment
                </Button>
              )}
            </div>

            {/* Payment Form */}
            {showForm && summary.pendingBalance > 0 && (
              <form
                onSubmit={handleSubmit}
                className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4 duration-200"
              >
                <h4 className="font-bold text-slate-700">Record New Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">
                      Amount Paid ({paidCurrency || invoiceCurrency})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={
                        paidCurrency && paidCurrency !== invoiceCurrency
                          ? 'Enter amount in the currency paid'
                          : `Max: ${summary.pendingBalance.toFixed(2)}`
                      }
                    />
                    {paidCurrency &&
                      paidCurrency !== invoiceCurrency &&
                      Number(amountPaid) > 0 &&
                      (() => {
                        const converted = convertAmount(
                          Number(amountPaid),
                          paidCurrency,
                          invoiceCurrency,
                          rates,
                        );
                        return converted !== null ? (
                          <p className="text-[11px] text-muted-foreground">
                            ≈ {formatCurrency(converted, invoiceCurrency)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-red-500">
                            No exchange rate on file for {paidCurrency} → {invoiceCurrency}
                          </p>
                        );
                      })()}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Currency Paid In</label>
                    <SearchableSelect
                      options={currencyOptions()}
                      value={paidCurrency}
                      onValueChange={setPaidCurrency}
                      placeholder="Currency"
                      emptyText="No currency found."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Payment Mode</label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Payment Date</label>
                    <Input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">
                      {paymentMode === 'CHEQUE' ? 'Cheque Number *' : 'Reference Number (Optional)'}
                    </label>
                    <Input
                      placeholder={
                        paymentMode === 'CHEQUE' ? 'e.g., CHQ-001234' : 'e.g., TXN-123456'
                      }
                      required={paymentMode === 'CHEQUE'}
                      value={paymentMode === 'CHEQUE' ? chequeNumber : referenceNumber}
                      onChange={(e) =>
                        paymentMode === 'CHEQUE'
                          ? setChequeNumber(e.target.value)
                          : setReferenceNumber(e.target.value)
                      }
                    />
                  </div>
                </div>
                {(paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE') &&
                  customerBankAccounts.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">
                        Pay From Customer Bank Account (Optional)
                      </label>
                      <Select
                        value={selectedBankAccountIdx}
                        onValueChange={(idx) => {
                          setSelectedBankAccountIdx(idx);
                          const acc = customerBankAccounts[Number(idx)];
                          if (acc) {
                            if (acc.currency) setPaidCurrency(acc.currency);
                            if (paymentMode === 'CHEQUE' && acc.bankName) {
                              setChequeBankName(acc.bankName);
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select the customer's saved bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerBankAccounts.map((acc, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {acc.bankName} — {acc.currency || 'no currency set'}
                              {acc.bankCountry ? ` (${acc.bankCountry})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                {/* Cheque-specific fields */}
                {paymentMode === 'CHEQUE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="col-span-full text-xs font-bold text-amber-700">
                      Cheque details — this will create a PENDING cheque record. Cash at Bank
                      increases only when you deposit the cheque in Accounts → Cheques.
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">
                        Name of the Customer&apos;s Bank *
                      </label>
                      <Input
                        placeholder="e.g., Emirates NBD"
                        required
                        value={chequeBankName}
                        onChange={(e) => setChequeBankName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">
                        Cheque Date * <span className="font-normal">(date on the cheque)</span>
                      </label>
                      <Input
                        type="date"
                        required
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">Cheque Due Date *</label>
                      <Input
                        type="date"
                        required
                        value={chequeDueDate}
                        onChange={(e) => setChequeDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Remarks (Optional)</label>
                  <Textarea
                    placeholder="Any notes about this payment..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Payment Proof (Optional) — screenshot or PDF receipt
                  </label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {receiptFile && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Paperclip size={12} /> {receiptFile.name}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Save Payment
                  </Button>
                </div>
              </form>
            )}

            {/* Ledger Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Ref/Remarks</th>
                    <th className="px-4 py-3">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No payments recorded yet
                      </td>
                    </tr>
                  ) : (
                    summary.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-green-600">
                          {formatDualCurrency(
                            p.amountPaid,
                            p.currencyCode || invoiceCurrency,
                            invoiceCurrency,
                            rates,
                            p.exchangeRateSnapshot,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold">{p.referenceNumber || '-'}</p>
                          {p.remarks && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{p.remarks}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.receiptUrl ? (
                            <a
                              href={p.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <FileText size={12} /> View
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
