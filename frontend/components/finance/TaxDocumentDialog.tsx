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

// ─── Shared Styles ────────────────────────────────────────────────────────────

const docStyle: React.CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 13,
  color: '#1a1a1a',
  background: '#fff',
  padding: '40px 48px',
  minWidth: 720,
};

const headerBand: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '3px solid #1e3a5f',
  paddingBottom: 20,
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#1e3a5f',
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  textAlign: 'right' as const,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: 1.2,
  marginBottom: 6,
};

const th: React.CSSProperties = {
  background: '#1e3a5f',
  color: '#fff',
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
};

const td: React.CSSProperties = {
  padding: '9px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
};

const tdRight: React.CSSProperties = { ...td, textAlign: 'right' as const };

function TotalLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13 }}>
      <div
        style={{
          width: 200,
          textAlign: 'right',
          paddingRight: 12,
          color: '#4b5563',
          fontWeight: bold ? 700 : 400,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 140,
          textAlign: 'right',
          fontWeight: bold ? 700 : 400,
          paddingTop: 4,
          paddingBottom: 4,
          borderTop: bold ? '2px solid #1e3a5f' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={sectionTitle}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#6b7280', minWidth: 160 }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

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
        fontWeight: 700,
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

// ─── Document Layouts ─────────────────────────────────────────────────────────

function OutputTaxDocument({ row, branch }: { row: OutputTaxRow; branch: BranchInfo }) {
  return (
    <div style={docStyle}>
      {/* Header */}
      <div style={headerBand}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>{branch.name}</div>
          {branch.address && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{branch.address}</div>
          )}
          {branch.tax_registration_number && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
              TRN: <strong>{branch.tax_registration_number}</strong>
            </div>
          )}
          {branch.country && <div style={{ fontSize: 12, color: '#6b7280' }}>{branch.country}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={titleStyle}>Tax Invoice</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            No: <strong style={{ color: '#1a1a1a' }}>{row.invoiceNumber}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Date: <strong style={{ color: '#1a1a1a' }}>{fmtDate(row.invoiceDate)}</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={row.status} />
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 28 }}>
        <InfoBlock title="Bill To">
          <div style={{ fontWeight: 700, fontSize: 15 }}>{row.customerName ?? '—'}</div>
          {row.customerVatNumber && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>TRN: {row.customerVatNumber}</div>
          )}
          {row.customerCountry && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>
              {row.customerCountry}
              {row.customerStateProvince ? `, ${row.customerStateProvince}` : ''}
            </div>
          )}
        </InfoBlock>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', borderRadius: '4px 0 0 0' }}>Description</th>
            <th style={{ ...th, textAlign: 'right' }}>Taxable Amount</th>
            <th style={{ ...th, textAlign: 'right' }}>{row.taxName ?? 'VAT'} %</th>
            <th style={{ ...th, textAlign: 'right' }}>Tax Amount</th>
            <th style={{ ...th, textAlign: 'right', borderRadius: '0 4px 0 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#f9fafb' }}>
            <td style={td}>Goods / Services</td>
            <td style={tdRight}>{fmt(row.taxableAmount, row.currencyCode)}</td>
            <td style={tdRight}>{row.taxPercent != null ? `${row.taxPercent}%` : '—'}</td>
            <td style={tdRight}>{fmt(row.outputVat, row.currencyCode)}</td>
            <td style={tdRight}>{fmt(row.totalInvoice, row.currencyCode)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <TotalLine label="Taxable Amount" value={fmt(row.taxableAmount, row.currencyCode)} />
        <TotalLine
          label={`${row.taxName ?? 'VAT'} (${row.taxPercent ?? 0}%)`}
          value={fmt(row.outputVat, row.currencyCode)}
        />
        <TotalLine
          label="Total Invoice Amount"
          value={fmt(row.totalInvoice, row.currencyCode)}
          bold
        />
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        This is a computer-generated Tax Invoice. No signature required.
      </div>
    </div>
  );
}

