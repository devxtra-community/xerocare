'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Link2, Copy, Printer, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import { publicAppLink } from '@/lib/publicAppUrl';
import { ESignatureCanvas } from '@/components/employeeComponents/ESignatureCanvas';
import { InstallationReportView } from './InstallationReportView';
import {
  getInstallationReport,
  generateInstallationSigningToken,
  signInstallationReportInPerson,
  type InstallationReportDetail,
} from '@/lib/installationReport';

/**
 * The technician's end-of-job handover: show the report, print it, and capture the
 * customer's signature — either on the technician's own device at the door, or by
 * sending a single-use link the customer signs from theirs.
 */

export function InstallationReportModal({
  requestId,
  onClose,
  onSigned,
}: {
  requestId: string;
  onClose: () => void;
  onSigned?: () => void;
}) {
  const [detail, setDetail] = useState<InstallationReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getInstallationReport(requestId);
      setDetail(d);
      setSignatureName((prev) => prev || d.contract?.customerName || d.request.customerName || '');
    } catch (err) {
      toast.error('Could not load the installation report', {
        description: getApiErrorMessage(err),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [requestId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const makeLink = async () => {
    setGeneratingLink(true);
    try {
      const { token, link } = await generateInstallationSigningToken(requestId);
      // Prefer the link the server built from PUBLIC_APP_URL. window.location.origin is
      // whatever THIS browser is on — localhost in dev, an internal host on the LAN —
      // which is unreachable for the customer the link is being sent to.
      setLink(link || publicAppLink(`/public/installation/sign/${token}`));
      toast.success('Signing link ready — valid for 72 hours');
    } catch (err) {
      toast.error('Could not generate a link', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingLink(false);
    }
  };

  const sign = async () => {
    if (!signatureName.trim() || !signatureData) return;
    setSigning(true);
    try {
      await signInstallationReportInPerson(requestId, {
        signatureName: signatureName.trim(),
        signatureData,
        note: note.trim() || undefined,
      });
      toast.success('Customer signature recorded');
      await load();
      onSigned?.();
    } catch (err) {
      toast.error('Could not record the signature', { description: getApiErrorMessage(err) });
    } finally {
      setSigning(false);
    }
  };

  const signed = detail?.signature.signed ?? false;
  const completed = detail?.request.status === 'COMPLETED';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Installation Report</DialogTitle>

        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <ClipboardCheck size={17} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Installation Report
              </p>
              <p className="text-base font-black text-slate-800">
                {detail?.request.invoiceNumber ?? '…'}
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
            <InstallationReportView detail={detail} />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="h-8 w-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 print:hidden"
            >
              <Printer size={12} className="mr-1" /> Print / Save PDF
            </Button>

            {!completed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center print:hidden">
                <p className="text-xs font-black text-amber-800">
                  This installation is not finished yet
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700">
                  The report can be signed once the job is completed.
                </p>
              </div>
            )}

            {completed && !signed && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
                <p className="text-xs font-black text-slate-700">Customer sign-off</p>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Signed by *
                  </Label>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Name of the person signing"
                    className="h-9 bg-white text-sm"
                  />
                </div>

                <ESignatureCanvas
                  label="Customer signature *"
                  onSave={(dataUrl) => {
                    setSignatureData(dataUrl);
                    toast.success('Signature captured');
                  }}
                  onClear={() => setSignatureData('')}
                />

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Remarks (optional)
                  </Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-[60px] bg-white text-sm"
                    placeholder="Anything the customer noted at handover…"
                  />
                </div>

                <Button
                  disabled={!signatureName.trim() || !signatureData || signing}
                  onClick={sign}
                  className="h-9 w-full bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"
                >
                  {signing ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} className="mr-1.5" />
                  )}
                  Record Customer Signature
                </Button>

                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <p className="text-xs font-black text-slate-700">
                    Or send the customer a link to sign
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={generatingLink}
                    onClick={makeLink}
                    className="h-9 w-full text-[10px] font-black uppercase tracking-widest"
                  >
                    {generatingLink ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <Link2 size={12} className="mr-1" />
                    )}
                    Generate signing link (72h)
                  </Button>
                </div>
              </div>
            )}

            {signed && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center print:hidden">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-sm font-black text-emerald-800">
                  Customer signed this installation report
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">{detail.signature.name}</p>
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
