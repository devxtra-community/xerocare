'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Download, Mail, MessageCircle, Printer, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { sendTaxDocumentEmail } from '@/lib/finance/accountsApi';
import type {
  OutputTaxRow,
  InputTaxLocalRow,
  InputTaxInternationalRow,
} from '@/lib/finance/accountsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchInfo {
  name: string;
  address?: string;
  tax_registration_number?: string;
  country?: string;
  currency?: string;
}

type DialogData =
  | { type: 'output'; row: OutputTaxRow }
  | { type: 'local'; row: InputTaxLocalRow }
  | { type: 'international'; row: InputTaxInternationalRow };

interface TaxDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DialogData;
  branch: BranchInfo;
}

// ─── Design Tokens (Normal Quotation style) ───────────────────────────────────

const ACCENT = '#000000';
const TEXT_MUTED = '#555555';
const TEXT_LIGHT = '#888888';
const LOGO_SRC =
  '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png';

// ─── Shared Styles ────────────────────────────────────────────────────────────

const docStyle: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  fontSize: 13,
  color: '#1a1a1a',
  background: '#ffffff',
  padding: '50px 48px',
  width: '100%',
  boxSizing: 'border-box',
};

const thStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: 300,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: ACCENT,
  borderTop: `1px solid ${ACCENT}`,
  borderBottom: `1px solid ${ACCENT}`,
});

const tdStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  fontSize: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
});

// ─── Utility Components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = status === 'FILED' ? '#065f46' : status === 'RECORDED' ? '#1e40af' : '#92400e';
  const bg = status === 'FILED' ? '#d1fae5' : status === 'RECORDED' ? '#dbeafe' : '#fef3c7';
  return (
    <span
      style={{
        background: bg,
        color,
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
      }}
    >
      {status}
    </span>
  );
}

const fmt = (n?: number | null, currency?: string) =>
  n != null ? formatCurrency(n, currency) : '—';

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

// ─── Shared Doc Header ────────────────────────────────────────────────────────

