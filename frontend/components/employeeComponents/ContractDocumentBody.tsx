'use client';

import React from 'react';
import { Invoice } from '@/lib/invoice';
import { ContractAgreement } from '@/lib/saleWorkflow';
import { ExternalLink, FileText } from 'lucide-react';

interface Props {
  invoice: Invoice;
  agreement: ContractAgreement;
  currency: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtAmt(n?: number | null, cur = 'QAR') {
  return `${cur} ${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function planLabel(rentType?: string) {
  const map: Record<string, string> = {
    FIXED_LIMIT: 'Fixed Limit Plan',
    FIXED_COMBO: 'Fixed Combo Plan',
    FIXED_FLAT: 'Fixed Flat Rate',
    CPC: 'Copy-Per-Count (CPC)',
    CPC_COMBO: 'CPC Combo Plan',
  };
  return rentType ? map[rentType] || rentType.replace(/_/g, ' ') : '—';
}

function billingCycleLabel(rentPeriod?: string) {
  const map: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly (every 3 months)',
    HALF_YEARLY: 'Half-Yearly (every 6 months)',
    YEARLY: 'Annual',
    CUSTOM: 'Custom',
  };
  return rentPeriod ? map[rentPeriod] || rentPeriod : '—';
}

function paymentModeLabel(mode?: string) {
  const map: Record<string, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    CREDIT_CARD: 'Credit Card',
  };
  return mode ? map[mode] || mode : '—';
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function DocRule() {
  return <hr className="border-0 border-t border-slate-300 my-0 print:border-slate-400" />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3 print:text-slate-800">
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

// ─── Document Header ──────────────────────────────────────────────────────────

const AGREEMENT_TITLE: Record<string, { title: string; subtitle: string }> = {
  SALE: {
    title: 'Sale Agreement',
    subtitle: 'This document confirms the sale transaction between the parties named below.',
  },
  RENT: {
    title: 'Rental Agreement',
    subtitle:
      'This document sets out the terms for rental of equipment between the parties named below.',
  },
  LEASE: {
    title: 'Lease Agreement',
    subtitle:
      'This document sets out the terms for equipment lease between the parties named below.',
  },
};

function DocumentHeader({
  agreement,
  saleType,
}: {
  agreement: ContractAgreement;
  saleType: string;
}) {
  const meta = AGREEMENT_TITLE[saleType] || AGREEMENT_TITLE.SALE;
  return (
    <div>
      {/* Letterhead row */}
      <div className="flex items-start justify-between mb-5">
        {/* Left: company mark */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
            Xerocare Trading &amp; Services W.L.L
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-65">
            {agreement.dealerAddress || ''}
            {agreement.dealerPhone ? ` · ${agreement.dealerPhone}` : ''}
          </p>
        </div>
        {/* Right: document type */}
        <div className="text-right">
          <p className="text-2xl font-black tracking-tight text-slate-800 uppercase leading-none">
            {meta.title}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Ref: <span className="font-bold text-slate-600">{agreement.agreementNumber}</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Date:{' '}
            <span className="font-bold text-slate-600">{fmtDate(agreement.contractDate)}</span>
          </p>
        </div>
      </div>
      <DocRule />
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{meta.subtitle}</p>
    </div>
  );
}

// ─── Parties ──────────────────────────────────────────────────────────────────

function PartiesSection({
  invoice,
  agreement,
}: {
  invoice: Invoice;
  agreement: ContractAgreement;
}) {
  return (
    <div>
      <SectionHeading>Parties to this Agreement</SectionHeading>
      <div className="grid grid-cols-2 gap-0 border border-slate-200">
        {/* Seller */}
        <div className="p-3 border-r border-slate-200">
          <FieldLabel>Seller / Dealer</FieldLabel>
          <p className="text-sm font-black text-slate-800 mb-1">{agreement.dealerName}</p>
          {agreement.dealerAddress && (
            <p className="text-[11px] text-slate-500 leading-snug">{agreement.dealerAddress}</p>
          )}
          {agreement.dealerPhone && (
            <p className="text-[11px] text-slate-500">{agreement.dealerPhone}</p>
          )}
          {invoice.taxRegistrationNumber && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              VAT Reg. No.: {invoice.taxRegistrationNumber}
            </p>
          )}
          {invoice.employeeName && (
            <p className="text-[10px] text-slate-400 mt-1">Sales Rep: {invoice.employeeName}</p>
          )}
        </div>
        {/* Buyer */}
        <div className="p-3">
          <FieldLabel>Buyer / Customer</FieldLabel>
          <p className="text-sm font-black text-slate-800 mb-1">{agreement.customerName}</p>
          {agreement.customerAddress && (
            <p className="text-[11px] text-slate-500 leading-snug">{agreement.customerAddress}</p>
          )}
          {agreement.customerPhone && (
            <p className="text-[11px] text-slate-500">{agreement.customerPhone}</p>
          )}
          {agreement.customerEmail && (
            <p className="text-[11px] text-slate-500">{agreement.customerEmail}</p>
          )}
          {agreement.customerVatNumber && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              VAT Reg. No.: {agreement.customerVatNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product / Equipment ──────────────────────────────────────────────────────

function ProductSection({ invoice }: { invoice: Invoice }) {
  const productItems = (invoice.items || []).filter(
    (i) => i.itemType === 'PRODUCT' || !!i.productId,
  );
  const allocations = (invoice.productAllocations || []).filter((a) => a.status === 'ALLOCATED');
  if (productItems.length === 0 && allocations.length === 0) return null;

  return (
    <div>
      <SectionHeading>Equipment / Product Details</SectionHeading>
      <table className="w-full text-xs border border-slate-200 border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
              Description
            </th>
            <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
              Serial No.
            </th>
            <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
              Warranty
            </th>
          </tr>
        </thead>
        <tbody>
          {productItems.length > 0
            ? productItems.map((item, idx) => {
                const alloc = allocations[idx];
                const serial = item.serialNumber || item.sn || alloc?.serialNumber || '—';
                return (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-700">{item.description}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{serial}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{item.warranty || '—'}</td>
                  </tr>
                );
              })
            : allocations.map((alloc, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-700">Allocated Machine</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                    {alloc.serialNumber}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">—</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SALE terms ───────────────────────────────────────────────────────────────

function SaleTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  const subtotal = Number(invoice.totalAmount ?? 0) - Number(invoice.taxAmount ?? 0);
  const tax = Number(invoice.taxAmount ?? 0);
  const total = Number(invoice.totalAmount ?? 0);
  const advance = Number(invoice.advanceAmount ?? 0);
  const balanceDue = Math.max(0, total - advance);

  return (
    <div>
      <SectionHeading>Sale Summary</SectionHeading>
      <table className="w-full text-xs border border-slate-200 border-collapse">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 text-slate-600 font-semibold">Subtotal</td>
            <td className="px-3 py-2 text-right font-semibold text-slate-800">
              {fmtAmt(subtotal, currency)}
            </td>
          </tr>
          {tax > 0 && (
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-500 font-semibold">
                {invoice.taxName || 'VAT'}
                {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-700">
                {fmtAmt(tax, currency)}
              </td>
            </tr>
          )}
          {invoice.customerVatStatus === 'EXEMPT' && (
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-500 font-semibold">VAT</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-700">VAT Exempt</td>
            </tr>
          )}
          <tr className="border-b border-slate-200 bg-slate-50">
            <td className="px-3 py-2 font-black text-slate-800">Total Amount</td>
            <td className="px-3 py-2 text-right font-black text-slate-800">
              {fmtAmt(total, currency)}
            </td>
          </tr>
          {advance > 0 && (
            <>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-500 font-semibold">Advance Paid</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-700">
                  − {fmtAmt(advance, currency)}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-3 py-2 font-black text-slate-800">Balance Due</td>
                <td className="px-3 py-2 text-right font-black text-slate-800">
                  {fmtAmt(balanceDue, currency)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── RENT terms ───────────────────────────────────────────────────────────────

function RentTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  // Tax on the recurring monthly rate — computed fresh here rather than reused from
  // invoice.taxAmount, which (for an ongoing contract) accrues across every billing
  // period and would misstate the tax on a single month's rate shown alongside it.
  const monthlyRentTax = invoice.taxPercent
    ? (Number(invoice.monthlyRent || 0) * Number(invoice.taxPercent)) / 100
    : 0;
  const monthlyRentInclTax = Number(invoice.monthlyRent || 0) + monthlyRentTax;
  const bwItem = (invoice.items || []).find(
    (i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0,
  );
  const colorItem = (invoice.items || []).find(
    (i) => (i.colorIncludedLimit ?? 0) > 0 || (i.colorExcessRate ?? 0) > 0,
  );
  const comboItem = (invoice.items || []).find(
    (i) => (i.combinedIncludedLimit ?? 0) > 0 || (i.combinedExcessRate ?? 0) > 0,
  );

  return (
    <div>
      <SectionHeading>Rental Terms</SectionHeading>
      <table className="w-full text-xs border border-slate-200 border-collapse">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 w-48 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Contract Start
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {fmtDate(invoice.effectiveFrom)}
            </td>
          </tr>
          {invoice.effectiveTo && (
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Contract End
              </td>
              <td className="px-3 py-2 font-semibold text-slate-800">
                {fmtDate(invoice.effectiveTo)}
              </td>
            </tr>
          )}
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Billing Cycle
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {billingCycleLabel(invoice.rentPeriod)}
            </td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Plan Type
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {planLabel(invoice.rentType)}
            </td>
          </tr>
          <tr className="border-b border-slate-100 bg-slate-50">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Monthly Rate
            </td>
            <td className="px-3 py-2 font-black text-slate-800">
              {fmtAmt(invoice.monthlyRent, currency)}
            </td>
          </tr>
          {monthlyRentTax > 0 && (
            <>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {invoice.taxName || 'VAT'}
                  {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-700">
                  {fmtAmt(monthlyRentTax, currency)}
                </td>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Monthly Rate (Incl. VAT)
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(monthlyRentInclTax, currency)}
                </td>
              </tr>
            </>
          )}

          {/* B&W usage */}
          {bwItem && (
            <>
              {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    B&W Free Limit (A4)
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {Number(bwItem.bwIncludedLimit).toLocaleString()} copies / billing period
                  </td>
                </tr>
              )}
              {(bwItem.bwExcessRate ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    B&W Excess Rate (A4)
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {currency} {Number(bwItem.bwExcessRate).toFixed(4)} per copy
                  </td>
                </tr>
              )}
            </>
          )}

          {/* Color usage */}
          {colorItem && (
            <>
              {(colorItem.colorIncludedLimit ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Color Free Limit
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {Number(colorItem.colorIncludedLimit).toLocaleString()} copies / billing period
                  </td>
                </tr>
              )}
              {(colorItem.colorExcessRate ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Color Excess Rate
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {currency} {Number(colorItem.colorExcessRate).toFixed(4)} per copy
                  </td>
                </tr>
              )}
            </>
          )}

          {/* Combo usage */}
          {comboItem && (
            <>
              {(comboItem.combinedIncludedLimit ?? 0) > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Combined Free Limit
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {Number(comboItem.combinedIncludedLimit).toLocaleString()} copies / billing
                    period
                  </td>
                </tr>
              )}
              {(comboItem.combinedExcessRate ?? 0) > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Combined Excess Rate
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {currency} {Number(comboItem.combinedExcessRate).toFixed(4)} per copy
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── LEASE terms ──────────────────────────────────────────────────────────────

function LeaseTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  const isEMI = invoice.leaseType === 'EMI';
  // Tax on the recurring monthly figure — computed fresh here rather than reused from
  // invoice.taxAmount, which (for an ongoing FSM contract) accrues across every billing
  // period and would misstate the tax on a single month's amount shown alongside it.
  const monthlyBase = isEMI
    ? Number(invoice.monthlyEmiAmount ?? invoice.monthlyLeaseAmount ?? 0)
    : Number(invoice.monthlyLeaseAmount ?? invoice.monthlyRent ?? 0);
  const monthlyTax = invoice.taxPercent ? (monthlyBase * Number(invoice.taxPercent)) / 100 : 0;
  const monthlyInclTax = monthlyBase + monthlyTax;
  const bwItem = !isEMI
    ? (invoice.items || []).find((i) => (i.bwIncludedLimit ?? 0) > 0 || (i.bwExcessRate ?? 0) > 0)
    : undefined;
  const colorItem = !isEMI
    ? (invoice.items || []).find(
        (i) => (i.colorIncludedLimit ?? 0) > 0 || (i.colorExcessRate ?? 0) > 0,
      )
    : undefined;

  return (
    <div>
      <SectionHeading>Lease Terms</SectionHeading>
      <table className="w-full text-xs border border-slate-200 border-collapse">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 w-48 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Lease Type
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {isEMI ? 'EMI — Equal Monthly Installments' : 'FSM — Full-Service Management'}
            </td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Tenure
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {invoice.leaseTenureMonths ?? '—'} months
            </td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Contract Start
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800">
              {fmtDate(invoice.effectiveFrom)}
            </td>
          </tr>

          {isEMI ? (
            <>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Monthly EMI
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(invoice.monthlyEmiAmount ?? invoice.monthlyLeaseAmount, currency)}
                </td>
              </tr>
              {monthlyTax > 0 && (
                <>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {invoice.taxName || 'VAT'}
                      {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700">
                      {fmtAmt(monthlyTax, currency)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Monthly EMI (Incl. VAT)
                    </td>
                    <td className="px-3 py-2 font-black text-slate-800">
                      {fmtAmt(monthlyInclTax, currency)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Total Lease Value
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(invoice.totalLeaseAmount ?? invoice.totalAmount, currency)}
                </td>
              </tr>
            </>
          ) : (
            <>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Service Plan
                </td>
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {planLabel(invoice.rentType)}
                </td>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Monthly Service Amount
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(invoice.monthlyLeaseAmount ?? invoice.monthlyRent, currency)}
                </td>
              </tr>
              {monthlyTax > 0 && (
                <>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {invoice.taxName || 'VAT'}
                      {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700">
                      {fmtAmt(monthlyTax, currency)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Monthly Service Amount (Incl. VAT)
                    </td>
                    <td className="px-3 py-2 font-black text-slate-800">
                      {fmtAmt(monthlyInclTax, currency)}
                    </td>
                  </tr>
                </>
              )}
              {bwItem && (
                <>
                  {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        B&W Free Limit (A4)
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {Number(bwItem.bwIncludedLimit).toLocaleString()} copies / month
                      </td>
                    </tr>
                  )}
                  {(bwItem.bwExcessRate ?? 0) > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        B&W Excess Rate
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {currency} {Number(bwItem.bwExcessRate).toFixed(4)} / copy
                      </td>
                    </tr>
                  )}
                </>
              )}
              {colorItem && (
                <>
                  {(colorItem.colorIncludedLimit ?? 0) > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Color Free Limit
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {Number(colorItem.colorIncludedLimit).toLocaleString()} copies / month
                      </td>
                    </tr>
                  )}
                  {(colorItem.colorExcessRate ?? 0) > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Color Excess Rate
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {currency} {Number(colorItem.colorExcessRate).toFixed(4)} / copy
                      </td>
                    </tr>
                  )}
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Advance / Deposit ────────────────────────────────────────────────────────

function AdvanceSection({
  invoice,
  saleType,
  currency,
}: {
  invoice: Invoice;
  saleType: string;
  currency: string;
}) {
  const advance = Number(invoice.advanceAmount ?? 0);
  const secDeposit = Number(invoice.securityDepositAmount ?? 0);
  const hasAdvance = advance > 0;
  const hasDeposit = secDeposit > 0;
  if (!hasAdvance && !hasDeposit) return null;

  // Rent/Lease advances are collected VAT-inclusive (see createSalePaymentRequest's
  // gross-up) — mirror that same figure here so the Contract Agreement, the receipt,
  // and the Accounts Receipts request all show the identical number. Sale's advance
  // display is untouched (Sale already handles its own tax at the invoice level, in
  // SaleTermsSection above).
  const isRentOrLease = saleType === 'RENT' || saleType === 'LEASE';
  const advanceTax =
    isRentOrLease && invoice.taxPercent ? (advance * Number(invoice.taxPercent)) / 100 : 0;
  const advanceInclTax = advance + advanceTax;

  const advanceLabel = saleType === 'LEASE' ? 'Down Payment' : 'Advance Payment';

  const advanceNote =
    saleType === 'RENT'
      ? 'Advance payment will be adjusted against the first billing period.'
      : saleType === 'LEASE'
        ? 'Down payment is deducted from the total lease value.'
        : 'Advance reduces the final balance due.';

  const depositNote =
    'Security deposit is held for the duration of the rental and refunded upon equipment return after final settlement.';

  return (
    <div>
      <SectionHeading>
        {saleType === 'LEASE' ? 'Down Payment / Advance' : 'Advance & Deposit'}
      </SectionHeading>
      <table className="w-full text-xs border border-slate-200 border-collapse">
        <tbody>
          {hasAdvance && (
            <>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 w-48 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {advanceLabel}
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(advanceTax > 0 ? advanceInclTax : advance, currency)}
                </td>
              </tr>
              {advanceTax > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {invoice.taxName || 'VAT'}
                    {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''} on {advanceLabel}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {fmtAmt(advanceTax, currency)}{' '}
                    <span className="text-slate-400 font-normal">
                      (base {fmtAmt(advance, currency)})
                    </span>
                  </td>
                </tr>
              )}
              {invoice.preferredPaymentMode && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Payment Mode
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {paymentModeLabel(invoice.preferredPaymentMode)}
                  </td>
                </tr>
              )}
              <tr className={hasDeposit ? 'border-b border-slate-200' : ''}>
                <td colSpan={2} className="px-3 py-2 text-[10px] text-slate-500 italic">
                  {advanceNote}
                </td>
              </tr>
            </>
          )}
          {hasDeposit && (
            <>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Security Deposit
                </td>
                <td className="px-3 py-2 font-black text-slate-800">
                  {fmtAmt(secDeposit, currency)}
                </td>
              </tr>
              {invoice.securityDepositMode && (
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Deposit Mode
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {paymentModeLabel(invoice.securityDepositMode)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="px-3 py-2 text-[10px] text-slate-500 italic">
                  {depositNote}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Warranty ─────────────────────────────────────────────────────────────────

function WarrantySection({ invoice }: { invoice: Invoice }) {
  const wType = invoice.warrantyType;
  if (!wType || wType === 'none') return null;

  const lines: string[] = [];
  if (wType === 'duration' || wType === 'both') {
    lines.push(
      `${invoice.warrantyDurationValue ?? '—'} ${invoice.warrantyDurationUnit ?? 'months'} from installation date`,
    );
  }
  if (wType === 'copies' || wType === 'both') {
    lines.push(`Up to ${Number(invoice.warrantyCopyLimit ?? 0).toLocaleString()} copies`);
  }

  return (
    <div>
      <SectionHeading>Warranty</SectionHeading>
      <div className="border border-slate-200 px-3 py-2.5 text-xs space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="font-semibold text-slate-700">
            {line}
          </p>
        ))}
        <p className="text-[10px] text-slate-500 mt-1 italic">
          Warranty applies from the date of installation/delivery and covers manufacturing defects
          under normal operating conditions.
        </p>
      </div>
    </div>
  );
}

// ─── Terms & Conditions ───────────────────────────────────────────────────────

function TermsSection({ agreement }: { agreement: ContractAgreement }) {
  if (!agreement.termsAndConditions) return null;
  return (
    <div>
      <SectionHeading>Terms &amp; Conditions</SectionHeading>
      <div className="border border-slate-200 px-3 py-3">
        <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
          {agreement.termsAndConditions}
        </pre>
      </div>
    </div>
  );
}

// ─── Signatures ───────────────────────────────────────────────────────────────

function SignaturesSection({ agreement }: { agreement: ContractAgreement }) {
  return (
    <div>
      <SectionHeading>Signatures</SectionHeading>
      <div className="grid grid-cols-2 border border-slate-200">
        {/* Seller */}
        <div className="p-3 border-r border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Seller Signature
          </p>
          {agreement.employeeSignatureData ? (
            <div>
              <img
                src={agreement.employeeSignatureData}
                alt="Employee Signature"
                className="max-h-16 w-full object-contain border border-slate-200 bg-white p-1 mb-1"
              />
              <p className="text-[9px] text-slate-500">
                {agreement.employeeSignedByName}
                {agreement.employeeSignedAt
                  ? ` · ${new Date(agreement.employeeSignedAt).toLocaleDateString('en-GB')}`
                  : ''}
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 py-4 text-center">
              <p className="text-[10px] text-slate-400">Awaiting seller signature</p>
            </div>
          )}
          <div className="mt-3 pt-2 border-t border-slate-200">
            <p className="text-[9px] text-slate-400">Authorised Signatory</p>
            <p className="text-[9px] font-bold text-slate-600">{agreement.dealerName}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Customer Signature
          </p>
          {agreement.customerSignedMethod === 'UPLOAD' && agreement.customerSignedDocumentUrl ? (
            <div className="border border-slate-200 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-slate-500 shrink-0" />
                <p className="text-[10px] font-bold text-slate-600">Uploaded Document</p>
              </div>
              <a
                href={agreement.customerSignedDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"
              >
                <ExternalLink size={10} />
                View Signed Document
              </a>
              {agreement.customerSignedDocumentNote && (
                <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                  {agreement.customerSignedDocumentNote}
                </p>
              )}
              <p className="text-[9px] text-slate-400">
                {agreement.customerSignedByName}
                {agreement.customerSignedAt
                  ? ` · ${new Date(agreement.customerSignedAt).toLocaleDateString('en-GB')}`
                  : ''}
              </p>
            </div>
          ) : agreement.customerSignatureData ? (
            <div>
              <img
                src={agreement.customerSignatureData}
                alt="Customer Signature"
                className="max-h-16 w-full object-contain border border-slate-200 bg-white p-1 mb-1"
              />
              <p className="text-[9px] text-slate-500">
                {agreement.customerSignedByName}
                {agreement.customerSignedAt
                  ? ` · ${new Date(agreement.customerSignedAt).toLocaleDateString('en-GB')}`
                  : ''}
                {agreement.customerSignedMethod === 'REMOTE' && (
                  <span className="ml-1 text-slate-400">(Remote)</span>
                )}
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 py-4 text-center">
              <p className="text-[10px] text-slate-400">Awaiting customer signature</p>
            </div>
          )}
          <div className="mt-3 pt-2 border-t border-slate-200">
            <p className="text-[9px] text-slate-400">Customer / Authorised Representative</p>
            <p className="text-[9px] font-bold text-slate-600">{agreement.customerName}</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
        By signing above, both parties confirm that they have read, understood, and agreed to the
        terms and conditions set out in this agreement.
      </p>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function ContractDocumentBody({ invoice, agreement, currency }: Props) {
  const saleType = (invoice.saleType || 'SALE').toUpperCase();

  return (
    <div className="space-y-5 text-slate-800 bg-white print:p-6">
      {/* ── Letterhead / Document Header ── */}
      <DocumentHeader agreement={agreement} saleType={saleType} />

      {/* ── Parties ── */}
      <PartiesSection invoice={invoice} agreement={agreement} />

      <DocRule />

      {/* ── Equipment ── */}
      <ProductSection invoice={invoice} />

      <DocRule />

      {/* ── Type-specific terms ── */}
      {saleType === 'SALE' && <SaleTermsSection invoice={invoice} currency={currency} />}
      {saleType === 'RENT' && <RentTermsSection invoice={invoice} currency={currency} />}
      {saleType === 'LEASE' && <LeaseTermsSection invoice={invoice} currency={currency} />}

      <DocRule />

      {/* ── Advance / Deposit ── */}
      <AdvanceSection invoice={invoice} saleType={saleType} currency={currency} />

      {/* ── Warranty ── */}
      <WarrantySection invoice={invoice} />

      <DocRule />

      {/* ── Terms & Conditions ── */}
      <TermsSection agreement={agreement} />

      <DocRule />

      {/* ── Signatures ── */}
      <SignaturesSection agreement={agreement} />
    </div>
  );
}

// ─── Type-aware default T&C generator ────────────────────────────────────────

export function defaultTermsForType(saleType?: string): string {
  const type = (saleType || 'SALE').toUpperCase();

  if (type === 'RENT') {
    return `1. This agreement sets out the terms for rental of the above-described equipment.
2. The equipment remains the sole property of the Seller throughout the rental period.
3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.
4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.
5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.
6. Either party may terminate this agreement with 30 days' written notice.
7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.
8. Security deposit, if any, will be refunded upon equipment return and final account settlement.
9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.
10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.`;
  }

  if (type === 'LEASE') {
    return `1. This agreement sets out the terms for the lease of the above-described equipment.
2. The equipment remains the property of the Seller for the full lease tenure unless otherwise agreed in writing.
3. The Buyer is responsible for proper use, care, and maintenance of the equipment during the lease term.
4. Lease payments are as specified in the Lease Terms section and are non-refundable once due.
5. Any down payment or advance is applied against the total lease value as specified.
6. Early termination prior to the agreed tenure may result in penalties per the Seller's policy.
7. Upon lease completion, the disposition of the equipment shall be as separately agreed in writing.
8. The Buyer shall not sub-lease, sell, or encumber the equipment without prior written consent of the Seller.
9. The Seller shall ensure the equipment is in good working order at the commencement of the lease.
10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.`;
  }

  // SALE (default)
  return `1. This agreement confirms the sale of the above-described equipment from Seller to Buyer.
2. Title and risk in the equipment pass to the Buyer upon full payment of the total purchase price.
3. The Seller warrants the equipment is free from manufacturing defects at the time of delivery.
4. Warranty coverage is as specified in the Warranty section of this agreement, where applicable.
5. Returns and exchanges are subject to the Seller's return and exchange policy.
6. Any balance due after the advance payment must be settled as per the agreed payment terms.
7. The Buyer accepts the equipment in the condition and specification as described herein.
8. The Seller shall not be liable for any indirect or consequential loss arising from use of the equipment.
9. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.`;
}
