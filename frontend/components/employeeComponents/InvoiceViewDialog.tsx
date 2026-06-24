'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  Mail,
  Phone,
  Globe,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  MoveHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProductById, getAllProducts } from '@/lib/product';
import { getAllSpareParts } from '@/lib/spare-part';
import { getAllModels } from '@/lib/model';
import { Invoice, sendEmailNotification, sendWhatsappNotification } from '@/lib/invoice';
import { toast } from 'sonner';
import { getUserFromToken } from '@/lib/auth';
import AuditTimeline from '../invoice/AuditTimeline';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

interface InternalConsumable {
  name?: string;
  model?: string;
  yield?: string;
  image?: string;
  partName?: string;
  description?: string;
  price?: string;
}

import ProductStandardQuotation from '../../public/quatationLayouts/productsalequatation/statnderd/productstatnderdquatation';
import ProductPremiumQuotation from '../../public/quatationLayouts/productsalequatation/premium/productpremiumquatation';
import ProductNormalQuotation from '../../public/quatationLayouts/productsalequatation/normal/productnormalqatation';
import SparePartsNormalQuotation from '../../public/quatationLayouts/sparepartsalequatation/normal/sparepartsnormalquatation';
import SparePartsStandardQuotation from '../../public/quatationLayouts/sparepartsalequatation/standerd/sparepartsstanderdquatation';
import SparePartsPremiumQuotation from '../../public/quatationLayouts/sparepartsalequatation/premium/sparepartspremiumquatation';
import RentNormalQuotation from '../../public/quatationLayouts/rentquatation/normal/rentnormalquatatio';
import RentStandardQuotation from '../../public/quatationLayouts/rentquatation/stanterd/rentstanderdquatation';
import RentPremiumQuotation from '../../public/quatationLayouts/rentquatation/premium/rentpremiumquatation';
import LeaseNormalQuotation from '../../public/quatationLayouts/leasequatation/normal/leasenormalquatation';
import LeaseStandardQuotation from '../../public/quatationLayouts/leasequatation/standerd/leasestanterdquatation';
import LeasePremiumQuotation from '../../public/quatationLayouts/leasequatation/premium/leasepremiumqutation';
import ReturnInvoiceLayout from '../../public/quatationLayouts/ReturnInvoiceLayout';

interface ProductMeta {
  brandRelation?: { name?: string };
  brand?: string;
  model?: { model_name?: string; model_no?: string; id?: string; description?: string };
  model_name?: string;
  model_no?: string;
  serial_no?: string;
  serialNo?: string;
  imageUrl?: string;
  image_url?: string;
  mpn?: string;
  sku?: string;
  name?: string;
  part_name?: string;
  description?: string;
  warranty?: string;
  features?: { subHeading: string; description: string }[];
  yield?: string;
  inventory?: { description?: string }[];
  image?: string;
  consumables?: InternalConsumable[];
  tax_rate?: number;
}

interface InvoiceViewDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
  onEmail?: () => Promise<void> | void;
  onWhatsApp?: () => Promise<void> | void;
  approveLabel?: string;
  showDistribution?: boolean;
}

