'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ESignatureCanvas } from '@/components/employeeComponents/ESignatureCanvas';
import { InstallationReportView } from '@/components/installation/InstallationReportView';
import {
  getInstallationReportForSigning,
  signInstallationReportViaToken,
  type InstallationReportDetail,
} from '@/lib/installationReport';
import { getApiErrorMessage } from '@/lib/apiError';

/**
 * Customer-side signing page, reached from the link the technician shares.
 *
 * Unauthenticated by design: the single-use 72-hour token IS the credential, so the
 * customer signs from their own device without an account. Same shape as the contract
 * and replacement signing pages.
 */

type PageState = 'loading' | 'ready' | 'signed' | 'error';

export default function InstallationSigningPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [detail, setDetail] = useState<InstallationReportDetail | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await getInstallationReportForSigning(token);
        setDetail(d);
        setName(d.contract?.customerName || d.request.customerName || '');
        setState(d.signature.signed ? 'signed' : 'ready');
      } catch (err) {
        setError(getApiErrorMessage(err));
        setState('error');
      }
    })();
  }, [token]);

  const submit = async () => {
    if (!name.trim() || !signatureData) return;
    setSaving(true);
    try {
      await signInstallationReportViaToken(token, {
        signatureName: name.trim(),
        signatureData,
        note: note.trim() || undefined,
      });
      setState('signed');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setState('error');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle size={28} className="mx-auto mb-3 text-amber-500" />
          <p className="text-base font-black text-slate-800">This link cannot be opened</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
            <ClipboardCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Xerocare
            </p>
            <p className="text-base font-black text-slate-800">Installation Report</p>
          </div>
        </div>

        {detail && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <InstallationReportView detail={detail} />
          </div>
        )}

        {state === 'signed' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 size={26} className="mx-auto mb-2 text-emerald-600" />
            <p className="text-sm font-black text-emerald-800">
              Thank you — your signature is recorded
            </p>
            <p className="mt-1 text-[11px] text-emerald-700">
              You can close this page. A copy stays on your contract record.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-slate-700">
              Please confirm the installation above
            </p>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Your name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <ESignatureCanvas
              label="Your signature *"
              onSave={(dataUrl) => setSignatureData(dataUrl)}
              onClear={() => setSignatureData('')}
            />

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Remarks (optional)
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>

            <Button
              disabled={!name.trim() || !signatureData || saving}
              onClick={submit}
              className="h-10 w-full bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 size={14} className="mr-1.5" />
              )}
              Sign &amp; Confirm Installation
            </Button>
            <p className="text-center text-[10px] font-bold text-slate-400">
              Save your signature first, then confirm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
