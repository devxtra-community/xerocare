'use client';

import React, { useEffect, useState } from 'react';
import { getProductById } from '@/lib/product';
import { Invoice, sendEmailNotification, sendWhatsappNotification } from '@/lib/invoice';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Converts CN-2026-00001 → RTN-INV-0001 */
function formatReturnInvoiceNumber(creditNoteNo: string): string {
  const match = creditNoteNo?.match(/(\d+)$/);
  if (!match) return `RTN-INV-${creditNoteNo}`;
  const num = parseInt(match[1], 10);
  return `RTN-INV-${String(num).padStart(4, '0')}`;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function typeLabel(type: string): string {
  switch (type) {
    case 'REPLACEMENT':
      return 'Product Replacement';
    case 'CREDIT_EXCHANGE':
      return 'Credit Exchange';
    case 'DIRECT_REFUND':
      return 'Direct Cash Refund / Credit';
    default:
      return type.replace(/_/g, ' ');
  }
}

// ── Shared inline style constants (match normal quotation) ────────────────────
const FONT: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
};

const ACCENT = '#000000';

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '3px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '300',
  color: '#1a1a1a',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '300',
  color: ACCENT,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid #e0e0e0',
  paddingBottom: '5px',
  marginBottom: '10px',
};

// ── Component ──────────────────────────────────────────────────────────────────

interface ReturnInvoiceLayoutProps {
  invoice: Invoice;
  onViewOriginalInvoice: () => void;
  onClose: () => void;
}

