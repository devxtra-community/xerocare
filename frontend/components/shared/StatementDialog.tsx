'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Download, Mail, Printer, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { sendTaxDocumentEmail } from '@/lib/finance/accountsApi';
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
} from './documentTemplate';

// ─── Shared statement data shapes ──────────────────────────────────────────
// Two genuinely different document types, not one generic table forced onto
// every page: a running-balance statement (Opening → transactions → Closing,
// the traditional "Statement of Account" for one customer/vendor/account) and
// a whole-page snapshot statement (a polished, formal version of whatever a
// page currently shows/filters — Chart of Accounts, General Ledger, etc.).

export interface StatementTransactionRow {
  date: string;
  reference?: string;
  description: string;
  debit?: number;
  credit?: number;
}

export interface RunningBalanceStatementData {
  kind: 'running-balance';
  title: string;
  subjectName: string;
  subjectMeta?: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  openingBalance: number;
  rows: StatementTransactionRow[];
  closingBalance: number;
  /** e.g. "Balance you owe us" / "Balance we owe vendor" — shown near the closing balance. */
  balanceLabel?: string;
}

export interface SnapshotSection {
  title: string;
  rows: { code?: string; label: string; value: string }[];
  total?: { label: string; value: string };
}

export interface SnapshotStatementData {
  kind: 'snapshot';
  title: string;
  periodFrom?: string;
  periodTo?: string;
  asOfDate?: string;
  filters?: Record<string, string | undefined>;
  sections: SnapshotSection[];
  summary?: { label: string; value: string; bold?: boolean }[];
}

export type StatementData = RunningBalanceStatementData | SnapshotStatementData;

interface StatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: StatementData;
  branch: BranchInfo;
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const fmtDateTime = () =>
  new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

// ─── Running-balance layout ────────────────────────────────────────────────

