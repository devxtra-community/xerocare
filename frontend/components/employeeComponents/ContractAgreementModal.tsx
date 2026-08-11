'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  FileSignature,
  Send,
  CheckCircle2,
  Copy,
  Printer,
  PenLine,
  User,
  Link2,
  Upload,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  ContractAgreement,
  createOrGetContractAgreement,
  signContractEmployee,
  signContractCustomerInPerson,
  signContractCustomerByUpload,
  generateSigningToken,
  getContractAgreement,
} from '@/lib/saleWorkflow';
import { ESignatureCanvas } from './ESignatureCanvas';
import { ContractDocumentBody, defaultTermsForType } from './ContractDocumentBody';
import { Invoice } from '@/lib/invoice';
import { Customer } from '@/lib/customer';
import { getActiveCurrency } from '@/lib/currency';

interface ContractAgreementModalProps {
  invoice: Invoice;
  customer?: Customer | null;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  open: boolean;
  onClose: () => void;
  onSigned?: (agreement: ContractAgreement) => void;
}

type SignTab = 'view' | 'employee-sign' | 'customer-sign' | 'remote-sign';

export function ContractAgreementModal({
  invoice,
  customer,
  branchName,
  branchAddress,
  branchPhone,
  open,
  onClose,
  onSigned,
}: ContractAgreementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agreement, setAgreement] = useState<ContractAgreement | null>(null);
  const [tab, setTab] = useState<SignTab>('view');
  const [employeeSigData, setEmployeeSigData] = useState<string | null>(null);
  const [customerSigData, setCustomerSigData] = useState<string | null>(null);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Upload method state
  const [customerSignMethod, setCustomerSignMethod] = useState<'CAPTURE' | 'UPLOAD'>('CAPTURE');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [attestationNote, setAttestationNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const currency = getActiveCurrency();

  const loadOrCreate = async () => {
    setIsLoading(true);
    try {
      // Try to get existing first
      let ag = await getContractAgreement(invoice.id);
      if (!ag) {
        // Create new
        ag = await createOrGetContractAgreement(invoice.id, {
          customerName: customer?.name || invoice.customerName || 'Customer',
          customerAddress: customer?.address || undefined,
          customerPhone: customer?.phone || undefined,
          customerEmail: customer?.email || undefined,
          customerVatNumber: customer?.vatNumber || undefined,
          dealerName: branchName || 'Xerocare',
          dealerAddress: branchAddress || undefined,
          dealerPhone: branchPhone || undefined,
          termsAndConditions: defaultTermsForType(invoice.saleType),
        });
      }
      setAgreement(ag);
    } catch (err) {
      toast.error('Failed to load contract agreement', {
        description: getApiErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab('view');
    setEmployeeSigData(null);
    setCustomerSigData(null);
    setRemoteLink(null);
    setCustomerSignMethod('CAPTURE');
    setUploadFile(null);
    setAttestationNote('');
    loadOrCreate();
  }, [open, invoice.id]);

  const handleSignEmployee = async () => {
    if (!employeeSigData) return;
    setIsSaving(true);
    try {
      const updated = await signContractEmployee(invoice.id, employeeSigData);
      setAgreement(updated);
      toast.success('Employee signature saved');
      onSigned?.(updated);
      setTab('view');
    } catch (err) {
      toast.error('Failed to save signature', { description: getApiErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignCustomer = async () => {
    if (!customerSigData) return;
    setIsSaving(true);
    try {
      const updated = await signContractCustomerInPerson(
        invoice.id,
        customerSigData,
        customer?.name || invoice.customerName,
      );
      setAgreement(updated);
      toast.success('Customer signature saved');
      onSigned?.(updated);
      setTab('view');
    } catch (err) {
      toast.error('Failed to save signature', { description: getApiErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadSignedDoc = async () => {
    if (!uploadFile || !attestationNote.trim()) return;
    setIsSaving(true);
    try {
      const updated = await signContractCustomerByUpload(
        invoice.id,
        uploadFile,
        attestationNote.trim(),
        customer?.name || invoice.customerName,
      );
      setAgreement(updated);
      toast.success('Signed document uploaded', {
        description: 'Customer consent recorded via uploaded document.',
      });
      onSigned?.(updated);
      setTab('view');
    } catch (err) {
      toast.error('Upload failed', { description: getApiErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateRemoteLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await generateSigningToken(invoice.id);
      const baseUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/public/contract/sign/${result.token}`
          : `/public/contract/sign/${result.token}`;
      setRemoteLink(baseUrl);
    } catch (err) {
      toast.error('Failed to generate signing link', { description: getApiErrorMessage(err) });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyLink = () => {
    if (!remoteLink) return;
    navigator.clipboard.writeText(remoteLink);
    toast.success('Link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PENDING_SIGNATURES: { label: 'Pending Signatures', color: 'bg-amber-100 text-amber-700' },
      EMPLOYEE_SIGNED: { label: 'Employee Signed', color: 'bg-blue-100 text-blue-700' },
      CUSTOMER_SIGNED: { label: 'Customer Signed', color: 'bg-purple-100 text-purple-700' },
      FULLY_SIGNED: { label: 'Fully Signed', color: 'bg-emerald-100 text-emerald-700' },
    };
    const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
    return (
      <span
        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${cfg.color}`}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Contract Agreement — {invoice.invoiceNumber}</DialogTitle>

        {/* ── Neutral toolbar — visually separate from the paper document ── */}
        <div className="bg-white border-b border-slate-200 px-5 pt-4 pb-0 shrink-0 print:hidden">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileSignature size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                  Contract Agreement
                </p>
                <p className="text-sm font-black text-slate-800 leading-none">
                  {invoice.invoiceNumber}
                </p>
              </div>
            </div>
            {agreement && <div className="shrink-0">{statusBadge(agreement.signatureStatus)}</div>}
          </div>

          {/* Tab strip */}
          <div className="flex gap-0 -mb-px">
            {[
              { key: 'view' as SignTab, label: 'Document', icon: FileSignature },
              { key: 'employee-sign' as SignTab, label: 'Employee Sign', icon: PenLine },
              { key: 'customer-sign' as SignTab, label: 'Customer Sign', icon: User },
              { key: 'remote-sign' as SignTab, label: 'Remote Link', icon: Link2 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                  tab === key
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-white print:overflow-visible print:max-h-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : agreement ? (
            <>
              {/* ── View Tab ──────────────────────────────────── */}
              {tab === 'view' && (
                <div ref={printRef}>
                  <ContractDocumentBody
                    invoice={invoice}
                    agreement={agreement}
                    currency={currency}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrint}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-8 w-full border border-slate-100 mt-4"
                  >
                    <Printer size={12} className="mr-1" /> Print / Save PDF
                  </Button>
                </div>
              )}

              {/* ── Employee Sign Tab ──────────────────────────── */}
              {tab === 'employee-sign' && (
                <div className="space-y-4">
                  {agreement.employeeSignatureData ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-black text-emerald-700">
                        Employee signature already captured
                      </p>
                      <p className="text-[11px] text-emerald-600 mt-1">
                        by {agreement.employeeSignedByName} on{' '}
                        {agreement.employeeSignedAt
                          ? new Date(agreement.employeeSignedAt).toLocaleDateString()
                          : '—'}
                      </p>
                      <img
                        src={agreement.employeeSignatureData}
                        alt="Employee Signature"
                        className="max-h-20 mx-auto mt-3 object-contain border border-emerald-100 rounded-lg p-1 bg-white"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 font-bold">
                        Draw your signature below using mouse or touch
                      </p>
                      <ESignatureCanvas
                        label="Seller / Employee Signature"
                        onSave={setEmployeeSigData}
                        onClear={() => setEmployeeSigData(null)}
                      />
                      {employeeSigData && (
                        <Button
                          onClick={handleSignEmployee}
                          disabled={isSaving}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <PenLine size={14} className="mr-2" />
                              Confirm & Save Employee Signature
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ���─ Customer Sign Tab ──────────────────────────── */}
              {tab === 'customer-sign' && (
                <div className="space-y-4">
                  {agreement.customerSignatureData || agreement.customerSignedDocumentUrl ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-black text-emerald-700">
                        Customer consent already recorded
                      </p>
                      <p className="text-[11px] text-emerald-600 mt-1">
                        via{' '}
                        {agreement.customerSignedMethod === 'UPLOAD'
                          ? 'Uploaded Document'
                          : agreement.customerSignedMethod === 'REMOTE'
                            ? 'Remote Link'
                            : 'Live Signature'}
                        {' · '}
                        {agreement.customerSignedAt
                          ? new Date(agreement.customerSignedAt).toLocaleDateString()
                          : '—'}
                      </p>
                      {agreement.customerSignedMethod === 'UPLOAD' &&
                      agreement.customerSignedDocumentUrl ? (
                        <a
                          href={agreement.customerSignedDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-slate-700 hover:underline"
                        >
                          <ExternalLink size={11} /> View Document
                        </a>
                      ) : agreement.customerSignatureData ? (
                        <img
                          src={agreement.customerSignatureData}
                          alt="Customer Signature"
                          className="max-h-20 mx-auto mt-3 object-contain border border-emerald-100 rounded-lg p-1 bg-white"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {/* Method selector */}
                      <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => setCustomerSignMethod('CAPTURE')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                            customerSignMethod === 'CAPTURE'
                              ? 'bg-slate-800 text-white'
                              : 'bg-white text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <PenLine size={12} />
                          Capture Signature
                        </button>
                        <button
                          onClick={() => setCustomerSignMethod('UPLOAD')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                            customerSignMethod === 'UPLOAD'
                              ? 'bg-slate-800 text-white'
                              : 'bg-white text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <Upload size={12} />
                          Upload Signed Doc
                        </button>
                      </div>

                      {customerSignMethod === 'CAPTURE' && (
                        <>
                          <p className="text-xs text-slate-500 font-bold">
                            Hand the device to the customer to sign below
                          </p>
                          <ESignatureCanvas
                            label={`Customer Signature — ${customer?.name || invoice.customerName || 'Customer'}`}
                            onSave={setCustomerSigData}
                            onClear={() => setCustomerSigData(null)}
                          />
                          {customerSigData && (
                            <Button
                              onClick={handleSignCustomer}
                              disabled={isSaving}
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                            >
                              {isSaving ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <User size={14} className="mr-2" />
                                  Confirm & Save Customer Signature
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}

                      {customerSignMethod === 'UPLOAD' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 leading-relaxed font-bold">
                            Upload a photo or scan of the physically-signed agreement. This is
                            recorded as the customer&apos;s consent proof.
                          </div>

                          <div>
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                              Signed Document (Image or PDF) *
                            </Label>
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                            >
                              {uploadFile ? (
                                <div className="flex items-center justify-center gap-2">
                                  <FileText size={16} className="text-slate-500" />
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {uploadFile.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <Upload size={20} className="mx-auto mb-1 text-slate-300" />
                                  <p className="text-xs font-bold text-slate-400">
                                    Click to select file
                                  </p>
                                  <p className="text-[10px] text-slate-300 mt-0.5">
                                    JPG, PNG, PDF · max 10 MB
                                  </p>
                                </>
                              )}
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                if (f && f.size > 10 * 1024 * 1024) {
                                  toast.error('File too large', {
                                    description: 'Maximum file size is 10 MB.',
                                  });
                                  return;
                                }
                                setUploadFile(f);
                              }}
                            />
                          </div>

                          <div>
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                              How was the signed copy obtained? *
                            </Label>
                            <Textarea
                              value={attestationNote}
                              onChange={(e) => setAttestationNote(e.target.value)}
                              placeholder="e.g. Signed copy received via WhatsApp from customer on 2026-08-08"
                              rows={2}
                              className="text-xs font-bold border-slate-200 resize-none"
                            />
                            <p className="text-[9px] text-slate-400 mt-1">
                              This note is required and stored as an audit record.
                            </p>
                          </div>

                          <Button
                            onClick={handleUploadSignedDoc}
                            disabled={isSaving || !uploadFile || !attestationNote.trim()}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <Upload size={14} className="mr-2" />
                                Upload & Record Customer Consent
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Remote Sign Tab ────────────────────────────── */}
              {tab === 'remote-sign' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-700 mb-1">
                      Remote Customer Signing
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Generate a secure 72-hour signing link to send to the customer via
                      WhatsApp/Email. The link allows them to review and sign the contract on their
                      own device without needing an account.
                    </p>
                  </div>

                  {agreement.customerSignatureData ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-black text-emerald-700">
                        Customer has already signed
                      </p>
                    </div>
                  ) : (
                    <>
                      {!remoteLink ? (
                        <Button
                          onClick={handleGenerateRemoteLink}
                          disabled={isGeneratingLink}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-10 rounded-xl"
                        >
                          {isGeneratingLink ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Link2 size={14} className="mr-2" />
                              Generate Signing Link
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                            <div className="flex-1 text-xs font-bold text-slate-700 break-all">
                              {remoteLink}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copyLink}
                              className="shrink-0 h-8 w-8 p-0 text-slate-500"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold text-center">
                            Link expires in 72 hours • Single use
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyLink}
                              className="text-[10px] font-black uppercase tracking-widest h-9"
                            >
                              <Copy size={12} className="mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              size="sm"
                              className="text-[10px] font-black uppercase tracking-widest h-9 bg-slate-800 text-white hover:bg-slate-900"
                              onClick={() => {
                                const wa = `https://wa.me/?text=${encodeURIComponent(
                                  `Please sign your contract agreement: ${remoteLink}`,
                                )}`;
                                window.open(wa, '_blank');
                              }}
                            >
                              <Send size={12} className="mr-1" />
                              Send via WhatsApp
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 print:hidden">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