export default function ReturnInvoiceLayout({
  invoice,
  onViewOriginalInvoice,
  onClose,
}: ReturnInvoiceLayoutProps) {
  const [replacementProductImage, setReplacementProductImage] = useState<string | null>(null);
  const [returnedProductImage, setReturnedProductImage] = useState<string | null>(null);
  const [replacementProductDesc, setReplacementProductDesc] = useState<string | null>(null);
  const [returnedProductDesc, setReturnedProductDesc] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Find the primary credit note (PRODUCT_REPLACED)
  const creditNote = invoice.creditNotes?.find((cn) => cn.status === 'PRODUCT_REPLACED');

  const returnInvoiceNo = creditNote
    ? formatReturnInvoiceNumber(creditNote.creditNoteNo)
    : 'RTN-INV-0000';
  const isReplacement =
    creditNote?.type === 'REPLACEMENT' || creditNote?.type === 'CREDIT_EXCHANGE';
  const isDirectRefund = creditNote?.type === 'DIRECT_REFUND';

  const netVariation = isReplacement
    ? (creditNote?.replacementAmount || 0) -
      (creditNote?.productAmount || 0) -
      (creditNote?.replacementDiscount || 0)
    : 0;

  const returnDate = formatDate(creditNote?.createdAt || invoice.createdAt);
  const soldDate = formatDate(invoice.createdAt);

  // ── Fetch product images ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchDetails = async () => {
      const returnedItem = invoice.items?.[0];
      if (returnedItem?.productId) {
        try {
          const p = await getProductById(returnedItem.productId).catch(() => null);
          if (p) {
            setReturnedProductImage((p as { imageUrl?: string }).imageUrl || null);
            setReturnedProductDesc((p as { description?: string }).description || null);
          }
        } catch {
          /* silent */
        }
      }
      if (creditNote?.replacementProductId) {
        try {
          const p = await getProductById(creditNote.replacementProductId).catch(() => null);
          if (p) {
            setReplacementProductImage((p as { imageUrl?: string }).imageUrl || null);
            setReplacementProductDesc((p as { description?: string }).description || null);
          }
        } catch {
          /* silent */
        }
      }
    };
    fetchDetails();
  }, [creditNote?.replacementProductId, invoice.id]);

  if (!creditNote) return null;

  // ── PDF + Send helper (same pattern as InvoiceViewDialog) ────────────────
  const handleSendCustomer = async (type: 'EMAIL' | 'WHATSAPP') => {
    setIsSending(true);
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
          filename: `ReturnInvoice-${returnInvoiceNo}.pdf`,
          content: base64Data,
          encoding: 'base64',
        },
      ];

      if (type === 'EMAIL') {
        if (!invoice.customerEmail) throw new Error('Customer email is missing');
        await sendEmailNotification(invoice.id, {
          recipient: invoice.customerEmail,
          subject: `Return Invoice — ${returnInvoiceNo}`,
          body: `<p>Dear ${invoice.customerName || 'Customer'},</p><p>Please find attached your Return Invoice <strong>${returnInvoiceNo}</strong> from Xerocare Trading &amp; Services W.L.L.</p>`,
          attachments,
        });
        toast.success('Return invoice sent via Gmail successfully');
      } else {
        if (!invoice.customerPhone) throw new Error('Customer phone is missing');
        await sendWhatsappNotification(invoice.id, {
          recipient: invoice.customerPhone,
          body: `Your return invoice ${returnInvoiceNo} from Xerocare is ready. Please find the document attached.`,
          attachments,
        });
        toast.success('Return invoice sent via WhatsApp successfully');
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Failed to send: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // ── Logo path same as normal quotation ────────────────────────────────────
  const logoPath =
    '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* ════════════════════════════════════════════════════════════════
          SCROLLABLE DOCUMENT BODY
          ════════════════════════════════════════════════════════════════ */}
      <div id="invoice-print-content" style={{ flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            ...FONT,
            backgroundColor: '#ffffff',
            width: '794px',
            minHeight: '1122px',
            margin: '0 auto',
            padding: '50px 40px',
            color: '#1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* ── TITLE ─────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: '300',
                color: ACCENT,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {isDirectRefund ? 'Credit Note' : 'Return Invoice'}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '300',
                color: '#888',
                letterSpacing: '1px',
                marginTop: '4px',
                textTransform: 'uppercase',
              }}
            >
              {typeLabel(creditNote.type)}
            </div>
          </div>

          {/* ── HEADER: Company Info + Logo ────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <div
                style={{ fontSize: '17px', fontWeight: '300', color: ACCENT, marginBottom: '6px' }}
              >
                Xerocare Trading &amp; Services W.L.L
              </div>
              <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.5' }}>
                <div>P.O.BOX 37494, DOHA-QATAR</div>
                <div>Mobile: +974 7071 7282</div>
                <div>Email: mail@xerocare.com</div>
              </div>
            </div>
            <div
              style={{
                width: '160px',
                height: '75px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <img
                src={logoPath}
                alt="Xerocare"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* ── BILL TO + INVOICE META ─────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '24px',
              borderTop: `1px solid ${ACCENT}`,
              paddingTop: '18px',
            }}
          >
            {/* Bill To */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '300',
                  color: ACCENT,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Bill To
              </div>
              <div style={{ fontSize: '14px', fontWeight: '300', marginBottom: '4px' }}>
                {invoice.customerName || 'N/A'}
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
                {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
                {invoice.customerPhone && <div>{invoice.customerPhone}</div>}
                {invoice.customerAddress && (
                  <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>
                    {invoice.customerAddress}
                  </div>
                )}
              </div>
              {invoice.customerTrn && (
                <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                  TRN: {invoice.customerTrn}
                </div>
              )}
            </div>

            {/* Invoice Meta */}
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
            >
              <div style={{ width: '250px' }}>
                {[
                  { label: 'Return Invoice No :', value: returnInvoiceNo },
                  { label: 'Credit Note Ref :', value: creditNote.creditNoteNo },
                  { label: 'Original Invoice :', value: invoice.invoiceNumber },
                  { label: 'Sale Date :', value: soldDate },
                  { label: 'Return Date :', value: returnDate },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#555' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '300' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SUBJECT LINE ──────────────────────────────────────────── */}
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                backgroundColor: 'transparent',
                color: '#000000',
                padding: '6px 20px',
                border: '1px solid #000000',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '300',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Sub: {isDirectRefund ? 'Credit Note for' : 'Return &amp; Replacement — '}
              {creditNote.productName}
            </div>
          </div>

          {/* ── INTRO TEXT ────────────────────────────────────────────── */}
          <div
            style={{
              marginBottom: '18px',
              padding: '0 5px',
              color: '#333',
              fontSize: '12.5px',
              lineHeight: '1.4',
            }}
          >
            <div style={{ marginBottom: '2px' }}>Dear Sir,</div>
            <div>
              {isDirectRefund
                ? 'This document confirms the return of the product and issuance of a direct credit/refund as detailed below.'
                : 'This document confirms the return of the original product and its replacement as detailed below. Please find the complete transaction summary.'}
            </div>
          </div>

          {/* ── RETURN REASON SECTION ─────────────────────────────────── */}
          {(creditNote.notes || creditNote.damageReason || creditNote.financeNote) && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                padding: '10px 18px',
                borderRadius: '8px',
                marginBottom: '18px',
                border: '1px solid #eee',
              }}
            >
              <div style={sectionTitleStyle}>Return Reason</div>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}
              >
                {creditNote.paymentMode && (
                  <div>
                    <div style={labelStyle}>Settlement Method</div>
                    <div style={{ ...valueStyle, fontWeight: '600', color: '#4f46e5' }}>
                      {creditNote.paymentMode.replace('_', ' ')}
                    </div>
                  </div>
                )}
                {creditNote.damageReason && (
                  <div>
                    <div style={labelStyle}>Damage / Defect Reason</div>
                    <div style={valueStyle}>{creditNote.damageReason}</div>
                  </div>
                )}
                {creditNote.notes && (
                  <div>
                    <div style={labelStyle}>Return Notes</div>
                    <div style={valueStyle}>{creditNote.notes}</div>
                  </div>
                )}
                {creditNote.financeNote && (
                  <div>
                    <div style={labelStyle}>Finance Note</div>
                    <div style={valueStyle}>{creditNote.financeNote}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RETURNED PRODUCT DETAILS ──────────────────────────────── */}
          <div
            style={{
              backgroundColor: '#f9f9f9',
              padding: '10px 18px',
              borderRadius: '8px',
              marginBottom: '18px',
              border: '1px solid #eee',
            }}
          >
            <div style={sectionTitleStyle}>Returned Product Details</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: returnedProductImage ? '1fr auto' : '1fr',
                gap: '16px',
                alignItems: 'start',
              }}
            >
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 24px' }}
              >
                <div>
                  <div style={labelStyle}>Brand</div>
                  <div style={valueStyle}>{creditNote.brand || 'N/A'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Product Name</div>
                  <div style={valueStyle}>{creditNote.productName || 'N/A'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Model Name</div>
                  <div style={valueStyle}>{creditNote.modelName || 'N/A'}</div>
                </div>
                {creditNote.serialNumber && (
                  <div>
                    <div style={labelStyle}>Serial Number</div>
                    <div style={valueStyle}>{creditNote.serialNumber}</div>
                  </div>
                )}
                <div>
                  <div style={labelStyle}>Original Sale Amount</div>
                  <div style={{ ...valueStyle, fontWeight: '600' }}>
                    QAR {fmt(creditNote.productAmount)}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Credit Issued</div>
                  <div style={{ ...valueStyle, fontWeight: '600' }}>
                    − QAR {fmt(creditNote.productAmount)}
                  </div>
                </div>
                {returnedProductDesc && (
                  <div style={{ gridColumn: 'span 3', marginTop: '4px' }}>
                    <div style={labelStyle}>Description</div>
                    <div
                      style={{ ...valueStyle, fontSize: '11px', lineHeight: '1.5', color: '#666' }}
                      dangerouslySetInnerHTML={{ __html: returnedProductDesc }}
                    />
                  </div>
                )}
              </div>
              {returnedProductImage && (
                <div
                  style={{
                    width: '140px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    background: '#fff',
                    padding: '6px',
                  }}
                >
                  <img
                    src={returnedProductImage}
                    alt="Returned product"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── REPLACEMENT PRODUCT DETAILS (if applicable) ───────────── */}
          {isReplacement && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                padding: '10px 18px',
                borderRadius: '8px',
                marginBottom: '18px',
                border: '1px solid #eee',
              }}
            >
              <div style={sectionTitleStyle}>
                {creditNote.type === 'CREDIT_EXCHANGE'
                  ? 'Exchange Product Details'
                  : 'Replacement Product Details'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: replacementProductImage ? '1fr auto' : '1fr',
                  gap: '16px',
                  alignItems: 'start',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px 24px',
                  }}
                >
                  <div>
                    <div style={labelStyle}>Brand</div>
                    <div style={valueStyle}>{creditNote.brand || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Product Name</div>
                    <div style={valueStyle}>{creditNote.replacementProductName || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Model Name</div>
                    <div style={valueStyle}>{creditNote.modelName || 'N/A'}</div>
                  </div>
                  {creditNote.replacementSerialNumber && (
                    <div>
                      <div style={labelStyle}>Serial Number</div>
                      <div style={valueStyle}>{creditNote.replacementSerialNumber}</div>
                    </div>
                  )}
                  <div>
                    <div style={labelStyle}>New Product Price</div>
                    <div style={{ ...valueStyle, fontWeight: '600' }}>
                      QAR {fmt(creditNote.replacementAmount || 0)}
                    </div>
                  </div>
                  {(creditNote.replacementDiscount || 0) > 0 && (
                    <div>
                      <div style={labelStyle}>Exchange Discount</div>
                      <div style={{ ...valueStyle, fontWeight: '600' }}>
                        − QAR {fmt(creditNote.replacementDiscount)}
                      </div>
                    </div>
                  )}
                  {replacementProductDesc && (
                    <div style={{ gridColumn: 'span 3', marginTop: '4px' }}>
                      <div style={labelStyle}>Description</div>
                      <div
                        style={{
                          ...valueStyle,
                          fontSize: '11px',
                          lineHeight: '1.5',
                          color: '#666',
                        }}
                        dangerouslySetInnerHTML={{ __html: replacementProductDesc }}
                      />
                    </div>
                  )}
                </div>
                {/* Product image */}
                <div
                  style={{
                    width: '140px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    background: '#fff',
                    padding: '6px',
                  }}
                >
                  {replacementProductImage ? (
                    <img
                      src={replacementProductImage}
                      alt="Replacement product"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#ccc',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      No Image
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCIAL SUMMARY TABLE ───────────────────────────────── */}
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '300',
                color: ACCENT,
                textTransform: 'uppercase',
                paddingBottom: '5px',
                marginBottom: '10px',
              }}
            >
              Financial Summary
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'transparent', color: '#000' }}>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: '300',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: '300',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    Amount (QAR)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 10px', fontSize: '12px', fontWeight: '300' }}>
                    Returned Product — {creditNote.productName}
                  </td>
                  <td
                    style={{
                      padding: '10px 10px',
                      fontSize: '12px',
                      fontWeight: '300',
                      textAlign: 'right',
                    }}
                  >
                    {fmt(creditNote.productAmount)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f7f7f7', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 10px', fontSize: '12px', fontWeight: '300' }}>
                    Credit Applied (Returned Product Value)
                  </td>
                  <td
                    style={{
                      padding: '10px 10px',
                      fontSize: '12px',
                      fontWeight: '300',
                      textAlign: 'right',
                    }}
                  >
                    − {fmt(creditNote.productAmount)}
                  </td>
                </tr>
                {isReplacement && (
                  <>
                    <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 10px', fontSize: '12px', fontWeight: '300' }}>
                        {creditNote.type === 'CREDIT_EXCHANGE' ? 'Exchange' : 'Replacement'} Product
                        — {creditNote.replacementProductName}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontSize: '12px',
                          fontWeight: '300',
                          textAlign: 'right',
                        }}
                      >
                        {fmt(creditNote.replacementAmount || 0)}
                      </td>
                    </tr>
                    {(creditNote.replacementDiscount || 0) > 0 && (
                      <tr style={{ backgroundColor: '#f7f7f7', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 10px', fontSize: '12px', fontWeight: '300' }}>
                          Exchange Discount Applied
                        </td>
                        <td
                          style={{
                            padding: '10px 10px',
                            fontSize: '12px',
                            fontWeight: '300',
                            textAlign: 'right',
                          }}
                        >
                          − {fmt(creditNote.replacementDiscount)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>

            {/* Totals block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <div style={{ width: '280px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '300' }}>
                    Returned Credit
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '300' }}>
                    − QAR {fmt(creditNote.productAmount)}
                  </span>
                </div>
                {isReplacement && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: `1px solid ${ACCENT}`,
                    }}
                  >
                    <span
                      style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '300' }}
                    >
                      New Product Price
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '300' }}>
                      QAR {fmt(creditNote.replacementAmount || 0)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    fontWeight: '300',
                  }}
                >
                  <span style={{ fontSize: '13px', textTransform: 'uppercase' }}>
                    {isReplacement
                      ? netVariation > 0
                        ? 'Balance Due from Customer'
                        : netVariation < 0
                          ? 'Credit to Customer'
                          : 'Net Balance'
                      : 'Total Credit Issued'}
                  </span>
                  <span style={{ fontSize: '15px', color: ACCENT, fontWeight: '300' }}>
                    QAR {fmt(isReplacement ? Math.abs(netVariation) : creditNote.productAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── TERMS AND CONDITIONS ──────────────────────────────────── */}
          <div style={{ marginTop: '24px', marginBottom: '32px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '300',
                color: ACCENT,
                textTransform: 'uppercase',
                paddingBottom: '5px',
                marginBottom: '12px',
              }}
            >
              Terms and Conditions
            </div>
            <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>
              <div>
                1. This return / credit note is valid only with authorization from Xerocare
                management.
              </div>
              <div>2. Returned products must be in original condition unless otherwise stated.</div>
              <div>
                3. Credit or replacement is subject to product inspection and serial number
                verification.
              </div>
              <div>4. For queries contact us at mob: 70717282 or email: mail@xerocare.com</div>
            </div>
          </div>

          {/* ── CONTACT & CLOSING NOTE ────────────────────────────────── */}
          <div style={{ fontSize: '12px', marginBottom: '32px', lineHeight: '1.6', color: '#333' }}>
            <div style={{ marginBottom: '15px' }}>
              For any further clarifications please feel free to contact the undersigned on{' '}
              <span style={{ color: ACCENT }}>mob: 70717282</span> or{' '}
              <span style={{ color: ACCENT }}>email: mail@xerocare.com</span>
            </div>
            <div style={{ marginTop: '10px' }}>
              With warm regards,
              <br />
              <div style={{ display: 'block', marginTop: '4px', color: ACCENT }}>
                For
                <br />
                Xerocare Trading &amp; Services WLL
              </div>
              DOHA QATAR
            </div>
          </div>

          {/* ── SIGNATURES ───────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              marginTop: '16px',
            }}
          >
            {['Prepared By', 'Authorized By', 'Customer Acknowledgement'].map((label) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    height: '48px',
                    borderBottom: '1px solid #bbb',
                    marginBottom: '8px',
                  }}
                />
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '300',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── FOOTER DIVIDER ────────────────────────────────────────── */}
          <div
            style={{
              borderTop: '2px solid #000',
              marginTop: '40px',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: '300', textTransform: 'uppercase' }}>
                Xerocare Trading &amp; Services W.L.L
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>Doha, Qatar</div>
            </div>
            <div style={{ fontSize: '11px', color: '#777', textAlign: 'right', lineHeight: '1.6' }}>
              <div>mail@xerocare.com</div>
              <div>+974 7071 7282</div>
              <div>www.xerocare.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          FIXED FOOTER ACTIONS
          ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Left: Close */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="font-black text-[11px] uppercase tracking-widest text-slate-500"
        >
          Close
        </Button>

        {/* Right: View Original + Send buttons */}
        <div className="flex items-center gap-2">
          {/* View Original */}
          <Button
            variant="outline"
            size="sm"
            onClick={onViewOriginalInvoice}
            className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest"
          >
            View Original Sale Invoice
          </Button>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }} />

          {/* Gmail */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendCustomer('EMAIL')}
            disabled={isSending || !invoice.customerEmail}
            title={invoice.customerEmail ? `Send to ${invoice.customerEmail}` : 'No customer email'}
            className="h-9 px-4 rounded-md font-black uppercase text-[10px] tracking-widest border-red-200 text-red-700 hover:bg-red-50 gap-2"
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Gmail
          </Button>

          {/* WhatsApp */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendCustomer('WHATSAPP')}
            disabled={isSending || !invoice.customerPhone}
            title={invoice.customerPhone ? `Send to ${invoice.customerPhone}` : 'No customer phone'}
            className="h-9 px-4 rounded-md font-black uppercase text-[10px] tracking-widest border-green-200 text-emerald-700 hover:bg-green-50 gap-2"
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
