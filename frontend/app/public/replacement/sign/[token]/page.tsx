'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReplacementDetailView } from '@/components/replacement/ReplacementDetailView';
import {
  getReplacementForSigning,
  approveReplacementViaToken,
  type ReplacementDetail,
} from '@/lib/replacement';
import { getApiErrorMessage } from '@/lib/apiError';

/**
 * Stage 07, customer side — the signing page reached from the emailed / WhatsApped link.
 *
 * Unauthenticated by design: the 72-hour single-use token IS the credential, so the
 * customer approves from their own device without an account.
 */

type PageState = 'loading' | 'ready' | 'approved' | 'error';

export default function ReplacementSigningPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await getReplacementForSigning(token);
        setDetail(d);
        setName(d.request.customerName ?? '');
        setState(d.request.status === 'CUSTOMER_APPROVED' ? 'approved' : 'ready');
      } catch (err) {
        setError(getApiErrorMessage(err));
        setState('error');
      }
    })();
  }, [token]);

  const approve = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await approveReplacementViaToken(token, name.trim(), note.trim() || undefined);
      setState('approved');
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
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-red-500" />
          <h1 className="text-lg font-black text-slate-800">This link cannot be opened</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <p className="mt-3 text-xs text-slate-400">
            Replacement links are valid for 72 hours and can be used once. Ask your account manager
            to send a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Wrench size={18} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Machine Replacement Report
            </p>
            <h1 className="text-xl font-black text-slate-800">{detail?.request.requestNo}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {detail && <ReplacementDetailView detail={detail} />}
        </div>

        {state === 'approved' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
            <h2 className="text-lg font-black text-emerald-800">Thank you — approval recorded</h2>
            <p className="mt-1.5 text-sm text-emerald-700">
              We have logged your confirmation of this machine replacement. No further action is
              needed.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-800">Confirm the replacement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Please confirm the machine listed above was replaced and the meter readings are
                correct.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Your name
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Note (optional)
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[70px]"
                placeholder="Anything you would like recorded with your approval…"
              />
            </div>
            <Button
              onClick={approve}
              disabled={!name.trim() || saving}
              className="h-11 w-full bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle2 size={16} className="mr-2" />
              )}
              Approve Replacement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
