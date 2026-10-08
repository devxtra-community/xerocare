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
  RefreshCw,
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
import { publicAppLink } from '@/lib/publicAppUrl';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  Bill,
  getBill,
  generateBillSigningToken,
  sendBillEmail,
  sendBillWhatsApp,
  markBillApprovedManually,
  resetBillForResend,
  SalePaymentRequest,
  PreviousBillSummary,
} from '@/lib/saleWorkflow';
import { Invoice } from '@/lib/invoice';
import { BillDocumentBody } from './BillDocumentBody';
import { getActiveCurrency } from '@/lib/currency';
import { printDocument } from '@/lib/printDocument';

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
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-warning/10 text-warning' },
  CUSTOMER_APPROVED: { label: 'Customer Approved', color: 'bg-success/10 text-success' },
  CUSTOMER_REJECTED: { label: 'Disputed', color: 'bg-destructive/10 text-destructive' },
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
  const [depositPayment, setDepositPayment] = useState<SalePaymentRequest | null>(null);
  const [previousBill, setPreviousBill] = useState<PreviousBillSummary | null>(null);
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
      setDepositPayment(data.depositPayment);
      setPreviousBill(data.previousBill);
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
      // Prefer the link the server built from PUBLIC_APP_URL. window.location.origin is
      // whatever THIS browser is on — localhost in dev, an internal host on the LAN —
      // which is unreachable for the customer the link is being sent to.
      setRemoteLink(result.link || publicAppLink(`/public/bill/sign/${result.token}`));
    } catch (err) {
      toast.error('Failed to generate bill link', { description: getApiErrorMessage(err) });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Clipboard writes must happen inside the click's user gesture on insecure
  // origins, so the await below stays direct — no intermediate setState round-trip.
  const copyLink = async () => {
    if (!remoteLink) return;
    const ok = await copyTextToClipboard(remoteLink);
    if (ok) {
      toast.success('Copied! Link copied to clipboard');
    } else {
      const manualCopy = window.prompt(
        'Clipboard access is unavailable. Copy this bill link manually:',
        remoteLink,
      );
      if (manualCopy !== null) {
        toast.info('Select the link in the prompt and press Ctrl+C or ⌘+C.');
      }
    }
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
        // Matches what's actually displayed in the field (see its value prop above) —
        // sent explicitly rather than relying only on the backend's own fallback to
        // invoice.customerName, so what gets recorded never drifts from what Finance saw.
        customerName: approverName.trim() || invoice?.customerName || undefined,
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

  const handlePrint = () => printDocument(printRef.current);

  const status = bill ? STATUS_META[bill.billStatus] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Bill — {invoice?.invoiceNumber}</DialogTitle>

        <div className="bg-card border-b border-border px-5 pt-4 pb-0 shrink-0 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
                  {bill?.billType === 'ADVANCE'
                    ? depositPayment
                      ? 'First Month Advance & Security Deposit Bill'
                      : 'First Month Advance Bill'
                    : bill?.billType === 'SECURITY_DEPOSIT'
                      ? 'Security Deposit Bill'
                      : 'Bill'}
                </p>
                <p className="text-sm font-black text-foreground leading-none">
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
                    ? 'border-border text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-card print:overflow-visible print:max-h-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : bill && invoice ? (
            <>
              {tab === 'view' && (
                <div className="space-y-4">
                  {bill.billStatus === 'CUSTOMER_REJECTED' && (
                    <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/30">
                      <div className="flex items-center gap-2 mb-1">
                        <ThumbsDown size={16} className="text-destructive" />
                        <p className="text-sm font-black text-destructive">
                          Customer disputed this bill
                        </p>
                      </div>
                      {bill.customerRejectionReason && (
                        <p className="text-[11px] text-destructive leading-relaxed">
                          &ldquo;{bill.customerRejectionReason}&rdquo;
                        </p>
                      )}
                      {bill.billType === 'ADVANCE' ? (
                        <Button
                          size="sm"
                          onClick={handleResetForResend}
                          disabled={isResetting}
                          className="mt-3 h-8 text-[10px] font-black uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
                            className="mt-3 h-8 text-[10px] font-black uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
                      depositPayment={depositPayment}
                      previousBill={previousBill}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrint}
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-8 w-full border border-border mt-4 print:hidden"
                    >
                      <Printer size={12} className="mr-1" /> Print / Save PDF
                    </Button>
                  </div>
                </div>
              )}

              {tab === 'send' && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-xl border border-border">
                    <p className="text-xs font-black text-foreground mb-1">
                      Send Bill for Customer Approval
                    </p>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      Generate a secure 72-hour link the customer can use to review this bill and
                      approve or dispute it on their own device — no account needed.
                    </p>
                  </div>

                  {bill.billStatus === 'CUSTOMER_APPROVED' ? (
                    <div className="p-4 bg-success/10 rounded-xl border border-success/30 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-success" />
                      <p className="text-sm font-black text-success">
                        Customer has already approved this bill
                      </p>
                    </div>
                  ) : !remoteLink ? (
                    <Button
                      onClick={handleGenerateLink}
                      disabled={isGeneratingLink}
                      className="w-full bg-foreground hover:bg-foreground text-primary-foreground font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
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
                      <div className="p-3 bg-card rounded-xl border border-border flex items-center gap-2">
                        <div className="flex-1 text-xs font-bold text-foreground break-all">
                          {remoteLink}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copyLink}
                          className="shrink-0 h-8 w-8 p-0 text-muted-foreground"
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold text-center">
                        Link expires in 72 hours • Single use
                      </p>
                      {/* A link is single-use and expires after 72 hours, so a customer who
                          let it lapse — or opened it once already — needs a fresh one. Until
                          now the generate button vanished as soon as a link existed, leaving
                          no way to reissue without closing and reopening the bill. */}
                      <Button
                        variant="outline"
                        onClick={handleGenerateLink}
                        disabled={isGeneratingLink}
                        className="w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-border text-foreground hover:bg-muted"
                      >
                        {isGeneratingLink ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <RefreshCw size={13} className="mr-2" />
                            Generate New Link
                          </>
                        )}
                      </Button>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
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
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-2 bg-foreground text-primary-foreground hover:bg-foreground"
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
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
                    <div className="p-4 bg-success/10 rounded-xl border border-success/30 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-success" />
                      <p className="text-sm font-black text-success">
                        Approved by {bill.customerApprovedByName}
                      </p>
                      <p className="text-[11px] text-success mt-1">
                        {bill.customerApprovalMethod === 'FINANCE_MANUAL'
                          ? `Recorded manually by ${bill.customerApprovalRecordedByName || 'staff'}`
                          : 'Via remote link'}
                        {bill.customerApprovedAt
                          ? ` · ${new Date(bill.customerApprovedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-warning/10 rounded-xl border border-warning/30 text-[11px] text-warning leading-relaxed font-bold">
                        Use this only when the customer approved by phone or in person, without
                        using the remote link. A note documenting how/when they approved is required
                        — this is the audit record for that approval.
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
                          Customer Name
                        </Label>
                        <Input
                          // Pre-filled from the invoice's real customer name — was a
                          // placeholder only, so the field looked filled in but was
                          // actually empty until Finance retyped the name they could
                          // already see. Still editable for the rare case someone other
                          // than the primary contact gave the approval.
                          value={approverName || invoice.customerName || ''}
                          onChange={(e) => setApproverName(e.target.value)}
                          className="h-10 font-bold border-border"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
                          Approval Note *
                        </Label>
                        <Textarea
                          value={approvalNote}
                          onChange={(e) => setApprovalNote(e.target.value)}
                          placeholder="e.g. Customer confirmed by phone call on..."
                          className="min-h-20 text-sm border-border"
                        />
                      </div>
                      <Button
                        onClick={handleMarkApproved}
                        disabled={!approvalNote.trim() || isSaving}
                        className="w-full bg-success hover:bg-success/90 text-success-foreground font-black text-[10px] uppercase tracking-widest h-10 rounded-xl disabled:opacity-40"
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

        <div className="p-4 bg-muted border-t border-border flex items-center justify-between gap-2 shrink-0 print:hidden">
          {/* Send straight from the footer, on whichever tab is open — the Send/Link tab
              makes you generate a link first, which is the right flow when you want the
              URL in hand, but not when you just want the customer to get the bill. Both
              of these go through the server, which resolves the customer's own email /
              WhatsApp number and issues the signing link itself. */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!bill || sendingVia !== null}
              onClick={() => handleSend('email')}
              className="text-[10px] font-black uppercase tracking-widest h-9 px-3"
              title="Email this bill to the customer"
            >
              {sendingVia === 'email' ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : (
                <Mail size={13} className="mr-1.5" />
              )}
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!bill || sendingVia !== null}
              onClick={() => handleSend('whatsapp')}
              className="text-[10px] font-black uppercase tracking-widest h-9 px-3"
              title="Send this bill to the customer on WhatsApp"
            >
              {sendingVia === 'whatsapp' ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : (
                <Send size={13} className="mr-1.5" />
              )}
              WhatsApp
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-9"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
