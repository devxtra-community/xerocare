'use client';

import React from 'react';
import { Letterhead } from '@/components/shared/documentTemplate';
import type { CreditNoteRecord } from '@/lib/invoice';
import {
  computeCreditNoteSettlement,
  settlementNarrative,
  type CreditNoteSettlement,
} from '@/lib/creditNoteSettlement';

interface Props {
  record: CreditNoteRecord;
  currency?: string;
  /** Customer contact block, when the caller has the originating invoice to hand. */
  customer?: {
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    trn?: string | null;
  };
  /** Original invoice date, shown against the reference so the two documents tie up. */
  originalInvoiceDate?: string | null;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmt(n: number | null | undefined, cur: string) {
  const v = Number(n ?? 0);
  return `${cur} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Shared bits, matched to the Bill/Quotation documents ────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-2 print:text-slate-800">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 print:text-slate-500">
      {children}
    </p>
  );
}

const TYPE_META: Record<
  CreditNoteRecord['type'],
  { title: string; chip: string; chipClass: string }
> = {
  DIRECT_REFUND: {
    title: 'Credit Note — Refund',
    chip: 'Money Back',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  REPLACEMENT: {
    title: 'Credit Note — Replacement',
    chip: 'Like-for-Like',
    chipClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  CREDIT_EXCHANGE: {
    title: 'Credit Note — Exchange',
    chip: 'Exchange',
    chipClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  PRODUCT_REPLACED: 'Completed',
};

// ─── Header ──────────────────────────────────────────────────────────────────

/**
 * Customer on the left, document meta on the right — the arrangement the Bill and
 * Quotation already use, so the three documents read as one family.
 *
 * The credit note number is presented as the document's own reference and the original
 * invoice sits beside it: a return produces a new document, but it only means anything
 * against the sale it reverses, so the two numbers always travel together.
 */
function CreditNoteHeader({
  record,
  customer,
  originalInvoiceDate,
}: {
  record: CreditNoteRecord;
  customer?: Props['customer'];
  originalInvoiceDate?: string | null;
}) {
  const meta = TYPE_META[record.type];
  const status = STATUS_LABEL[record.status] ?? record.status;

  const rows: Array<[string, React.ReactNode]> = [
    [
      'Credit Note No.',
      <span key="n" className="font-mono">
        {record.creditNoteNo}
      </span>,
    ],
    ['Date Issued', fmtDate(record.createdAt)],
    [
      'Against Invoice',
      <span key="i" className="font-mono">
        {record.invoiceNumber}
      </span>,
    ],
    ['Invoice Date', fmtDate(originalInvoiceDate)],
    ['Status', status],
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xl font-black tracking-tight text-slate-800 uppercase leading-none">
          {meta.title}
        </p>
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.chipClass}`}
        >
          {meta.chip}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        <div className="p-3">
          <FieldLabel>Credit To</FieldLabel>
          <p className="text-sm font-black text-slate-800 leading-snug">
            {record.customerName || 'Customer'}
          </p>
          {customer?.address && (
            <p className="text-[11px] text-slate-600 leading-snug mt-1 whitespace-pre-line">
              {customer.address}
            </p>
          )}
          <div className="mt-1.5 space-y-0.5">
            {customer?.email && (
              <p className="text-[11px] text-slate-600 leading-snug">{customer.email}</p>
            )}
            {customer?.phone && (
              <p className="text-[11px] text-slate-600 leading-snug">{customer.phone}</p>
            )}
          </div>
          {customer?.trn && (
            <p className="text-[10px] text-slate-500 mt-1.5">
              TRN: <span className="font-mono">{customer.trn}</span>
            </p>
          )}
        </div>

