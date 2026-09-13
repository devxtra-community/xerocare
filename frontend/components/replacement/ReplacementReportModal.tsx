'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send, Link2, Copy, Printer, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { publicAppLink } from '@/lib/publicAppUrl';
import {
  getReplacement,
  sendReplacementReport,
  generateReplacementSigningToken,
  markReplacementCustomerApproved,
  type ReplacementDetail,
} from '@/lib/replacement';
import { ReplacementDetailView } from './ReplacementDetailView';

/**
 * Stage 07 — the replacement report and the customer's sign-off.
 *
 * Same shape as BillModal deliberately: document body, send by email or WhatsApp, a
 * 72-hour single-use signing link, and a manual "approved in person" path for when the
 * customer signs in front of the technician. Carries no pricing — the swap itself costs
 * the customer nothing; the usage it affects is billed on the ordinary monthly bill.
 */

export function ReplacementReportModal({
  requestId,
  onClose,
  onUpdated,
}: {
  requestId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingVia, setSendingVia] = useState<'email' | 'whatsapp' | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await getReplacement(requestId);
      setDetail(d);
      setApproverName((prev) => prev || d.request.customerName);
    } catch (err) {
      toast.error('Failed to load the report', { description: getApiErrorMessage(err) });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [requestId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (channel: 'email' | 'whatsapp') => {
    setSendingVia(channel);
    try {
      const res = await sendReplacementReport(requestId, channel);
      setLink(res.link);
      toast.success(`Report sent via ${channel === 'email' ? 'email' : 'WhatsApp'}`, {
        description: `Sent to ${res.recipient}`,
      });
      await load();
      onUpdated?.();
    } catch (err) {
      toast.error(`Could not send via ${channel}`, { description: getApiErrorMessage(err) });
    } finally {
      setSendingVia(null);
    }
  };

  const makeLink = async () => {
    setGeneratingLink(true);
    try {
      const { token } = await generateReplacementSigningToken(requestId);
      // window.location.origin is whatever THIS browser is on — localhost in dev, an
      // internal host on the LAN — which is unreachable for the customer the link is
      // being sent to. The other three signing modals were moved off it; this one was
      // missed.
      setLink(publicAppLink(`/public/replacement/sign/${token}`));
    } catch (err) {
      toast.error('Could not generate a link', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingLink(false);
    }
  };

  const approve = async () => {
    if (!approverName.trim()) return;
    setApproving(true);
    try {
      await markReplacementCustomerApproved(requestId, approverName.trim(), approvalNote.trim());
      toast.success('Replacement marked as customer approved');
      await load();
      onUpdated?.();
    } catch (err) {
      toast.error('Could not record approval', { description: getApiErrorMessage(err) });
    } finally {
      setApproving(false);
    }
  };

  const approved = detail?.request.status === 'CUSTOMER_APPROVED';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Replacement Report</DialogTitle>

        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <FileText size={17} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Machine Replacement Report
              </p>
              <p className="text-base font-black text-slate-800">
                {detail?.request.requestNo ?? '…'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : detail ? (
          <div className="space-y-5 p-5">
            <div ref={printRef}>
              <ReplacementDetailView detail={detail} />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="h-8 w-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 print:hidden"
            >
              <Printer size={12} className="mr-1" /> Print / Save PDF
            </Button>

            {!approved && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
                <p className="text-xs font-black text-slate-700">
                  Send to the customer for approval
                </p>

                {link && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    <span className="flex-1 break-all text-xs font-bold text-slate-700">
                      {link}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-slate-500"
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        toast.success('Link copied');
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={generatingLink || sendingVia !== null}
                    onClick={makeLink}
                    className="h-9 px-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    {generatingLink ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <Link2 size={12} className="mr-1" />
                    )}
                    Link
                  </Button>
                  <Button
                    size="sm"
                    disabled={sendingVia !== null}
                    onClick={() => send('whatsapp')}
                    className="h-9 bg-slate-800 px-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-900"
                  >
                    {sendingVia === 'whatsapp' ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <Send size={12} className="mr-1" />
                    )}
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    disabled={sendingVia !== null}
                    onClick={() => send('email')}
                    className="h-9 bg-indigo-600 px-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700"
                  >
                    {sendingVia === 'email' ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <Mail size={12} className="mr-1" />
                    )}
                    Email
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <p className="text-xs font-black text-slate-700">
                    Or record an in-person approval
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Approved by
                    </Label>
                    <Input
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Note (optional)
                    </Label>
                    <Textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      className="min-h-[60px] text-sm"
                      placeholder="Anything the customer said at handover…"
                    />
                  </div>
                  <Button
                    disabled={!approverName.trim() || approving}
                    onClick={approve}
                    className="h-9 w-full bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"
                  >
                    {approving ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} className="mr-1.5" />
                    )}
                    Mark as Customer Approved
                  </Button>
                </div>
              </div>
            )}

            {approved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center print:hidden">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-sm font-black text-emerald-800">
                  Customer approved this replacement
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  {detail.request.customerApprovalName}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className="sticky bottom-0 flex items-center justify-end border-t border-slate-100 bg-slate-50 p-4 print:hidden">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 text-xs font-black text-slate-500"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
