'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Download, Mail, Phone, Printer, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { sendTaxDocumentEmail } from '@/lib/finance/accountsApi';
import type {
  OutputTaxRow,
  InputTaxLocalRow,
  InputTaxInternationalRow,
} from '@/lib/finance/accountsApi';
import {
  ACCENT,
  TEXT_MUTED,
  TEXT_LIGHT,
  docStyle,
  thStyle,
  tdStyle,
  DocHeader,
  DocFooter,
  TotalsBlock,
  generateDocPdf,
  type BranchInfo,
} from '@/components/shared/documentTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────

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
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
              {row.taxName ?? 'VAT'} Claimable :
            </span>
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
              <th style={thStyle('right')}>Input {row.taxName ?? 'VAT'}</th>
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
            label: `Input ${row.taxName ?? 'VAT'} (${row.taxPercent ?? 0}%)`,
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
        Computer-generated Purchase Tax Record for internal {row.taxName ?? 'VAT'} reporting
        purposes.
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
            {row.supplierVatNumber && (
              <div>
                {row.taxName ?? 'VAT'} No: {row.supplierVatNumber}
              </div>
            )}
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
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
              {row.taxName ?? 'VAT'} Claimable :
            </span>
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
              <th style={thStyle('right')}>Reverse Charge {row.taxName ?? 'VAT'}</th>
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
            label: `Reverse Charge ${row.taxName ?? 'VAT'}${row.taxPercent != null ? ` (${row.taxPercent}%)` : ''}`,
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
        Self-billed under the Reverse Charge Mechanism. {row.taxName ?? 'VAT'} declared by the
        recipient ({branch.name}).
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
    return generateDocPdf(element);
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
        ? `Customer: ${(row.customerName as string) ?? '—'} | Taxable: ${fmt(row.taxableAmount as number, currency)} | ${(row.taxName as string) ?? 'VAT'}: ${fmt(row.outputVat as number, currency)} | Total: ${fmt(row.totalInvoice as number, currency)}`
        : data.type === 'local'
          ? `Vendor: ${(row.vendorName as string) ?? '—'} | Total: ${fmt(row.totalAmount as number, currency)}`
          : `Supplier: ${(row.supplierName as string) ?? '—'} | Total: ${fmt(((row.taxableAmount as number) ?? 0) + ((row.customsDuty as number) ?? 0) + ((row.importVatReverseCharge as number) ?? 0), currency)}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex flex-col + max-h-[95vh] caps total dialog height at the viewport,
          matching QuotationViewDialog (the reference design) — without this the
          dialog's height is only as tall as its content, and since the base
          DialogContent centers via top-50%/-translate-y-50% with no scroll
          wrapper of its own, a long document simply extends past the top/bottom
          of the viewport instead of scrolling. The doc-preview div below is the
          flex-1/overflow-y-auto child that actually scrolls, so only ONE region
          scrolls internally and the dialog chrome (toolbar/footer) stays put. */}
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white flex flex-col max-h-[95vh]">
        {/* Document preview — the scrollable region */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-100 p-6">
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

        {/* Email input strip */}
        {showEmailInput && (
          <div className="shrink-0 flex items-center gap-2 px-6 py-3 bg-blue-50 border-t border-blue-100">
            <Mail size={14} className="text-blue-500 shrink-0" />
            <Input
              type="email"
              placeholder="Recipient email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
              className="h-9 text-sm rounded-md border-blue-200 bg-white flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleEmail}
              disabled={sending}
              className="h-9 text-[11px] font-normal uppercase tracking-widest px-4 rounded-md"
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

        {/* Footer Actions — matches the Employee Quotation view's footer bar
            (spacing, proportions, and button treatment) exactly */}
        <div className="px-6 pb-4 pt-4 bg-slate-50 shrink-0 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="text-[9px] font-normal uppercase tracking-widest text-slate-400">
              {docTitle}:
            </span>
            <span className="text-[9px] font-normal uppercase tracking-widest text-blue-600">
              {docId}
            </span>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-4 rounded-md font-normal uppercase text-[11px] tracking-widest border-slate-200 text-slate-700 hover:bg-slate-100 gap-2"
              >
                <Printer size={14} /> Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={sending}
                className="h-9 px-4 rounded-md font-normal uppercase text-[11px] tracking-widest border-slate-200 text-slate-700 hover:bg-slate-100 gap-2"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailInput(!showEmailInput)}
                className="h-9 px-4 rounded-md font-normal uppercase text-[11px] tracking-widest border-red-200 text-red-700 hover:bg-red-50 gap-2"
              >
                <Mail size={14} /> Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="h-9 px-4 rounded-md font-normal uppercase text-[11px] tracking-widest border-green-200 text-emerald-700 hover:bg-green-50 gap-2"
              >
                <Phone size={14} /> WhatsApp
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-[11px] font-normal uppercase tracking-widest text-slate-500 hover:text-red-600"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
