'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  PlusCircle,
  FileDown,
  ExternalLink,
  Mail,
  MessageSquare,
  Clock,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSalePaymentsForInvoice,
  generateSalePaymentReceipt,
  sendReceiptEmail,
  sendReceiptWhatsApp,
  type SalePaymentRequest,
} from '@/lib/saleWorkflow';
import { getAccountSummary, type PaymentSummary } from '@/lib/payment';
import { InvoiceAccountView } from './InvoiceAccountView';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

interface SalePaymentCollectionModalProps {
  invoiceId: string;
  invoiceNumber: string;
  open: boolean;
  onClose: () => void;
  /** Sale/Rent/Lease/etc — governs when receipt actions become available (see below).
   *  Defaults to Sale's immediate-receipt behaviour when omitted. */
  saleType?: string;
  /** Employee-side Rent/Lease context: the employee's only receipt responsibility is the
   *  advance — periodic/usage collections are Finance's responsibility (their own receipt
   *  UI lives in UsageRecordingModal). When true, filters the collection history down to
   *  RENT_ADVANCE/LEASE_ADVANCE requests only. Defaults to false (shows every collection),
   *  which keeps Sale's existing behaviour untouched. */
  advanceOnly?: boolean;
}

/**
 * Employee-facing Payment Collection panel — used for a Sale's collections AND a
 * Rent/Lease contract's advance payment (same request shape, same backend, same
 * approval-gate; only the receipt-availability rule below differs by type).
 *
 * Deliberately thin: recording a collection (Cash/Bank/Cheque) and the Finance
 * approval-gate that governs it both already live in InvoiceAccountView /
 * recordSalePayment / approveSalePayment. This panel only adds two things on top,
 * reusing those exact calls rather than a second implementation:
 *   1. The request-level collection history (including PENDING ones still awaiting
 *      Finance, which InvoiceAccountView's own ledger view omits by design — it only
 *      lists approved payments, per the Outstanding-until-approved rule).
 *   2. Generate/email/WhatsApp receipt actions per collection.
 *
 * Receipt timing differs by type, and this mirrors an existing, deliberate distinction
 * already live elsewhere in this codebase (see the sale-contracts page's own comment:
 * "Sale/advance: receipt available immediately; Rent/Lease periodic: gated by approval"):
 *   - SALE/PRODUCT_SALE/SPAREPART_SALE, and RENT_ADVANCE/LEASE_ADVANCE regardless of
 *     type: available the moment it's recorded (PENDING or APPROVED, not REJECTED) —
 *     the employee already took the money (often in person, in front of the customer,
 *     who may need the receipt immediately), so approval being an internal accounting
 *     step must not hold up proof of payment.
 *   - Rent/Lease periodic collections: available only once Finance has APPROVED it.
 *     Not backend-enforced (the backend allows either), so this is the one place that
 *     rule lives. Periodic collections aren't recorded through this panel at all
 *     (Record Usage is Finance's own flow) — this only matters if a future caller
 *     ever passes non-advance Rent/Lease payments in here.
 *
 * Paid/Pending here come from the same getAccountSummary endpoint InvoiceAccountView
 * uses, which sums only approved payments — so this panel can never show an amount as
 * Paid before Accounts has actually approved it. Receipt availability is a separate,
 * looser rule (proof of a collection actually taken), not a statement that it's Paid.
 */
