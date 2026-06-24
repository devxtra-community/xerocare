'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Download, Send, Mail, Phone, Loader2 } from 'lucide-react';
import {
  downloadQuotationPdf,
  downloadCompletionBillPdf,
  sendQuotationDoc,
  sendCompletionBillDoc,
} from '@/lib/serviceTicket';

type SendDocumentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  docType: 'quotation' | 'completion-bill';
  initialEmail?: string;
  initialPhone?: string;
  customerName?: string;
};

export default function SendDocumentModal({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  docType,
  initialEmail = '',
  initialPhone = '',
  customerName = 'Customer',
}: SendDocumentModalProps) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [phoneEnabled, setPhoneEnabled] = useState(true);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setPhone(initialPhone);
      setEmailEnabled(!!initialEmail);
      setPhoneEnabled(!!initialPhone);
    }
  }, [open, initialEmail, initialPhone]);

  const docLabel = docType === 'quotation' ? 'Service Quotation' : 'Service Completion Bill';
  const filePrefix = docType === 'quotation' ? 'Quotation' : 'Completion_Bill';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      let blob: Blob;
      if (docType === 'quotation') {
        blob = await downloadQuotationPdf(ticketId);
      } else {
        blob = await downloadCompletionBillPdf(ticketId);
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filePrefix}_${ticketNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${docLabel} PDF downloaded successfully.`);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error(`Failed to download ${docLabel} PDF.`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailEnabled && !phoneEnabled) {
      toast.error('Please select at least one delivery channel (Email or WhatsApp).');
      return;
    }

    try {
      setSending(true);
      const payload = {
        sendToEmail: emailEnabled ? email : undefined,
        sendToPhone: phoneEnabled ? phone : undefined,
      };

      if (docType === 'quotation') {
        await sendQuotationDoc(ticketId, payload);
      } else {
        await sendCompletionBillDoc(ticketId, payload);
      }

      toast.success(`${docLabel} has been sent successfully.`);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send document:', error);
      toast.error(`Failed to send ${docLabel}.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-2xl p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Share {docLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Download or deliver the {docLabel.toLowerCase()} to {customerName} for ticket{' '}
            {ticketNumber}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 py-3">
          {/* Email Block */}
          <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <Mail className="h-4 w-4 text-slate-400" />
                Send via Email
              </label>
            </div>
            {emailEnabled && (
              <Input
                type="email"
                required
                placeholder="customer@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs bg-white border-slate-200 rounded-lg mt-1"
              />
            )}
          </div>

          {/* WhatsApp Block */}
          <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={phoneEnabled}
                  onChange={(e) => setPhoneEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <Phone className="h-4 w-4 text-slate-400" />
                Send via WhatsApp
              </label>
            </div>
            {phoneEnabled && (
              <Input
                type="tel"
                required
                placeholder="+974xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs bg-white border-slate-200 rounded-lg mt-1"
              />
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={downloading || sending}
              onClick={handleDownload}
              className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Download className="h-4 w-4 text-slate-500" />
              )}
              Download PDF Document
            </Button>

            <div className="flex items-center justify-end gap-2 mt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={sending}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending || (!emailEnabled && !phoneEnabled)}
                className="rounded-xl text-xs font-bold h-10 bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 px-5"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
                Send Document
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
