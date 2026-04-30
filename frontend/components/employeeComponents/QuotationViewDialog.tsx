'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Send, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProductById, getAllProducts } from '@/lib/product';
import { getAllSpareParts, getSparePartById } from '@/lib/spare-part';
import { getAllModels } from '@/lib/model';
import { Invoice, sendEmailNotification, sendWhatsappNotification } from '@/lib/invoice';
import { toast } from 'sonner';

interface ProductMeta {
  brandRelation?: { name?: string };
  brand?: string;
  model?: { model_name?: string; id?: string; description?: string };
  model_name?: string;
  serial_no?: string;
  imageUrl?: string;
  image_url?: string;
  mpn?: string;
  name?: string;
  part_name?: string;
  description?: string;
  yield?: string;
  sku?: string;
  compatible_model?: string;
  inventory?: { description?: string }[];
}

interface QuotationViewDialogProps {
  quotation: Invoice;
  onClose: () => void;
  onSendToFinance?: (id: string) => Promise<void>;
  onApprove?: () => void;
  onReject?: () => void;
  onStatusChange?: (status: string) => Promise<void>;
  showDistribution?: boolean;
}

export function QuotationViewDialog({
  quotation,
  onClose,
  onSendToFinance,
  onApprove,
  onReject,
  onStatusChange,
  showDistribution = false,
}: QuotationViewDialogProps) {
  const [sending, setSending] = useState(false);
  const [isSendingCustomer, setIsSendingCustomer] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, ProductMeta>>({});

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

            // 1. Try resolving by productId first (check spare parts then products)
            if (targetProductId && targetProductId !== 'N/A') {
              // 1a. Check if it's in the pre-fetched spare parts list (fast)
              const spLocal = spareParts.find((s) => s.id === targetProductId);
              if (spLocal) {
                details[targetProductId] = spLocal as unknown as ProductMeta;
              } else {
                // 1b. Not in the list, try fetching directly from spare-part service
                try {
                  const spDetail = await getSparePartById(targetProductId).catch(() => null);
                  if (spDetail) {
                    details[targetProductId] = spDetail as unknown as ProductMeta;
                  } else {
                    // 1c. If not a spare part, try product service
                    const p = await getProductById(targetProductId).catch(() => null);
                    if (p) {
                      details[targetProductId] = p as unknown as ProductMeta;
                    }
                  }
                } catch (e) {
                  console.warn(
                    `Product/Sparepart ${targetProductId} not found or error loading:`,
                    e,
                  );
                }
              }
            }

            // 2. Try resolving by modelId
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
            }

            // 3. Fallback: Resolve by description if metadata still missing for this item
            if (
              item.description &&
              !details[targetProductId || ''] &&
              !details[item.modelId || '']
            ) {
              const m = models.find(
                (m: { model_name?: string; product_name?: string }) =>
                  m.model_name === item.description || m.product_name === item.description,
              );
              if (m) {
                details[item.description] = m as unknown as ProductMeta;
              } else {
                const term = item.description?.toLowerCase().trim();
                const sp = spareParts.find(
                  (s) =>
                    s.part_name?.toLowerCase().trim() === term ||
                    s.mpn?.toLowerCase().trim() === term ||
                    s.sku?.toLowerCase().trim() === term,
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

  const isRent = quotation.saleType === 'RENT';
  const isLease = quotation.saleType === 'LEASE';
  const isSale = !isRent && !isLease;
  const isSparePartSale = quotation.saleType === 'SPAREPART_SALE';

  const firstBrandName =
    enrichedItems.find((item) => item.metadata?.brand || item.metadata?.brandRelation?.name)
      ?.metadata?.brand ||
    enrichedItems.find((item) => item.metadata?.brandRelation?.name)?.metadata?.brandRelation
      ?.name ||
    'N/A';

  const firstModelName =
    enrichedItems.find((item) => item.metadata?.model?.model_name)?.metadata?.model?.model_name ||
    enrichedItems.find((item) => item.metadata?.compatible_model)?.metadata?.compatible_model ||
    'Universal';

  const firstSerialNo =
    enrichedItems.find((item) => item.metadata?.serial_no)?.metadata?.serial_no || 'N/A';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col h-[98vh]">
        <DialogTitle className="sr-only">Quotation Document</DialogTitle>
        <div
          id="quotation-print-content"
          className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-white"
        >
          {/* ═══ HEADER — Specialized for Spare Parts or Default ═══════════════════════════════════════════ */}
          {isSparePartSale ? (
            <div className="w-full shrink-0">
              <img
                src="/sparepartsquatation/sparepartquatationheader.png"
                alt="Quotation Header"
                className="w-full h-auto object-cover"
              />
            </div>
          ) : (
            <div className="relative flex justify-between items-center px-12 pt-6 pb-4 shrink-0 bg-white">
              {/* Left: English Branding */}
              <div className="flex flex-col">
                <h1 className="text-5xl font-[900] text-[#D41B22] tracking-[-0.051em] leading-[0.7] font-sans lowercase">
                  xerocare
                </h1>
                <p className="text-[11px] font-bold text-[#AAAAAA] tracking-[0.25em] mt-2 uppercase">
                  TRADING & SERVICES W.L.L
                </p>
              </div>

              {/* Center Logo */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pt-2 bg-transparent">
                <img
                  src="/quatationlogo/quatationlogo.png"
                  alt="xerocare logo"
                  className="w-[90px] h-[90px] object-contain border-none outline-none shadow-none"
                />
              </div>

              {/* Right: Arabic Branding */}
              <div className="flex flex-col items-end">
                <h1 className="text-5xl font-[900] text-[#D41B22] leading-[0.7] mb-1" dir="rtl">
                  زيرو كير
                </h1>
                <p className="text-[14px] font-black text-[#AAAAAA] tracking-tight mt-2" dir="rtl">
                  للتجارة والخدمات ذ.م.م
                </p>
              </div>
            </div>
          )}

          <div className="px-12 pb-6 space-y-4 bg-white flex-1 overflow-visible">
            {isSparePartSale ? (
              <div className="space-y-4">
                {/* Job Report Title Row */}
                <div className="flex justify-between items-end pb-2">
                  <div className="pl-1">
                    <p className="text-[14px] font-bold text-black uppercase">Name/Address</p>
                    <h3 className="text-[17px] font-black uppercase leading-tight mt-1">
                      {quotation.customerName || 'N/A'}
                    </h3>
                    {quotation.customerAddress && (
                      <h3 className="text-[17px] font-black leading-tight uppercase">
                        {quotation.customerAddress}
                      </h3>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <h2 className="text-[20px] font-black text-[#B24A4D] uppercase tracking-wide mb-2 italic">
                      Quotation - <span className="text-[18px]">Estimate job Report</span>
                    </h2>
                    <div className="border-[1.5px] border-[#B24A4D] rounded-2xl overflow-hidden flex min-w-[300px]">
                      <div className="flex-1 bg-[#EEF2F5] border-r border-[#B24A4D] text-center py-1">
                        <p className="text-[10px] font-bold text-[#B24A4D] uppercase tracking-tighter">
                          Date
                        </p>
                        <p className="text-[13px] font-black text-black">
                          {new Date(quotation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-1 bg-[#F5D8D9] text-center py-1">
                        <p className="text-[10px] font-bold text-[#B24A4D] uppercase tracking-tighter">
                          Estimate No.
                        </p>
                        <p className="text-[13px] font-black text-black">
                          {quotation.invoiceNumber.split('-').pop()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-6 text-[12px] font-bold text-black uppercase">
                      <p>
                        Payment Method - &nbsp;{' '}
                        <span className="font-medium text-gray-600">Due on receipt</span>
                      </p>
                      <p>
                        Rep &nbsp; <span className="font-medium text-gray-600">Admin</span>
                      </p>
                    </div>
                    <div className="mt-2 text-[12px] font-black text-black uppercase flex gap-2">
                      <span>Due Date</span>
                      <span className="font-bold border-b border-black min-w-[80px] text-center">
                        {new Date(quotation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Brand / Model / Sl No Row */}
                <div className="flex justify-center gap-16 py-4 text-[13px] font-black text-black uppercase">
                  <div className="flex gap-2">
                    <span className="text-gray-900">BRAND</span>
                    <span className="font-medium uppercase text-gray-600">{firstBrandName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-900">MODEL NO</span>
                    <span className="font-medium text-gray-600 uppercase">{firstModelName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-900">SL NO</span>
                    <span className="font-medium text-gray-600">{firstSerialNo}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start pt-1">
                  {/* Left: Customer Info (AGRICO style) */}
                  <div className="space-y-0 text-black">
                    <h3 className="text-[17px] font-black uppercase leading-tight">
                      {quotation.customerName || 'N/A'}
                    </h3>
                    {quotation.customerAddress ? (
                      <h3 className="text-[17px] font-black leading-tight uppercase">
                        {quotation.customerAddress}
                      </h3>
                    ) : null}
                    {quotation.customerEmail && (
                      <p className="text-[14px] font-bold text-gray-700 leading-tight">
                        Email: {quotation.customerEmail}
                      </p>
                    )}
                    {quotation.customerPhone && (
                      <p className="text-[14px] font-bold text-gray-700 leading-tight">
                        Phone: {quotation.customerPhone}
                      </p>
                    )}
                  </div>

                  {/* Right: Date & Ref */}
                  <div className="text-right space-y-0 text-black">
                    <p className="text-[16px] font-black">
                      DATE:{' '}
                      {new Date(quotation.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-[16px] font-black uppercase">
                      REF NO {quotation.invoiceNumber.split('-').pop()}/
                      {new Date().getFullYear().toString().slice(-2)}
                    </p>
                  </div>
                </div>

                {/* Subject Bar with Left Accent */}
                <div className="relative flex items-center bg-[#CCCCCC] border border-black shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                  {/* The dark grey accent bar on the left */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gray-500 border-r border-black"></div>
                  <p className="w-full py-1.5 px-4 text-center text-[13px] font-black text-black uppercase tracking-tight ml-3">
                    Sub:{' '}
                    {isSparePartSale
                      ? `Quotation for Replacement Consumables for ${firstModelName}`
                      : `Quotation for ${enrichedItems[0]?.metadata?.name || enrichedItems[0]?.description || 'Equipment'}`}
                  </p>
                </div>
              </>
            )}

            {/* Greeting */}
            <div
              className={`text-sm text-black space-y-4 font-semibold pl-1 ${isSparePartSale ? 'pt-4' : ''}`}
            >
              <div className="space-y-1">
                <p>Dear Sir/ Madam,</p>
                {isSparePartSale ? (
                  <>
                    <p>Thanks for your valuable inquiry.</p>
                    <p className="text-[12px] font-medium leading-tight text-gray-900 mt-2">
                      As we discussed please find the maintenance for printers/copiers with special
                      price. All details are mentioned in the quotation. If any clarification please
                      do call and let me know the status.
                    </p>
                  </>
                ) : (
                  <p>
                    Thank you for your valuable enquiry, please find our best competitive offers
                    below.
                  </p>
                )}
              </div>
            </div>

            {/* Machine Details Table */}
            <div className="space-y-6">
              {isSparePartSale ? (
                <div className="border-[1.5px] border-[#B24A4D] rounded-3xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#B24A4D] border-b-[1.5px] border-[#B24A4D]">
                        <th className="text-center py-2.5 px-4 text-[14px] font-black text-white w-[15%] uppercase tracking-widest border-r border-[#ffffff20]">
                          MPN
                        </th>
                        <th className="text-center py-2.5 px-4 text-[14px] font-black text-white w-[50%] uppercase tracking-widest border-r border-[#ffffff20]">
                          Description
                        </th>
                        <th className="text-center py-2.5 px-4 text-[14px] font-black text-white w-[10%] uppercase tracking-widest border-r border-[#ffffff20]">
                          Qty
                        </th>
                        <th className="text-center py-2.5 px-4 text-[14px] font-black text-white w-[12.5%] uppercase tracking-widest border-r border-[#ffffff20]">
                          Rate
                        </th>
                        <th className="text-center py-2.5 px-4 text-[14px] font-black text-white w-[12.5%] uppercase tracking-widest">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="min-h-[400px]">
                      {enrichedItems.map((item, idx) => {
                        const detail = item.metadata;
                        const isSparePart = item.itemType === 'SPAREPART';

                        const partName =
                          detail?.mpn ||
                          detail?.sku ||
                          (isSparePart ? detail?.part_name : null) ||
                          (item.description !== 'N/A' && item.description !== ''
                            ? item.description
                            : 'N/A');

                        const description =
                          (detail?.description &&
                          detail.description !== 'N/A' &&
                          detail.description !== ''
                            ? detail.description
                            : null) ||
                          detail?.model?.description ||
                          detail?.part_name ||
                          (item.description !== 'N/A' && item.description !== ''
                            ? item.description
                            : 'N/A');

                        const rate = Number(item.unitPrice || 0);
                        const quantity = Number(item.quantity || 1);
                        const total = rate * quantity;

                        return (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="border-r border-[#F3A3A5] p-3 text-[11px] font-black text-center text-gray-400 uppercase">
                              {partName === 'N/A' ? '' : partName}
                            </td>
                            <td className="border-r border-[#F3A3A5] p-3 text-[12px] align-top text-left">
                              <div className="space-y-1.5">
                                <p className="font-black text-black uppercase leading-tight mb-1">
                                  {description.split('\n')[0]}
                                </p>
                                {description
                                  .split('\n')
                                  .slice(1)
                                  .map((line: string, i: number) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return null;
                                    return (
                                      <p key={i} className="flex gap-2 text-[10px] items-start">
                                        <span className="text-[#B24A4D] font-black mt-0.5">➤</span>
                                        <span className="font-bold text-gray-500 uppercase leading-[1.3]">
                                          {trimmed}
                                        </span>
                                      </p>
                                    );
                                  })}
                              </div>
                            </td>
                            <td className="border-r border-[#F3A3A5] p-3 text-[13px] font-black text-center text-black">
                              {quantity}
                            </td>
                            <td className="border-r border-[#F3A3A5] p-3 text-[12px] font-black text-center text-gray-500">
                              {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-[13px] font-black text-center text-black">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Empty rows to maintain height */}
                      {Array.from({ length: Math.max(0, 10 - enrichedItems.length) }).map(
                        (_, i) => (
                          <tr key={`empty-${i}`} className="border-b border-gray-100 h-10">
                            <td className="border-r border-[#F3A3A5]"></td>
                            <td className="border-r border-[#F3A3A5]"></td>
                            <td className="border-r border-[#F3A3A5]"></td>
                            <td className="border-r border-[#F3A3A5]"></td>
                            <td></td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                enrichedItems.map((item, idx) => {
                  const detail = item.metadata;
                  const image = detail?.imageUrl || detail?.image_url;
                  const productName =
                    detail?.name || detail?.part_name || item.description || 'N/A';
                  const productDesc =
                    detail?.description || detail?.model?.description || item.description || '';

                  return (
                    <div key={idx} className="space-y-4 relative">
                      <div className="pl-2">
                        <h4 className="text-[16px] font-black text-black border-b-2 border-black inline-block pb-0.5">
                          {idx + 1}. {productName}
                        </h4>
                      </div>

                      {/* Table wrapper */}
                      <div className="border-[2px] border-black overflow-hidden bg-white">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-[#D1E5F4] border-b-[2px] border-black">
                              <th className="text-center py-2 px-4 text-[13px] font-black border-r-[2px] border-black w-[65%]">
                                Description
                              </th>
                              <th className="text-center py-2 px-2 text-[13px] font-black border-r-[2px] border-black w-[7.5%] underline">
                                Qty.
                              </th>
                              <th className="text-center py-2 px-4 text-[13px] font-black border-r-[2px] border-black w-[13.75%] underline">
                                Unit Price <br /> (Qr.)
                              </th>
                              <th className="text-center py-2 px-4 text-[13px] font-black w-[13.75%] underline">
                                Special Price <br /> (Qr.)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row 1: Description (spans 2 rows) | Image (spans 3 right cols) */}
                            <tr>
                              <td
                                rowSpan={2}
                                className="border-r-[2px] border-black align-top p-5"
                                style={{ width: '65%' }}
                              >
                                <p className="text-[15px] font-black text-black underline uppercase mb-3">
                                  {productName}
                                </p>
                                <div className="text-[12px] text-black space-y-1.5 font-bold leading-relaxed">
                                  {productDesc ? (
                                    productDesc.split('\n').map((line: string, i: number) => {
                                      const trimmedLine = line.trim();
                                      if (!trimmedLine) return null;
                                      const isHeader =
                                        trimmedLine.endsWith(':') ||
                                        trimmedLine.match(/^[A-Z\s]+$/);
                                      const isKeywordRed =
                                        trimmedLine.includes('+') ||
                                        trimmedLine.includes('Machine') ||
                                        trimmedLine.includes('trays') ||
                                        trimmedLine.includes('Toner') ||
                                        trimmedLine.startsWith('Warranty');

                                      // Pattern: 1st Red, 2nd Black, 3rd Red... (i.e. even indices are red)
                                      const isPatternRed = i % 2 === 0;
                                      const shouldBeRed = isPatternRed || isKeywordRed || isHeader;

                                      return (
                                        <p
                                          key={i}
                                          className={`flex gap-2 ${shouldBeRed ? 'font-black text-[#D41B22]' : 'font-bold text-black'}`}
                                        >
                                          <span
                                            className={`${shouldBeRed ? 'text-[#D41B22]' : 'text-gray-900'} mt-0.5`}
                                          >
                                            ➤
                                          </span>
                                          <span
                                            className={isHeader ? 'underline decoration-black' : ''}
                                          >
                                            {trimmedLine}
                                          </span>
                                        </p>
                                      );
                                    })
                                  ) : (
                                    <>
                                      <p className="flex gap-2 font-black text-[#D41B22]">
                                        <span className="text-[#D41B22] mt-0.5">➤</span>
                                        Print/Scan/ Copy
                                      </p>
                                      <p className="flex gap-2 font-bold text-black">
                                        <span className="text-gray-900 mt-0.5">➤</span>
                                        Type: Professional multifunctional device.
                                      </p>
                                      <p className="flex gap-2 font-black text-[#D41B22]">
                                        <span className="text-[#D41B22] mt-0.5">➤</span>
                                        Price Includes Machine + Auto Document Feeder+
                                      </p>
                                    </>
                                  )}
                                </div>
                              </td>
                              {/* Image spanning all 3 right columns */}
                              <td
                                colSpan={3}
                                className="border-b-[2px] border-black text-center p-4"
                                style={{ height: '360px' }}
                              >
                                {image ? (
                                  <img
                                    src={image}
                                    alt="product"
                                    className="max-w-full max-h-[320px] object-contain drop-shadow-xl mx-auto"
                                  />
                                ) : (
                                  <div className="h-full" />
                                )}
                              </td>
                            </tr>
                            {/* Row 2: Qty | Unit Price | Special Price */}
                            <tr>
                              <td className="text-center align-middle py-5 border-r-[2px] border-black font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {String(item.quantity || 1).padStart(2, '0')}
                                </p>
                              </td>
                              <td className="text-center align-middle py-5 border-r-[2px] border-black font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {Number(
                                    isSale
                                      ? item.unitPrice
                                      : item.combinedExcessRate || item.bwExcessRate || 0,
                                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </td>
                              <td className="text-center align-middle py-5 font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {Number(isSale ? item.unitPrice : 0).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isSparePartSale ? (
              <div className="space-y-6">
                {/* Terms and Total Row */}
                <div className="flex justify-between items-start pt-2">
                  <div className="text-[10px] font-bold text-gray-700 leading-[1.3] max-w-[500px] uppercase">
                    <p>Delivery: 7-10 days normal working days. After conformed LPO</p>
                    <p>Payment: CASH or PDC (Management approved for the credit terms)</p>
                    <p>
                      Warranty: 30 days in service of the parts. Not covered the consumables items.
                    </p>
                    <p>
                      Validity: 15 days estimated will valid. If not approved /paid within 15 days
                      will not be valid, re-estimate will be charged.
                    </p>
                  </div>
                  <div className="flex items-center border-[2.5px] border-[#B24A4D] rounded-xl px-12 py-3 bg-white min-w-[300px] justify-between relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-[#B24A4D] flex items-center justify-center">
                      <span className="text-white font-black text-[16px] uppercase italic">
                        Total
                      </span>
                    </div>
                    <div className="w-32"></div> {/* Spacer for absolute box */}
                    <p className="text-[20px] font-black text-black uppercase tracking-tight">
                      QAR {Number(quotation.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-bold text-gray-800 italic leading-tight">
                  <p>
                    We trust you will find our offer competitive and look forward to hearing from at
                    the earliest.
                  </p>
                  <p>Thanking you assuring you of our best attention all.</p>
                </div>

                <div className="flex justify-between items-end pt-4">
                  <div className="text-[12px] font-black text-black space-y-0.5 uppercase">
                    <p>Best Regards,</p>
                    <p>XEROCARE TRADING & SERVICES WLL</p>
                    <p>P.O.BOX 37494</p>
                    <p>DOHA - QATAR</p>
                    <p>MOB: 7071 7282</p>
                  </div>
                  <div className="pb-2">
                    <p className="text-[12px] font-bold text-black italic">
                      Customer Sing:
                      ........................................................................................................
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="pl-1">
                  <h4 className="text-[14px] font-black text-black underline mb-3 uppercase tracking-wider">
                    TERMS AND CONDITIONS
                  </h4>
                  <div className="space-y-1 text-[13px] font-bold text-black">
                    <div className="flex gap-4">
                      <span className="w-28 uppercase">1) PAYMENT</span>
                      <span>: CONFIRMED LPO</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="w-28 uppercase">2) PRICES</span>
                      <span>: INCLUSIVE OF DELIVERY & INSTALLATION AT YOUR SITE</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="w-28 uppercase">3) DELIVERY</span>
                      <span>
                        :{' '}
                        <span className="underline font-black italic">
                          EX STOCK, SUBJECT TO AVAILABILITY
                        </span>{' '}
                        OR 30 DAYS FROM ORDER DATE
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="w-28 uppercase">5) VALIDITY</span>
                      <span>: 30 Days</span>
                    </div>
                  </div>
                </div>

                <div className="pl-1 space-y-4">
                  <p className="text-[13px] font-bold text-black">
                    For any further clarifications please feel free to contact the undersigned on
                    Mob: 70717282 or Email: mail@xerocare.com
                  </p>
                  <div className="space-y-1">
                    <p className="text-[13px] font-bold text-black">With warm regards,</p>
                    <div className="pt-2">
                      <p className="text-[13px] font-black text-black uppercase">For</p>
                      <p className="text-[13px] font-black text-black uppercase">
                        XEROCARE TRADING & SERVICES WLL
                      </p>
                      <p className="text-[13px] font-black text-black uppercase">DOHA QATAR</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="relative flex justify-end px-4 -mt-36 z-50 pointer-events-none pr-20">
              <img
                src="/seel/seel1.png"
                alt="Official Seal"
                className="w-56 h-56 object-contain rotate-[-12deg]"
                style={{ mixBlendMode: 'multiply', filter: 'contrast(1.1)' }}
              />
            </div>

            {/* Maintenance Summary (Rental/Lease) if applicable */}
            {(isRent || isLease) && (
              <div className="border-[2px] border-black p-4 bg-white mt-10">
                <h4 className="text-[14px] font-black text-black underline uppercase mb-3 text-center">
                  Rental & Lease Terms Summary
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Advance Amount
                    </p>
                    <p className="text-sm font-black text-black">
                      QAR {(quotation.advanceAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Sec. Deposit
                    </p>
                    <p className="text-sm font-black text-black">
                      QAR {(quotation.securityDepositAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Validity Period
                    </p>
                    <p className="text-sm font-black text-black">
                      {quotation.effectiveFrom
                        ? new Date(quotation.effectiveFrom).toLocaleDateString()
                        : 'N/A'}{' '}
                      -{' '}
                      {quotation.effectiveTo
                        ? new Date(quotation.effectiveTo).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Monthly Cost
                    </p>
                    <p className="text-sm font-black text-black">
                      QAR{' '}
                      {(
                        quotation.monthlyRent ||
                        quotation.monthlyLeaseAmount ||
                        0
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Grand Total for Sale */}
            {isSale && (
              <div className="flex justify-end pt-2">
                <div className="border-[2px] border-black px-8 py-3 bg-[#D1E5F4] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                  <p className="text-xl font-black text-black uppercase tracking-tight">
                    Total: QAR{' '}
                    {Number(quotation.totalAmount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar: Specialized for Spare Parts or Default */}
          {isSparePartSale ? (
            <div className="w-full shrink-0 pt-10">
              <img
                src="/sparepartsquatation/footersparepartsquatation.png"
                alt="Quotation Footer"
                className="w-full h-auto object-cover"
              />
            </div>
          ) : (
            <div className="px-12 pb-10 pt-4 bg-white shrink-0">
              <div className="flex justify-between items-center py-6 border-t-[2px] border-black">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-900 p-2.5 rounded-md shadow-sm">
                    <Mail size={18} className="text-white" />
                  </div>
                  <span className="text-[13px] font-black text-black">mail@xerocare.com</span>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                  <div className="bg-zinc-900 p-2.5 rounded-md shadow-sm">
                    <Phone size={18} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-black tracking-tight">
                      +974 7071 7282
                    </span>
                    <span className="text-[13px] font-black text-black tracking-tight" dir="rtl">
                      +٩٧٤ ٧٠٧١ ٧٢٨٢
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                  <div className="bg-zinc-900 p-2.5 rounded-md shadow-sm">
                    <Send size={18} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-black tracking-tight">
                      37494, Doha-Qatar
                    </span>
                    <span className="text-[13px] font-black text-black tracking-tight" dir="rtl">
                      ٣٧٤٩٤, الدوحة-قطر
                    </span>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                  <div className="bg-zinc-900 p-2.5 rounded-md shadow-sm">
                    <Globe size={18} className="text-white" />
                  </div>
                  <span className="text-[13px] font-black text-black">www.xerocare.com</span>
                </div>
              </div>
            </div>
          )}
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

            {/* Distribution buttons - Visible only after Finance Approval / Completion */}
            {showDistribution &&
              [
                'FINANCE_APPROVED',
                'ACCEPTED',
                'APPROVED',
                'PENDING_CONFIRMATION',
                'SENT_TO_CUSTOMER',
                'CUSTOMER_ACCEPTED',
                'CUSTOMER_REJECTED',
                'TRANSACTION_COMPLETED',
                'PAID',
                'ACTIVE_LEASE',
                'ISSUED',
              ].includes(quotation.status) && (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