export function SalePaymentCollectionModal({
  invoiceId,
  invoiceNumber,
  open,
  onClose,
  saleType,
  advanceOnly,
}: SalePaymentCollectionModalProps) {
  const isSaleFamily = ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(
    (saleType ?? 'SALE').toUpperCase(),
  );
  // Same "already took the money in person" reasoning applies to a security deposit
  // collected at signing as it does to the advance itself — both happen in the same
  // sitting as this modal's advanceOnly view, so neither should wait on Finance's
  // internal approval before the employee can hand over proof of payment.
  const isImmediateReceiptContext = (pmt: SalePaymentRequest) =>
    pmt.paymentContext === 'RENT_ADVANCE' ||
    pmt.paymentContext === 'LEASE_ADVANCE' ||
    !!pmt.isSecurityDeposit;
  const receiptAvailable = (pmt: SalePaymentRequest) => {
    return isSaleFamily || isImmediateReceiptContext(pmt)
      ? pmt.status !== 'REJECTED'
      : pmt.status === 'APPROVED';
  };
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<SalePaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [generatingReceiptFor, setGeneratingReceiptFor] = useState<string | null>(null);
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        getAccountSummary(invoiceId),
        getSalePaymentsForInvoice(invoiceId),
      ]);
      setSummary(s);
      // The security deposit is collected in the exact same sitting as the advance (see
      // QuotationConversionFlow.tsx) even though it's recorded as its own SalePaymentRequest
      // — leaving it out here meant the employee had collected e.g. 16,300 (advance +
      // accessories + deposit) but this panel only ever showed/receipted 16,150 of it,
      // with no way to see or receipt the deposit portion from this same modal at all.
      const filtered = advanceOnly
        ? p.filter(
            (pmt) =>
              pmt.paymentContext === 'RENT_ADVANCE' ||
              pmt.paymentContext === 'LEASE_ADVANCE' ||
              pmt.isSecurityDeposit,
          )
        : p;
      setPayments(filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (err) {
      toast.error('Failed to load payment collection details', {
        description: getApiErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, advanceOnly]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleGenerateReceipt = async (pmt: SalePaymentRequest) => {
    setGeneratingReceiptFor(pmt.id);
    try {
      if (pmt.receiptUrl) {
        window.open(pmt.receiptUrl, '_blank');
        return;
      }
      const { receiptUrl } = await generateSalePaymentReceipt(pmt.id);
      setPayments((prev) => prev.map((p) => (p.id === pmt.id ? { ...p, receiptUrl } : p)));
      window.open(receiptUrl, '_blank');
      toast.success('Receipt generated', {
        description: `${pmt.requestNo} receipt opened in a new tab.`,
      });
    } catch (err) {
      toast.error('Failed to generate receipt', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingReceiptFor(null);
    }
  };

  const handleSendReceipt = async (pmt: SalePaymentRequest, channel: 'email' | 'whatsapp') => {
    const key = pmt.id + channel;
    setSendingFor(key);
    try {
      const result =
        channel === 'email' ? await sendReceiptEmail(pmt.id) : await sendReceiptWhatsApp(pmt.id);
      toast.success(`Receipt sent via ${channel === 'email' ? 'email' : 'WhatsApp'}`, {
        description: `Sent to ${result.recipient}`,
      });
    } catch (err) {
      toast.error(`Failed to send receipt via ${channel}`, {
        description: getApiErrorMessage(err),
      });
    } finally {
      setSendingFor(null);
    }
  };

  if (!open) return null;

  // The deposit is real money the employee collected too, but it deliberately never
  // touches invoice.totalAmount / the ledger getAccountSummary reads from (a deposit
  // is a refundable liability, not revenue — see accountsShared.ts). Folded in only
  // for this at-signing display so Total/Paid/Pending reflect what the employee
  // actually handed over and can prove receipt for, without changing what counts as
  // revenue anywhere else in the app (Balance Sheet, AR, etc. are untouched).
  const depositPayments = advanceOnly ? payments.filter((p) => p.isSecurityDeposit) : [];
  const depositTotal = depositPayments
    .filter((p) => p.status !== 'REJECTED')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const depositPaid = depositPayments
    .filter((p) => p.status === 'APPROVED')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const depositPending = depositTotal - depositPaid;
  const hasDeposit = depositPayments.length > 0;

  const displayTotal = (summary?.totalAmount ?? 0) + depositTotal;
  const displayPaid = (summary?.totalPaid ?? 0) + depositPaid;
  const displayPending = (summary?.pendingBalance ?? 0) + depositPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Wallet className="text-primary" size={20} />
              Payment Collection — {invoiceNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every collection recorded here goes to Accounts → Receipts for approval before it
              counts as Paid.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : summary ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                    <p className="text-lg font-bold text-slate-800">
                      {formatCurrency(displayTotal, summary.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[10px] font-black uppercase text-emerald-600">Paid</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {formatCurrency(displayPaid, summary.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-black uppercase text-amber-600">Pending</p>
                    <p className="text-lg font-bold text-amber-700">
                      {formatCurrency(displayPending, summary.currency)}
                    </p>
                  </div>
                </div>
                {hasDeposit && (
                  <p className="text-[10px] text-slate-400 -mt-2">
                    Includes {formatCurrency(depositTotal, summary.currency)} security deposit —
                    refundable, held separately from rent/lease revenue.
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {advanceOnly
                      ? hasDeposit
                        ? 'Advance & Security Deposit'
                        : 'Advance Payment'
                      : 'Collection History'}
                  </p>
                  {/* Periodic Rent/Lease collections are recorded through Record Usage
                      (Finance), not this generic form — keeps this view strictly a
                      receipt-lookup for the advance in that context. */}
                  {!advanceOnly && summary.pendingBalance > 0.01 && (
                    <Button
                      size="sm"
                      onClick={() => setShowCollectionForm(true)}
                      className="h-7 gap-1 text-[10px] font-black uppercase"
                    >
                      <PlusCircle size={12} /> Add Collection
                    </Button>
                  )}
                </div>

                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No collections recorded yet.
                  </p>
                ) : (
                  // hasDeposit: the employee collected both in the same sitting (see
                  // QuotationConversionFlow.tsx steps 4/5) — wrapping them as one visual
                  // receipt block with a shared header + total makes that obvious, instead
                  // of reading as two unrelated transactions. They stay two real, separate
                  // SalePaymentRequest rows underneath (mode/date/status/receipt can
                  // legitimately differ per component, e.g. a cheque deposit against a cash
                  // advance) — Technician-side "deposit already collected" detection and
                  // every Accounts/AR/Balance-Sheet distinction keyed off isSecurityDeposit
                  // is untouched; only the presentation here is merged.
                  <div
                    className={`rounded-xl border overflow-hidden ${
                      hasDeposit ? 'border-primary/30 bg-primary/2' : 'border-slate-200'
                    }`}
                  >
                    {hasDeposit && (
                      <div className="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-1.5">
                        <Wallet size={12} className="text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-wide text-primary">
                          Collected Together — First Month Advance &amp; Security Deposit
                        </p>
                      </div>
                    )}
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr className="text-[9px] font-black uppercase tracking-wide">
                          <th className="text-left px-3 py-2">Request</th>
                          <th className="text-left px-3 py-2">Mode</th>
                          <th className="text-right px-3 py-2">Amount</th>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((pmt) => (
                          <tr key={pmt.id}>
                            <td className="px-3 py-2 font-mono font-bold text-slate-700">
                              {pmt.requestNo}
                              {pmt.isSecurityDeposit && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-teal-100 text-teal-700">
                                  Deposit
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">{pmt.paymentMode.replace('_', ' ')}</td>
                            <td className="px-3 py-2 text-right font-bold">
                              {formatCurrency(pmt.amount, pmt.currency)}
                            </td>
                            <td className="px-3 py-2">
                              {new Date(pmt.paymentDate).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                  pmt.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : pmt.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {pmt.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {pmt.status === 'REJECTED' ? (
                                <span className="text-[9px] text-slate-300">—</span>
                              ) : receiptAvailable(pmt) ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleGenerateReceipt(pmt)}
                                    disabled={generatingReceiptFor === pmt.id}
                                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                    title={pmt.receiptUrl ? 'View Receipt' : 'Generate Receipt'}
                                  >
                                    {generatingReceiptFor === pmt.id ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : pmt.receiptUrl ? (
                                      <ExternalLink size={11} />
                                    ) : (
                                      <FileDown size={11} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleSendReceipt(pmt, 'email')}
                                    disabled={sendingFor === pmt.id + 'email'}
                                    className="text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                                    title="Email receipt to customer"
                                  >
                                    {sendingFor === pmt.id + 'email' ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <Mail size={11} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleSendReceipt(pmt, 'whatsapp')}
                                    disabled={sendingFor === pmt.id + 'whatsapp'}
                                    className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                    title="WhatsApp receipt to customer"
                                  >
                                    {sendingFor === pmt.id + 'whatsapp' ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <MessageSquare size={11} />
                                    )}
                                  </button>
                                  {/* Sale-family and advance payments reach here while still
                                      PENDING too — an informational hint, the buttons above
                                      already work. */}
                                  {pmt.status === 'PENDING' && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-amber-500 whitespace-nowrap">
                                      <Clock size={9} /> awaiting approval
                                    </span>
                                  )}
                                </div>
                              ) : (
                                // Rent/Lease periodic collection, still PENDING: no receipt
                                // until Finance approves.
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 whitespace-nowrap">
                                  <Clock size={9} /> awaiting approval
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {hasDeposit && (
                        <tfoot>
                          <tr className="border-t-2 border-primary/20 bg-primary/5">
                            <td
                              colSpan={2}
                              className="px-3 py-2 text-right font-black text-primary uppercase text-[10px]"
                            >
                              Total Collected
                            </td>
                            <td className="px-3 py-2 text-right font-black text-primary">
                              {formatCurrency(displayTotal, summary.currency)}
                            </td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Failed to load payment details.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Collection — stacked on top, same as every other InvoiceAccountView caller
          (InvoiceDetailsDialog + ReplaceDeviceModal is the established precedent for
          this pattern). Reuses the exact same gated recording form and approval-gate;
          not a second implementation. */}
      {showCollectionForm && (
        <InvoiceAccountView
          invoiceId={invoiceId}
          open={showCollectionForm}
          gated
          onClose={() => {
            setShowCollectionForm(false);
            load();
          }}
        />
      )}
    </>
  );
}
