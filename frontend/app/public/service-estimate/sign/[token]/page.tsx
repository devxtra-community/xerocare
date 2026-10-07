'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileText, CheckCircle2, AlertTriangle, ThumbsDown, Download } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getServiceEstimateForSigning,
  approveServiceEstimateRemote,
  rejectServiceEstimateRemote,
  serviceEstimateSigningPdfUrl,
  type ServiceEstimateForSigning,
} from '@/lib/serviceTicket';
import { getApiErrorMessage } from '@/lib/apiError';

type PageState = 'loading' | 'ready' | 'rejecting' | 'approved' | 'rejected' | 'error';

export default function RemoteServiceEstimateApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<ServiceEstimateForSigning | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [doneAt, setDoneAt] = useState('');

  const load = async () => {
    try {
      const res = await getServiceEstimateForSigning(token);
      setData(res);
      if (res.alreadyDecided) {
        setState(res.decision?.status === 'CUSTOMER_APPROVED' ? 'approved' : 'rejected');
        setDoneAt(res.decision?.approvedAt || res.decision?.rejectedAt || '');
      } else {
        setState('ready');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid estimate link');
      setState('error');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApprove = async () => {
    if (!customerName.trim()) return;
    setIsSaving(true);
    try {
      const result = await approveServiceEstimateRemote(token, customerName.trim());
      setDoneAt(result.approvedAt);
      setState('approved');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSaving(true);
    try {
      const result = await rejectServiceEstimateRemote(
        token,
        rejectReason.trim(),
        customerName.trim() || undefined,
      );
      setDoneAt(result.rejectedAt);
      setState('rejected');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setState('error');
    } finally {
      setIsSaving(false);
    }
  };

  const currency = data?.estimate.currencyCode || data?.branch?.currencyCode || 'QAR';
  const money = (n: number | null | undefined) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-success to-muted p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-success rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-primary-foreground" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Service Quotation Approval
          </p>
        </div>

        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={28} className="animate-spin text-success" />
              <p className="text-sm font-bold text-muted-foreground">Loading your quotation...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <p className="text-sm font-black text-foreground">Unable to Load Quotation</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
              <p className="text-xs text-muted-foreground mt-2">
                This link may have expired or already been used. Please contact Xerocare for a new
                link.
              </p>
            </div>
          )}

          {state === 'approved' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-14 w-14 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-success" />
              </div>
              <p className="text-lg font-black text-foreground">Quotation Approved!</p>
              {doneAt && (
                <p className="text-xs text-muted-foreground">
                  Approved on {new Date(doneAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
                Thank you. Our service team will proceed with the repair. You may close this tab.
              </p>
            </div>
          )}

          {state === 'rejected' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-14 w-14 bg-warning/10 rounded-full flex items-center justify-center">
                <ThumbsDown size={28} className="text-warning" />
              </div>
              <p className="text-lg font-black text-foreground">Quotation Declined</p>
              {doneAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted on {new Date(doneAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
                Our team will get in touch to discuss next steps. You may close this tab.
              </p>
            </div>
          )}

          {(state === 'ready' || state === 'rejecting') && data && (
            <>
              <div className="border border-border rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Quotation
                    </p>
                    <p className="text-sm font-black text-foreground">{data.ticket.ticketNumber}</p>
                  </div>
                  {data.branch?.name && (
                    <p className="text-xs font-bold text-muted-foreground text-right">
                      {data.branch.name}
                    </p>
                  )}
                </div>

                <div className="text-xs text-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Machine:</span>{' '}
                  {data.ticket.productBrand} {data.ticket.productModel}
                  <br />
                  <span className="font-bold text-foreground">Serial No:</span>{' '}
                  {data.ticket.serialNumber}
                  {data.customerName && (
                    <>
                      <br />
                      <span className="font-bold text-foreground">Customer:</span>{' '}
                      {data.customerName}
                    </>
                  )}
                </div>

                {data.estimate.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-1.5 font-bold">Item</th>
                          <th className="py-1.5 font-bold text-center">Qty</th>
                          <th className="py-1.5 font-bold text-right">Unit</th>
                          <th className="py-1.5 font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.estimate.items.map((it, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="py-1.5 text-foreground">{it.partName}</td>
                            <td className="py-1.5 text-center text-foreground">{it.quantity}</td>
                            <td className="py-1.5 text-right text-foreground">
                              {it.isFree ? 'Free' : money(it.unitPrice)}
                            </td>
                            <td className="py-1.5 text-right text-foreground">
                              {it.isFree
                                ? 'Free'
                                : money(it.totalPrice ?? Number(it.unitPrice || 0) * it.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-xs space-y-1 pt-1">
                  <Row label="Parts" value={money(data.estimate.partsCost)} />
                  <Row label="Labour" value={money(data.estimate.labourCost)} />
                  {Number(data.estimate.visitChargeAmount) > 0 && (
                    <Row label="Visit charge" value={money(data.estimate.visitChargeAmount)} />
                  )}
                  {data.ticket.visitChargeMethod === 'SEPARATE' &&
                    Number(data.ticket.visitChargeAmount) > 0 && (
                      <Row
                        label={`Visit charge (${data.ticket.visitChargeStatus === 'COLLECTED' || data.ticket.visitChargeCollected ? 'PAID' : data.ticket.visitChargeStatus === 'PENDING_APPROVAL' ? 'PAYMENT PENDING APPROVAL' : 'UNPAID'})`}
                        value={money(data.ticket.visitChargeAmount)}
                      />
                    )}
                  {Number(data.estimate.transportChargeAmount) > 0 && (
                    <Row
                      label="Transport charge"
                      value={money(data.estimate.transportChargeAmount)}
                    />
                  )}
                  {Number(data.estimate.discountAmount) > 0 && (
                    <Row label="Discount" value={`- ${money(data.estimate.discountAmount)}`} />
                  )}
                  <div className="flex justify-between pt-2 mt-1 border-t border-border text-sm font-black text-foreground">
                    <span>
                      {data.ticket.visitChargeMethod === 'SEPARATE' &&
                      Number(data.ticket.visitChargeAmount) > 0 &&
                      (data.ticket.visitChargeStatus === 'COLLECTED' ||
                        data.ticket.visitChargeCollected)
                        ? 'Amount due for this estimate'
                        : 'Total'}
                    </span>
                    <span>{money(data.estimate.totalCost)}</span>
                  </div>
                </div>

                {data.validUntil && (
                  <p className="text-[10px] text-muted-foreground">
                    Valid until {new Date(data.validUntil).toLocaleDateString()}
                  </p>
                )}

                <a
                  href={serviceEstimateSigningPdfUrl(token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-success hover:underline"
                >
                  <Download size={14} /> Download quotation PDF
                </a>
              </div>

              {data.expired && (
                <div className="p-3 bg-warning/10 rounded-xl border border-warning/30 text-center text-xs text-warning font-bold">
                  This quotation has expired. Please contact Xerocare for an updated quotation.
                </div>
              )}

              {state === 'ready' && !data.expired && (
                <>
                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                      Your Full Name *
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-10 font-bold border-border"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <LoadingButton
                      onClick={handleApprove}
                      loading={isSaving}
                      loadingText="Approving..."
                      disabled={!customerName.trim() || isSaving}
                      className={cn(
                        buttonVariants(),
                        'flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground font-black text-sm rounded-xl shadow-lg shadow-success/10 disabled:opacity-40',
                      )}
                    >
                      <CheckCircle2 size={18} className="mr-2" />
                      Approve Quotation
                    </LoadingButton>
                    <Button
                      variant="outline"
                      onClick={() => setState('rejecting')}
                      disabled={isSaving}
                      className="flex-1 h-12 border-destructive/30 text-destructive hover:bg-destructive/10 font-black text-sm rounded-xl"
                    >
                      <ThumbsDown size={18} className="mr-2" />
                      Decline
                    </Button>
                  </div>
                </>
              )}

              {state === 'rejecting' && (
                <>
                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                      Why are you declining? *
                    </Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. The cost is higher than expected"
                      className="min-h-24 text-sm border-border"
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
                    <LoadingButton
                      onClick={handleReject}
                      loading={isSaving}
                      loadingText="Submitting..."
                      disabled={!rejectReason.trim() || isSaving}
                      className={cn(
                        buttonVariants(),
                        'flex-1 h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-sm rounded-xl disabled:opacity-40',
                      )}
                    >
                      Submit
                    </LoadingButton>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Secured by Xerocare • This link is for one-time use only
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
