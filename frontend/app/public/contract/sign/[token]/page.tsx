'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileSignature, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ESignatureCanvas } from '@/components/employeeComponents/ESignatureCanvas';
import { ContractDocumentBody } from '@/components/employeeComponents/ContractDocumentBody';
import {
  getContractForSigning,
  signContractRemote,
  type ContractAgreement,
  type ContractForSigning,
} from '@/lib/saleWorkflow';
import { getApiErrorMessage } from '@/lib/apiError';
import { getActiveCurrency } from '@/lib/currency';

type PageState = 'loading' | 'ready' | 'signing' | 'done' | 'error';

export default function RemoteSigningPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [contract, setContract] = useState<ContractForSigning | null>(null);
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
      setContract(data);
      setCustomerName(data.agreement.customerName || '');
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileSignature size={24} className="text-white" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Contract Signing Portal
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
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

          {/* Ready to Sign — full contract document, same as the employee-facing view */}
          {(state === 'ready' || state === 'signing') && contract && (
            <>
              {contract.invoice ? (
                <div className="border border-slate-200 rounded-2xl p-4 sm:p-6 overflow-x-auto">
                  <ContractDocumentBody
                    invoice={contract.invoice}
                    agreement={contract.agreement as ContractAgreement}
                    currency={getActiveCurrency()}
                  />
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center text-xs text-amber-700 font-bold">
                  Contract details could not be fully loaded — please contact the dealer if this
                  persists.
                </div>
              )}

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
