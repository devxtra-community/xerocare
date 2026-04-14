'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProductById } from '@/lib/product';
import { getAllSpareParts } from '@/lib/spare-part';
import { getAllModels } from '@/lib/model';
import { Invoice, downloadPremiumInvoice } from '@/lib/invoice';

interface InvoiceViewDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
}

export function InvoiceViewDialog({ invoice, onClose }: InvoiceViewDialogProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const details: Record<string, any> = {};
        if (invoice.items) {
          const [spareParts, modelsRes] = await Promise.all([
            getAllSpareParts().catch(() => []),
            getAllModels({ limit: 1000 }).catch(() => ({ data: [] })),
          ]);
          const models = Array.isArray(modelsRes.data) ? modelsRes.data : [];
          const allocs = invoice.productAllocations || [];

          for (const item of invoice.items) {
            const alloc = item.modelId ? allocs.find((a) => a.modelId === item.modelId) : null;
            const targetProductId = item.productId || alloc?.productId;

            if (targetProductId) {
              try {
                const p = await getProductById(targetProductId);
                details[targetProductId] = p;
              } catch (e) {
                console.error(e);
              }
            }
            if (item.modelId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const m = models.find((m: any) => m.id === item.modelId);
              if (m) details[item.modelId] = m;
            } else if (item.description) {
              /* eslint-disable @typescript-eslint/no-explicit-any */
              const m = models.find(
                (m: any) =>
                  m.model_name === item.description || m.product_name === item.description,
              );
              /* eslint-enable @typescript-eslint/no-explicit-any */
              if (m) {
                details[item.description] = m;
              } else {
                const sp = spareParts.find(
                  (s) => s.part_name === item.description || s.mpn === item.description,
                );
                if (sp) details[item.description] = sp;
              }
            }
          }
        }
        setProductDetails(details);
      } catch (err) {
        console.error('Failed to fetch premium details:', err);
      }
    };
    fetchFullDetails();
  }, [invoice]);

  const allocs = invoice.productAllocations || [];
  const enrichedItems = (invoice.items || [])
    .map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alloc = item.modelId ? allocs.find((a: any) => a.modelId === item.modelId) : null;
      const targetProductId = item.productId || alloc?.productId;

      const meta =
        targetProductId && productDetails[targetProductId]
          ? productDetails[targetProductId]
          : item.modelId && productDetails[item.modelId]
            ? productDetails[item.modelId]
            : item.description && productDetails[item.description]
              ? productDetails[item.description]
              : null;

      return {
        ...item,
        metadata: meta,
        allocation: alloc,
      };
    })
    .filter((item) => item.quantity && item.quantity > 0);

  const isRent = invoice.saleType === 'RENT';
  const isLease = invoice.saleType === 'LEASE';
  const isSale = !isRent && !isLease;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white">
        <DialogTitle className="sr-only">Invoice Document</DialogTitle>
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* ═══ HEADER — Xerocare Job Report ═══════════════════════════════ */}
          <div
            className="relative flex justify-between shrink-0 overflow-hidden"
            style={{ height: '130px' }}
          >
            {/* Left: mascot on diamond pattern */}
            <div className="w-1/2 h-full">
              <img
                src="/branding/header_left.png"
                alt="Header Left"
                className="h-full w-full object-contain object-left select-none p-1"
              />
            </div>
            {/* Right: xerocare logo + contact */}
            <div className="w-1/2 h-full flex justify-end">
              <img
                src="/branding/header_right.png"
                alt="Header Right"
                className="h-full max-w-full object-contain object-right select-none p-2"
              />
            </div>
            {/* Red bottom stripe */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-red-600 z-10" />
          </div>

          <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-grow bg-white">
            {/* Customer & Job Info Section Top Row */}
            <div className="flex items-start justify-between">
              {/* Left: Project Bar */}
              <div className="grid grid-cols-1 gap-2 flex-grow max-w-[450px]">
                <div className="flex">
                  <div className="bg-slate-50 border-x border-t border-slate-200 px-8 py-1 rounded-t-lg">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Project
                    </p>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-b-2xl rounded-tr-2xl p-4 bg-white shadow-xl flex flex-col gap-1 -mt-[1px]">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight">
                    Name/Address
                  </p>
                  <div className="border-l-[4px] border-red-600 pl-4">
                    <p className="text-xl font-black text-slate-800 uppercase leading-tight tracking-tight">
                      {invoice.customerName || 'N/A'}
                    </p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight mt-0.5">
                      {invoice.customerEmail || 'No Email'}
                    </p>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tight mt-0.5">
                      {invoice.customerPhone || 'No Phone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Invoice Info */}
              <div className="flex flex-col items-end gap-5 lg:min-w-[320px]">
                <h2 className="text-[20px] font-black text-red-700 uppercase tracking-tighter italic mr-4">
                  {invoice.saleType
                    ? `${invoice.saleType.replace(/_/g, ' ')} INVOICE`
                    : invoice.type
                      ? `${invoice.type} INVOICE`
                      : 'INVOICE'}
                </h2>
                <div className="flex gap-0 border-2 border-red-700 rounded-3xl overflow-hidden shadow-xl">
                  <div className="bg-red-50/50 border-r-2 border-red-700 px-8 py-2 min-w-[140px] text-center">
                    <p className="text-[12px] font-black text-red-700 uppercase mb-1">Date</p>
                    <p className="text-sm font-black text-slate-800">
                      {new Date(invoice.createdAt)
                        .toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                        .replace(/\//g, '-')}
                    </p>
                  </div>
                  <div className="bg-white px-8 py-2 min-w-[140px] text-center">
                    <p className="text-[12px] font-black text-red-700 uppercase mb-1">
                      Invoice No.
                    </p>
                    <p className="text-sm font-black text-slate-800">
                      {invoice.invoiceNumber.split('-').pop()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-8 text-[12px] font-black text-slate-600 uppercase tracking-tight mt-1 px-4">
                  <p>
                    Payment Method - <span className="text-red-700">Due on receipt</span>
                  </p>
                  <p>
                    Rep - <span className="text-red-700">{invoice.employeeName || 'RSHD'}</span>
                  </p>
                </div>
                <div className="flex gap-10 text-[12px] font-black text-slate-600 uppercase tracking-tight px-4">
                  <p>
                    Status{' '}
                    <span className="text-red-700 ml-8 font-black uppercase tracking-widest">
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Brand / Model / Sl No - Large Row exactly like image */}
            <div className="flex justify-center gap-16 py-4 border-b border-slate-100 uppercase">
              <div className="flex gap-4 items-center">
                <span className="text-base font-black text-slate-900 tracking-widest">BRAND</span>
                <span className="text-base font-bold text-slate-600 italic leading-none">
                  {enrichedItems[0]?.metadata?.brandRelation?.name ||
                    enrichedItems[0]?.metadata?.brand ||
                    'N/A'}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-base font-black text-slate-900 tracking-widest">
                  MODEL NO
                </span>
                <span className="text-base font-bold text-slate-600 italic leading-none">
                  {enrichedItems[0]?.metadata?.model?.model_name ||
                    enrichedItems[0]?.metadata?.model_name ||
                    'N/A'}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-base font-black text-slate-900 tracking-widest">SL NO</span>
                <span className="text-base font-bold text-slate-600 italic leading-none">
                  {enrichedItems[0]?.allocation?.serialNumber ||
                    enrichedItems[0]?.metadata?.serial_no ||
                    (!isRent && !isLease ? 'N/A' : 'TBD UPON DISPATCH')}
                </span>
              </div>
            </div>

            {/* Greeting Section */}
            <div className="text-[12px] font-black text-slate-800 space-y-2 leading-relaxed opacity-90">
              <p>Dear Sir/ Madam</p>
              <p>Thanks for your valuable inquiry .</p>
              <p>
                As we discussed please find the maintenance for printers/copiers with special price
                , All details are mentioned in the quotation . If any clarification please do call
                and let me know the status .
              </p>
            </div>

            {/* Main Items Table */}
            <div className="space-y-0">
              <div className="border-[3px] border-red-700 rounded-t-2xl overflow-hidden shadow-2xl bg-white">
                <table className="w-full">
                  <thead>
                    {isSale && (
                      <tr className="bg-red-700 text-white">
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          MPN
                        </th>
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Product Name
                        </th>
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Description
                        </th>
                        <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Quantity
                        </th>
                        <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Discount
                        </th>
                        <th className="text-right py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Rate
                        </th>
                        <th className="text-right py-4 px-8 text-[12px] font-black uppercase tracking-widest">
                          Total
                        </th>
                      </tr>
                    )}
                    {(isRent || isLease) && (
                      <tr className="bg-red-700 text-white">
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          MPN
                        </th>
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Product Name
                        </th>
                        <th className="text-left py-4 px-8 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Description
                        </th>
                        <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Qty
                        </th>
                        <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Limit (B/W/Comb)
                        </th>
                        <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                          Col Lmt
                        </th>
                        <th className="text-center py-4 px-4 text-[12px] font-black uppercase tracking-widest">
                          Exc Rate (B/C/Comb)
                        </th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y-2 divide-red-50">
                    {enrichedItems.map((item, idx) => {
                      const detail = item.metadata;
                      const image = detail?.imageUrl || detail?.image_url;
                      const mpn = detail?.mpn || ' ';
                      const productName =
                        detail?.name || detail?.part_name || item.description || 'N/A';
                      const productDesc =
                        detail?.description ||
                        detail?.inventory?.[0]?.description ||
                        (item.description && item.description !== productName
                          ? item.description
                          : 'Standard specification as per brand guidelines.');

                      return (
                        <tr
                          key={idx}
                          className="group hover:bg-red-50/40 transition-all duration-300"
                        >
                          <td className="py-3 px-4 border-r-2 border-red-50 align-top relative">
                            <span className="text-[12px] font-black text-slate-800">{mpn}</span>
                          </td>
                          <td className="py-3 px-4 border-r-2 border-red-50 relative w-1/4">
                            <div className="relative z-10 space-y-1">
                              <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-snug">
                                {productName}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-r-2 border-red-50 align-top relative w-1/4">
                            <div className="flex gap-4">
                              {image && (
                                <img
                                  src={image}
                                  alt="Product"
                                  className="w-[100px] h-[100px] object-contain mix-blend-multiply shrink-0 opacity-100"
                                />
                              )}
                              <p className="text-[11px] text-slate-500 leading-relaxed font-bold opacity-90 uppercase mt-1">
                                {productDesc}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                            {item.quantity}
                          </td>
                          {isSale && (
                            <>
                              <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(item as any).discount ? `${(item as any).discount}%` : '0%'}
                              </td>
                              <td className="py-3 px-4 text-right border-r-2 border-red-50 align-top font-black text-slate-800 text-sm">
                                {Number(item.unitPrice || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-3 px-4 text-right align-top font-black text-slate-900 text-sm">
                                {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                              </td>
                            </>
                          )}
                          {(isRent || isLease) && (
                            <>
                              <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                {item.combinedIncludedLimit
                                  ? `${item.combinedIncludedLimit}`
                                  : item.bwIncludedLimit || 0}
                              </td>
                              <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                {item.combinedIncludedLimit
                                  ? 'Combo'
                                  : item.colorIncludedLimit || 0}
                              </td>
                              <td className="py-3 px-3 text-center align-top font-black text-slate-900 text-sm">
                                {item.combinedExcessRate
                                  ? `${Number(item.combinedExcessRate).toFixed(3)} (Combo)`
                                  : `${(Number(item.bwExcessRate) || 0).toFixed(3)} / ${(Number(item.colorExcessRate) || 0).toFixed(3)}`}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {/* Padding rows exactly like reference to fill the box */}
                    {Array.from({ length: Math.max(0, 5 - enrichedItems.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8">
                        <td className="border-r-2 border-red-50 bg-slate-50/[0.02]" />
                        <td className="border-r-2 border-red-50" />
                        <td className="border-r-2 border-red-50 bg-slate-50/[0.02]" />
                        <td className="border-r-2 border-red-50" />
                        {isSale && (
                          <>
                            <td className="border-r-2 border-red-50 bg-slate-50/[0.02]" />
                            <td className="border-r-2 border-red-50" />
                            <td className="bg-slate-50/[0.02]" />
                          </>
                        )}
                        {isRent && (
                          <>
                            <td className="border-r-2 border-red-50 bg-slate-50/[0.02]" />
                            <td className="border-r-2 border-red-50" />
                            <td className="bg-slate-50/[0.02]" />
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fixed Total Box precisely connected and styled */}
              {isSale && (
                <div className="flex justify-end mt-0">
                  <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-8 py-2 bg-white flex items-center gap-8 shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)]">
                    <p className="text-lg font-black text-red-700 uppercase tracking-[0.2em] border-r-2 border-red-100 pr-8 leading-none">
                      Total
                    </p>
                    <p className="text-2xl font-black text-slate-900 leading-none">
                      QAR {Number(invoice.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {isRent && (
                <div className="flex justify-between items-start mt-0 pl-12 pr-0">
                  <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-6 py-3 bg-white flex flex-col shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)] min-w-[400px]">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-red-50 flex pb-1.5 mb-2">
                      Rent Agreement Details
                    </p>
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Type
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase">
                          {invoice.rentType?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Period
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase">
                          {invoice.rentPeriod?.replace('_', ' ') || 'MONTHLY'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Advance
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          QAR {(invoice.advanceAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Deposit
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          QAR {(invoice.securityDepositAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-8 py-2 bg-white flex items-center gap-6 shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)]">
                    <p className="text-lg font-black text-red-700 uppercase tracking-[0.1em] border-r-2 border-red-100 pr-6 leading-none">
                      Monthly Rent
                    </p>
                    <p className="text-xl font-black text-slate-900 leading-none">
                      QAR {Number(invoice.monthlyRent || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {isLease && (
                <div className="flex justify-between items-start mt-0 overflow-hidden pl-12 pr-0">
                  <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-6 py-3 bg-white flex flex-col shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)] min-w-[400px]">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-red-50 flex pb-1.5 mb-2">
                      Lease Contract Frame
                    </p>
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Type
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase">
                          {invoice.leaseType || 'EMI'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Tenure
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase">
                          {invoice.leaseTenureMonths} Months
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Advance
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          QAR {(invoice.advanceAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Total Value
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          QAR{' '}
                          {(invoice.totalLeaseAmount || invoice.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-8 py-2 bg-white flex items-center gap-6 shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)]">
                    <p className="text-lg font-black text-red-700 uppercase tracking-[0.1em] border-r-2 border-red-100 pr-6 leading-none">
                      Monthly EMI
                    </p>
                    <p className="text-xl font-black text-slate-900 leading-none">
                      QAR {Number(invoice.monthlyEmiAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Content precisely from reference */}
            <div className="grid grid-cols-2 gap-12 mt-8 pt-6 border-t border-slate-100 px-4">
              <div className="text-[11px] font-black text-slate-800 space-y-2 leading-relaxed opacity-80">
                <p>Delivery : 7-10 days normal working days , After conformed LPO</p>
                <p>Payment : CASH or PDC (Management approved for the credit terms)</p>
                <p>
                  Warranty : 30 days in service of the parts , Not covered the of the consumables
                  items ,
                </p>
                <p>
                  Validity : 15 days estimated will valid , If not approved / paid with in 15 days
                  will not be valid , re-estimate will be charged .
                </p>
                <p className="mt-6 font-black text-slate-800 italic leading-relaxed opacity-100">
                  We trust you will find our offer competitive and look forward to hearing from you
                  at the earliest .<br />
                  Thanking you assuring you of our best attention all.
                </p>
              </div>

              <div className="flex flex-col justify-end items-end space-y-8">
                <div className="text-right">
                  <p className="text-[12px] font-black text-slate-950 uppercase tracking-widest mb-1 italic">
                    Customer Sing: ..............................................................
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight opacity-70">
                    Best Regards,
                  </p>
                  <p className="text-[13px] font-black text-red-700 uppercase tracking-tight italic mt-1">
                    XEROCARE TRADING & SERVICES WLL
                  </p>
                  <p className="text-[11px] font-black text-slate-800 uppercase mt-2">
                    P.O.BOX 37494, DOHA-QATAR
                  </p>
                  <p className="text-[11px] font-black text-slate-800 uppercase">MOB: 7071 7282</p>
                </div>
              </div>
            </div>

            {/* Brand Logo Row */}
            <div className="px-0 pb-6 pt-4 bg-white shrink-0 border-t border-slate-100 mt-8">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center opacity-30 grayscale saturate-0">
                  <div className="flex flex-wrap gap-x-10 gap-y-4">
                    {[
                      'brother',
                      'Canon',
                      'TOSHIBA',
                      'EPSON',
                      'OKI',
                      'RICOH',
                      'kyocera',
                      'LEXMARK',
                      'SHARP',
                    ].map((p) => (
                      <span
                        key={p}
                        className="text-[11px] font-black uppercase tracking-widest italic text-slate-900 whitespace-nowrap"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-4 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-8 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => downloadPremiumInvoice(invoice.id)}
                      size="sm"
                      className="h-10 bg-red-700 hover:bg-red-800 text-white font-black text-[11px] uppercase tracking-widest px-10 gap-2 shadow-lg shadow-red-100 rounded-full"
                    >
                      <Download size={14} />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
