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
import { Loader2, Plus, Receipt, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface InvoiceAccountViewProps {
  invoiceId: string;
  onClose: () => void;
  open: boolean;
}

export function InvoiceAccountView({ invoiceId, onClose, open }: InvoiceAccountViewProps) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSummary = async () => {
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
  };

  useEffect(() => {
    if (open && invoiceId) {
      fetchSummary();
      setShowForm(false);
    }
  }, [open, invoiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (summary && Number(amountPaid) > summary.pendingBalance + 0.01) {
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
      });
      toast.success('Payment recorded successfully');
      setShowForm(false);
      setAmountPaid('');
      setReferenceNumber('');
      setRemarks('');
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
                  {formatCurrency(summary.totalAmount)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Invoice: {summary.invoiceNumber}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-green-600 uppercase">Total Paid</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(summary.totalPaid)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-orange-600 uppercase">Pending Balance</p>
                <p className="text-xl font-bold text-orange-700">
                  {formatCurrency(summary.pendingBalance)}
                </p>
              </div>
            </div>

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
                    <label className="text-xs font-bold text-slate-500">Amount Paid (QAR)</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      max={summary.pendingBalance}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={`Max: ${summary.pendingBalance.toFixed(2)}`}
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
                      Reference Number (Optional)
                    </label>
                    <Input
                      placeholder="e.g., TXN-123456"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Remarks (Optional)</label>
                  <Textarea
                    placeholder="Any notes about this payment..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                  />
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
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
                          {formatCurrency(p.amountPaid)}
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