        <div>
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 px-3 py-[5px]">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-slate-500 shrink-0">
                {label}
              </span>
              <span className="text-[11px] font-bold text-slate-800 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Items ───────────────────────────────────────────────────────────────────

function describeReturned(record: CreditNoteRecord) {
  if (record.itemCategory === 'SPARE_PART') {
    return {
      name: record.productName || 'Spare part',
      sub: record.sku ? `SKU ${record.sku}` : null,
      qty: record.quantity ?? 1,
    };
  }
  return {
    name: [record.brand, record.productName].filter(Boolean).join(' ') || 'Product',
    sub: record.serialNumber ? `Serial ${record.serialNumber}` : record.modelName || null,
    qty: 1,
  };
}

function describeReplacement(record: CreditNoteRecord) {
  if (record.itemCategory === 'SPARE_PART') {
    if (!record.replacementSparePartName) return null;
    return {
      name: record.replacementSparePartName,
      sub: record.replacementSparePartSku ? `SKU ${record.replacementSparePartSku}` : null,
      qty: record.replacementQuantity ?? record.quantity ?? 1,
    };
  }
  if (!record.replacementProductName) return null;
  return {
    name: record.replacementProductName,
    sub: record.replacementSerialNumber ? `Serial ${record.replacementSerialNumber}` : null,
    qty: 1,
  };
}

/**
 * The two sides of the transaction on one table: what came back, and what went out.
 *
 * Shown as one table rather than two blocks because the customer's question is always the
 * difference between them, and a difference is far easier to read down a column than
 * across a page.
 */
function ItemsSection({
  record,
  s,
  currency,
}: {
  record: CreditNoteRecord;
  s: CreditNoteSettlement;
  currency: string;
}) {
  const returned = describeReturned(record);
  const replacement = describeReplacement(record);

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeading>Items</SectionHeading>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 print:bg-slate-100">
            <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-y border-slate-200">
              Description
            </th>
            <th className="text-center text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-y border-slate-200 w-14">
              Qty
            </th>
            <th className="text-right text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-y border-slate-200 w-28">
              Amount
            </th>
            <th className="text-right text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-y border-slate-200 w-24">
              {s.taxName}
            </th>
            <th className="text-right text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-y border-slate-200 w-28">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2.5 border-b border-slate-100 align-top">
              <p className="text-[11px] font-bold text-slate-800 leading-snug">{returned.name}</p>
              {returned.sub && (
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{returned.sub}</p>
              )}
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mt-1">
                Returned by customer
              </p>
            </td>
            <td className="px-3 py-2.5 border-b border-slate-100 text-center text-[11px] text-slate-700 align-top">
              {returned.qty}
            </td>
            <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] text-slate-700 align-top">
              − {fmtAmt(s.returnedNet, currency)}
            </td>
            <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] text-slate-700 align-top">
              − {fmtAmt(s.returnedTax, currency)}
            </td>
            <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] font-bold text-slate-800 align-top">
              − {fmtAmt(s.returnedGross, currency)}
            </td>
          </tr>

          {replacement && (
            <tr>
              <td className="px-3 py-2.5 border-b border-slate-100 align-top">
                <p className="text-[11px] font-bold text-slate-800 leading-snug">
                  {replacement.name}
                </p>
                {replacement.sub && (
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {replacement.sub}
                  </p>
                )}
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-1">
                  Issued to customer
                </p>
              </td>
              <td className="px-3 py-2.5 border-b border-slate-100 text-center text-[11px] text-slate-700 align-top">
                {replacement.qty}
              </td>
              <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] text-slate-700 align-top">
                {fmtAmt(s.replacementNet, currency)}
              </td>
              <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] text-slate-700 align-top">
                {fmtAmt(s.replacementTax, currency)}
              </td>
              <td className="px-3 py-2.5 border-b border-slate-100 text-right text-[11px] font-bold text-slate-800 align-top">
                {fmtAmt(s.replacementGross, currency)}
              </td>
            </tr>
          )}

          {s.discount > 0 && (
            <tr>
              <td
                className="px-3 py-2 border-b border-slate-100 text-[11px] text-emerald-700"
                colSpan={4}
              >
                Goodwill discount on replacement
              </td>
              <td className="px-3 py-2 border-b border-slate-100 text-right text-[11px] font-bold text-emerald-700">
                − {fmtAmt(s.discount, currency)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Settlement ──────────────────────────────────────────────────────────────

/**
 * Who owes whom, and how much.
 *
 * The direction is stated in words as well as by sign, because a negative number in a
 * total column is exactly the thing people misread — and on this document misreading it
 * means paying money that should have been collected.
 */
function SettlementSection({
  record,
  s,
  currency,
}: {
  record: CreditNoteRecord;
  s: CreditNoteSettlement;
  currency: string;
}) {
  const isExchange = record.type === 'CREDIT_EXCHANGE';

  const headline =
    s.direction === 'CUSTOMER_PAYS'
      ? {
          label: 'Amount Payable by Customer',
          tone: 'text-indigo-700',
          box: 'bg-indigo-50 border-indigo-200',
        }
      : s.direction === 'COMPANY_REFUNDS'
        ? {
            label: 'Amount Refundable to Customer',
            tone: 'text-rose-700',
            box: 'bg-rose-50 border-rose-200',
          }
        : { label: 'Nothing Payable', tone: 'text-slate-700', box: 'bg-slate-50 border-slate-200' };

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeading>Settlement</SectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="text-[11px] text-slate-600 leading-relaxed">
          {settlementNarrative(record, s)}
          {record.damageReason && (
            <p className="mt-2 text-[10px] text-slate-500">
              <span className="font-black uppercase tracking-widest text-slate-400">Reason: </span>
              {record.damageReason}
            </p>
          )}
          {record.type === 'DIRECT_REFUND' && record.paymentMode && (
            <p className="mt-1 text-[10px] text-slate-500">
              <span className="font-black uppercase tracking-widest text-slate-400">
                Refund mode:{' '}
              </span>
              {record.paymentMode.replace(/_/g, ' ')}
            </p>
          )}
        </div>

        <div>
          {isExchange && (
            <>
              <div className="flex items-baseline justify-between px-3 py-[5px]">
                <span className="text-[10px] text-slate-500">Value issued</span>
                <span className="text-[11px] text-slate-800">
                  {fmtAmt(s.replacementNet, currency)}
                </span>
              </div>
              <div className="flex items-baseline justify-between px-3 py-[5px]">
                <span className="text-[10px] text-slate-500">Less value returned</span>
                <span className="text-[11px] text-slate-800">
                  − {fmtAmt(s.returnedNet, currency)}
                </span>
              </div>
              {s.discount > 0 && (
                <div className="flex items-baseline justify-between px-3 py-[5px]">
                  <span className="text-[10px] text-emerald-700">Less goodwill discount</span>
                  <span className="text-[11px] text-emerald-700">
                    − {fmtAmt(s.discount, currency)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between px-3 py-[5px] border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-600">Net difference</span>
                <span className="text-[11px] font-bold text-slate-800">
                  {fmtAmt(Math.abs(s.netDifference), currency)}
                </span>
              </div>
              {s.taxPercent > 0 && (
                <div className="flex items-baseline justify-between px-3 py-[5px]">
                  <span className="text-[10px] text-slate-500">
                    {s.taxName} @ {s.taxPercent}%
                  </span>
                  <span className="text-[11px] text-slate-800">
                    {fmtAmt(Math.abs(s.differenceTax), currency)}
                  </span>
                </div>
              )}
            </>
          )}

          {record.type === 'DIRECT_REFUND' && (
            <>
              <div className="flex items-baseline justify-between px-3 py-[5px]">
                <span className="text-[10px] text-slate-500">Value returned</span>
                <span className="text-[11px] text-slate-800">
                  {fmtAmt(s.returnedNet, currency)}
                </span>
              </div>
              {s.taxPercent > 0 && (
                <div className="flex items-baseline justify-between px-3 py-[5px]">
                  <span className="text-[10px] text-slate-500">
                    {s.taxName} @ {s.taxPercent}%
                  </span>
                  <span className="text-[11px] text-slate-800">
                    {fmtAmt(s.returnedTax, currency)}
                  </span>
                </div>
              )}
            </>
          )}

          <div className={`mt-2 rounded-lg border px-3 py-2.5 ${headline.box}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {headline.label}
            </p>
            <p className={`text-lg font-black leading-tight mt-0.5 ${headline.tone}`}>
              {fmtAmt(s.settlementAmount, currency)}
            </p>
            {s.direction === 'CUSTOMER_PAYS' && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Payable to {'Xerocare'} before collection of the replacement.
              </p>
            )}
            {s.direction === 'COMPANY_REFUNDS' && record.type === 'DIRECT_REFUND' && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Refund is released once approved by Accounts.
              </p>
            )}
            {s.direction === 'NO_MOVEMENT' && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                This document records the exchange of goods only.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notes ───────────────────────────────────────────────────────────────────

function NotesSection({ record }: { record: CreditNoteRecord }) {
  // financeNote is Accounts' internal remark and is deliberately NOT printed — the
  // customer-facing document carries only what was agreed with the customer.
  if (!record.notes) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeading>Notes</SectionHeading>
      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
        {record.notes}
      </p>
    </div>
  );
}

function SignatureSection() {
  return (
    <div className="grid grid-cols-2 gap-10 mt-8">
      {['For Xerocare Technology L.L.C', 'Received by Customer'].map((label) => (
        <div key={label}>
          <div className="border-b border-slate-300 h-10" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

/**
 * A credit note is a one-page document and must print as one page.
 *
 * The app's global print rule sets `@page { margin: 14mm }`, which leaves about 1017px of
 * an A4 page usable — less than the letterhead's own minimum height, so the footer and
 * signatures were pushed onto a second, otherwise-empty page every time. The letterhead is
 * a full-bleed design (edge-to-edge header bar and footer artwork), so a paper margin is
 * wrong for it regardless: the page margin goes to zero here and the inset padding inside
 * Letterhead keeps the text off the paper edge.
 */
const PRINT_RULES = `
@media print {
  @page { size: A4; margin: 0; }
  .cn-doc { min-height: 297mm; }
}
`;

export function CreditNoteDocumentBody({
  record,
  currency = 'AED',
  customer,
  originalInvoiceDate,
}: Props) {
  const s = computeCreditNoteSettlement(record);

  return (
    <div className="cn-doc">
      <style>{PRINT_RULES}</style>
      <Letterhead minHeight="297mm">
        <CreditNoteHeader
          record={record}
          customer={customer}
          originalInvoiceDate={originalInvoiceDate}
        />
        <div className="h-5" />
        <ItemsSection record={record} s={s} currency={currency} />
        <SettlementSection record={record} s={s} currency={currency} />
        <NotesSection record={record} />
        <SignatureSection />
      </Letterhead>
    </div>
  );
}

export default CreditNoteDocumentBody;
