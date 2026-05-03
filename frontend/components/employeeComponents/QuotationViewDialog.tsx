'use client';

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Send,
  Mail,
  Phone,
  ArrowRightLeft,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  getProductById,
  getAllProducts,
  getAvailableProductsByModel,
  Product,
} from '@/lib/product';
import { getAllSpareParts } from '@/lib/spare-part';
import { getAllModels } from '@/lib/model';
import {
  Invoice,
  sendEmailNotification,
  sendWhatsappNotification,
  convertToTransaction,
  allocateMachinesInvoice,
  requestValidityExtension,
} from '@/lib/invoice';
import { recordPayment } from '@/lib/payment';
import { toast } from 'sonner';

interface ProductMeta {
  brandRelation?: { name?: string };
  brand?: string;
  model?: { model_name?: string; id?: string };
  model_name?: string;
  serial_no?: string;
  imageUrl?: string;
  image_url?: string;
  mpn?: string;
  name?: string;
  part_name?: string;
  description?: string;
  inventory?: { description?: string }[];
}

interface QuotationViewDialogProps {
  quotation: Invoice;
  onClose: () => void;
  onSendToFinance?: (id: string) => Promise<void>;
  onApprove?: () => void;
  onReject?: () => void;
  onStatusChange?: (status: string) => Promise<void>;
  onConvertSuccess?: () => void;
  showDistribution?: boolean;
}

