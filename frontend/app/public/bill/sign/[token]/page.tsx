'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileText, CheckCircle2, AlertTriangle, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BillDocumentBody } from '@/components/Finance/BillDocumentBody';
import {
  getBillForSigning,
  approveBillRemote,
  rejectBillRemote,
  type BillForSigning,
} from '@/lib/saleWorkflow';
import { getApiErrorMessage } from '@/lib/apiError';
import { getActiveCurrency } from '@/lib/currency';

type PageState = 'loading' | 'ready' | 'disputing' | 'approved' | 'disputed' | 'error';

export default function RemoteBillApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [bill, setBill] = useState<BillForSigning | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [doneAt, setDoneAt] = useState<string>('');

  const loadBill = async () => {
    try {
      const data = await getBillForSigning(token);
      setBill(data);
      setState('ready');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid bill link');
      setState('error');
      return;
    }
    loadBill();
  }, [token]);

  const handleApprove = async () => {
    if (!customerName.trim()) return;
    setIsSaving(true);
    try {
      const result = await approveBillRemote(token, customerName);
      setDoneAt(result.approvedAt);
      setState('approved');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setIsSaving(true);
    try {
      const result = await rejectBillRemote(token, disputeReason);
      setDoneAt(result.rejectedAt);
      setState('disputed');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-white" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Bill Approval Portal
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm font-bold text-slate-500">Loading your bill...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-black text-slate-800">Unable to Load Bill</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
              <p className="text-xs text-slate-400 mt-2">
                This link may have expired or already been used. Please contact the dealer for a new
                link.
              </p>
            </div>
          )}

          {state === 'approved' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <p className="text-lg font-black text-slate-800">Bill Approved!</p>
              <p className="text-xs text-slate-400">
                Approved on {doneAt ? new Date(doneAt).toLocaleString() : ''}
              </p>
              <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
                Thank you for reviewing this bill. You may close this tab.
              </p>
            </div>
          )}

          {state === 'disputed' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-14 w-14 bg-amber-100 rounded-full flex items-center justify-center">
                <ThumbsDown size={28} className="text-amber-500" />
              </div>
              <p className="text-lg font-black text-slate-800">Dispute Submitted</p>
              <p className="text-xs text-slate-400">
                Submitted on {doneAt ? new Date(doneAt).toLocaleString() : ''}
              </p>
              <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
                Our finance team will review this bill and send you a corrected version. You may
                close this tab.
              </p>
            </div>
          )}

          {(state === 'ready' || state === 'disputing') && bill && (
            <>
              {bill.invoice ? (
                <div className="border border-slate-200 rounded-2xl p-4 sm:p-6 overflow-x-auto">
                  <BillDocumentBody
                    invoice={bill.invoice}
                    bill={bill.usage}
                    currency={getActiveCurrency()}
                    advancePayment={bill.advancePayment}
                  />
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center text-xs text-amber-700 font-bold">
                  Bill details could not be fully loaded — please contact the dealer if this
                  persists.
                </div>
              )}

              {state === 'ready' && (
                <>
                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      Your Full Name *
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-10 font-bold border-slate-200"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={!customerName.trim() || isSaving}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-100 disabled:opacity-40"
                    >
                      {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={18} className="mr-2" />
                          Approve Bill
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setState('disputing')}
                      disabled={isSaving}
                      className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50 font-black text-sm rounded-xl"
                    >
                      <ThumbsDown size={18} className="mr-2" />
                      Dispute This Bill
                    </Button>
                  </div>
                </>
              )}

              {state === 'disputing' && (
                <>
                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      What looks incorrect? *
                    </Label>
                    <Textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="e.g. The meter reading looks higher than expected"
                      className="min-h-24 text-sm border-slate-200"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setState('ready')}
                      disabled={isSaving}
                      className="flex-1 h-12 font-black text-sm rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleDispute}
                      disabled={!disputeReason.trim() || isSaving}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl disabled:opacity-40"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Submit Dispute'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          Secured by Xerocare • This link is for one-time use only
        </p>
      </div>
    </div>
  );
}
