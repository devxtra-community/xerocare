'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getServiceContractById,
  ServiceContractDetail,
  ContractCoverage,
} from '@/lib/serviceContract';
import { getCustomerById, Customer } from '@/lib/customer';
import { recordPayment, getAccountSummary, PaymentSummary } from '@/lib/payment';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import { InvoiceViewDialog } from '@/components/employeeComponents/InvoiceViewDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { getActiveCurrency } from '@/lib/currency';
import {
  ArrowLeft,
  FileText,
  User,
  Printer,
  Calendar,
  Wrench,
  Gauge,
  Check,
  X,
  DollarSign,
} from 'lucide-react';

const COVERAGE_LABELS: Array<{ key: keyof ContractCoverage; label: string }> = [
  { key: 'labour', label: 'Labour & Visits' },
  { key: 'spareParts', label: 'Spare Parts' },
  { key: 'toner', label: 'Toner' },
  { key: 'travel', label: 'Travel' },
];

const getStatusBadgeClass = (status: string) => {
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'EXPIRED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const getTicketStatusClass = (status: string) => {
  if (status === 'COMPLETED' || status === 'FREE_SERVICE')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'CANCELLED' || status.includes('REJECTED'))
    return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export default function ServiceContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<ServiceContractDetail | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMode: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // update every minute

    return () => clearInterval(timer);
  }, []);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServiceContractById(contractId);
      setContract(data);
      if (data.customerId) {
        try {
          setCustomer(await getCustomerById(data.customerId));
        } catch {
          setCustomer(null);
        }
      }
      if (data.invoiceId) {
        try {
          setPaymentSummary(await getAccountSummary(data.invoiceId));
        } catch {
          setPaymentSummary(null);
        }
      } else {
        setPaymentSummary(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contract details.', {
        description: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const openPayDialog = () => {
    setPayForm({
      amount: '',
      paymentMode: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    });
    setPayDialogOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract?.invoiceId) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a payment amount greater than 0.');
      return;
    }
    setSavingPayment(true);
    try {
      await recordPayment({
        invoiceId: contract.invoiceId,
        amountPaid: amount,
        paymentMode: payForm.paymentMode,
        paymentDate: payForm.paymentDate,
        referenceNumber: payForm.referenceNumber || undefined,
        remarks: payForm.remarks || undefined,
      });
      setPaymentSummary(await getAccountSummary(contract.invoiceId));
      toast.success('Payment recorded against the contract invoice.');
      setPayDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to record payment.', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const openInvoice = async () => {
    if (!contract?.invoiceId) return;
    setLoadingInvoice(true);
    try {
      const inv = await getInvoiceById(contract.invoiceId);
      setInvoiceData(inv);
      setInvoiceDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load invoice.', { description: getApiErrorMessage(error) });
    } finally {
      setLoadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 animate-pulse">
        Loading contract details...
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <p className="text-sm text-slate-500">Service contract not found.</p>
      </div>
    );
  }

  const currency = getActiveCurrency();
  const history = contract.serviceHistory;
  const daysLeft = Math.ceil(
    (new Date(contract.endDate).getTime() - currentTime) / (1000 * 60 * 60 * 24),
  );

  const billingSummary = (() => {
    if (contract.contractType === 'AMC')
      return `Annual fee — ${currency} ${Number(contract.contractValue ?? 0).toFixed(2)}, invoiced in full at signing and collected as one or more installments. Meter readings are tracking-only (never charged).`;
    if (contract.contractType === 'SMA')
      return `${Number(contract.copyLimit ?? 0).toLocaleString()} copy limit from meter ${Number(contract.startMeterReading ?? 0).toLocaleString()} — excess at ${currency} ${Number(contract.overagePerCopyRate ?? 0)}/copy${contract.monthlyCharge ? ` + ${currency} ${Number(contract.monthlyCharge).toFixed(2)}/mo base fee` : ''}.`;
    return contract.fsmaBillingMode === 'INDIVIDUAL'
      ? `Per-click billing — B&W ${currency} ${Number(contract.ratePerClickBW ?? 0)} · Colour ${currency} ${Number(contract.ratePerClickColor ?? 0)}.`
      : `Per-click billing — combined rate ${currency} ${Number(contract.ratePerClickCombined ?? 0)}/click.`;
  })();

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/employee/service/contracts')}
            className="h-8 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {contract.contractType} Contract
          </h1>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(contract.status)}`}
          >
            {contract.status}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Created {fmtDate(contract.created_at)} · Last updated {fmtDate(contract.updated_at)}
        </span>
      </div>

      {/* Top summary tiles */}
      <div
        className={`grid grid-cols-2 gap-3 ${contract.contractType === 'AMC' ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}
      >
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Contract Value
            </span>
            <span className="text-lg font-bold text-slate-800">
              {currency} {Number(contract.contractValue).toFixed(2)}
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Services Done
            </span>
            <span className="text-lg font-bold text-slate-800">{history.ticketCount}</span>
            <span className="block text-[10px] text-slate-400">
              {history.completedCount} completed
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Total Service Cost
            </span>
            <span className="text-lg font-bold text-slate-800">
              {currency} {history.totalServiceCost.toFixed(2)}
            </span>
          </CardContent>
        </Card>
        {contract.contractType !== 'AMC' && (
          <Card className="shadow-sm border-slate-200/80">
            <CardContent className="p-4">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Meter Billing To Date
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {currency} {Number(contract.totalBilled).toFixed(2)}
              </span>
              <span className="block text-[10px] text-slate-400">
                {contract.readings.length} reading{contract.readings.length === 1 ? '' : 's'}
              </span>
            </CardContent>
          </Card>
        )}
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Invoice Status
              </span>
              <div className="flex items-center gap-1">
                {contract.invoiceId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openInvoice}
                    disabled={loadingInvoice}
                    title="View / download / send invoice"
                    className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                )}
                {contract.invoiceId && paymentSummary && paymentSummary.pendingBalance > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openPayDialog}
                    title="Record an installment payment"
                    className="h-6 w-6 text-slate-400 hover:text-green-600 hover:bg-green-50/50"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {!contract.invoiceId ? (
              <span className="text-xs font-bold text-slate-400">No invoice raised</span>
            ) : !paymentSummary ? (
              <span className="text-xs text-slate-400">Loading…</span>
            ) : (
              <>
                <span
                  className={`text-lg font-bold ${
                    paymentSummary.pendingBalance <= 0
                      ? 'text-emerald-700'
                      : paymentSummary.totalPaid > 0
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {paymentSummary.pendingBalance <= 0
                    ? 'PAID'
                    : paymentSummary.totalPaid > 0
                      ? 'PARTIAL'
                      : 'PENDING'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  Paid {currency} {paymentSummary.totalPaid.toFixed(2)} · Balance {currency}{' '}
                  {paymentSummary.pendingBalance.toFixed(2)}
                </span>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer / Machine / Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className="font-bold text-sm text-slate-800">
              {customer?.name || 'Unknown Customer'}
            </p>
            {customer?.email && <p className="text-slate-500">{customer.email}</p>}
            {customer?.phone && <p className="text-slate-500">{customer.phone}</p>}
            {customer?.address && <p className="text-slate-400">{customer.address}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5 text-blue-600" /> Machine
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className="font-bold text-sm text-slate-800">
              {contract.machine
                ? `${contract.machine.brand} ${contract.machine.modelName}`
                : 'Unknown Machine'}
            </p>
            <p className="text-slate-500 font-mono">
              S/N: {contract.machine?.serialNumber || 'N/A'}
            </p>
            {contract.machine?.ownership && (
              <p className="text-slate-400 uppercase text-[10px] font-bold">
                {contract.machine.ownership}
              </p>
            )}
            {contract.machine?.meterReading != null && (
              <p className="text-slate-500">
                Current meter:{' '}
                <span className="font-mono font-semibold">
                  {Number(contract.machine.meterReading).toLocaleString()}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" /> Time Period
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className="text-slate-500">
              From{' '}
              <span className="font-semibold text-slate-800">{fmtDate(contract.startDate)}</span> to{' '}
              <span className="font-semibold text-slate-800">{fmtDate(contract.endDate)}</span>
            </p>
            {contract.status === 'ACTIVE' && (
              <p className={`font-bold ${daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Period ended'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage + billing parameters */}
      <Card className="shadow-sm border-slate-200/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-blue-600" /> Coverage & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COVERAGE_LABELS.map(({ key, label }) => {
              const covered = !!contract.coverageRules?.[key];
              return (
                <span
                  key={String(key)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                    covered
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {covered ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {label}
                  {covered ? ' free' : ' chargeable'}
                </span>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">{billingSummary}</p>
          {contract.notes && (
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              Notes: {contract.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Service history */}
      <Card className="shadow-sm border-slate-200/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-blue-600" /> Service History ({history.ticketCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.tickets.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No service tickets recorded under this contract yet.
            </p>
          ) : (
            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-slate-500">Ticket</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Date</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Issue</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Status</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Parts/Items
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Visit Charge
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Total Cost
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono font-semibold text-slate-700 py-2">
                        {t.ticketNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 py-2">
                        {fmtDate(t.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 py-2 max-w-[240px] truncate">
                        {t.issueDescription}
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${getTicketStatusClass(t.status)}`}
                        >
                          {t.status.replaceAll('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {currency} {t.itemsTotal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {currency} {t.visitChargeAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-slate-800 py-2">
                        {currency} {t.totalCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50/60">
                    <TableCell colSpan={6} className="text-xs font-bold text-slate-600 py-2">
                      Total service cost under this contract
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-slate-900 py-2">
                      {currency} {history.totalServiceCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meter readings */}
      <Card className="shadow-sm border-slate-200/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-emerald-600" /> Meter Readings (
            {contract.readings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contract.readings.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No readings recorded yet.</p>
          ) : (
            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-slate-500">Date</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Meter</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Clicks
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Charged
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.readings.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-slate-500 py-2">
                        {fmtDate(r.readingDate)}
                      </TableCell>
                      <TableCell className="text-xs font-mono py-2">
                        {r.totalReading != null
                          ? Number(r.totalReading).toLocaleString()
                          : r.bwReading != null || r.colorReading != null
                            ? `BW ${Number(r.bwReading ?? 0).toLocaleString()} · Col ${Number(r.colorReading ?? 0).toLocaleString()}`
                            : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {Number(r.clicksTotal || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {contract.contractType === 'AMC' ? (
                          <span className="text-slate-400">tracking only</span>
                        ) : (
                          `${currency} ${Number(r.amountCharged || 0).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 py-2 max-w-[200px] truncate">
                        {r.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AMC INSTALLMENT PAYMENT DIALOG */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md w-full p-0 bg-white rounded-xl shadow-2xl border border-slate-200">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Recorded against the same invoice raised at signing.
            </DialogDescription>
          </DialogHeader>

          {paymentSummary && (
            <div className="mx-6 mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-500">
                Paid {currency} {paymentSummary.totalPaid.toFixed(2)} of {currency}{' '}
                {paymentSummary.totalAmount.toFixed(2)}
              </span>
              <span className="font-bold text-slate-700">
                Balance {currency} {paymentSummary.pendingBalance.toFixed(2)}
              </span>
            </div>
          )}

          <form onSubmit={handleRecordPayment}>
            <div className="grid grid-cols-2 gap-4 px-6 py-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Amount ({currency}) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={payForm.amount}
                  onChange={(e) => setPayForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Payment Mode *</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      paymentMode: e.target.value as typeof prev.paymentMode,
                    }))
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Payment Date *</label>
                <Input
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Reference Number</label>
                <Input
                  value={payForm.referenceNumber}
                  onChange={(e) =>
                    setPayForm((prev) => ({ ...prev, referenceNumber: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Remarks</label>
                <Input
                  value={payForm.remarks}
                  onChange={(e) => setPayForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayDialogOpen(false)}
                className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingPayment}
                className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-medium text-xs shadow-sm"
              >
                {savingPayment ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {invoiceDialogOpen && invoiceData && (
        <InvoiceViewDialog
          invoice={invoiceData}
          onClose={() => {
            setInvoiceDialogOpen(false);
            setInvoiceData(null);
          }}
        />
      )}
    </div>
  );
}