export function QuotationViewDialog({
  quotation,
  onClose,
  onSendToFinance,
  onApprove,
  onReject,
  onStatusChange,
  onConvertSuccess,
  showDistribution = false,
}: QuotationViewDialogProps) {
  const [sending, setSending] = useState(false);
  const [isSendingCustomer, setIsSendingCustomer] = useState(false);
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, ProductMeta>>({});
  const [showConversionModal, setShowConversionModal] = useState(false);

  const isRent = quotation.saleType === 'RENT';
  const isLease = quotation.saleType === 'LEASE';
  const isSale = !isRent && !isLease;

  const isExpired = quotation.effectiveTo ? new Date() > new Date(quotation.effectiveTo) : false;
  const isExtensionRequested = quotation.status === 'VALIDITY_EXTENSION_REQUESTED';

  // We determine if we are in finance view by checking if they can approve/reject, OR if the status is already finalized

  const _isFinanceView =
    !!(onApprove && onReject) ||
    quotation.status === 'FINAL' ||
    quotation.status === 'FINANCE_APPROVED';

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        const details: Record<string, ProductMeta> = {};
        if (quotation.items) {
          const [spareParts, modelsRes] = await Promise.all([
            getAllSpareParts().catch(() => []),
            getAllModels({ limit: 1000 }).catch(() => ({ data: [] })),
          ]);
          const models = Array.isArray(modelsRes.data) ? modelsRes.data : [];
          const allocs = quotation.productAllocations || [];

          for (const item of quotation.items) {
            const alloc = item.modelId ? allocs.find((a) => a.modelId === item.modelId) : null;
            const targetProductId = item.productId || alloc?.productId;

            if (targetProductId) {
              try {
                const p = (await getProductById(targetProductId)) as unknown as ProductMeta;
                details[targetProductId] = p;
              } catch (e) {
                console.error(e);
              }
            }
            if (item.modelId) {
              const m = models.find((m: { id: string }) => m.id === item.modelId);
              if (m) {
                try {
                  const productsForModel = await getAllProducts({ modelId: m.id }).catch(() => []);

                  const productWithImage = productsForModel.find(
                    (p: { imageUrl?: string; image_url?: string }) => p.imageUrl || p.image_url,
                  );
                  if (productWithImage) {
                    const typedM = m as unknown as ProductMeta;
                    typedM.imageUrl =
                      productWithImage.imageUrl ||
                      (productWithImage as { image_url?: string }).image_url;
                    if (
                      !typedM.description &&
                      (productWithImage as { description?: string }).description
                    ) {
                      typedM.description = (
                        productWithImage as { description?: string }
                      ).description;
                    }
                  }
                } catch (e) {
                  console.error('Failed to fetch product for model image', e);
                }
                details[item.modelId] = m as unknown as ProductMeta;
              }
            } else if (item.description) {
              const m = models.find(
                (m: { model_name?: string; product_name?: string }) =>
                  m.model_name === item.description || m.product_name === item.description,
              );
              if (m) {
                details[item.description] = m as unknown as ProductMeta;
              } else {
                const sp = spareParts.find(
                  (s) => s.part_name === item.description || s.mpn === item.description,
                );
                if (sp) details[item.description] = sp as unknown as ProductMeta;
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
  }, [quotation]);

  const handleSend = async () => {
    if (!onSendToFinance) return;
    setSending(true);
    try {
      await onSendToFinance(quotation.id);
    } finally {
      setSending(false);
    }
  };

  /* 
  const handleConvert = async () => {
    if (!onConvertToTransaction) return;
    setConverting(true);
    try {
      await onConvertToTransaction(quotation.id);
    } finally {
      setConverting(false);
    }
  };
  */

  const handleSendCustomer = async (type: 'EMAIL' | 'WHATSAPP' | 'BOTH') => {
    setIsSendingCustomer(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('quotation-print-content');
      if (!element) throw new Error('Document content not found');

      // ── Force a fixed width for capture so PDF is always A4-sharp on any device ──
      const TARGET_WIDTH = 900; // pixels — enough for A4 readability
      const originalStyle = element.getAttribute('style') || '';
      element.setAttribute(
        'style',
        `${originalStyle}; width: ${TARGET_WIDTH}px !important; max-width: ${TARGET_WIDTH}px !important; overflow: visible !important;`,
      );
      // Allow the browser to re-layout at fixed width
      await new Promise<void>((r) => setTimeout(r, 120));

      let dataUrl: string;
      try {
        dataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: TARGET_WIDTH,
        });
      } finally {
        // Always restore original style
        element.setAttribute('style', originalStyle);
      }

      // Create PDF — if the image is taller than one A4 page, add extra pages
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgAspectRatio = imgProps.height / imgProps.width;
      const totalImgHeightInMm = pdfWidth * imgAspectRatio;

      let remainingHeight = totalImgHeightInMm;
      let position = 0; // current Y position in rendered image space (mm)

      while (remainingHeight > 0) {
        // Portion of the image to render on this page
        const pageImageHeight = Math.min(pdfPageHeight, remainingHeight);

        pdf.addImage(
          dataUrl,
          'PNG',
          0, // x
          position === 0 ? 0 : -(totalImgHeightInMm - remainingHeight), // y offset (negative to scroll down)
          pdfWidth,
          totalImgHeightInMm,
          undefined,
          'FAST',
        );

        remainingHeight -= pageImageHeight;
        position += pageImageHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
        }
      }

      const pdfBase64 = pdf.output('datauristring');
      const base64Data = pdfBase64.split(',')[1];

      if (!base64Data) throw new Error('Generated PDF data is empty');

      const attachments: { filename: string; content: string; encoding: string }[] = [
        {
          filename: `Quotation-${quotation.invoiceNumber}.pdf`,
          content: base64Data,
          encoding: 'base64',
        },
      ];

      // Create HTML Body mimicking the original generic email layout, so WhatsApp fallback text uses plain text
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Quotation Accepted</h2>
          <p>Dear ${quotation.customerName || 'Customer'},</p>
          <p>Your quotation <strong>${quotation.invoiceNumber}</strong> has been processed successfully.</p>
          <p>Please find the accepted quotation document attached to this email.</p>
          <p>Best Regards,<br/>XeroCare Trading & Services W.L.L</p>
        </div>
      `;

      if (type === 'EMAIL' || type === 'BOTH') {
        if (!quotation.customerEmail) throw new Error('Customer Email is missing');
        await sendEmailNotification(quotation.id, {
          recipient: quotation.customerEmail,
          subject: `Quotation Accepted - ${quotation.invoiceNumber}`,
          body: htmlBody,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          attachments,
        });
      }

      if (type === 'WHATSAPP' || type === 'BOTH') {
        if (!quotation.customerPhone) throw new Error('Customer Phone is missing');
        await sendWhatsappNotification(quotation.id, {
          recipient: quotation.customerPhone,
          body: `Dear ${quotation.customerName},\n\nYour quotation ${quotation.invoiceNumber} has been processed successfully. The official document has been generated.\n\nBest Regards,\nXeroCare Trading & Services W.L.L`,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          attachments,
        });
      }

      toast.success('Sent successfully', { description: `Quotation sent via ${type}` });
      if (onStatusChange) {
        onStatusChange('SENT_TO_CUSTOMER');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to send to customer:', err);
      toast.error('Failed to send', {
        description: err.message || 'An error occurred while generating or sending the document',
      });
    } finally {
      setIsSendingCustomer(false);
    }
  };

  const handleRequestExtension = async () => {
    setIsRequestingExtension(true);
    try {
      await requestValidityExtension(quotation.id);
      toast.success('Validity extension requested', {
        description: 'Finance has been notified to extend this quotation.',
      });
      if (onStatusChange) onStatusChange('VALIDITY_EXTENSION_REQUESTED');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Failed to request extension', { description: err.message });
    } finally {
      setIsRequestingExtension(false);
    }
  };

  const allocs = quotation.productAllocations || [];
  const enrichedItems = (quotation.items || [])
    .map((item) => {
      const alloc = item.modelId
        ? allocs.find((a: { modelId: string }) => a.modelId === item.modelId)
        : null;
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

  return (
    <>
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-4xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col max-h-[90vh]">
          <DialogTitle className="sr-only">Quotation Document</DialogTitle>
          <div
            id="quotation-print-content"
            className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-white"
          >
            {/* ═══ HEADER — Xerocare Job Report ═══════════════════════════════ */}
            <div
              className="relative flex justify-between shrink-0 overflow-hidden"
              style={{ height: '130px' }}
            >
              {/* Left: mascot on diamond pattern image */}
              <div className="w-1/2 h-full">
                <img
                  src="/branding/header_left.png"
                  alt="Header Left"
                  className="h-full w-full object-contain object-left select-none p-1"
                />
              </div>
              {/* Right: xerocare logo + contact image */}
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

            <div className="p-4 space-y-4 bg-white">
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
                        {quotation.customerName || 'N/A'}
                      </p>
                      <p className="text-xs font-black text-slate-600 uppercase tracking-tight mt-0.5">
                        {quotation.customerEmail || 'No Email'}
                      </p>
                      <p className="text-xs font-black text-slate-600 uppercase tracking-tight mt-0.5">
                        {quotation.customerPhone || 'No Phone'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Quotation Info */}
                <div className="flex flex-col items-end gap-5 lg:min-w-[320px]">
                  <h2 className="text-[20px] font-black text-red-700 uppercase tracking-tighter italic mr-4">
                    {quotation.saleType
                      ? `${quotation.saleType.replace(/_/g, ' ')} QUOTATION`
                      : 'QUOTATION'}
                  </h2>
                  <div className="flex gap-0 border-2 border-red-700 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-red-50/50 border-r-2 border-red-700 px-6 py-2 min-w-[140px] text-center">
                      <p className="text-[11px] font-black text-red-700 uppercase mb-0">Date</p>
                      <p className="text-sm font-black text-slate-800">
                        {new Date(quotation.createdAt)
                          .toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                          .replace(/\//g, '-')}
                      </p>
                    </div>
                    <div className="bg-white px-6 py-2 min-w-[140px] text-center">
                      <p className="text-[11px] font-black text-red-700 uppercase mb-0">
                        Estimate No.
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {quotation.invoiceNumber.split('-').pop()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8 text-[12px] font-black text-slate-600 uppercase tracking-tight mt-1 px-4">
                    <p>
                      Payment Method - <span className="text-red-700">Due on receipt</span>
                    </p>
                    <p>
                      Rep - <span className="text-red-700">{quotation.employeeName || 'RSHD'}</span>
                    </p>
                  </div>
                  <div className="flex gap-10 text-[12px] font-black text-slate-600 uppercase tracking-tight px-4">
                    <span className="opacity-0">Placeholder</span>
                    <p>
                      Due Date{' '}
                      <span className="text-red-700 ml-8 font-black">
                        {new Date(quotation.createdAt)
                          .toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                          .replace(/\//g, '-')}
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
                    {quotation.type === 'QUOTATION'
                      ? 'TBD UPON DISPATCH'
                      : enrichedItems[0]?.allocation?.serialNumber ||
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
                  As we discussed please find the maintenance for printers/copiers with special
                  price , All details are mentioned in the quotation . If any clarification please
                  do call and let me know the status .
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
                          <th className="text-right py-4 pr-10 text-[12px] font-black uppercase tracking-widest">
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
                          {quotation.rentType === 'FIXED_COMBO' ||
                          quotation.rentType === 'CPC_COMBO' ? (
                            <>
                              <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                                Combo Limit
                              </th>
                              <th className="text-center py-4 pr-10 text-[12px] font-black uppercase tracking-widest">
                                Combo Rate
                              </th>
                            </>
                          ) : quotation.rentType === 'FIXED_FLAT' ? (
                            <th className="text-center py-4 pr-10 text-[12px] font-black uppercase tracking-widest">
                              Billing
                            </th>
                          ) : (
                            <>
                              <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                                B/W Limit
                              </th>
                              <th className="text-center py-4 px-6 text-[12px] font-black uppercase tracking-widest border-r border-red-600/40">
                                Color Limit
                              </th>
                              <th className="text-center py-4 pr-10 text-[12px] font-black uppercase tracking-widest">
                                Excess (B/C)
                              </th>
                            </>
                          )}
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
                          detail?.description || 'Standard specification as per brand guidelines.';

                        return (
                          <React.Fragment key={idx}>
                            <tr className="group hover:bg-red-50/40 transition-all duration-300">
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
                                      crossOrigin="anonymous"
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
                                    {item.discount ? `${item.discount}%` : '0%'}
                                  </td>
                                  <td className="py-3 px-4 text-right border-r-2 border-red-50 align-top font-black text-slate-800 text-sm">
                                    {Number(item.unitPrice || 0).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="py-3 pr-10 text-right align-top font-black text-slate-900 text-sm whitespace-nowrap">
                                    {(
                                      (item.quantity || 0) * (item.unitPrice || 0)
                                    ).toLocaleString()}
                                  </td>
                                </>
                              )}
                              {(isRent || isLease) && (
                                <>
                                  {quotation.rentType === 'FIXED_COMBO' ||
                                  quotation.rentType === 'CPC_COMBO' ? (
                                    <>
                                      <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                        {item.combinedIncludedLimit || 0}
                                      </td>
                                      <td className="py-3 pr-10 text-center align-top font-black text-slate-900 text-sm whitespace-nowrap">
                                        {Number(item.combinedExcessRate || 0).toFixed(3)}
                                      </td>
                                    </>
                                  ) : quotation.rentType === 'FIXED_FLAT' ? (
                                    <td className="py-3 pr-10 text-center align-top font-black text-slate-900 text-sm italic opacity-50">
                                      Included
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                        {item.bwIncludedLimit || 0}
                                      </td>
                                      <td className="py-3 px-3 text-center border-r-2 border-red-50 align-top font-black text-slate-900 text-sm">
                                        {item.colorIncludedLimit || 0}
                                      </td>
                                      <td className="py-3 pr-10 text-center align-top font-black text-slate-900 text-sm whitespace-nowrap">
                                        {(Number(item.bwExcessRate) || 0).toFixed(3)} /{' '}
                                        {(Number(item.colorExcessRate) || 0).toFixed(3)}
                                      </td>
                                    </>
                                  )}
                                </>
                              )}
                            </tr>
                            {item.bwSlabRanges?.length ||
                            item.colorSlabRanges?.length ||
                            item.comboSlabRanges?.length ? (
                              <tr className="bg-red-50/10 border-b-2 border-red-50">
                                <td colSpan={7} className="py-3 px-8">
                                  <div className="grid grid-cols-3 gap-6 bg-white p-4 rounded-xl border border-red-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                                    {item.bwSlabRanges && item.bwSlabRanges.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b-2 border-red-50 pb-1">
                                          Black & White Slabs
                                        </p>
                                        {item.bwSlabRanges.map(
                                          (
                                            slab: { from: number; to: number; rate: number },
                                            sIdx: number,
                                          ) => (
                                            <div
                                              key={sIdx}
                                              className="flex justify-between text-[11px] font-bold text-slate-700 py-1"
                                            >
                                              <span>
                                                {slab.from} - {slab.to || '∞'} copies
                                              </span>
                                              <span className="text-red-700">
                                                {Number(slab.rate).toFixed(3)} QAR
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                    {item.colorSlabRanges && item.colorSlabRanges.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b-2 border-red-50 pb-1">
                                          Color Slabs
                                        </p>
                                        {item.colorSlabRanges.map(
                                          (
                                            slab: { from: number; to: number; rate: number },
                                            sIdx: number,
                                          ) => (
                                            <div
                                              key={sIdx}
                                              className="flex justify-between text-[11px] font-bold text-slate-700 py-1"
                                            >
                                              <span>
                                                {slab.from} - {slab.to || '∞'} copies
                                              </span>
                                              <span className="text-red-700">
                                                {Number(slab.rate).toFixed(3)} QAR
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                    {item.comboSlabRanges && item.comboSlabRanges.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b-2 border-red-50 pb-1">
                                          Combined Slabs
                                        </p>
                                        {item.comboSlabRanges.map(
                                          (
                                            slab: { from: number; to: number; rate: number },
                                            sIdx: number,
                                          ) => (
                                            <div
                                              key={sIdx}
                                              className="flex justify-between text-[11px] font-bold text-slate-700 py-1"
                                            >
                                              <span>
                                                {slab.from} - {slab.to || '∞'} copies
                                              </span>
                                              <span className="text-red-700">
                                                {Number(slab.rate).toFixed(3)} QAR
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
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
                        QAR {Number(quotation.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {isRent && (
                  <div className="flex justify-between items-start mt-0 pl-12 pr-0">
                    <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-6 py-3 bg-white flex flex-col shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)] min-w-[500px]">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-red-50 flex pb-1.5 mb-2">
                        Rent Agreement Details
                      </p>
                      <div className="grid grid-cols-6 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Type
                          </p>
                          <p className="text-[12px] font-black text-slate-800 uppercase leading-none mt-1">
                            {quotation.rentType?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Period
                          </p>
                          <p className="text-[12px] font-black text-slate-800 uppercase leading-none mt-1">
                            {quotation.rentPeriod?.replace('_', ' ') || 'MONTHLY'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Advance
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            QAR {(quotation.advanceAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Deposit
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            QAR {(quotation.securityDepositAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Start Date
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            {quotation.effectiveFrom
                              ? new Date(quotation.effectiveFrom).toLocaleDateString(undefined, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            End Date
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            {quotation.effectiveTo
                              ? new Date(quotation.effectiveTo).toLocaleDateString(undefined, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-8 py-2 bg-white flex items-center gap-6 shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)]">
                      <p className="text-lg font-black text-red-700 uppercase tracking-[0.1em] border-r-2 border-red-100 pr-6 leading-none">
                        Monthly Rent
                      </p>
                      <p className="text-xl font-black text-slate-900 leading-none">
                        QAR {Number(quotation.monthlyRent || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {isLease && (
                  <div className="flex justify-between items-start mt-0 overflow-hidden pl-12 pr-0">
                    <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-6 py-3 bg-white flex flex-col shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)] min-w-[500px]">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-red-50 flex pb-1.5 mb-2">
                        Lease Contract Frame
                      </p>
                      <div className="grid grid-cols-6 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Type
                          </p>
                          <p className="text-[12px] font-black text-slate-800 uppercase leading-none mt-1">
                            {quotation.leaseType || 'EMI'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Tenure
                          </p>
                          <p className="text-[12px] font-black text-slate-800 uppercase leading-none mt-1">
                            {quotation.leaseTenureMonths} Months
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Advance
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            QAR {(quotation.advanceAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Deposit
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            QAR {(quotation.securityDepositAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Start Date
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            {quotation.effectiveFrom
                              ? new Date(quotation.effectiveFrom).toLocaleDateString(undefined, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            End Date
                          </p>
                          <p className="text-[12px] font-black text-slate-800 leading-none mt-1">
                            {quotation.effectiveTo
                              ? new Date(quotation.effectiveTo).toLocaleDateString(undefined, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-[3px] border-t-0 border-red-700 rounded-b-3xl px-8 py-2 bg-white flex items-center gap-6 shadow-[0_20px_50px_-12px_rgba(185,28,28,0.2)]">
                      <p className="text-lg font-black text-red-700 uppercase tracking-[0.1em] border-r-2 border-red-100 pr-6 leading-none">
                        {quotation.leaseType === 'FSM' ? 'Monthly Lease' : 'Monthly EMI'}
                      </p>
                      <p className="text-xl font-black text-slate-900 leading-none">
                        QAR{' '}
                        {Number(
                          quotation.leaseType === 'FSM'
                            ? quotation.monthlyLeaseAmount || 0
                            : quotation.monthlyEmiAmount || 0,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Content precisely from reference */}
              <div className="grid grid-cols-2 gap-8 mt-4 pt-4 border-t border-slate-100 px-4">
                <div className="text-[10px] font-black text-slate-800 space-y-1.5 leading-relaxed opacity-80">
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
                  <p className="mt-4 font-black text-slate-800 italic leading-relaxed opacity-100">
                    We trust you will find our offer competitive and look forward to hearing from
                    you at the earliest .<br />
                    Thanking you assuring you of our best attention all.
                  </p>
                </div>

                <div className="flex flex-col justify-end items-end space-y-6">
                  <div className="text-right">
                    <p className="text-[11px] font-black text-slate-950 uppercase tracking-widest mb-1 italic">
                      Customer Sing: ..............................................................
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight opacity-70">
                      Best Regards,
                    </p>
                    <p className="text-[12px] font-black text-red-700 uppercase tracking-tight italic mt-1">
                      XEROCARE TRADING & SERVICES WLL
                    </p>
                    <p className="text-[10px] font-black text-slate-800 uppercase mt-2">
                      P.O.BOX 37494, DOHA-QATAR
                    </p>
                    <p className="text-[10px] font-black text-slate-800 uppercase">
                      MOB: 7071 7282
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Logo Row */}
              <div className="px-0 pb-4 pt-3 bg-white shrink-0 border-t border-slate-100 mt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center opacity-30 grayscale saturate-0">
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
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
                          className="text-[10px] font-black uppercase tracking-widest italic text-slate-900 whitespace-nowrap"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions Row - OUTSIDE Print Content wrapper */}
          <div className="px-6 pb-4 pt-4 bg-slate-50 shrink-0 border-t border-slate-200 mt-0 z-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Status:
                </span>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    quotation.status === 'FINANCE_APPROVED' ||
                    [
                      'ACCEPTED',
                      'APPROVED',
                      'SENT_TO_CUSTOMER',
                      'CUSTOMER_ACCEPTED',
                      'TRANSACTION_COMPLETED',
                      'PAID',
                      'ACTIVE_LEASE',
                      'ISSUED',
                    ].includes(quotation.status)
                      ? 'text-emerald-600'
                      : quotation.status === 'FINANCE_REJECTED' ||
                          quotation.status === 'REJECTED' ||
                          quotation.status === 'CUSTOMER_REJECTED'
                        ? 'text-red-600'
                        : 'text-blue-600'
                  }`}
                >
                  {quotation.status === 'FINANCE_APPROVED'
                    ? 'Approved by Finance'
                    : quotation.status === 'FINANCE_REJECTED'
                      ? 'Rejected by Finance'
                      : quotation.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600"
              >
                Close
              </Button>

              {!_isFinanceView && onStatusChange && quotation.status === 'SENT' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange('ACCEPTED')}
                    className="h-9 text-[11px] font-black uppercase tracking-widest border-green-200 text-green-700 hover:bg-green-50"
                  >
                    Mark as Accepted
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange('REJECTED')}
                    className="h-9 text-[11px] font-black uppercase tracking-widest border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Mark as Rejected
                  </Button>
                </>
              )}

              {/* Distribution buttons - Visible only after Finance Approval */}
              {showDistribution &&
                [
                  'FINANCE_APPROVED',
                  'SENT_TO_CUSTOMER',
                  'CUSTOMER_ACCEPTED',
                  'CUSTOMER_REJECTED',
                ].includes(quotation.status) &&
                quotation.type === 'QUOTATION' && (
                  <div className="flex gap-2 border-l border-slate-300 pl-4 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendCustomer('EMAIL')}
                      disabled={isSendingCustomer}
                      className="h-9 px-4 rounded-md font-black uppercase text-[11px] tracking-widest border-red-200 text-red-700 hover:bg-red-50 gap-2"
                    >
                      <Mail size={14} /> Gmail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendCustomer('WHATSAPP')}
                      disabled={isSendingCustomer}
                      className="h-9 px-4 rounded-md font-black uppercase text-[11px] tracking-widest border-green-200 text-emerald-700 hover:bg-green-50 gap-2"
                    >
                      <Phone size={14} /> WhatsApp
                    </Button>
                  </div>
                )}

              {onApprove && onReject && (
                <div className="flex gap-3 border-l border-slate-300 pl-4 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-8 rounded-md font-black uppercase text-[11px] tracking-widest border-red-200 text-red-600 hover:bg-red-50 gap-2"
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-10 rounded-md font-black uppercase text-[11px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-100"
                    onClick={onApprove}
                  >
                    Accept
                  </Button>
                </div>
              )}

              {!onApprove &&
                onSendToFinance &&
                (quotation.status === 'DRAFT' || quotation.status === 'FINANCE_REJECTED') && (
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    size="sm"
                    className="h-9 bg-red-700 hover:bg-red-800 text-white font-black text-[11px] uppercase tracking-widest px-10 gap-2 shadow-lg shadow-red-100 rounded-md ml-2"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send to Finance
                  </Button>
                )}

              {/* Convert Button — Direct access if valid */}
              {!onApprove &&
                onConvertSuccess &&
                quotation.type === 'QUOTATION' &&
                !isExpired &&
                !isExtensionRequested && (
                  <Button
                    onClick={() => setShowConversionModal(true)}
                    size="sm"
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest px-6 gap-2 shadow-lg shadow-emerald-100 rounded-md ml-2"
                  >
                    <ArrowRightLeft size={14} />
                    Convert to{' '}
                    {quotation.saleType === 'RENT'
                      ? 'Rent'
                      : quotation.saleType === 'LEASE'
                        ? 'Lease'
                        : 'Sale'}
                  </Button>
                )}

              {/* Request Extension Button — If expired */}
              {!onApprove &&
                quotation.type === 'QUOTATION' &&
                isExpired &&
                !isExtensionRequested && (
                  <Button
                    onClick={handleRequestExtension}
                    disabled={isRequestingExtension}
                    size="sm"
                    className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] uppercase tracking-widest px-6 gap-2 shadow-lg shadow-amber-100 rounded-md ml-2"
                  >
                    {isRequestingExtension ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowRightLeft size={14} />
                    )}
                    Request Validity Extension
                  </Button>
                )}

              {/* Pending Message */}
              {isExtensionRequested && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-bold text-[10px] uppercase tracking-wider">
                  <Loader2 size={12} className="animate-spin" />
                  Extension Pending Finance Approval
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversion Modal */}
      {showConversionModal && onConvertSuccess && (
        <ConversionModal
          quotation={quotation}
          onClose={() => setShowConversionModal(false)}
          onSuccess={() => {
            setShowConversionModal(false);
            onConvertSuccess();
          }}
        />
      )}
    </>
  );
}

