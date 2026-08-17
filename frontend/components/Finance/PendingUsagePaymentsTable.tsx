'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  getPendingUsagePayments,
  collectPendingUsagePayment,
  generateSalePaymentReceipt,
  sendReceiptEmail,
  sendReceiptWhatsApp,
  type PendingUsagePayment,
  type SalePaymentRequest,
} from '@/lib/saleWorkflow';
import { fetchCashBankAccounts, CashBankAccount } from '@/lib/finance/accountsApi';
import {
  Loader2,
  RefreshCw,
  PlusCircle,
  Coins,
  Mail,
  MessageSquare,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getApiErrorMessage } from '@/lib/apiError';

/**
 * Finance-side "Pending Payments" tab — one row per Rent/Lease billing period whose full
 * charge hasn't yet been submitted as collections (a partial collection's shortfall, or a
 * period recorded with nothing collected at all). "Add Pending Amount" collects a further
 * amount against that specific period, through the same Accounts-approval gate as every
 * other collection.
 */
export default function PendingUsagePaymentsTable({ mode }: { mode?: 'RENT' | 'LEASE' }) {
  const currency = useBranchCurrency();
  const [rows, setRows] = useState<PendingUsagePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const [target, setTarget] = useState<PendingUsagePayment | null>(null);
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingUsagePayments();
      const filtered = mode ? data.filter((r) => r.saleType === mode) : data;
      setRows(filtered);
    } catch (err) {
      toast.error('Failed to load pending payments', { description: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setTotal(rows.length);
  }, [rows.length, setTotal]);

  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  const openAddPending = async (row: PendingUsagePayment) => {
    const accts = await fetchCashBankAccounts({ skipErrorToast: true }).catch(
      () => [] as CashBankAccount[],
    );
    setCashAccounts(accts);
    setTarget(row);
    setAmount(String(row.amountPending.toFixed(2)));
    setPaymentMode('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setChequeNumber('');
    setChequeBankName('');
    setChequeDueDate('');
    setChequeDate(new Date().toISOString().split('T')[0]);
    setCashAccountId('');
  };

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
      toast.success('Pending amount recorded', {
        description: 'Submitted to Accounts for approval.',
      });
      setTarget(null);
      fetchRows();
      setJustCollected(request);
    } catch (err) {
      toast.error('Failed to record pending amount', { description: getApiErrorMessage(err) });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pending Payments</h2>
          <p className="text-sm text-slate-500">
            Billing periods with a partial or fully uncollected shortfall
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>INVOICE #</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>PERIOD</TableHead>
              <TableHead>TYPE</TableHead>
              <TableHead className="text-right">AMOUNT GIVEN</TableHead>
              <TableHead className="text-right">AMOUNT PENDING</TableHead>
              <TableHead className="text-right">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No pending payments — every recorded period is fully collected.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={row.usageRecordId}>
                  <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                  <TableCell>{row.customerName || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(row.billingPeriodStart), 'MMM dd, yyyy')} -<br />
                    {format(new Date(row.billingPeriodEnd), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      {row.saleType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {formatCurrency(row.amountGiven, currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {formatCurrency(row.amountPending, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px] font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                      onClick={() => openAddPending(row)}
                      title="Add Pending Amount"
                    >
                      <PlusCircle className="h-3 w-3" />
                      ADD PENDING AMOUNT
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {/* Add Pending Amount dialog */}
      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Add Pending Amount</DialogTitle>
          <div className="bg-linear-to-r from-amber-600 to-amber-500 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <Coins size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                  Add Pending Amount
                </p>
                <p className="text-base font-black">{target?.invoiceNumber}</p>
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
                onChange={(e) =>
                  setPaymentMode(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE')
                }
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
                    Reference (optional)
                  </Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                {cashAccounts.length > 0 && (
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
                      {cashAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs font-black"
                onClick={() => setTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-9 text-xs font-black bg-amber-600 hover:bg-amber-700"
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
        <Dialog open={!!justCollected} onOpenChange={(v) => !v && setJustCollected(null)}>
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
                onClick={() => setJustCollected(null)}
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
