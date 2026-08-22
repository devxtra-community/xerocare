'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  Send,
  CheckCircle2,
  Copy,
  Printer,
  Link2,
  Mail,
  ThumbsDown,
  PenLine,
  Pencil,
} from 'lucide-react';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  Bill,
  getBill,
  generateBillSigningToken,
  sendBillEmail,
  sendBillWhatsApp,
  markBillApprovedManually,
  resetBillForResend,
  SalePaymentRequest,
} from '@/lib/saleWorkflow';
import { Invoice } from '@/lib/invoice';
import { BillDocumentBody } from './BillDocumentBody';
import { getActiveCurrency } from '@/lib/currency';

interface BillModalProps {
  usageRecordId: string;
  open: boolean;
  onClose: () => void;
  /** Fires after a successful send, manual approve, etc. — refresh-only, never closes. */
  onUpdated?: (bill: Bill) => void;
  /** Shown as an "Edit & Resend" action when the bill is disputed — the caller owns the
   *  actual usage-edit form (UsageRecordingModal's edit mode), BillModal just requests it. */
  onEditRequested?: (usageRecordId: string) => void;
  /** Which tab to open on — defaults to 'send' right after a bill is first created,
   *  since that's the very next thing Finance needs to do. */
  initialTab?: BillTab;
}

type BillTab = 'view' | 'send' | 'approve';

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700' },
  CUSTOMER_APPROVED: { label: 'Customer Approved', color: 'bg-emerald-100 text-emerald-700' },
  CUSTOMER_REJECTED: { label: 'Disputed', color: 'bg-red-100 text-red-700' },
};