export function InvoiceViewDialog({
  invoice,
  onClose,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  showDistribution = false,
}: InvoiceViewDialogProps) {
  const [isSendingCustomer, setIsSendingCustomer] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, ProductMeta>>({});
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Controls whether the return invoice view or original invoice is shown
  const [showingOriginalInvoice, setShowingOriginalInvoice] = useState(false);
  const [showReturnSidebar, setShowReturnSidebar] = useState(false);

  // Detect if this invoice has a completed return / replacement
  const returnCreditNote = invoice.creditNotes?.find((cn) => cn.status === 'PRODUCT_REPLACED');
  const isReturnInvoice = !!returnCreditNote;

  const currentUser = getUserFromToken();
  const canViewTimeline = currentUser && ['MANAGER', 'FINANCE', 'ADMIN'].includes(currentUser.role);

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
                  const typedM = m as unknown as ProductMeta;
                  const firstProduct = productsForModel[0];
                  if (
                    firstProduct &&
                    (firstProduct as { tax_rate?: number }).tax_rate !== undefined
                  ) {
                    typedM.tax_rate = Number((firstProduct as { tax_rate?: number }).tax_rate);
                  }
                  const productWithImage = productsForModel.find(
                    (p: { imageUrl?: string; image_url?: string }) => p.imageUrl || p.image_url,
                  );
                  if (productWithImage) {
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
                    if (
                      (!typedM.features || typedM.features.length === 0) &&
                      (
                        productWithImage as {
                          features?: { subHeading: string; description: string }[];
                        }
                      ).features
                    ) {
                      typedM.features = (
                        productWithImage as {
                          features?: { subHeading: string; description: string }[];
                        }
                      ).features;
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

  const firstModelName =
    enrichedItems.find((item) => item.metadata?.model?.model_name || item.metadata?.model_name)
      ?.metadata?.model?.model_name ||
    enrichedItems.find((item) => item.metadata?.model_name)?.metadata?.model_name ||
    'Machine';

  // ── Layout Detection Logic ────────────────────────────────────────────────
  const rawId = (invoice.layoutId || '').toLowerCase();
  const notesRaw = (invoice.notes || '').toLowerCase();
  const descTag = enrichedItems.some((it) => (it.description || '').includes('[PRM]'))
    ? 'premium'
    : enrichedItems.some((it) => (it.description || '').includes('[STD]'))
      ? 'standard'
      : '';

  const notesTag =
    notesRaw.includes('style:standard') || notesRaw.includes('style:standerd')
      ? 'standard'
      : notesRaw.includes('style:premium')
        ? 'premium'
        : '';

  const searchStr = (rawId + notesRaw + descTag + notesTag).toLowerCase();
  const st = (invoice.saleType || '').toUpperCase().trim();

  const isLease =
    st === 'LEASE' ||
    searchStr.includes('lease') ||
    invoice.leaseType ||
    (invoice.layoutId?.startsWith('lease:') ?? false);

  const isRent =
    !isLease &&
    (st === 'RENT' || searchStr.includes('rental') || !!invoice.rentType || !!invoice.monthlyRent);

  const isSale = !isRent && !isLease;

  const isSparePart =
    searchStr.includes('sparepart') ||
    searchStr.includes('spare-part') ||
    searchStr.includes('spare part') ||
    st === 'SPAREPART_SALE' ||
    st === 'SPARE_PART_SALE';

  const isSparePartSale = st.includes('SPAREPART') || st.includes('SPARE_PART');

  const isProductPremium =
    !isRent &&
    !isSparePart &&
    isSale &&
    (invoice.layoutId?.includes('premium') || searchStr.includes('premium'));

  const isProductStandard =
    !isRent &&
    !isSparePart &&
    isSale &&
    (invoice.layoutId?.includes('standard') ||
      searchStr.includes('standard') ||
      searchStr.includes('standerd'));

  const isProductNormal = isSale && !isProductStandard && !isProductPremium && !isSparePart;

  const isSpareStandard =
    isSparePart &&
    (invoice.layoutId?.includes('standard') ||
      searchStr.includes('standard') ||
      searchStr.includes('standerd')) &&
    !searchStr.includes('premium');

  const isSparePremium =
    isSparePart && (invoice.layoutId?.includes('premium') || searchStr.includes('premium'));

  const isSpareNormal = isSparePart && !isSpareStandard && !isSparePremium;

  const isRentStandard =
    isRent &&
    (invoice.layoutId?.includes('standard') ||
      searchStr.includes('standard') ||
      searchStr.includes('standerd')) &&
    !searchStr.includes('premium');

  const isRentPremium =
    isRent && (invoice.layoutId?.includes('premium') || searchStr.includes('premium'));

  const isRentNormal = isRent && !isRentStandard && !isRentPremium;

  const isLeaseStandard =
    isLease &&
    (invoice.layoutId?.includes('standard') ||
      searchStr.includes('standard') ||
      searchStr.includes('standerd')) &&
    !searchStr.includes('premium');

  const isLeasePremium =
    isLease && (invoice.layoutId?.includes('premium') || searchStr.includes('premium'));

  const isLeaseNormal = isLease && !isLeaseStandard && !isLeasePremium;

  const useTemplate = true; // Use the new layouts for everything where possible

  // ── Data mapping for Standard / Premium templates ─────────────────────────
  const templateLineItems = enrichedItems.map((item, idx) => {
    const unitP = item.unitPrice || 0;
    const dStr = item.description || '';
    const extractTag = (tag: string) => {
      const m = dStr.match(new RegExp(`\\[${tag}:(.*?)\\]`));
      return m ? m[1] : '';
    };

    const exBN = extractTag('BN');
    const exMN = extractTag('MN');
    const exPN = extractTag('PN');
    // const exHS = extractTag('HS'); // exHS was unused, removed to fix lint error
    const exDiscMatch = dStr.match(/\[DISC:([\d.]+)\]/);
    const extractedDisc = exDiscMatch ? parseFloat(exDiscMatch[1]) : 0;

    const globalDiscountPerItem =
      idx === 0 && enrichedItems.length === 1 && invoice.discountAmount
        ? invoice.discountAmount
        : 0;

    const disc =
      item.discount !== undefined && item.discount > 0
        ? item.discount
        : item.discountAmount || extractedDisc || globalDiscountPerItem || 0;

    const qty = item.quantity || 1;
    const discountedPrice = unitP - disc;
    const subAmt = qty * discountedPrice;
    const rawDesc =
      item.metadata?.description ||
      item.metadata?.inventory?.[0]?.description ||
      item.description ||
      '';

    const cleanDesc = rawDesc
      .replace(/\[STD\]/g, '')
      .replace(/\[PRM\]/g, '')
      .replace(/\[DISC:.*?\]/g, '')
      .replace(/\[BN:.*?\]/g, '')
      .replace(/\[MN:.*?\]/g, '')
      .replace(/\[PN:.*?\]/g, '')
      .replace(/\[HS:.*?\]/g, '')
      .trim();

    return {
      productName: exPN || item.metadata?.name || item.metadata?.part_name || 'PRODUCT',
      brand: exBN || item.metadata?.brandRelation?.name || item.metadata?.brand || 'Xerocare',
      modelNo: exMN || item.metadata?.model?.model_no || item.metadata?.model_no || 'Generic',
      modelName: item.metadata?.model?.model_name || item.metadata?.model_name || 'N/A',
      slNo: item.allocation?.serialNumber || item.metadata?.serial_no || 'TBD',
      description: cleanDesc,
      qty: qty,
      unitPrice: unitP,
      specialPrice: discountedPrice,
      vat: ((discountedPrice * Number(item.metadata?.tax_rate || 0)) / 100) * qty,
      amount: subAmt,
      productImage: item.metadata?.imageUrl || item.metadata?.image_url || item.metadata?.image,
      discount: disc,
      mpn: item.metadata?.mpn || extractTag('MPN'),
      features: (item.metadata?.features as { subHeading: string; description: string }[]) || [],
      consumables: (item.metadata?.consumables || []).map((c: InternalConsumable) => ({
        partName: c.partName || c.name || '',
        description: c.description || c.model || '',
        yield: c.yield || '',
        price: c.price || '0.00',
      })),
      warranty: item.metadata?.warranty || '',
    };
  });

  const totalBeforeDiscount = templateLineItems.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
  const totalDiscountFromItems = templateLineItems.reduce(
    (acc, it) => acc + it.discount * it.qty,
    0,
  );
  const finalDiscountTotal = Math.max(totalDiscountFromItems, Number(invoice.discountAmount || 0));

  const finalVatTotal = templateLineItems.reduce((acc, it) => acc + (it.vat || 0), 0);
  const netAmount = totalBeforeDiscount - finalDiscountTotal;
  const isVatAlreadyIncluded =
    invoice.totalAmount &&
    Math.abs(Number(invoice.totalAmount) - (netAmount + finalVatTotal)) < 0.05;
  const finalTotalAmount = isVatAlreadyIncluded
    ? Number(invoice.totalAmount)
    : Number(invoice.totalAmount || netAmount) + finalVatTotal;

  const templateTotals = {
    subTotal: isVatAlreadyIncluded
      ? Number(invoice.totalAmount) - finalVatTotal + finalDiscountTotal
      : totalBeforeDiscount,
    discountTotal: finalDiscountTotal,
    vatTotal: finalVatTotal,
    total: finalTotalAmount,
    payment: finalTotalAmount,
    balanceDue: finalTotalAmount,
    paid: ['PAID', 'TRANSACTION_COMPLETED'].includes(invoice.status),
  };

  const templateBillTo = {
    name: invoice.customerName || 'No Customer Assigned',
    address: invoice.customerAddress || 'N/A',
    trn: invoice.customerTrn || 'N/A',
    email: invoice.customerEmail || 'No Customer Assigned',
    phone: invoice.customerPhone || 'No Customer Assigned',
  };

  const templateQuotation = {
    number: invoice.invoiceNumber || '',
    date: new Date(invoice.createdAt).toLocaleDateString('en-GB').replace(/\//g, '/'),
    terms: 'Due on receipt',
    dueDate: invoice.effectiveTo
      ? new Date(invoice.effectiveTo).toLocaleDateString('en-GB').replace(/\//g, '/')
      : '',
    contractStartDate: invoice.effectiveFrom
      ? new Date(invoice.effectiveFrom).toLocaleDateString('en-GB').replace(/\//g, '/')
      : 'TBD',
    contractEndDate: invoice.effectiveTo
      ? new Date(invoice.effectiveTo).toLocaleDateString('en-GB').replace(/\//g, '/')
      : 'TBD',
  };

  const templateProductName =
    enrichedItems
      .map((it) => it.metadata?.name || it.description?.split(' ')[0])
      .filter(Boolean)[0] || 'PRODUCT';
  const templateModelName = enrichedItems[0]?.metadata?.model?.model_name || '';
  const templateShipTo = { ...templateBillTo };

  const rentTemplateLineItems = (invoice.items || [])
    .filter((it) => it.itemType === 'PRODUCT' || !it.itemType)
    .map((item) => {
      let limitStr = 'N/A';
      let excessStr = 'N/A';
      if (invoice.rentType === 'FIXED_COMBO' || invoice.rentType === 'CPC_COMBO') {
        limitStr = `Combined: ${item.combinedIncludedLimit || 0}`;
        excessStr = `Rate: ${Number(item.combinedExcessRate || 0).toFixed(3)}`;
      } else if (invoice.rentType !== 'FIXED_FLAT') {
        limitStr = `BW: ${item.bwIncludedLimit || 0}, Color: ${item.colorIncludedLimit || 0}`;
        excessStr = `BW: ${Number(item.bwExcessRate || 0).toFixed(3)}, Color: ${Number(item.colorExcessRate || 0).toFixed(3)}`;
      }
      const pMeta =
        productDetails[item.productId || ''] || productDetails[item.modelId || ''] || {};
      return {
        productName: pMeta.name || 'PRODUCT',
        brand: pMeta.brandRelation?.name || pMeta.brand || 'Xerocare',
        model: pMeta.model_name || pMeta.model_no || 'Generic',
        modelName: pMeta.model_name || 'N/A',
        modelNo: pMeta.model_no || 'Generic',
        slNo: pMeta.serial_no || item.serialNumber || 'TBD',
        description: pMeta.description || item.description || '',
        features: pMeta.features || [],
        qty: item.quantity || 1,
        limit: limitStr,
        excessRate: excessStr,
        image: pMeta.image || pMeta.imageUrl || '',
        bwSlabs: item.bwSlabRanges || [],
        colorSlabs: item.colorSlabRanges || [],
        comboSlabs: item.comboSlabRanges || [],
      };
    });

  const rentAgreementDetails = {
    rentType: invoice.rentType?.replace(/_/g, ' ') || 'N/A',
    period: invoice.rentPeriod?.replace(/_/g, ' ') || 'MONTHLY',
    advance: invoice.advanceAmount || 0,
    deposit: invoice.securityDepositAmount || 0,
    duration: `${invoice.leaseTenureMonths || 0} Months`,
    monthlyRentAmount: invoice.monthlyRent || 0,
    discountPercent: invoice.discountPercent || 0,
    discountedMonthlyRent: (invoice.monthlyRent || 0) * (1 - (invoice.discountPercent || 0) / 100),
  };

  const rentTaxRate = Number(enrichedItems[0]?.metadata?.tax_rate || 0);
  const rentSubTotal =
    Number(invoice.monthlyRent || 0) ||
    (invoice.items || []).reduce((acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0), 0);
  const rentTaxAmount = (rentSubTotal * rentTaxRate) / 100;
  const rentTotalAmount = rentSubTotal + rentTaxAmount;

  const isFsmLease = invoice.leaseType === 'FSM';
  const leaseTemplateLineItems = (invoice.items || [])
    .filter((it) => it.itemType === 'PRODUCT' || !it.itemType)
    .map((item) => {
      const pMeta =
        productDetails[item.productId || ''] || productDetails[item.modelId || ''] || {};
      let limitStr = 'N/A';
      let excessStr = 'N/A';
      if (isFsmLease) {
        if (invoice.rentType === 'FIXED_COMBO' || invoice.rentType === 'CPC_COMBO') {
          limitStr = `Combined: ${item.combinedIncludedLimit || 0}`;
          excessStr = `Rate: ${Number(item.combinedExcessRate || 0).toFixed(3)}`;
        } else {
          limitStr = `BW: ${item.bwIncludedLimit || 0}, Color: ${item.colorIncludedLimit || 0}`;
          excessStr = `BW: ${Number(item.bwExcessRate || 0).toFixed(3)}, Color: ${Number(item.colorExcessRate || 0).toFixed(3)}`;
        }
      }
      return {
        productName: pMeta.name || 'PRODUCT',
        brand: pMeta.brandRelation?.name || pMeta.brand || 'Xerocare',
        model: pMeta.model_name || 'Generic',
        modelName: pMeta.model_name || 'N/A',
        modelNo: pMeta.model_no || 'Generic',
        slNo: pMeta.serial_no || item.serialNumber || 'TBD',
        description: pMeta.description || item.description || '',
        features: pMeta.features || [],
        qty: item.quantity || 1,
        limit: limitStr,
        excessRate: excessStr,
        rate: String(item.unitPrice || 0),
        bwSlabs: item.bwSlabRanges || [],
        colorSlabs: item.colorSlabRanges || [],
        comboSlabs: item.comboSlabRanges || [],
        productImage: pMeta.imageUrl,
        discount: item.discount || 0,
      };
    });

  const leaseAgreementDetails = {
    leaseType: invoice.leaseType || 'EMI',
    rentType: isFsmLease ? (invoice.rentType || 'FIXED_LIMIT').replace(/_/g, ' ') : undefined,
    rentPeriod: isFsmLease ? (invoice.rentPeriod || 'MONTHLY').replace(/_/g, ' ') : undefined,
    duration: `${invoice.leaseTenureMonths || 0} Months`,
    advance: invoice.advanceAmount || 0,
    deposit: invoice.securityDepositAmount || 0,
    discountPercent: invoice.discountPercent || 0,
    startDate: invoice.effectiveFrom
      ? new Date(invoice.effectiveFrom).toLocaleDateString('en-GB')
      : 'TBD',
    endDate: invoice.effectiveTo
      ? new Date(invoice.effectiveTo).toLocaleDateString('en-GB')
      : 'TBD',
    monthlyEmi: isFsmLease
      ? Number(invoice.monthlyRent || 0)
      : Number(invoice.monthlyEmiAmount || 0),
    totalLeaseValue: isFsmLease
      ? Number(invoice.monthlyLeaseAmount || invoice.totalAmount || 0)
      : Number(invoice.totalAmount || 0),
  };

  const leaseTaxRate = Number(enrichedItems[0]?.metadata?.tax_rate || 0);
  const leaseSubTotal = Number(leaseAgreementDetails.totalLeaseValue || 0);
  const leaseTaxAmount = (leaseSubTotal * leaseTaxRate) / 100;
  const leaseTotalAmount = leaseSubTotal + leaseTaxAmount;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      {isReturnInvoice && !showingOriginalInvoice ? (
        <DialogContent className="sm:max-w-5xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col h-[98vh]">
          <DialogTitle className="sr-only">Return Invoice</DialogTitle>
          <ReturnInvoiceLayout
            invoice={invoice}
            onClose={onClose}
            onViewOriginalInvoice={() => setShowingOriginalInvoice(true)}
          />
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-5xl rounded-none border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col h-[98vh]">
          <DialogTitle className="sr-only">Invoice Document</DialogTitle>
          {(() => {
            if (!invoice.effectiveTo) return null;
            const isContract = invoice.status === 'ACTIVE_CONTRACT' || invoice.status === 'EXPIRED';
            if (!isContract) return null;

            const toDate = new Date(invoice.effectiveTo);
            const today = new Date();
            const isExpired = toDate < today;

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            const isExpiringSoon = toDate <= thirtyDaysFromNow && toDate >= today;

            if (!isExpired && !isExpiringSoon) return null;

            const diffTime = Math.abs(toDate.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return (
              <div
                className={`p-4 flex items-center gap-3 border-b ${
                  isExpired
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-amber-50 border-amber-100 text-amber-700'
                }`}
              >
                {isExpired ? (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {isExpired ? 'Contract Expired' : 'Contract Expiring Soon'}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5 font-medium leading-relaxed">
                    {isExpired
                      ? `This contract expired ${diffDays} days ago on ${toDate.toLocaleDateString()}. Please renew or request validity extension.`
                      : `This contract will expire in ${diffDays} days on ${toDate.toLocaleDateString()}.`}
                  </p>
                </div>
              </div>
            );
          })()}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div
              id="invoice-print-content"
              className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-white"
            >
              {useTemplate ? (
                <div className="flex-1">
                  {isProductNormal && (
                    <ProductNormalQuotation
                      isInvoice={true}
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}
                  {isProductStandard && (
                    <ProductStandardQuotation
                      isInvoice={true}
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}
                  {isProductPremium && (
                    <ProductPremiumQuotation
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}

                  {isSpareNormal && (
                    <SparePartsNormalQuotation
                      isInvoice={true}
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}
                  {isSpareStandard && (
                    <SparePartsStandardQuotation
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}
                  {isSparePremium && (
                    <SparePartsPremiumQuotation
                      productName={templateProductName}
                      modelName={templateModelName}
                      billTo={templateBillTo}
                      shipTo={templateShipTo}
                      quotation={templateQuotation}
                      lineItems={templateLineItems}
                      totals={templateTotals}
                    />
                  )}

                  {isRentNormal && (
                    <RentNormalQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={rentTemplateLineItems}
                      agreementDetails={rentAgreementDetails}
                      totals={{
                        subTotal: rentSubTotal,
                        tax: rentTaxAmount,
                        total: rentTotalAmount,
                      }}
                    />
                  )}
                  {isRentStandard && (
                    <RentStandardQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={rentTemplateLineItems}
                      agreementDetails={rentAgreementDetails}
                      totals={{
                        subTotal: rentSubTotal,
                        tax: rentTaxAmount,
                        total: rentTotalAmount,
                      }}
                    />
                  )}
                  {isRentPremium && (
                    <RentPremiumQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={rentTemplateLineItems}
                      agreementDetails={rentAgreementDetails}
                      totals={{
                        subTotal: rentSubTotal,
                        tax: rentTaxAmount,
                        total: rentTotalAmount,
                      }}
                    />
                  )}

                  {isLeaseNormal && (
                    <LeaseNormalQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={leaseTemplateLineItems}
                      leaseDetails={leaseAgreementDetails}
                      totals={{
                        subTotal: leaseSubTotal,
                        tax: leaseTaxAmount,
                        total: leaseTotalAmount,
                      }}
                    />
                  )}
                  {isLeaseStandard && (
                    <LeaseStandardQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={leaseTemplateLineItems}
                      leaseDetails={leaseAgreementDetails}
                      totals={{
                        subTotal: leaseSubTotal,
                        tax: leaseTaxAmount,
                        total: leaseTotalAmount,
                      }}
                    />
                  )}
                  {isLeasePremium && (
                    <LeasePremiumQuotation
                      billTo={templateBillTo}
                      quotation={templateQuotation}
                      lineItems={leaseTemplateLineItems}
                      leaseDetails={leaseAgreementDetails}
                      totals={{
                        subTotal: leaseSubTotal,
                        tax: leaseTaxAmount,
                        total: leaseTotalAmount,
                      }}
                    />
                  )}
                </div>
              ) : (
                <>
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
                      <h1
                        className="text-5xl font-[900] text-[#D41B22] leading-[0.7] mb-1"
                        dir="rtl"
                      >
                        زيرو كير
                      </h1>
                      <p
                        className="text-[14px] font-black text-[#AAAAAA] tracking-tight mt-2"
                        dir="rtl"
                      >
                        للتجارة والخدمات ذ.م.م
                      </p>
                    </div>
                  </div>

                  <div className="px-12 pb-6 space-y-4 bg-white flex-1 overflow-visible">
                    <div className="flex justify-between items-start pt-1">
                      <div className="space-y-0 text-black">
                        <h3 className="text-[17px] font-black uppercase leading-tight">
                          {invoice.customerName || 'No Customer Assigned'}
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
                                const partName =
                                  detail?.mpn || detail?.sku || item.description || 'N/A';
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
                            detail?.description ||
                            detail?.model?.description ||
                            item.description ||
                            '';
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
                                            productDesc
                                              .split('\n')
                                              .map((line: string, i: number) => {
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
                                                const shouldBeRed =
                                                  isPatternRed || isKeywordRed || isHeader;

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
                                                      className={
                                                        isHeader ? 'underline decoration-black' : ''
                                                      }
                                                    >
                                                      {trimmedLine}
                                                    </span>
                                                  </p>
                                                );
                                              })
                                          ) : (
                                            <p className="flex gap-2">
                                              <span className="text-gray-900 mt-0.5">➤</span>
                                              <span>
                                                Standard specification as per brand guidelines.
                                              </span>
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
                          For any further clarifications please feel free to contact the undersigned
                          on Mob: 70717282 or Email: mail@xerocare.com
                        </p>
                        <div className="space-y-1">
                          <p className="text-[13px] font-bold text-black">With warm regards,</p>
                          <div className="pt-2">
                            <p className="text-[13px] font-black text-black uppercase">For</p>
                            <p className="text-[13px] font-black text-black uppercase">
                              XEROCARE TRADING & SERVICES WLL
                            </p>
                            <p className="text-[13px] font-black text-black uppercase">
                              DOHA QATAR
                            </p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase">
                              Advance / Deposit
                            </p>
                            <p className="text-sm font-black text-black">
                              QAR{' '}
                              {(
                                invoice.advanceAmount ||
                                invoice.securityDepositAmount ||
                                0
                              ).toLocaleString()}
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
                            <p className="text-[10px] font-black text-gray-500 uppercase">
                              Monthly
                            </p>
                            <p className="text-sm font-black text-black">
                              QAR{' '}
                              {(
                                invoice.monthlyRent ||
                                invoice.monthlyLeaseAmount ||
                                0
                              ).toLocaleString()}
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
                </>
              )}
            </div>
            {/* Credit Exchange Details Sidebar */}
            {invoice.creditNotes &&
              showReturnSidebar &&
              invoice.creditNotes.some((cn) => cn.status === 'PRODUCT_REPLACED') && (
                <div className="w-full md:w-[350px] shrink-0 border-t md:border-t-0 md:border-l border-violet-100 bg-violet-50/20 p-6 overflow-y-auto max-h-[45vh] md:max-h-full space-y-6">
                  <div className="flex items-center gap-2 text-violet-700">
                    <RotateCcw className="h-5 w-5" />
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Returns &amp; Exchange
                    </h3>
                  </div>

                  {invoice.creditNotes
                    .filter((cn) => cn.status === 'PRODUCT_REPLACED')
                    .map((cn) => {
                      const variation =
                        (cn.replacementAmount || 0) -
                        cn.productAmount -
                        (cn.replacementDiscount || 0);
                      return (
                        <div key={cn.id} className="space-y-4">
                          <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                              <Badge className="bg-violet-600 text-white border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                                {cn.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-[10px] font-bold text-slate-400">
                                {cn.creditNoteNo}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {/* Returned */}
                              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">
                                  ↩ Returned
                                </p>
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                  {cn.productName}
                                </p>
                                <p className="text-[11px] font-black text-rose-600 mt-1">
                                  {formatCurrency(cn.productAmount)}
                                </p>
                              </div>

                              <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-white p-1 rounded-full border border-violet-100 shadow-sm">
                                  <MoveHorizontal className="h-4 w-4 text-violet-400" />
                                </div>
                              </div>

                              {/* Replacement */}
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                                  ↗ Replacement
                                </p>
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                  {cn.replacementProductName || 'New Product'}
                                </p>
                                <p className="text-[11px] font-black text-emerald-600 mt-1">
                                  {formatCurrency(cn.replacementAmount || 0)}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 font-medium">New Price</span>
                                <span className="font-bold text-slate-700">
                                  {formatCurrency(cn.replacementAmount || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 font-medium">Returned Credit</span>
                                <span className="font-bold text-rose-600">
                                  − {formatCurrency(cn.productAmount)}
                                </span>
                              </div>
                              {cn.replacementDiscount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500 font-medium">
                                    Exchange Discount
                                  </span>
                                  <span className="font-bold text-rose-500">
                                    − {formatCurrency(cn.replacementDiscount)}
                                  </span>
                                </div>
                              )}
                              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-violet-600 uppercase">
                                  Net Variation
                                </span>
                                <span
                                  className={`text-sm font-black ${variation >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                                >
                                  {variation >= 0 ? '+' : ''}
                                  {formatCurrency(variation)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  <div className="h-px bg-violet-100 my-4" />
                  <AuditTimeline entityId={invoice.id} />
                </div>
              )}

            {canViewTimeline &&
              (!invoice.creditNotes ||
                !invoice.creditNotes.some((cn) => cn.status === 'PRODUCT_REPLACED')) && (
                <div className="w-full md:w-[350px] shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-slate-50/50 p-6 overflow-y-auto max-h-[35vh] md:max-h-full">
                  <AuditTimeline entityId={invoice.id} />
                </div>
              )}
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
              {isReturnInvoice && showingOriginalInvoice && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowingOriginalInvoice(false)}
                    className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 font-black text-[11px] uppercase tracking-widest"
                  >
                    <RotateCcw size={13} />
                    Back to Return Invoice
                  </Button>
                  <Button
                    variant={showReturnSidebar ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowReturnSidebar(!showReturnSidebar)}
                    className={`gap-2 font-black text-[11px] uppercase tracking-widest ${
                      showReturnSidebar
                        ? 'bg-violet-600 text-white hover:bg-violet-700 border-none'
                        : 'border-violet-200 text-violet-700 hover:bg-violet-50'
                    }`}
                  >
                    <RotateCcw size={13} className={showReturnSidebar ? 'animate-spin-once' : ''} />
                    {showReturnSidebar ? 'Hide Return Details' : 'Show Return Details'}
                  </Button>
                </div>
              )}
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
              {/* Distribution Buttons */}
              {showDistribution && (
                <div className="flex gap-2 border-l border-slate-200 pl-4 ml-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSendCustomer('EMAIL')}
                    disabled={isSendingCustomer}
                    className="h-9 px-4 rounded-md font-black uppercase text-[10px] tracking-widest border-red-200 text-red-700 hover:bg-red-50 gap-2"
                  >
                    <Mail size={14} /> Gmail
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendCustomer('WHATSAPP')}
                    disabled={isSendingCustomer}
                    className="h-9 px-4 rounded-md font-black uppercase text-[10px] tracking-widest border-green-200 text-emerald-700 hover:bg-green-50 gap-2"
                  >
                    <Phone size={14} /> WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
