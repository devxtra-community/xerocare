'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileSignature, CheckCircle2, AlertTriangle, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ESignatureCanvas } from '@/components/employeeComponents/ESignatureCanvas';
import { getContractForSigning, signContractRemote } from '@/lib/saleWorkflow';
import { getApiErrorMessage } from '@/lib/apiError';

type PageState = 'loading' | 'ready' | 'signing' | 'done' | 'error';

export default function RemoteSigningPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [contract, setContract] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sigData, setSigData] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [doneData, setDoneData] = useState<{
    agreementNumber: string;
    signedAt: string;
  } | null>(null);

  const loadContract = async () => {
    try {
      const data = await getContractForSigning(token);
      setContract(data as Record<string, unknown>);
      setCustomerName((data.customerName as string) || '');
      setState('ready');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid signing link');
      setState('error');
      return;
    }
    loadContract();
  }, [token]);

  const handleSign = async () => {
    if (!sigData) return;
    setIsSaving(true);
    try {
      const result = await signContractRemote(token, sigData, customerName);
      setDoneData({ agreementNumber: result.agreementNumber, signedAt: result.signedAt });
      setState('done');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileSignature size={24} className="text-white" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Contract Signing Portal
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-5">
          {/* Loading */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-500">Loading your contract...</p>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-black text-slate-800">Unable to Load Contract</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
              <p className="text-xs text-slate-400 mt-2">
                This link may have expired or already been used. Please contact the dealer for a new
                link.
              </p>
            </div>
          )}

          {/* Done */}
          {state === 'done' && doneData && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <p className="text-lg font-black text-slate-800">Contract Signed!</p>
              <p className="text-sm text-slate-500">
                Agreement{' '}
                <span className="font-black text-indigo-600">{doneData.agreementNumber}</span> has
                been signed successfully.
              </p>
              <p className="text-xs text-slate-400">
                Signed on {new Date(doneData.signedAt).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
                Thank you for signing. A copy of this agreement is held securely by the dealer. You
                may close this tab.
              </p>
            </div>
          )}

          {/* Ready to Sign */}
          {(state === 'ready' || state === 'signing') && contract && (
            <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">
                  Contract Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                      <Building2 size={9} /> Dealer
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      {String(contract.dealerName || '')}
                    </p>
                    {!!contract.dealerAddress && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {String(contract.dealerAddress)}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                      <User size={9} /> Customer
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      {String(contract.customerName || '')}
                    </p>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-indigo-50 rounded-xl flex gap-3 text-center">
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-indigo-400">Agreement No.</p>
                    <p className="text-xs font-black text-indigo-700">
                      {String(contract.agreementNumber || '')}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-indigo-400">Date</p>
                    <p className="text-xs font-black text-indigo-700">
                      {contract.contractDate
                        ? new Date(String(contract.contractDate)).toLocaleDateString('en-GB')
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms preview */}
              {contract.termsAndConditions && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Terms & Conditions
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl max-h-36 overflow-y-auto">
                    <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {String(contract.termsAndConditions)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Employee already signed indicator */}
              {contract.employeeSignedAt && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl text-emerald-700">
                  <CheckCircle2 size={14} />
                  <p className="text-[11px] font-black">
                    Dealer signed on{' '}
                    {new Date(String(contract.employeeSignedAt)).toLocaleDateString()}
                    {!!contract.employeeSignedByName &&
                      ` — ${String(contract.employeeSignedByName)}`}
                  </p>
                </div>
              )}

              {/* Customer name field */}
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

              {/* Signature canvas */}
              <ESignatureCanvas
                label="Your Signature *"
                onSave={setSigData}
                onClear={() => setSigData(null)}
                width={480}
                height={160}
              />

              <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                By signing above, you agree to the terms and conditions of this contract.
              </p>

              <Button
                onClick={handleSign}
                disabled={!sigData || !customerName.trim() || isSaving}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-40"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <FileSignature size={18} className="mr-2" />
                    Sign Contract
                  </>
                )}
              </Button>
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