function InputLocalDocument({ row, branch }: { row: InputTaxLocalRow; branch: BranchInfo }) {
  return (
    <div style={docStyle}>
      {/* Header */}
      <div style={headerBand}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>{branch.name}</div>
          {branch.address && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{branch.address}</div>
          )}
          {branch.tax_registration_number && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
              TRN: <strong>{branch.tax_registration_number}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={titleStyle}>Purchase Tax Record</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Date: <strong style={{ color: '#1a1a1a' }}>{fmtDate(row.invoiceDate)}</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={row.taxStatus} />
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <InfoBlock title="Vendor">
          <div style={{ fontWeight: 700, fontSize: 15 }}>{row.vendorName}</div>
          {row.vendorVatNumber && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>TRN: {row.vendorVatNumber}</div>
          )}
          {row.vendorCountry && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>Country: {row.vendorCountry}</div>
          )}
        </InfoBlock>
        <InfoBlock title="Purchase Details">
          <MetaLine label="Branch" value={row.branch} />
          <MetaLine label="Category" value={row.purchaseCategory} />
          <MetaLine label="Currency" value={row.currencyCode} />
          <MetaLine label="VAT Claimable" value={row.vatClaimable ? 'Yes' : 'No'} />
        </InfoBlock>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', borderRadius: '4px 0 0 0' }}>Category</th>
            <th style={{ ...th, textAlign: 'right' }}>Taxable Amount</th>
            <th style={{ ...th, textAlign: 'right' }}>{row.taxName ?? 'VAT'} %</th>
            <th style={{ ...th, textAlign: 'right' }}>Input VAT</th>
            <th style={{ ...th, textAlign: 'right', borderRadius: '0 4px 0 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#f9fafb' }}>
            <td style={td}>{row.purchaseCategory ?? 'Purchase'}</td>
            <td style={tdRight}>{fmt(row.taxableAmount, row.currencyCode)}</td>
            <td style={tdRight}>{row.taxPercent != null ? `${row.taxPercent}%` : '—'}</td>
            <td style={tdRight}>{fmt(row.inputVatAmount, row.currencyCode)}</td>
            <td style={tdRight}>{fmt(row.totalAmount, row.currencyCode)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <TotalLine label="Taxable Amount" value={fmt(row.taxableAmount, row.currencyCode)} />
        <TotalLine
          label={`${row.taxName ?? 'Input VAT'} (${row.taxPercent ?? 0}%)`}
          value={fmt(row.inputVatAmount, row.currencyCode)}
        />
        <TotalLine label="Total Amount" value={fmt(row.totalAmount, row.currencyCode)} bold />
      </div>

      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        This is a computer-generated Purchase Tax Record for internal VAT reporting purposes.
      </div>
    </div>
  );
}

function InputIntlDocument({ row, branch }: { row: InputTaxInternationalRow; branch: BranchInfo }) {
  const totalAmount =
    (row.taxableAmount ?? 0) + (row.customsDuty ?? 0) + (row.importVatReverseCharge ?? 0);
  return (
    <div style={docStyle}>
      {/* Header */}
      <div style={headerBand}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>{branch.name}</div>
          {branch.address && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{branch.address}</div>
          )}
          {branch.tax_registration_number && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
              TRN: <strong>{branch.tax_registration_number}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={titleStyle}>Self-Billed Tax Invoice</div>
          <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 2 }}>
            (Reverse Charge)
          </div>
          {row.importInvoiceNo && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              Import Invoice: <strong style={{ color: '#1a1a1a' }}>{row.importInvoiceNo}</strong>
            </div>
          )}
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Date: <strong style={{ color: '#1a1a1a' }}>{fmtDate(row.invoiceDate)}</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={row.taxStatus} />
          </div>
        </div>
      </div>

      {/* Supplier / Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <InfoBlock title="Supplier">
          <div style={{ fontWeight: 700, fontSize: 15 }}>{row.supplierName}</div>
          {row.supplierVatNumber && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>VAT No: {row.supplierVatNumber}</div>
          )}
          {row.supplierCountry && (
            <div style={{ fontSize: 12, color: '#4b5563' }}>Country: {row.supplierCountry}</div>
          )}
        </InfoBlock>
        <InfoBlock title="Import Details">
          <MetaLine label="Branch" value={row.branch} />
          <MetaLine label="Import Country" value={row.importCountry} />
          <MetaLine label="Customs Entry No" value={row.customsEntryNo} />
          <MetaLine label="Currency" value={row.currencyCode} />
          {row.exchangeRate != null && (
            <MetaLine label="Exchange Rate" value={String(row.exchangeRate)} />
          )}
          <MetaLine label="VAT Claimable" value={row.vatClaimable ? 'Yes' : 'No'} />
        </InfoBlock>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', borderRadius: '4px 0 0 0' }}>Goods / Service</th>
            <th style={{ ...th, textAlign: 'right' }}>Taxable Amount</th>
            <th style={{ ...th, textAlign: 'right' }}>Customs Duty</th>
            <th style={{ ...th, textAlign: 'right' }}>Reverse Charge VAT</th>
            <th style={{ ...th, textAlign: 'right', borderRadius: '0 4px 0 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#f9fafb' }}>
            <td style={td}>{row.goodsOrService ?? 'Import'}</td>
            <td style={tdRight}>{fmt(row.taxableAmount, row.currencyCode)}</td>
            <td style={tdRight}>{fmt(row.customsDuty, row.currencyCode)}</td>
            <td style={tdRight}>{fmt(row.importVatReverseCharge, row.currencyCode)}</td>
            <td style={tdRight}>{fmt(totalAmount, row.currencyCode)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <TotalLine label="Taxable Amount" value={fmt(row.taxableAmount, row.currencyCode)} />
        <TotalLine label="Customs Duty" value={fmt(row.customsDuty, row.currencyCode)} />
        <TotalLine
          label={`Reverse Charge VAT${row.taxPercent != null ? ` (${row.taxPercent}%)` : ''}`}
          value={fmt(row.importVatReverseCharge, row.currencyCode)}
        />
        <TotalLine label="Total" value={fmt(totalAmount, row.currencyCode)} bold />
      </div>

      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Self-billed under the Reverse Charge Mechanism. VAT declared by the recipient ({branch.name}
        ).
      </div>
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
      `<html><head><title>${docTitle}</title><style>body{margin:0;padding:0;}</style></head><body>`,
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white">
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
