'use client';

import React, { useEffect, useState } from 'react';
import { Send, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProductById, getAllProducts } from '@/lib/product';
import { getAllSpareParts } from '@/lib/spare-part';
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

interface InvoiceViewDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
  onEmail?: () => Promise<void> | void;
  onWhatsApp?: () => Promise<void> | void;
  approveLabel?: string;
}

export function InvoiceViewDialog({
  invoice,
  onClose,
  onApprove,
  onReject,
  approveLabel = 'Approve',
}: InvoiceViewDialogProps) {
  const [isSendingCustomer, setIsSendingCustomer] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, ProductMeta>>({});
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        const details: Record<string, ProductMeta> = {};
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

            if (targetProductId && targetProductId !== 'N/A') {
              try {
                const p = await getProductById(targetProductId).catch(() => null);
                if (p) {
                  details[targetProductId] = p as unknown as ProductMeta;
                }
              } catch (e) {
                console.warn(`Product ${targetProductId} not found:`, e);
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
                  console.error(e);
                }
                details[item.modelId] = m as unknown as ProductMeta;
              }
            } else if (item.description) {
              const m = models.find(
                (m: { model_name?: string; product_name?: string }) =>
                  m.model_name === item.description || m.product_name === item.description,
              );
              if (m) details[item.description] = m as unknown as ProductMeta;
              else {
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
        console.error('Failed to fetch details:', err);
      }
    };
    fetchFullDetails();
  }, [invoice]);

  const handleSendCustomer = async (type: 'EMAIL' | 'WHATSAPP' | 'BOTH') => {
    setIsSendingCustomer(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('invoice-print-content');
      if (!element) throw new Error('Document content not found');

      const TARGET_WIDTH = 900;
      const originalStyle = element.getAttribute('style') || '';
      element.setAttribute(
        'style',
        `${originalStyle}; width: ${TARGET_WIDTH}px !important; max-width: ${TARGET_WIDTH}px !important; overflow: visible !important;`,
      );
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
        element.setAttribute('style', originalStyle);
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const imgAspectRatio = imgProps.height / imgProps.width;
      const totalImgHeightInMm = pdfWidth * imgAspectRatio;

      let remainingHeight = totalImgHeightInMm;
      let position = 0;
      while (remainingHeight > 0) {
        pdf.addImage(
          dataUrl,
          'PNG',
          0,
          position === 0 ? 0 : -(totalImgHeightInMm - remainingHeight),
          pdfWidth,
          totalImgHeightInMm,
          undefined,
          'FAST',
        );
        remainingHeight -= pdfPageHeight;
        position += pdfPageHeight;
        if (remainingHeight > 0) pdf.addPage();
      }

      const pdfBase64 = pdf.output('datauristring');
      const base64Data = pdfBase64.split(',')[1];
      const attachments = [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: base64Data,
          encoding: 'base64',
        },
      ];

      if (type === 'EMAIL' || type === 'BOTH') {
        if (!invoice.customerEmail) throw new Error('Customer Email is missing');
        await sendEmailNotification(invoice.id, {
          recipient: invoice.customerEmail,
          subject: `Invoice - ${invoice.invoiceNumber}`,
          body: `<p>Please find attached your invoice.</p>`,
          attachments: attachments,
        });
      }
      if (type === 'WHATSAPP' || type === 'BOTH') {
        if (!invoice.customerPhone) throw new Error('Customer Phone is missing');
        await sendWhatsappNotification(invoice.id, {
          recipient: invoice.customerPhone,
          body: `Your invoice ${invoice.invoiceNumber} is ready.`,
          attachments: attachments,
        });
      }
      toast.success('Sent successfully');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Failed to send: ' + err.message);
    } finally {
      setIsSendingCustomer(false);
    }
  };

  const allocs = invoice.productAllocations || [];
  const enrichedItems = (invoice.items || [])
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
      return { ...item, metadata: meta, allocation: alloc };
    })
    .filter((item) => item.quantity && item.quantity > 0);

  const isRent = invoice.saleType === 'RENT';
  const isLease = invoice.saleType === 'LEASE';
  const isSparePartSale = invoice.saleType === 'SPAREPART_SALE';

  const firstModelName =
    enrichedItems.find(
      (item) => item.metadata?.model?.model_name || item.metadata?.compatible_model,
    )?.metadata?.model?.model_name ||
    enrichedItems.find((item) => item.metadata?.compatible_model)?.metadata?.compatible_model ||
    'Machine';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col h-[98vh]">
        <DialogTitle className="sr-only">Invoice Document</DialogTitle>
        <div
          id="invoice-print-content"
          className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-white"
        >
          {/* Header */}
          <div className="relative flex justify-between items-center px-12 pt-6 pb-4 shrink-0 bg-white">
            <div className="flex flex-col">
              <h1 className="text-5xl font-[900] text-[#D41B22] tracking-[-0.051em] leading-[0.7] font-sans lowercase">
                xerocare
              </h1>
              <p className="text-[11px] font-bold text-[#AAAAAA] tracking-[0.25em] mt-2 uppercase">
                TRADING & SERVICES W.L.L
              </p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pt-2 bg-transparent">
              <img
                src="/quatationlogo/quatationlogo.png"
                alt="logo"
                className="w-[90px] h-[90px] object-contain"
              />
            </div>
            <div className="flex flex-col items-end">
              <h1 className="text-5xl font-[900] text-[#D41B22] leading-[0.7] mb-1" dir="rtl">
                زيرو كير
              </h1>
              <p className="text-[14px] font-black text-[#AAAAAA] tracking-tight mt-2" dir="rtl">
                للتجارة والخدمات ذ.م.م
              </p>
            </div>
          </div>

          <div className="px-12 pb-6 space-y-4 bg-white flex-1 overflow-visible">
            <div className="flex justify-between items-start pt-1">
              <div className="space-y-0 text-black">
                <h3 className="text-[17px] font-black uppercase leading-tight">
                  {invoice.customerName || 'N/A'}
                </h3>
                {invoice.customerAddress ? (
                  <h3 className="text-[17px] font-black leading-tight uppercase">
                    {invoice.customerAddress}
                  </h3>
                ) : null}
                {invoice.customerEmail && (
                  <p className="text-[14px] font-bold text-gray-700 leading-tight">
                    Email: {invoice.customerEmail}
                  </p>
                )}
                {invoice.customerPhone && (
                  <p className="text-[14px] font-bold text-gray-700 leading-tight">
                    Phone: {invoice.customerPhone}
                  </p>
                )}
              </div>
              <div className="text-right space-y-0 text-black">
                <p className="text-[16px] font-black">
                  DATE:{' '}
                  {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-[16px] font-black uppercase">
                  REF NO {invoice.invoiceNumber.split('-').pop()}/
                  {new Date().getFullYear().toString().slice(-2)}
                </p>
              </div>
            </div>

            <div className="relative flex items-center bg-[#CCCCCC] border border-black shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gray-500 border-r border-black"></div>
              <p className="w-full py-1.5 px-4 text-center text-[13px] font-black text-black uppercase tracking-tight ml-3">
                Sub:{' '}
                {isSparePartSale
                  ? `Invoice for Replacement Consumables for ${firstModelName}`
                  : `${invoice.saleType?.replace(/_/g, ' ')} Invoice for ${enrichedItems[0]?.metadata?.name || enrichedItems[0]?.description || 'Equipment'}`}
              </p>
            </div>

            <div className="space-y-6">
              {isSparePartSale ? (
                <div className="border-[2px] border-black overflow-hidden bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#D1E5F4] border-b-[2px] border-black">
                        <th className="text-center py-2 px-4 text-[13px] font-black border-r-[2px] border-black w-[25%]">
                          PART NAME
                        </th>
                        <th className="text-center py-2 px-4 text-[13px] font-black border-r-[2px] border-black w-[40%]">
                          DESCRIPTION
                        </th>
                        <th className="text-center py-2 px-4 text-[13px] font-black border-r-[2px] border-black w-[20%]">
                          YIELD*
                        </th>
                        <th className="text-center py-2 px-4 text-[13px] font-black w-[15%] underline">
                          Price(Qr)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedItems.map((item, idx) => {
                        const detail = item.metadata;
                        const partName = detail?.mpn || detail?.sku || item.description || 'N/A';
                        const description =
                          detail?.description ||
                          detail?.model?.description ||
                          detail?.part_name ||
                          item.description ||
                          'N/A';
                        const yieldSpec = detail?.yield || '';
                        const priceValue =
                          Number(item.quantity || 1) * Number(item.unitPrice || 0) -
                          Number(item.discount || 0);

                        return (
                          <tr key={idx} className="border-b border-black last:border-b-0">
                            <td className="border-r-[2px] border-black p-3 text-[12px] font-black text-center uppercase">
                              {partName}
                            </td>
                            <td className="border-r-[2px] border-black p-3 text-[12px] align-top text-left">
                              <div className="space-y-1.5">
                                {description.split('\n').map((line: string, i: number) => {
                                  const trimmedLine = line.trim();
                                  if (!trimmedLine) return null;
                                  const isRed = i % 2 === 0;
                                  return (
                                    <p
                                      key={i}
                                      className={`flex gap-2 items-start ${isRed ? 'font-black text-[#D41B22]' : 'font-bold text-black'}`}
                                    >
                                      <span
                                        className={`${isRed ? 'text-[#D41B22]' : 'text-gray-900'} mt-0.5`}
                                      >
                                        ➤
                                      </span>
                                      <span className="uppercase">{trimmedLine}</span>
                                    </p>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="border-r-[2px] border-black p-3 text-[12px] font-black text-center uppercase">
                              {yieldSpec}
                            </td>
                            <td className="p-3 text-[12px] font-black text-center">
                              {priceValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
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
                                Total <br /> (Qr.)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
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

                                      // Pattern: 1st Red, 2nd Black, 3rd Red...
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
                                    <p className="flex gap-2">
                                      <span className="text-gray-900 mt-0.5">➤</span>
                                      <span>Standard specification as per brand guidelines.</span>
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td
                                colSpan={3}
                                className="border-b-[2px] border-black text-center p-4"
                                style={{ height: '360px' }}
                              >
                                {image ? (
                                  <img
                                    src={image}
                                    alt="product"
                                    className="max-w-full max-h-[320px] object-contain mx-auto"
                                  />
                                ) : (
                                  <div className="h-full" />
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="text-center align-middle py-5 border-r-[2px] border-black font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {String(item.quantity || 1).padStart(2, '0')}
                                </p>
                              </td>
                              <td className="text-center align-middle py-5 border-r-[2px] border-black font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {Number(item.unitPrice || 0).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </td>
                              <td className="text-center align-middle py-5 font-black text-black">
                                <p className="text-[15px] font-black text-black">
                                  {Number(
                                    (item.quantity || 1) * (item.unitPrice || 0),
                                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

            <div className="space-y-8 mt-6">
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
                  For any further clarifications please feel free to contact the undersigned on Mob:
                  70717282 or Email: mail@xerocare.com
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
            </div>

            <div className="relative flex justify-end px-4 -mt-36 z-50 pointer-events-none pr-20">
              <img
                src="/seel/seel1.png"
                alt="Seal"
                className="w-56 h-56 object-contain rotate-[-12deg]"
                style={{ mixBlendMode: 'multiply', filter: 'contrast(1.1)' }}
              />
            </div>

            {/* Maintenance Summary */}
            {(isRent || isLease) && (
              <div className="border-[2px] border-black p-4 bg-white mt-10">
                <h4 className="text-[14px] font-black text-black underline uppercase mb-3 text-center">
                  Contract Terms Summary
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase">Advance</p>
                    <p className="text-sm font-black text-black">
                      QAR {(invoice.advanceAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase">Deposit</p>
                    <p className="text-sm font-black text-black">
                      QAR {(invoice.securityDepositAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase">Period</p>
                    <p className="text-sm font-black text-black">
                      {invoice.effectiveFrom
                        ? new Date(invoice.effectiveFrom).toLocaleDateString()
                        : 'N/A'}{' '}
                      -{' '}
                      {invoice.effectiveTo
                        ? new Date(invoice.effectiveTo).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase">Monthly</p>
                    <p className="text-sm font-black text-black">
                      QAR{' '}
                      {(invoice.monthlyRent || invoice.monthlyLeaseAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <div className="border-[2px] border-black px-8 py-3 bg-[#D1E5F4] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <p className="text-xl font-black text-black uppercase tracking-tight">
                  Total: QAR{' '}
                  {Number(invoice.totalAmount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="px-12 pb-10 pt-4 bg-white shrink-0 border-t-[2px] border-black mt-auto">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-md">
                  <Mail size={16} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-black">mail@xerocare.com</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-md">
                  <Phone size={16} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-black">+974 7071 7282</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-md">
                  <Send size={16} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-black">Doha-Qatar</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-md">
                  <Globe size={16} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-black">www.xerocare.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="font-black text-[11px] uppercase tracking-widest text-slate-500"
            >
              Close
            </Button>
          </div>
          <div className="flex gap-2">
            {onReject && !isRejecting && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={() => setIsRejecting(true)}
              >
                Reject
              </Button>
            )}
            {isRejecting && (
              <div className="flex items-center gap-2">
                <input
                  placeholder="Reason..."
                  className="h-9 border border-red-200 rounded px-2 text-xs"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRejecting(false);
                    if (onReject) onReject(rejectReason);
                  }}
                >
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {onApprove && (
              <Button className="bg-emerald-600 text-white font-bold" onClick={onApprove}>
                {approveLabel}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSendCustomer('BOTH')}
              disabled={isSendingCustomer}
              className="border-red-200 text-red-700 font-bold"
            >
              Email/WA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
