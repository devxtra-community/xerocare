'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

export default function CustomerQuotationPage() {
  const params = useParams();
  const id = params.id as string;
  const action = params.action as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAction = async () => {
      try {
        // We use the proxied route from next.config.ts
        const response = await axios.get(`/b/invoices/public/quotation/${id}/${action}`);
        if (response.data.success) {
          setStatus('success');
          setMessage(
            action === 'accept'
              ? 'Thank you for accepting the quotation. Our team will contact you shortly with the next steps.'
              : 'The quotation has been rejected. We appreciate your feedback.',
          );

          // Attempt to close the window automatically after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Something went wrong.');
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(
          err.response?.data?.message || 'Failed to process your request. Please try again later.',
        );
      }
    };

    if (id && action) {
      handleAction();
    }
  }, [id, action]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header with Logo Area */}
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
            <span className="text-white font-black text-2xl tracking-tighter">XC</span>
          </div>
          <h2 className="text-white font-extrabold text-xl tracking-tight">XEROCARE</h2>
        </div>

        {/* Content Area */}
        <div className="p-10 text-center flex-1">
          {status === 'loading' && (
            <div className="py-10">
              <Loader2 className="w-16 h-16 text-slate-900 animate-spin mx-auto mb-6 opacity-80" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Processing...</h3>
              <p className="text-slate-500">Please wait while we record your response.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">
                {action === 'accept' ? 'Confirmed!' : 'Recorded'}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">{message}</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 inline-block">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  This window will close automatically
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-rose-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Oops!</h3>
              <p className="text-lg text-slate-600 leading-relaxed">{message}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-slate-500 hover:text-slate-900 font-semibold transition-colors group"
          >
            <Home className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
            Back to Website
          </Link>
        </div>
      </div>

      {/* Background Micro-Animations/Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