// ─── Conversion Modal ──────────────────────────────────────────────────────────
// Shown when the employee clicks "Convert to Sale/Rent/Lease".
// Steps: 1) Assign serial numbers, 2) Record advance payment, 3) Confirm.

interface ConversionModalProps {
  quotation: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

interface SerialUpdate {
  itemId: string;
  description: string;
  productId: string;
  modelId?: string;
}

function ConversionModal({ quotation, onClose, onSuccess }: ConversionModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Serial number assignment per item
  const allocatableItems = (quotation.items || []).filter(
    (item) => item.itemType === 'PRODUCT' || item.itemType === 'SPAREPART',
  );
  const [serialUpdates, setSerialUpdates] = useState<SerialUpdate[]>(
    allocatableItems.map((item) => ({
      itemId: item.id || '',
      description: item.description,
      productId: item.productId || '',
      modelId: item.modelId,
    })),
  );

  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoadingProducts(true);
      const productMap: Record<string, Product[]> = {};
      try {
        for (const item of allocatableItems) {
          if (item.modelId) {
            const products = await getAvailableProductsByModel(item.modelId);
            productMap[item.modelId] = products;
          }
        }
        setAvailableProducts(productMap);
      } catch (err) {
        console.error('Failed to fetch available products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchAvailable();
  }, [quotation]);

  // Step 2: Advance payment
  const prefilledAdvance = Number(quotation.advanceAmount || 0);
  const [advanceAmount, setAdvanceAmount] = useState(
    prefilledAdvance > 0 ? String(prefilledAdvance) : '',
  );
  const [paymentMode, setPaymentMode] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'
  >('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [skipAdvance, setSkipAdvance] = useState(false);

  const updateSerial = (index: number, productId: string) => {
    setSerialUpdates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId };
      return updated;
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // 1. Convert Quotation → Proforma
      await convertToTransaction(quotation.id);

      // 2. Allocate machines (assign serial numbers) if there are any allocatable items
      const itemsToAllocate = serialUpdates.filter((u) => u.itemId && u.productId);
      if (itemsToAllocate.length > 0) {
        await allocateMachinesInvoice(quotation.id, {
          itemUpdates: itemsToAllocate.map((u) => ({
            id: u.itemId,
            productId: u.productId,
          })),
        });
      }

      // 3. Record advance payment as a ledger entry if not skipped
      if (!skipAdvance && advanceAmount && Number(advanceAmount) > 0) {
        await recordPayment({
          invoiceId: quotation.id,
          amountPaid: Number(advanceAmount),
          paymentMode,
          paymentDate,
          referenceNumber: referenceNumber || undefined,
          remarks:
            remarks ||
            `Advance payment collected at conversion — Invoice ${quotation.invoiceNumber}`,
        });
      }

      toast.success('Conversion complete!', {
        description: `Invoice ${quotation.invoiceNumber} is now active${!skipAdvance && Number(advanceAmount) > 0 ? ` with advance QAR ${Number(advanceAmount).toFixed(2)} recorded` : ''}.`,
      });
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Conversion failed';
      toast.error('Conversion failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saleLabel =
    quotation.saleType === 'RENT' ? 'Rent' : quotation.saleType === 'LEASE' ? 'Lease' : 'Sale';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border-0">
        <DialogTitle className="sr-only">Convert to {saleLabel}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRightLeft size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                Convert Quotation
              </p>
              <p className="text-lg font-black tracking-tight">
                {quotation.invoiceNumber} → {saleLabel}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {(['1', '2', '3'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    step >= i + 1 ? 'bg-white text-emerald-600' : 'bg-white/30 text-white'
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${step > i + 1 ? 'bg-white' : 'bg-white/30'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Serial Numbers
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Advance Payment
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              Confirm
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* ── Step 1: Serial Numbers ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Assign Serial / Product IDs
              </p>
              {allocatableItems.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <PackageCheck size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">No physical items to allocate</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This quotation has no products that need serial numbers.
                  </p>
                </div>
              ) : (
                serialUpdates.map((update, idx) => (
                  <div
                    key={update.itemId || idx}
                    className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2"
                  >
                    <p className="text-xs font-black text-slate-700 truncate">
                      {update.description}
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assign Physical Machine (Serial Number)
                      </label>
                      {update.modelId && availableProducts[update.modelId] ? (
                        <select
                          value={update.productId}
                          onChange={(e) => updateSerial(idx, e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                        >
                          <option value="">Select a unit from inventory...</option>
                          {availableProducts[update.modelId].map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.serial_no} {p.name ? `— ${p.name}` : ''}
                            </option>
                          ))}
                          {availableProducts[update.modelId].length === 0 && (
                            <option disabled>No units available in stock</option>
                          )}
                        </select>
                      ) : isLoadingProducts ? (
                        <div className="flex items-center gap-2 h-9 px-3 bg-slate-100 rounded-lg animate-pulse">
                          <Loader2 size={12} className="animate-spin text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Checking Stock...
                          </span>
                        </div>
                      ) : (
                        <Input
                          placeholder="Enter serial number or product ID..."
                          value={update.productId}
                          onChange={(e) => updateSerial(idx, e.target.value)}
                          className="h-9 text-sm font-mono border-slate-200 focus:border-emerald-400"
                        />
                      )}
                      {update.modelId && availableProducts[update.modelId]?.length === 0 && (
                        <p className="text-[9px] font-bold text-red-500 uppercase mt-1">
                          ⚠ No units of this model are currently available in inventory.
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Step 2: Advance Payment ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                  Invoice Reference
                </p>
                <p className="text-lg font-black text-slate-800 mt-0.5">
                  {quotation.invoiceNumber}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Total Amount:{' '}
                  <span className="text-slate-800 font-black">
                    QAR {Number(quotation.totalAmount || 0).toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skip-advance"
                  checked={skipAdvance}
                  onChange={(e) => setSkipAdvance(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                />
                <label
                  htmlFor="skip-advance"
                  className="text-xs font-bold text-slate-600 cursor-pointer"
                >
                  No advance collected — skip this step
                </label>
              </div>

              {!skipAdvance && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Advance Amount (QAR)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        className="h-9 text-sm border-slate-200 focus:border-emerald-400 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Payment Date
                      </label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-9 text-sm border-slate-200 focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPaymentMode(mode)}
                          className={`h-9 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-all ${
                            paymentMode === mode
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {mode.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(paymentMode === 'CHEQUE' || paymentMode === 'BANK_TRANSFER') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Reference / Cheque Number
                      </label>
                      <Input
                        placeholder="TXN ID, Cheque No..."
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="h-9 text-sm border-slate-200 focus:border-emerald-400 font-mono"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Remarks (optional)
                    </label>
                    <Input
                      placeholder="Any notes..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="h-9 text-sm border-slate-200 focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Summary</p>
              <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Quotation</span>
                  <span className="text-[11px] font-black text-slate-800">
                    {quotation.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Customer</span>
                  <span className="text-[11px] font-black text-slate-800">
                    {quotation.customerName}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Converting To
                  </span>
                  <span className="text-[11px] font-black text-emerald-700 uppercase">
                    {saleLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Items Allocated
                  </span>
                  <span className="text-[11px] font-black text-slate-800">
                    {serialUpdates.filter((u) => u.productId).length} / {serialUpdates.length}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Advance Payment
                  </span>
                  <span className="text-[11px] font-black text-slate-800">
                    {skipAdvance || !advanceAmount || Number(advanceAmount) === 0
                      ? '—'
                      : `QAR ${Number(advanceAmount).toFixed(2)} via ${paymentMode.replace('_', ' ')}`}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-1">
                  ⚠ This action is irreversible
                </p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  Once confirmed, the quotation will be converted and cannot be reverted. The
                  advance payment will be recorded against invoice{' '}
                  <strong>{quotation.invoiceNumber}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            className="font-black text-[11px] uppercase tracking-widest text-slate-500"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest rounded-lg"
              >
                Next →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="h-9 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest rounded-lg gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Confirm &amp; Convert
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