export function BillModal({
  usageRecordId,
  open,
  onClose,
  onUpdated,
  onEditRequested,
  initialTab = 'view',
}: BillModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [advancePayment, setAdvancePayment] = useState<SalePaymentRequest | null>(null);
  const [tab, setTab] = useState<BillTab>(initialTab);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [sendingVia, setSendingVia] = useState<'email' | 'whatsapp' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const currency = getActiveCurrency();

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getBill(usageRecordId);
      setBill(data.usage);
      setInvoice(data.invoice);
      setAdvancePayment(data.advancePayment);
    } catch (err) {
      toast.error('Failed to load bill', { description: getApiErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForResend = async () => {
    setIsResetting(true);
    try {
      const updated = await resetBillForResend(usageRecordId);
      setBill(updated);
      onUpdated?.(updated);
      setTab('send');
      toast.success('Advance Bill reset — ready to resend for approval');
    } catch (err) {
      toast.error('Failed to reset bill', { description: getApiErrorMessage(err) });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setRemoteLink(null);
    setApproverName('');
    setApprovalNote('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usageRecordId]);

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await generateBillSigningToken(usageRecordId);
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}/public/bill/sign/${result.token}`
          : `/public/bill/sign/${result.token}`;
      setRemoteLink(url);
    } catch (err) {
      toast.error('Failed to generate bill link', { description: getApiErrorMessage(err) });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyLink = () => {
    if (!remoteLink) return;
    navigator.clipboard.writeText(remoteLink);
    toast.success('Link copied to clipboard');
  };

  const handleSend = async (channel: 'email' | 'whatsapp') => {
    setSendingVia(channel);
    try {
      const result =
        channel === 'email'
          ? await sendBillEmail(usageRecordId)
          : await sendBillWhatsApp(usageRecordId);
      setRemoteLink(result.link);
      toast.success(`Bill sent via ${channel === 'email' ? 'email' : 'WhatsApp'}`, {
        description: `Sent to ${result.recipient}`,
      });
      onUpdated?.(bill as Bill);
    } catch (err) {
      toast.error(`Failed to send bill via ${channel}`, { description: getApiErrorMessage(err) });
    } finally {
      setSendingVia(null);
    }
  };

  const handleMarkApproved = async () => {
    if (!approvalNote.trim()) return;
    setIsSaving(true);
    try {
      const updated = await markBillApprovedManually(usageRecordId, {
        customerName: approverName.trim() || undefined,
        approvalNote: approvalNote.trim(),
      });
      setBill(updated);
      toast.success('Bill marked as Customer Approved');
      onUpdated?.(updated);
      setTab('view');
    } catch (err) {
      toast.error('Failed to mark bill approved', { description: getApiErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const status = bill ? STATUS_META[bill.billStatus] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Bill — {invoice?.invoiceNumber}</DialogTitle>

        <div className="bg-white border-b border-slate-200 px-5 pt-4 pb-0 shrink-0 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                  {bill?.billType === 'ADVANCE' ? 'Advance Bill' : 'Bill'}
                </p>
                <p className="text-sm font-black text-slate-800 leading-none">
                  {invoice?.invoiceNumber}
                </p>
              </div>
            </div>
            {status && (
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${status.color}`}
              >
                {status.label}
              </span>
            )}
          </div>

          <div className="flex gap-0 -mb-px">
            {[
              { key: 'view' as BillTab, label: 'Document', icon: FileText },
              { key: 'send' as BillTab, label: 'Send / Link', icon: Link2 },
              { key: 'approve' as BillTab, label: 'Mark Approved', icon: PenLine },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                  tab === key
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-white print:overflow-visible print:max-h-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : bill && invoice ? (
            <>
              {tab === 'view' && (
                <div className="space-y-4">
                  {bill.billStatus === 'CUSTOMER_REJECTED' && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-2 mb-1">
                        <ThumbsDown size={16} className="text-red-500" />
                        <p className="text-sm font-black text-red-700">
                          Customer disputed this bill
                        </p>
                      </div>
                      {bill.customerRejectionReason && (
                        <p className="text-[11px] text-red-600 leading-relaxed">
                          &ldquo;{bill.customerRejectionReason}&rdquo;
                        </p>
                      )}
                      {bill.billType === 'ADVANCE' ? (
                        <Button
                          size="sm"
                          onClick={handleResetForResend}
                          disabled={isResetting}
                          className="mt-3 h-8 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isResetting ? (
                            <Loader2 size={12} className="mr-1.5 animate-spin" />
                          ) : (
                            <Pencil size={12} className="mr-1.5" />
                          )}
                          Resend for Approval
                        </Button>
                      ) : (
                        onEditRequested && (
                          <Button
                            size="sm"
                            onClick={() => onEditRequested(usageRecordId)}
                            className="mt-3 h-8 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Pencil size={12} className="mr-1.5" />
                            Edit Bill &amp; Resend
                          </Button>
                        )
                      )}
                    </div>
                  )}
                  <div ref={printRef}>
                    <BillDocumentBody
                      invoice={invoice}
                      bill={bill}
                      currency={currency}
                      advancePayment={advancePayment}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrint}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-8 w-full border border-slate-100 mt-4"
                    >
                      <Printer size={12} className="mr-1" /> Print / Save PDF
                    </Button>
                  </div>
                </div>
              )}

              {tab === 'send' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-700 mb-1">
                      Send Bill for Customer Approval
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Generate a secure 72-hour link the customer can use to review this bill and
                      approve or dispute it on their own device — no account needed.
                    </p>
                  </div>

                  {bill.billStatus === 'CUSTOMER_APPROVED' ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-black text-emerald-700">
                        Customer has already approved this bill
                      </p>
                    </div>
                  ) : !remoteLink ? (
                    <Button
                      onClick={handleGenerateLink}
                      disabled={isGeneratingLink}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    >
                      {isGeneratingLink ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Link2 size={14} className="mr-2" />
                          Generate Bill Link
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                        <div className="flex-1 text-xs font-bold text-slate-700 break-all">
                          {remoteLink}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyLink}
                          className="shrink-0 h-8 w-8 p-0 text-slate-500"
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold text-center">
                        Link expires in 72 hours • Single use
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyLink}
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-2"
                        >
                          <Copy size={12} className="mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-2 bg-slate-800 text-white hover:bg-slate-900"
                          onClick={() => {
                            const wa = `https://wa.me/?text=${encodeURIComponent(
                              `Please review your bill: ${remoteLink}`,
                            )}`;
                            window.open(wa, '_blank');
                          }}
                        >
                          <Send size={12} className="mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          disabled={sendingVia !== null}
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-2 bg-indigo-600 text-white hover:bg-indigo-700"
                          onClick={() => handleSend('email')}
                        >
                          {sendingVia === 'email' ? (
                            <Loader2 size={12} className="animate-spin mr-1" />
                          ) : (
                            <Mail size={12} className="mr-1" />
                          )}
                          Email
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'approve' && (
                <div className="space-y-4">
                  {bill.billStatus === 'CUSTOMER_APPROVED' ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-black text-emerald-700">
                        Approved by {bill.customerApprovedByName}
                      </p>
                      <p className="text-[11px] text-emerald-600 mt-1">
                        {bill.customerApprovalMethod === 'FINANCE_MANUAL'
                          ? 'Recorded manually by Finance'
                          : 'Via remote link'}
                        {bill.customerApprovedAt
                          ? ` · ${new Date(bill.customerApprovedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 leading-relaxed font-bold">
                        Use this only when the customer approved by phone or in person, without
                        using the remote link. A note documenting how/when they approved is required
                        — this is the audit record for that approval.
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                          Customer Name
                        </Label>
                        <Input
                          value={approverName}
                          onChange={(e) => setApproverName(e.target.value)}
                          placeholder={invoice.customerName || 'Customer'}
                          className="h-10 font-bold border-slate-200"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                          Approval Note *
                        </Label>
                        <Textarea
                          value={approvalNote}
                          onChange={(e) => setApprovalNote(e.target.value)}
                          placeholder="e.g. Customer confirmed by phone call on..."
                          className="min-h-20 text-sm border-slate-200"
                        />
                      </div>
                      <Button
                        onClick={handleMarkApproved}
                        disabled={!approvalNote.trim() || isSaving}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl disabled:opacity-40"
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={14} className="mr-2" />
                            Mark as Customer Approved
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 print:hidden">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