function RunningBalanceDocument({
  data,
  branch,
}: {
  data: RunningBalanceStatementData;
  branch: BranchInfo;
}) {
  const fmt = (n: number) => formatCurrency(n, data.currency);
  let running = data.openingBalance;

  return (
    <div style={docStyle}>
      <DocHeader branch={branch} title={data.title} subtitle={data.subjectName} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: 18,
          marginBottom: 24,
        }}
      >
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
            Statement For
          </div>
          <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>{data.subjectName}</div>
          {data.subjectMeta && (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{data.subjectMeta}</div>
          )}
        </div>
        <div style={{ width: 230 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Period :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>
              {fmtDate(data.periodFrom)} – {fmtDate(data.periodTo)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Generated :</span>
            <span style={{ fontSize: 12, fontWeight: 300 }}>{fmtDateTime()}</span>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={thStyle('left')}>Date</th>
            <th style={thStyle('left')}>Reference</th>
            <th style={{ ...thStyle('left'), width: '30%' }}>Description</th>
            <th style={thStyle('right')}>Debit</th>
            <th style={thStyle('right')}>Credit</th>
            <th style={thStyle('right')}>Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdStyle('left'), fontStyle: 'italic' }} colSpan={5}>
              Opening Balance
            </td>
            <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{fmt(data.openingBalance)}</td>
          </tr>
          {data.rows.length === 0 ? (
            <tr>
              <td style={{ ...tdStyle('left'), color: TEXT_LIGHT }} colSpan={6}>
                No transactions in this period.
              </td>
            </tr>
          ) : (
            data.rows.map((r, i) => {
              running = running + (r.debit ?? 0) - (r.credit ?? 0);
              return (
                <tr key={i}>
                  <td style={tdStyle('left')}>{fmtDate(r.date)}</td>
                  <td style={tdStyle('left')}>{r.reference ?? '—'}</td>
                  <td style={tdStyle('left')}>{r.description}</td>
                  <td style={tdStyle('right')}>{r.debit ? fmt(r.debit) : ''}</td>
                  <td style={tdStyle('right')}>{r.credit ? fmt(r.credit) : ''}</td>
                  <td style={{ ...tdStyle('right'), fontWeight: 500 }}>{fmt(running)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <TotalsBlock
        rows={[
          {
            label: data.balanceLabel ?? 'Closing Balance',
            value: fmt(data.closingBalance),
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
        This is a computer-generated statement. No signature required.
      </div>

      <DocFooter branch={branch} />
    </div>
  );
}

// ─── Whole-page snapshot layout ────────────────────────────────────────────

function SnapshotDocument({ data, branch }: { data: SnapshotStatementData; branch: BranchInfo }) {
  const filterEntries = Object.entries(data.filters ?? {}).filter(([, v]) => !!v);
  return (
    <div style={docStyle}>
      <DocHeader branch={branch} title={data.title} />

      <div
        style={{
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: 14,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: TEXT_MUTED,
        }}
      >
        <div>
          {data.periodFrom && data.periodTo && (
            <div>
              Period: {fmtDate(data.periodFrom)} – {fmtDate(data.periodTo)}
            </div>
          )}
          {data.asOfDate && <div>As of: {fmtDate(data.asOfDate)}</div>}
          {filterEntries.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {filterEntries.map(([k, v]) => `${k}: ${v}`).join('   •   ')}
            </div>
          )}
        </div>
        <div>Generated: {fmtDateTime()}</div>
      </div>

      {data.sections.map((section, si) => (
        <div key={si} style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            {section.title}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {section.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.code !== undefined && (
                    <td
                      style={{
                        ...tdStyle('left'),
                        width: 70,
                        fontFamily: 'monospace',
                        color: TEXT_MUTED,
                      }}
                    >
                      {r.code}
                    </td>
                  )}
                  <td style={tdStyle('left')}>{r.label}</td>
                  <td style={tdStyle('right')}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {section.total && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderTop: `1px solid ${ACCENT}`,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>{section.total.label}</span>
              <span>{section.total.value}</span>
            </div>
          )}
        </div>
      ))}

      {data.summary && data.summary.length > 0 && <TotalsBlock rows={data.summary} />}

      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: TEXT_LIGHT,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        This is a computer-generated statement. No signature required.
      </div>

      <DocFooter branch={branch} />
    </div>
  );
}

// ─── Main Dialog — one shared component for both statement kinds ──────────

export default function StatementDialog({
  open,
  onOpenChange,
  data,
  branch,
}: StatementDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sending, setSending] = useState(false);

  const docTitle = data.title;
  const docId =
    data.kind === 'running-balance' ? data.subjectName : (data.asOfDate ?? data.periodTo ?? '');

  const generatePdf = async () => {
    const element = printRef.current;
    if (!element) throw new Error('Document not found');
    return generateDocPdf(element);
  };

  const filenameBase = () =>
    `${docTitle}_${docId}`.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const handleDownload = async () => {
    setSending(true);
    try {
      const pdf = await generatePdf();
      pdf.save(`${filenameBase()}.pdf`);
      toast.success('Statement downloaded');
    } catch {
      toast.error('Failed to generate statement');
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
        body: `<p>Please find attached: <strong>${docTitle}</strong> from ${branch.name}.</p>`,
        attachments: [{ filename: `${filenameBase()}.pdf`, content: base64, encoding: 'base64' }],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white">
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {docTitle}
            </div>
            {docId && <div className="text-sm font-semibold text-white">{docId}</div>}
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
            <button
              onClick={() => onOpenChange(false)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

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

        <div className="overflow-y-auto max-h-[78vh] bg-gray-100 p-6">
          <div
            ref={printRef}
            id="statement-print-content"
            className="mx-auto shadow-xl"
            style={{ maxWidth: 900 }}
          >
            {data.kind === 'running-balance' ? (
              <RunningBalanceDocument data={data} branch={branch} />
            ) : (
              <SnapshotDocument data={data} branch={branch} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
