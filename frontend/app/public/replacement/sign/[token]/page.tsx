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
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-destructive" />
          <h1 className="text-lg font-black text-foreground">This link cannot be opened</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Replacement links are valid for 72 hours and can be used once. Ask your account manager
            to send a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm">
            <Wrench size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Machine Replacement Report
            </p>
            <h1 className="text-xl font-medium text-foreground">{detail?.request.requestNo}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {detail && <ReplacementDetailView detail={detail} />}
        </div>

        {state === 'approved' ? (
          <div className="mt-5 rounded-2xl border border-success/30 bg-success/10 p-7 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-success" />
            <h2 className="text-lg font-black text-success">Thank you — approval recorded</h2>
            <p className="mt-1.5 text-sm text-success">
              We have logged your confirmation of this machine replacement. No further action is
              needed.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-base font-black text-foreground">Confirm the replacement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Please confirm the machine listed above was replaced and the meter readings are
                correct.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Your name
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
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
              className="h-11 w-full bg-success text-sm font-black text-success-foreground hover:bg-success/90"
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
