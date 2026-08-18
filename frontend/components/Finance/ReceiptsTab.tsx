'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  getAllSalePayments,
  approveSalePayment,
  rejectSalePayment,
  recordSalePayment,
  sendReceiptEmail,
  sendReceiptWhatsApp,
  SalePaymentRequest,
} from '@/lib/saleWorkflow';
import {
  fetchCashBankAccounts,
  fetchCheques,
  CashBankAccount,
  type Cheque,
} from '@/lib/finance/accountsApi';
import {
  ChequeActionModal,
  ChequeDetailModal,
  CHEQUE_TABLE_STATUS_BADGE as CHEQUE_STATUS_BADGE,
  CHEQUE_STATUS_ICON,
  type ActionType as ChequeActionType,
} from '@/components/accounts/ChequeDetailModal';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import { getApiErrorMessage } from '@/lib/apiError';
import { getActiveCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Eye,
  Users,
  ChevronDown,
  ChevronRight,
  Printer,
  Mail,
  MessageSquare,
  Send,
  Filter,
  X,
} from 'lucide-react';
import { SalePaymentReceiptView } from '@/components/finance/SalePaymentReceiptView';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

type FilterTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' | 'CUSTOMERS';

// ─── Customer Cheques (Received) Section ──────────────────────────────────────
function CustomerChequesSection({ branchIds }: { branchIds?: string }) {
  const currency = useBranchCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewCheque, setViewCheque] = useState<Cheque | null>(null);
  const [actionState, setActionState] = useState<{
    cheque: Cheque;
    action: ChequeActionType;
  } | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = { type: 'RECEIVED' };
    if (statusFilter !== 'ALL') p.status = statusFilter;
    if (search.trim()) p.search = search.trim();
    // Admin passes a branch selection; Finance passes nothing and stays JWT-scoped.
    if (branchIds) p.branchIds = branchIds;
    return p;
  }, [statusFilter, search, branchIds]);

  const { data: cheques = [], isLoading } = useQuery<Cheque[]>({
    queryKey: ['cheques', params],
    queryFn: () => fetchCheques(params),
    staleTime: 30_000,
  });

  const { data: cashAccountsRaw = [] } = useQuery({
    queryKey: ['cash-bank-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });
  const bankAccounts = (
    cashAccountsRaw as { id: string; name: string; type: string; bankName?: string }[]
  )
    .filter((a) => a.type === 'BANK')
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));

  return (
    <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-700">Customer Cheques (Received)</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cheque #, customer…"
                className="pl-9 pr-3 py-1.5 text-xs border border-border rounded-md bg-card w-52"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-border rounded-md px-2 py-1.5 text-xs bg-card"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="DEPOSITED">Deposited</option>
              <option value="CLEARED">Cleared</option>
              <option value="BOUNCED">Bounced</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : cheques.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No received cheques found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b">
              <tr>
                {[
                  'Cheque #',
                  'Customer / Bank',
                  'Amount',
                  'Cheque Date',
                  'Due Date',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cheques.map((c) => {
                const isOverdue =
                  new Date(c.dueDate) < new Date() && ['PENDING'].includes(c.status);
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${isOverdue ? 'bg-red-50/40' : 'hover:bg-muted/20'}`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-700 text-xs">{c.chequeNo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 max-w-[140px] truncate">
                        {c.partyName}
                      </p>
                      <p className="text-xs text-gray-400">{c.bankName ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(c.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.chequeDate ? String(c.chequeDate).slice(0, 10) : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}
                    >
                      {String(c.dueDate).slice(0, 10)}
                      {isOverdue && <span className="ml-1 text-red-500">⚠</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHEQUE_STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {CHEQUE_STATUS_ICON[c.status]}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap items-center">
                        <button
                          onClick={() => setViewCheque(c)}
                          className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View
                        </button>
                        {c.status === 'PENDING' && (
                          <button
                            onClick={() => setActionState({ cheque: c, action: 'deposit' })}
                            className="text-xs font-medium px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Deposit
                          </button>
                        )}
                        {c.status === 'DEPOSITED' && (
                          <button
                            onClick={() => setActionState({ cheque: c, action: 'clear' })}
                            className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          >
                            Clear
                          </button>
                        )}
                        {['PENDING', 'DEPOSITED'].includes(c.status) && (
                          <button
                            onClick={() => setActionState({ cheque: c, action: 'bounce' })}
                            className="text-xs font-medium px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Bounce
                          </button>
                        )}
                        {c.status === 'PENDING' && (
                          <button
                            onClick={() => setActionState({ cheque: c, action: 'cancel' })}
                            className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {viewCheque && (
        <ChequeDetailModal
          cheque={viewCheque}
          currency={currency}
          onClose={() => setViewCheque(null)}
        />
      )}
      {actionState && (
        <ChequeActionModal
          cheque={actionState.cheque}
          action={actionState.action}
          cashAccounts={bankAccounts}
          onClose={() => setActionState(null)}
        />
      )}
    </div>
  );
}

// paymentContext → contract type label
const ctxType = (ctx?: string | null): 'SALE' | 'RENT' | 'LEASE' | null => {
  if (!ctx || ctx === 'SALE') return 'SALE';
  if (ctx.startsWith('RENT')) return 'RENT';
  if (ctx.startsWith('LEASE')) return 'LEASE';
  return null;
};

/**
 * Shared Receipts view used by BOTH Finance and Admin.
 *
 * `branchIds` is the only difference between the two callers: Finance omits it and the
 * server scopes every query to the caller's own branch from the JWT, while Admin passes
 * the branch filter's selection (empty = all branches). Keeping this one component
 * parameterised — rather than forking an admin copy — is deliberate: these tabs were built
 * on the Finance side and never reached Admin precisely because the two sides were
 * separate implementations that drifted apart.
 */
export default function ReceiptsTab({ branchIds }: { branchIds?: string } = {}) {
  const currency = getActiveCurrency();
  const [payments, setPayments] = useState<SalePaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('PENDING');

  // Secondary filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'RENT' | 'LEASE'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const hasSecondaryFilters =
    typeFilter !== 'ALL' || modeFilter !== 'ALL' || dateFrom || dateTo || employeeFilter !== 'ALL';

  // Approve/reject state
  const [actionTarget, setActionTarget] = useState<SalePaymentRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isActing, setIsActing] = useState(false);

  // Cash/bank accounts
  const [cashAccounts, setCashAccounts] = useState<CashBankAccount[]>([]);
  const [approvingAccountId, setApprovingAccountId] = useState('');

  // Receipt view
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Finance direct balance recording
  const [directPayOpen, setDirectPayOpen] = useState(false);
  const [directPayStep, setDirectPayStep] = useState<'search' | 'form'>('search');
  const [directPayInvoiceNo, setDirectPayInvoiceNo] = useState('');
  const [directPayInvoice, setDirectPayInvoice] = useState<Invoice | null>(null);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [directAmount, setDirectAmount] = useState('');
  const [directMode, setDirectMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [directDate, setDirectDate] = useState(new Date().toISOString().split('T')[0]);
  const [directRef, setDirectRef] = useState('');
  const [directRemarks, setDirectRemarks] = useState('');
  const [directAccountId, setDirectAccountId] = useState('');
  const [directChequeNo, setDirectChequeNo] = useState('');
  const [directChequeBank, setDirectChequeBank] = useState('');
  const [directChequeDate, setDirectChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [directChequeDue, setDirectChequeDue] = useState('');
  const [isSavingDirect, setIsSavingDirect] = useState(false);

  // Customer view
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // Receipt send
  const [sendType, setSendType] = useState<'email' | 'whatsapp' | null>(null);
  const [sendRecipient, setSendRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);

  const printRef = useRef<HTMLDivElement | null>(null);

  const resetDirectPay = () => {
    setDirectPayStep('search');
    setDirectPayInvoiceNo('');
    setDirectPayInvoice(null);
    setDirectAmount('');
    setDirectMode('CASH');
    setDirectDate(new Date().toISOString().split('T')[0]);
    setDirectRef('');
    setDirectRemarks('');
    setDirectAccountId('');
    setDirectChequeNo('');
    setDirectChequeBank('');
    setDirectChequeDate(new Date().toISOString().split('T')[0]);
    setDirectChequeDue('');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, accounts] = await Promise.all([
        getAllSalePayments(branchIds ? { branchIds } : undefined),
        fetchCashBankAccounts({ skipErrorToast: true }).catch(() => [] as CashBankAccount[]),
      ]);
      setPayments(data);
      setCashAccounts(accounts);
    } catch (err) {
      toast.error('Failed to load receipts', { description: getApiErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  // Re-runs when Admin changes the branch selection; Finance passes no branchIds, so this
  // fires exactly once there, matching the previous behaviour.
  useEffect(() => {
    loadData();
  }, [branchIds]);

  const uniqueEmployees = useMemo(
    () =>
      [
        ...new Set(payments.map((p) => p.recordedByEmployeeName).filter(Boolean)),
      ].sort() as string[],
    [payments],
  );

  const openReceiptView = async (pmt: SalePaymentRequest) => {
    setActionTarget(pmt);
    setActionType('view');
    setViewInvoice(null);
    setIsLoadingInvoice(true);
    try {
      const inv = await getInvoiceById(pmt.invoiceId);
      setViewInvoice(inv);
    } catch {
      // receipt still renders without invoice context
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const handleSendReceipt = async () => {
    if (!actionTarget || !sendType) return;
    setIsSending(true);
    try {
      const recipient = sendRecipient.trim() || undefined;
      const result =
        sendType === 'email'
          ? await sendReceiptEmail(actionTarget.id, recipient)
          : await sendReceiptWhatsApp(actionTarget.id, recipient);
      toast.success(`Receipt ${sendType === 'email' ? 'email' : 'WhatsApp'} queued`, {
        description: `Sent to ${result.recipient}`,
      });
      setSendType(null);
      setSendRecipient('');
    } catch (err) {
      toast.error('Failed to send receipt', { description: getApiErrorMessage(err) });
    } finally {
      setIsSending(false);
    }
  };

  const handleApprove = async () => {
    if (!actionTarget) return;
    const needsAccount =
      ['CASH', 'BANK_TRANSFER'].includes(actionTarget.paymentMode) && !actionTarget.cashAccountId;
    if (needsAccount && !approvingAccountId) {
      toast.error('Select a cash or bank account before approving');
      return;
    }
    setIsActing(true);
    try {
      const accountToUse = actionTarget.cashAccountId || approvingAccountId || undefined;
      await approveSalePayment(actionTarget.id, accountToUse);
      toast.success('Payment approved', {
        description: `${actionTarget.requestNo} — ${actionTarget.currency} ${Number(actionTarget.amount).toFixed(2)} posted to ledger.`,
      });
      setActionTarget(null);
      setActionType(null);
      setApprovingAccountId('');
      loadData();
    } catch (err) {
      toast.error('Failed to approve', { description: getApiErrorMessage(err) });
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!actionTarget || !rejectReason.trim()) return;
    setIsActing(true);
    try {
      await rejectSalePayment(actionTarget.id, rejectReason);
      toast.success('Payment rejected', {
        description: `${actionTarget.requestNo} returned for correction.`,
      });
      setActionTarget(null);
      setActionType(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      toast.error('Failed to reject', { description: getApiErrorMessage(err) });
    } finally {
      setIsActing(false);
    }
  };

  // What's already on record for the invoice picked in "Record Balance Payment" —
  // computed from the same `payments` list already loaded for the table, so a
  // Finance-recorded balance payment can't blindly overlap an employee-recorded
  // one that's still awaiting approval (that combo overpays and gets rejected by
  // the backend at approval time, but only after Finance has filled the whole form).
  const directPayExisting = useMemo(() => {
    if (!directPayInvoice) return null;
    const forInvoice = payments.filter((p) => p.invoiceId === directPayInvoice.id);
    const approved = forInvoice.filter((p) => p.status === 'APPROVED');
    const pending = forInvoice.filter((p) => p.status === 'PENDING');
    const approvedTotal = approved.reduce((s, p) => s + Number(p.amount), 0);
    const pendingTotal = pending.reduce((s, p) => s + Number(p.amount), 0);
    const totalAmount = Number(directPayInvoice.totalAmount || 0);
    const safeRemaining = Math.max(0, totalAmount - approvedTotal - pendingTotal);
    return { approvedTotal, pending, pendingTotal, totalAmount, safeRemaining };
  }, [directPayInvoice, payments]);

  const handleDirectInvoiceSearch = async () => {
    if (!directPayInvoiceNo.trim()) return;
    setIsSearchingInvoice(true);
    try {
      const existing = payments.find(
        (p) => p.invoiceNumber.toLowerCase() === directPayInvoiceNo.trim().toLowerCase(),
      );
      if (!existing) {
        toast.error(
          'Invoice not found. Enter the exact invoice number of a contract that already has a payment request.',
        );
        return;
      }
      const full = await getInvoiceById(existing.invoiceId);
      setDirectPayInvoice(full);
      setDirectPayStep('form');

      // Prefill with what's actually still safe to record — total minus whatever's
      // already approved AND whatever's still pending on this same invoice — rather
      // than leaving Finance to guess and re-type the full invoice amount from memory.
      const forInvoice = payments.filter((p) => p.invoiceId === existing.invoiceId);
      const alreadyCommitted = forInvoice
        .filter((p) => p.status === 'APPROVED' || p.status === 'PENDING')
        .reduce((s, p) => s + Number(p.amount), 0);
      const safeRemaining = Math.max(0, Number(full.totalAmount || 0) - alreadyCommitted);
      setDirectAmount(safeRemaining > 0 ? safeRemaining.toFixed(2) : '');
    } catch (err) {
      toast.error('Failed to load invoice', { description: getApiErrorMessage(err) });
    } finally {
      setIsSearchingInvoice(false);
    }
  };

  const handleDirectPaySubmit = async () => {
    if (!directPayInvoice || !directAmount) return;
    if (['CASH', 'BANK_TRANSFER'].includes(directMode) && !directAccountId) {
      toast.error('Select a cash or bank account');
      return;
    }
    if (directPayExisting && Number(directAmount) > directPayExisting.safeRemaining + 0.1) {
      toast.error('This would overpay the invoice', {
        description:
          directPayExisting.pending.length > 0
            ? `${directPayExisting.pending.length} pending request(s) already total ${currency} ${directPayExisting.pendingTotal.toFixed(2)} on this invoice. Approve/reject those first, or lower the amount to ${currency} ${directPayExisting.safeRemaining.toFixed(2)}.`
            : `Only ${currency} ${directPayExisting.safeRemaining.toFixed(2)} remains unpaid on this invoice.`,
      });
      return;
    }
    setIsSavingDirect(true);
    try {
      const spr = await recordSalePayment(directPayInvoice.id, {
        amount: Number(directAmount),
        paymentMode: directMode,
        paymentDate: directDate,
        referenceNumber: directRef || undefined,
        remarks: directRemarks || `Finance balance payment — ${directPayInvoice.invoiceNumber}`,
        cashAccountId: directMode !== 'CHEQUE' ? directAccountId : undefined,
        chequeNumber: directMode === 'CHEQUE' ? directChequeNo : undefined,
        chequeBankName: directMode === 'CHEQUE' ? directChequeBank : undefined,
        chequeDate: directMode === 'CHEQUE' ? directChequeDate : undefined,
        chequeDueDate: directMode === 'CHEQUE' ? directChequeDue : undefined,
        paymentContext: 'SALE',
      });
      const accountToUse = directMode !== 'CHEQUE' ? directAccountId : undefined;
      await approveSalePayment(spr.id, accountToUse);
      toast.success('Balance payment recorded & approved', {
        description: `${currency} ${Number(directAmount).toFixed(2)} posted to ledger for ${directPayInvoice.invoiceNumber}.`,
      });
      setDirectPayOpen(false);
      resetDirectPay();
      loadData();
    } catch (err) {
      toast.error('Failed to record balance payment', { description: getApiErrorMessage(err) });
    } finally {
      setIsSavingDirect(false);
    }
  };

  const filtered = useMemo(
    () =>
      payments
        .filter((p) => (tab === 'ALL' || tab === 'CUSTOMERS' ? true : p.status === tab))
        .filter((p) => typeFilter === 'ALL' || ctxType(p.paymentContext) === typeFilter)
        .filter((p) => modeFilter === 'ALL' || p.paymentMode === modeFilter)
        .filter((p) => !dateFrom || p.paymentDate >= dateFrom)
        .filter((p) => !dateTo || p.paymentDate <= dateTo)
        .filter((p) => employeeFilter === 'ALL' || p.recordedByEmployeeName === employeeFilter)
        .filter(
          (p) =>
            !search ||
            p.requestNo.toLowerCase().includes(search.toLowerCase()) ||
            p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            p.customerName.toLowerCase().includes(search.toLowerCase()) ||
            p.recordedByEmployeeName.toLowerCase().includes(search.toLowerCase()),
        ),
    [payments, tab, typeFilter, modeFilter, dateFrom, dateTo, employeeFilter, search],
  );

  const counts = {
    PENDING: payments.filter((p) => p.status === 'PENDING').length,
    APPROVED: payments.filter((p) => p.status === 'APPROVED').length,
    REJECTED: payments.filter((p) => p.status === 'REJECTED').length,
    ALL: payments.length,
    CUSTOMERS: 0,
  };

  const customerGroups = useMemo(() => {
    const map = new Map<string, { name: string; payments: SalePaymentRequest[] }>();
    for (const p of payments) {
      const key = p.customerName || 'Unknown';
      if (!map.has(key)) map.set(key, { name: key, payments: [] });
      map.get(key)!.payments.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [payments]);

  const uniqueCustomers = customerGroups.length;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
      APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
      REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
    };
    const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-500' };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.color}`}
      >
        {cfg.label}
      </span>
    );
  };

  const toggleCustomer = (name: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-bold">
          Review and approve sale, rent, and lease collection payments
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setDirectPayOpen(true);
              resetDirectPay();
            }}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            <DollarSign size={12} className="mr-1" />
            Record Balance Payment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
          >
            <RefreshCw size={12} className="mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {(
          [
            {
              key: 'PENDING',
              label: 'Pending',
              icon: Clock,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              count: counts.PENDING,
            },
            {
              key: 'APPROVED',
              label: 'Approved',
              icon: CheckCircle2,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              count: counts.APPROVED,
            },
            {
              key: 'REJECTED',
              label: 'Rejected',
              icon: XCircle,
              color: 'text-red-500',
              bg: 'bg-red-50',
              count: counts.REJECTED,
            },
            {
              key: 'ALL',
              label: 'All Payments',
              icon: DollarSign,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
              count: counts.ALL,
            },
            {
              key: 'CUSTOMERS',
              label: 'By Customer',
              icon: Users,
              color: 'text-teal-600',
              bg: 'bg-teal-50',
              count: uniqueCustomers,
            },
          ] as const
        ).map(({ key, label, icon: Icon, color, bg, count }) => (
          <button
            key={key}
            onClick={() => setTab(key as FilterTab)}
            className={`${bg} rounded-2xl p-4 text-left transition-all ${tab === key ? 'ring-2 ring-offset-1 ring-indigo-300' : 'hover:ring-1 hover:ring-slate-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {label}
              </p>
            </div>
            <p className={`text-2xl font-black ${color}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by request no, invoice, customer, or employee..."
            className="pl-9 h-9 border-slate-200 text-sm font-bold"
          />
        </div>

        {/* Secondary filter bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
            <Filter size={11} /> Filters
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* Type */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Type
              </label>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="RENT">Rent</SelectItem>
                  <SelectItem value="LEASE">Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Mode */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Mode
              </label>
              <Select
                value={modeFilter}
                onValueChange={(v) => setModeFilter(v as typeof modeFilter)}
              >
                <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Modes</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Date From */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-slate-200 bg-white text-xs font-bold"
              />
            </div>
            {/* Date To */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-slate-200 bg-white text-xs font-bold"
              />
            </div>
            {/* Employee */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Recorded By
              </label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Employees</SelectItem>
                  {uniqueEmployees.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasSecondaryFilters && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setModeFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setEmployeeFilter('ALL');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:underline flex items-center gap-1"
              >
                <X size={10} /> Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer grouping view */}
      {tab === 'CUSTOMERS' ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : customerGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">No customers yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customerGroups
                  .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()))
                  .map((group) => {
                    const isOpen = expandedCustomers.has(group.name);
                    const approvedTotal = group.payments
                      .filter((p) => p.status === 'APPROVED')
                      .reduce((s, p) => s + Number(p.amount), 0);
                    const pendingTotal = group.payments
                      .filter((p) => p.status === 'PENDING')
                      .reduce((s, p) => s + Number(p.amount), 0);
                    const uniqueInvoices = new Set(group.payments.map((p) => p.invoiceNumber)).size;
                    return (
                      <div key={group.name}>
                        <button
                          onClick={() => toggleCustomer(group.name)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 text-left transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                              <Users size={13} className="text-teal-600" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{group.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">
                                {uniqueInvoices} contract{uniqueInvoices !== 1 ? 's' : ''} ·{' '}
                                {group.payments.length} payment
                                {group.payments.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {approvedTotal > 0 && (
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                  Approved
                                </p>
                                <p className="text-sm font-black text-emerald-700">
                                  {currency}{' '}
                                  {approvedTotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            )}
                            {pendingTotal > 0 && (
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                                  Pending
                                </p>
                                <p className="text-sm font-black text-amber-700">
                                  {currency}{' '}
                                  {pendingTotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            )}
                            {isOpen ? (
                              <ChevronDown size={14} className="text-slate-400" />
                            ) : (
                              <ChevronRight size={14} className="text-slate-400" />
                            )}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="bg-slate-50/50 border-t border-slate-100 px-4 pb-4">
                            <table className="w-full text-xs mt-3">
                              <thead>
                                <tr className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                  <th className="text-left pb-2 pr-4">Request No.</th>
                                  <th className="text-left pb-2 pr-4">Invoice</th>
                                  <th className="text-left pb-2 pr-4">Type</th>
                                  <th className="text-left pb-2 pr-4">Mode</th>
                                  <th className="text-right pb-2 pr-4">Amount</th>
                                  <th className="text-left pb-2 pr-4">Date</th>
                                  <th className="text-left pb-2 pr-4">Status</th>
                                  <th className="text-right pb-2">Receipt</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.payments.map((pmt) => (
                                  <tr key={pmt.id} className="text-slate-600">
                                    <td className="py-1.5 pr-4 font-mono font-bold text-slate-700">
                                      {pmt.requestNo}
                                    </td>
                                    <td className="py-1.5 pr-4 font-bold">{pmt.invoiceNumber}</td>
                                    <td className="py-1.5 pr-4">
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-50 text-blue-600">
                                        {ctxType(pmt.paymentContext) ?? '—'}
                                      </span>
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      {pmt.paymentMode.replace('_', ' ')}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right font-mono font-black text-slate-800">
                                      {pmt.currency}{' '}
                                      {Number(pmt.amount).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      {new Date(pmt.paymentDate).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="py-1.5 pr-4">{statusBadge(pmt.status)}</td>
                                    <td className="py-1.5 text-right">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openReceiptView(pmt)}
                                        className="h-6 w-6 p-0 text-slate-400 hover:bg-slate-200"
                                        title="View Receipt"
                                      >
                                        <Eye size={11} />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Standard payments table */
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">No payments in this category</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Request No.
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Invoice
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Customer
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Type
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Mode
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Amount
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Date
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Recorded By
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((pmt) => (
                    <TableRow key={pmt.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-slate-800 text-xs">
                        {pmt.requestNo}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700 text-sm">
                        {pmt.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-bold text-slate-600 text-sm">
                        {pmt.customerName}
                      </TableCell>
                      <TableCell>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-50 text-blue-600">
                          {ctxType(pmt.paymentContext) ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          {pmt.paymentMode.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-800">
                        {pmt.currency}{' '}
                        {Number(pmt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-500">
                        {new Date(pmt.paymentDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-500">
                        {pmt.recordedByEmployeeName}
                      </TableCell>
                      <TableCell>{statusBadge(pmt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReceiptView(pmt)}
                            className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100"
                            title="View Receipt"
                          >
                            <Eye size={13} />
                          </Button>
                          {pmt.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setActionTarget(pmt);
                                  setActionType('approve');
                                }}
                                className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-50"
                                title="Approve"
                              >
                                <CheckCircle2 size={13} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setActionTarget(pmt);
                                  setActionType('reject');
                                  setRejectReason('');
                                  setApprovingAccountId('');
                                }}
                                className="h-7 w-7 p-0 text-red-400 hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle size={13} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Cheques (Received) */}
      <CustomerChequesSection branchIds={branchIds} />

      {/* Receipt View Dialog */}
      {actionType === 'view' && actionTarget && (
        <Dialog
          open
          onOpenChange={() => {
            setActionType(null);
            setViewInvoice(null);
            setSendType(null);
            setSendRecipient('');
          }}
        >
          <DialogContent className="sm:max-w-lg rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">Payment Receipt</DialogTitle>
            {isLoadingInvoice ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <SalePaymentReceiptView
                  payment={actionTarget}
                  invoice={viewInvoice}
                  currency={currency}
                  printRef={printRef}
                />
                <div className="p-4 bg-slate-50 border-t space-y-3">
                  {/* Send-receipt inline form */}
                  {sendType && (
                    <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl">
                      {sendType === 'email' ? (
                        <Mail size={13} className="text-indigo-500 shrink-0" />
                      ) : (
                        <MessageSquare size={13} className="text-emerald-500 shrink-0" />
                      )}
                      <Input
                        autoFocus
                        placeholder={
                          sendType === 'email'
                            ? 'Customer email…'
                            : 'Phone number (e.g. +97412345678)…'
                        }
                        value={sendRecipient}
                        onChange={(e) => setSendRecipient(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReceipt()}
                        className="h-7 border-0 shadow-none text-xs font-bold p-0 focus-visible:ring-0 flex-1"
                        disabled={isSending}
                      />
                      <Button
                        size="sm"
                        onClick={handleSendReceipt}
                        disabled={isSending}
                        className="h-7 px-3 text-[10px] font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                      >
                        {isSending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Send size={11} />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSendType(null);
                          setSendRecipient('');
                        }}
                        disabled={isSending}
                        className="h-7 w-7 p-0 text-slate-400"
                      >
                        <XCircle size={11} />
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    {/* Approve/Reject only for PENDING */}
                    {actionTarget.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActionType('reject')}
                          className="text-[10px] font-black uppercase text-red-500 h-9"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setActionType('approve')}
                          className="text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 h-9 px-5 rounded-xl"
                        >
                          Approve
                        </Button>
                      </>
                    )}
                    {/* Send receipt — available for PENDING and APPROVED (not REJECTED) */}
                    {actionTarget.status !== 'REJECTED' && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSendType('email');
                            setSendRecipient('');
                          }}
                          className="h-9 px-3 text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-50"
                          title="Send receipt by email"
                        >
                          <Mail size={12} className="mr-1" /> Email
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSendType('whatsapp');
                            setSendRecipient('');
                          }}
                          className="h-9 px-3 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                          title="Send receipt via WhatsApp"
                        >
                          <MessageSquare size={12} className="mr-1" /> WhatsApp
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.print()}
                      className="text-[10px] font-black uppercase text-slate-400 h-9 ml-auto"
                    >
                      <Printer size={12} className="mr-1" /> Print
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActionType(null);
                        setViewInvoice(null);
                        setSendType(null);
                        setSendRecipient('');
                      }}
                      className="text-[10px] font-black uppercase text-slate-400 h-9"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Dialog */}
      {actionType === 'approve' && actionTarget && (
        <Dialog
          open
          onOpenChange={() => {
            if (!isActing) {
              setActionType(null);
              setApprovingAccountId('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
            <DialogTitle className="text-lg font-black text-slate-800">Approve Payment</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 leading-relaxed">
              This will post{' '}
              <span className="font-black text-emerald-600">
                {actionTarget.currency} {Number(actionTarget.amount).toFixed(2)}
              </span>{' '}
              ({actionTarget.paymentMode.replace('_', ' ')}) to the invoice ledger for{' '}
              <span className="font-black">{actionTarget.customerName}</span>. This cannot be
              undone.
            </DialogDescription>
            {['CASH', 'BANK_TRANSFER'].includes(actionTarget.paymentMode) &&
              !actionTarget.cashAccountId && (
                <div className="mt-3 space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Post to Account <span className="text-red-500">*</span>
                  </Label>
                  <Select value={approvingAccountId} onValueChange={setApprovingAccountId}>
                    <SelectTrigger className="h-9 w-full min-w-0 border-slate-200 text-sm font-bold overflow-hidden">
                      <SelectValue placeholder="Select cash / bank account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-sm">
                          <span className="block truncate">
                            {acc.name} — {acc.currency}{' '}
                            {Number(acc.currentBalance).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            <DialogFooter className="flex justify-between mt-4">
              <Button
                variant="ghost"
                onClick={() => setActionType(null)}
                disabled={isActing}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isActing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {actionType === 'reject' && actionTarget && (
        <Dialog open onOpenChange={() => !isActing && setActionType(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
            <DialogTitle className="text-lg font-black text-slate-800">Reject Payment</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              The payment will be returned to{' '}
              <span className="font-black">{actionTarget.recordedByEmployeeName}</span> for
              correction. Please provide a reason.
            </DialogDescription>
            <div className="mt-3">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Rejection Reason *
              </Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., incorrect amount, wrong mode..."
                className="h-10 border-slate-200 font-bold text-sm"
              />
            </div>
            <DialogFooter className="flex justify-between mt-4">
              <Button
                variant="ghost"
                onClick={() => setActionType(null)}
                disabled={isActing}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isActing || !rejectReason.trim()}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Finance Direct Balance Payment Dialog */}
      <Dialog
        open={directPayOpen}
        onOpenChange={(v) => {
          if (!v && !isSavingDirect) {
            setDirectPayOpen(false);
            resetDirectPay();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Record Sale Balance Payment</DialogTitle>
          <div className="bg-linear-to-r from-indigo-700 to-indigo-500 p-5 text-white">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5">
              Finance · Direct Recording
            </p>
            <p className="text-lg font-black">Record Sale Balance Payment</p>
            <p className="text-[10px] opacity-70 mt-0.5">
              Creates an approved payment record visible in Customer 360 and all accounts reports.
            </p>
          </div>

          {directPayStep === 'search' ? (
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                  Invoice Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={directPayInvoiceNo}
                    onChange={(e) => setDirectPayInvoiceNo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDirectInvoiceSearch()}
                    placeholder="e.g. INV-2025-001"
                    className="h-10 border-slate-200 font-bold text-sm flex-1"
                  />
                  <Button
                    onClick={handleDirectInvoiceSearch}
                    disabled={isSearchingInvoice || !directPayInvoiceNo.trim()}
                    className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 rounded-xl"
                  >
                    {isSearchingInvoice ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDirectPayOpen(false);
                    resetDirectPay();
                  }}
                  className="text-[10px] font-black uppercase text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                  Invoice
                </p>
                <p className="text-sm font-black text-indigo-800">
                  {directPayInvoice?.invoiceNumber}
                </p>
                <p className="text-xs text-indigo-600 font-bold">
                  {directPayInvoice?.customerName || '—'} · {currency}{' '}
                  {Number(directPayInvoice?.totalAmount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                {directPayExisting && directPayExisting.approvedTotal > 0 && (
                  <p className="text-[10px] text-indigo-500 font-bold mt-1.5">
                    Already approved: {currency}{' '}
                    {directPayExisting.approvedTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              {directPayExisting && directPayExisting.pending.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                    Already has {directPayExisting.pending.length} pending request
                    {directPayExisting.pending.length > 1 ? 's' : ''} — {currency}{' '}
                    {directPayExisting.pendingTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <ul className="text-[10px] text-amber-700 font-bold space-y-0.5">
                    {directPayExisting.pending.map((p) => (
                      <li key={p.id}>
                        {p.requestNo} · {currency}{' '}
                        {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ·
                        by {p.recordedByEmployeeName}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-600 mt-1">
                    Recording the full remaining balance here will overpay once that request is also
                    approved. Approve or reject it first, or reduce the amount below.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Amount ({currency}) *
                  </Label>
                  <Input
                    type="number"
                    value={directAmount}
                    onChange={(e) => setDirectAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 border-slate-200 font-black text-indigo-600"
                  />
                  {directPayExisting && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Safe to record without overpaying: {currency}{' '}
                      {directPayExisting.safeRemaining.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Payment Mode
                  </Label>
                  <Select
                    value={directMode}
                    onValueChange={(v) => {
                      setDirectMode(v as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE');
                      setDirectAccountId('');
                    }}
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
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Payment Date
                  </Label>
                  <Input
                    type="date"
                    value={directDate}
                    onChange={(e) => setDirectDate(e.target.value)}
                    className="h-10 border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>
              {directMode !== 'CHEQUE' && (
                <div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Deposit to Account *
                  </Label>
                  <Select value={directAccountId} onValueChange={setDirectAccountId}>
                    <SelectTrigger className="h-10 border-slate-200 font-bold text-xs">
                      <SelectValue placeholder="Select cash / bank account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold">
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {directMode === 'CHEQUE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
                    Cheque Details
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        Cheque No.
                      </Label>
                      <Input
                        value={directChequeNo}
                        onChange={(e) => setDirectChequeNo(e.target.value)}
                        className="h-9 border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        Bank Name
                      </Label>
                      <Input
                        value={directChequeBank}
                        onChange={(e) => setDirectChequeBank(e.target.value)}
                        className="h-9 border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        Cheque Date
                      </Label>
                      <Input
                        type="date"
                        value={directChequeDate}
                        onChange={(e) => setDirectChequeDate(e.target.value)}
                        className="h-9 border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                        Due Date
                      </Label>
                      <Input
                        type="date"
                        value={directChequeDue}
                        onChange={(e) => setDirectChequeDue(e.target.value)}
                        className="h-9 border-slate-200 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
              {directMode !== 'CHEQUE' && (
                <div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Reference #
                  </Label>
                  <Input
                    value={directRef}
                    onChange={(e) => setDirectRef(e.target.value)}
                    placeholder="Transaction / Reference number"
                    className="h-10 border-slate-200 font-bold text-xs"
                  />
                </div>
              )}
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                  Remarks
                </Label>
                <Input
                  value={directRemarks}
                  onChange={(e) => setDirectRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="h-10 border-slate-200 font-bold text-xs"
                />
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setDirectPayStep('search')}
                  disabled={isSavingDirect}
                  className="text-[10px] font-black uppercase text-slate-400"
                >
                  Back
                </Button>
                <Button
                  onClick={handleDirectPaySubmit}
                  disabled={
                    isSavingDirect ||
                    !directAmount ||
                    (['CASH', 'BANK_TRANSFER'].includes(directMode) && !directAccountId)
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl"
                >
                  {isSavingDirect ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Record & Approve'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