function DocHeader({
  branch,
  title,
  subtitle,
}: {
  branch: BranchInfo;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      {/* Centered document title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Company info (left) + Logo (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 300, color: ACCENT, marginBottom: 6 }}>
            {branch.name}
          </div>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            {branch.address && <div>{branch.address}</div>}
            {branch.tax_registration_number && <div>TRN: {branch.tax_registration_number}</div>}
            {branch.country && <div>{branch.country}</div>}
          </div>
        </div>
        <div
          style={{
            width: 160,
            height: 75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <img
            src={LOGO_SRC}
            alt="Xerocare"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Shared Doc Footer ────────────────────────────────────────────────────────

function DocFooter({ branch }: { branch: BranchInfo }) {
  return (
    <div
      style={{
        borderTop: `1px solid ${ACCENT}`,
        paddingTop: 14,
        marginTop: 40,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#666',
      }}
    >
      <div>www.xerocare.com</div>
      <div>{branch.address ?? 'Doha, Qatar'}</div>
      <div>mail@xerocare.com | +974 7071 7282</div>
    </div>
  );
}

// ─── Totals Block ─────────────────────────────────────────────────────────────

function TotalsBlock({ rows }: { rows: { label: string; value: string; bold?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
      <div style={{ width: 280 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: row.bold ? `1px solid ${ACCENT}` : '1px solid #f0f0f0',
            }}
          >
            <span
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: row.bold ? 14 : 12,
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Document Layouts ─────────────────────────────────────────────────────────

function OutputTaxDocument({ row, branch }: { row: OutputTaxRow; branch: BranchInfo }) {
  return (
    <div style={docStyle}>
      <DocHeader branch={branch} title="Tax Invoice" />

      {/* Bill To (left) + Invoice meta (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: 18,
          marginBottom: 28,
        }}
      >
        {/* Bill To */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Bill To
          </div>
          <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>
            {row.customerName ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            {row.customerVatNumber && <div>TRN: {row.customerVatNumber}</div>}
            {row.customerCountry && (
              <div>
                {row.customerCountry}
                {row.customerStateProvince ? `, ${row.customerStateProvince}` : ''}
                {row.customerCity ? `, ${row.customerCity}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Invoice meta */}
        <div style={{ width: 230 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 300, color: '#111' }}>Invoice No :</span>
            <span style={{ fontSize: 13, fontWeight: 300 }}>{row.invoiceNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Date :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{fmtDate(row.invoiceDate)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={row.status} />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Invoice Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: 'transparent' }}>
              <th style={{ ...thStyle('left'), width: '40%' }}>Description</th>
              <th style={thStyle('right')}>Taxable Amount</th>
              <th style={thStyle('center')}>{row.taxName ?? 'VAT'} %</th>
              <th style={thStyle('right')}>Tax Amount</th>
              <th style={thStyle('right')}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#fff' }}>
              <td style={tdStyle('left')}>Goods / Services</td>
              <td style={tdStyle('right')}>{fmt(row.taxableAmount, row.currencyCode)}</td>
              <td style={tdStyle('center')}>
                {row.taxPercent != null ? `${row.taxPercent}%` : '—'}
              </td>
              <td style={tdStyle('right')}>{fmt(row.outputVat, row.currencyCode)}</td>
              <td style={tdStyle('right')}>{fmt(row.totalInvoice, row.currencyCode)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <TotalsBlock
        rows={[
          { label: 'Taxable Amount', value: fmt(row.taxableAmount, row.currencyCode) },
          {
            label: `${row.taxName ?? 'VAT'} (${row.taxPercent ?? 0}%)`,
            value: fmt(row.outputVat, row.currencyCode),
          },
          {
            label: 'Total Invoice Amount',
            value: fmt(row.totalInvoice, row.currencyCode),
            bold: true,
          },
        ]}
      />

      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: TEXT_LIGHT,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        This is a computer-generated Tax Invoice. No signature required.
      </div>

      <DocFooter branch={branch} />
    </div>
  );
}

function InputLocalDocument({ row, branch }: { row: InputTaxLocalRow; branch: BranchInfo }) {
  return (
    <div style={docStyle}>
      <DocHeader branch={branch} title="Purchase Tax Record" />

      {/* Vendor (left) + Purchase meta (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: 18,
          marginBottom: 28,
        }}
      >
        {/* Vendor info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Vendor
          </div>
          <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>{row.vendorName}</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            {row.vendorVatNumber && <div>TRN: {row.vendorVatNumber}</div>}
            {row.vendorCountry && <div>{row.vendorCountry}</div>}
          </div>
        </div>

        {/* Purchase meta */}
        <div style={{ width: 230 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Date :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{fmtDate(row.invoiceDate)}</span>
          </div>
          {row.branch && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Branch :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.branch}</span>
            </div>
          )}
          {row.purchaseCategory && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Category :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.purchaseCategory}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>VAT Claimable :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{row.vatClaimable ? 'Yes' : 'No'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={row.taxStatus} />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Purchase Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: 'transparent' }}>
              <th style={{ ...thStyle('left'), width: '40%' }}>Category</th>
              <th style={thStyle('right')}>Taxable Amount</th>
              <th style={thStyle('center')}>{row.taxName ?? 'VAT'} %</th>
              <th style={thStyle('right')}>Input VAT</th>
              <th style={thStyle('right')}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#fff' }}>
              <td style={tdStyle('left')}>{row.purchaseCategory ?? 'Purchase'}</td>
              <td style={tdStyle('right')}>{fmt(row.taxableAmount, row.currencyCode)}</td>
              <td style={tdStyle('center')}>
                {row.taxPercent != null ? `${row.taxPercent}%` : '—'}
              </td>
              <td style={tdStyle('right')}>{fmt(row.inputVatAmount, row.currencyCode)}</td>
              <td style={tdStyle('right')}>{fmt(row.totalAmount, row.currencyCode)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <TotalsBlock
        rows={[
          { label: 'Taxable Amount', value: fmt(row.taxableAmount, row.currencyCode) },
          {
            label: `${row.taxName ?? 'Input VAT'} (${row.taxPercent ?? 0}%)`,
            value: fmt(row.inputVatAmount, row.currencyCode),
          },
          { label: 'Total Amount', value: fmt(row.totalAmount, row.currencyCode), bold: true },
        ]}
      />

      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: TEXT_LIGHT,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Computer-generated Purchase Tax Record for internal VAT reporting purposes.
      </div>

      <DocFooter branch={branch} />
    </div>
  );
}

function InputIntlDocument({ row, branch }: { row: InputTaxInternationalRow; branch: BranchInfo }) {
  const totalAmount =
    (row.taxableAmount ?? 0) + (row.customsDuty ?? 0) + (row.importVatReverseCharge ?? 0);
  return (
    <div style={docStyle}>
      <DocHeader branch={branch} title="Self-Billed Tax Invoice" subtitle="(Reverse Charge)" />

      {/* Supplier (left) + Import meta (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: 18,
          marginBottom: 28,
        }}
      >
        {/* Supplier info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Supplier
          </div>
          <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>{row.supplierName}</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            {row.supplierVatNumber && <div>VAT No: {row.supplierVatNumber}</div>}
            {row.supplierCountry && <div>{row.supplierCountry}</div>}
          </div>
        </div>

        {/* Import meta */}
        <div style={{ width: 230 }}>
          {row.importInvoiceNo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Import Invoice :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.importInvoiceNo}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Date :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{fmtDate(row.invoiceDate)}</span>
          </div>
          {row.importCountry && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Import Country :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.importCountry}</span>
            </div>
          )}
          {row.customsEntryNo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Customs Entry :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.customsEntryNo}</span>
            </div>
          )}
          {row.exchangeRate != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Exchange Rate :</span>
              <span style={{ fontSize: 12, fontWeight: 300 }}>{row.exchangeRate}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>VAT Claimable :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{row.vatClaimable ? 'Yes' : 'No'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={row.taxStatus} />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Import Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: 'transparent' }}>
              <th style={{ ...thStyle('left'), width: '40%' }}>Goods / Service</th>
              <th style={thStyle('right')}>Taxable Amount</th>
              <th style={thStyle('right')}>Customs Duty</th>
              <th style={thStyle('right')}>Reverse Charge VAT</th>
              <th style={thStyle('right')}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#fff' }}>
              <td style={tdStyle('left')}>{row.goodsOrService ?? 'Import'}</td>
              <td style={tdStyle('right')}>{fmt(row.taxableAmount, row.currencyCode)}</td>
              <td style={tdStyle('right')}>{fmt(row.customsDuty, row.currencyCode)}</td>
              <td style={tdStyle('right')}>{fmt(row.importVatReverseCharge, row.currencyCode)}</td>
              <td style={tdStyle('right')}>{fmt(totalAmount, row.currencyCode)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <TotalsBlock
        rows={[
          { label: 'Taxable Amount', value: fmt(row.taxableAmount, row.currencyCode) },
          { label: 'Customs Duty', value: fmt(row.customsDuty, row.currencyCode) },
          {
            label: `Reverse Charge VAT${row.taxPercent != null ? ` (${row.taxPercent}%)` : ''}`,
            value: fmt(row.importVatReverseCharge, row.currencyCode),
          },
          { label: 'Total', value: fmt(totalAmount, row.currencyCode), bold: true },
        ]}
      />

      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: TEXT_LIGHT,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Self-billed under the Reverse Charge Mechanism. VAT declared by the recipient ({branch.name}
        ).
      </div>

      <DocFooter branch={branch} />
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function TaxDocumentDialog({
  open,
  onOpenChange,
  data,
  branch,
}: TaxDocumentDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sending, setSending] = useState(false);

  const docId =
    data.type === 'output'
      ? data.row.invoiceNumber
      : data.type === 'local'
        ? (data.row as InputTaxLocalRow).id
        : (data.row as InputTaxInternationalRow).id;

  const docTitle =
    data.type === 'output'
      ? 'TAX INVOICE'
      : data.type === 'local'
        ? 'PURCHASE TAX RECORD'
        : 'SELF-BILLED TAX INVOICE (REVERSE CHARGE)';

  const currency =
    data.type === 'output'
      ? data.row.currencyCode
      : data.type === 'local'
        ? (data.row as InputTaxLocalRow).currencyCode
        : (data.row as InputTaxInternationalRow).currencyCode;

  const generatePdf = async () => {
    const element = printRef.current;
    if (!element) throw new Error('Document not found');

    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');

    const TARGET_WIDTH = 900;
    const orig = element.getAttribute('style') || '';
    element.setAttribute(
      'style',
      `${orig}; width:${TARGET_WIDTH}px !important; max-width:${TARGET_WIDTH}px !important; overflow:visible !important;`,
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
      element.setAttribute('style', orig);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const totalH = pdfW * (imgProps.height / imgProps.width);
    let rem = totalH;
    let pos = 0;
    while (rem > 0) {
      pdf.addImage(
        dataUrl,
        'PNG',
        0,
        pos === 0 ? 0 : -(totalH - rem),
        pdfW,
        totalH,
        undefined,
        'FAST',
      );
      rem -= pdfH;
      pos += pdfH;
      if (rem > 0) pdf.addPage();
    }
    return pdf;
  };

  const handleDownload = async () => {
    setSending(true);
    try {
      const pdf = await generatePdf();
      pdf.save(`${docTitle.replace(/[^A-Z0-9]/gi, '_')}_${docId}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>${docTitle}</title><style>*{box-sizing:border-box;}body{margin:0;padding:0;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>`,
    );
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleEmail = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    setSending(true);
    try {
      const pdf = await generatePdf();
      const base64 = pdf.output('datauristring').split(',')[1];
      await sendTaxDocumentEmail({
        recipient: emailInput.trim(),
        subject: `${docTitle} — ${docId}`,
        body: `<p>Please find attached: <strong>${docTitle}</strong> (${docId}) from ${branch.name}.</p>`,
        attachments: [
          {
            filename: `${docTitle.replace(/[^A-Z0-9]/gi, '_')}_${docId}.pdf`,
            content: base64,
            encoding: 'base64',
          },
        ],
      });
      toast.success('Email sent successfully');
      setShowEmailInput(false);
      setEmailInput('');
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleWhatsApp = () => {
    const row = data.row as unknown as Record<string, unknown>;
    const date = fmtDate(row.invoiceDate as string);
    const lines = [
      `*${docTitle}*`,
      `${branch.name}${branch.tax_registration_number ? ` | TRN: ${branch.tax_registration_number}` : ''}`,
      `Date: ${date}`,
      data.type === 'output'
        ? `Customer: ${(row.customerName as string) ?? '—'} | Taxable: ${fmt(row.taxableAmount as number, currency)} | VAT: ${fmt(row.outputVat as number, currency)} | Total: ${fmt(row.totalInvoice as number, currency)}`
        : data.type === 'local'
          ? `Vendor: ${(row.vendorName as string) ?? '—'} | Total: ${fmt(row.totalAmount as number, currency)}`
          : `Supplier: ${(row.supplierName as string) ?? '—'} | Total: ${fmt(((row.taxableAmount as number) ?? 0) + ((row.customsDuty as number) ?? 0) + ((row.importVatReverseCharge as number) ?? 0), currency)}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {docTitle}
            </div>
            <div className="text-sm font-semibold text-white">{docId}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 gap-1.5 text-xs"
              onClick={handlePrint}
            >
              <Printer size={14} /> Print
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 gap-1.5 text-xs"
              onClick={handleDownload}
              disabled={sending}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{' '}
              PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 gap-1.5 text-xs"
              onClick={() => setShowEmailInput(!showEmailInput)}
            >
              <Mail size={14} /> Email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-green-400 hover:text-green-300 hover:bg-slate-700 h-8 gap-1.5 text-xs"
              onClick={handleWhatsApp}
            >
              <MessageCircle size={14} /> WhatsApp
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email input strip */}
        {showEmailInput && (
          <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100">
            <Mail size={14} className="text-blue-500 shrink-0" />
            <Input
              type="email"
              placeholder="Recipient email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
              className="h-8 text-sm rounded-lg border-blue-200 bg-white flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleEmail}
              disabled={sending}
              className="h-8 text-xs px-4 rounded-lg"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : 'Send'}
            </Button>
            <button
              onClick={() => setShowEmailInput(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Document preview */}
        <div className="overflow-y-auto max-h-[78vh] bg-gray-100 p-6">
          <div
            ref={printRef}
            id="tax-doc-print-content"
            className="mx-auto shadow-xl"
            style={{ maxWidth: 900 }}
          >
            {data.type === 'output' && <OutputTaxDocument row={data.row} branch={branch} />}
            {data.type === 'local' && (
              <InputLocalDocument row={data.row as InputTaxLocalRow} branch={branch} />
            )}
            {data.type === 'international' && (
              <InputIntlDocument row={data.row as InputTaxInternationalRow} branch={branch} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
