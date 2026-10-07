'use client';

import React from 'react';
import { Letterhead, ACCENT, COMPANY } from '@/components/shared/documentTemplate';
import { DocSectionTitle, DocFieldLabel, docBody } from '@/components/shared/documentStyle';
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

// Accessories (stand, tray, stapler unit, etc.) added alongside the Rent/Lease machine —
// real priced items, billed once with the first month advance, never metered. Kept
// separate from the machine/equipment rows below (which they'd otherwise pollute, since
// they also carry a productId) and from the Initial Amount Payable total (which otherwise
// silently omitted them).
function getAccessoryItems(invoice: Invoice) {
  return (invoice.items || []).filter((i) => (i.itemType as string) === 'ACCESSORY');
}
function getAccessoryTotal(invoice: Invoice) {
  return getAccessoryItems(invoice).reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0,
  );
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

// Headings and captions come from the shared quotation look so an agreement, a bill and
// a quotation read as one set of paperwork. Nothing here draws a rule — the quotation
// separates sections with space, not lines.
/** Body typography for the whole agreement, matching the quotation layouts. */
const docStyleBase: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  fontSize: 12,
  fontWeight: 300,
  color: 'var(--foreground)',
};

const SectionHeading = DocSectionTitle;
const FieldLabel = DocFieldLabel;

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
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 300, color: ACCENT, marginBottom: 6 }}>
            {COMPANY.name}
          </div>
          <div
            style={{ fontSize: 12, fontWeight: 300, color: 'var(--foreground)', lineHeight: 1.5 }}
          >
            <div>{agreement.dealerAddress || COMPANY.addressLine1}</div>
            {agreement.dealerPhone ? <div>Mobile: {agreement.dealerPhone}</div> : null}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 300, color: ACCENT, textTransform: 'uppercase' }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--foreground)', marginTop: 6 }}>
            Ref: {agreement.agreementNumber}
          </div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--foreground)' }}>
            Date: {fmtDate(agreement.contractDate)}
          </div>
        </div>
      </div>
      <div style={{ ...docBody, marginTop: 10 }}>{meta.subtitle}</div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {/* Seller */}
        <div className="p-3">
          <FieldLabel>Seller / Dealer</FieldLabel>
          <p className="text-sm font-black text-foreground mb-1">{agreement.dealerName}</p>
          {agreement.dealerAddress && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {agreement.dealerAddress}
            </p>
          )}
          {agreement.dealerPhone && (
            <p className="text-[11px] text-muted-foreground">{agreement.dealerPhone}</p>
          )}
          {invoice.taxRegistrationNumber && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {invoice.taxName || 'VAT'} Reg. No.: {invoice.taxRegistrationNumber}
            </p>
          )}
          {invoice.employeeName && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Sales Rep: {invoice.employeeName}
            </p>
          )}
        </div>
        {/* Buyer */}
        <div className="p-3">
          <FieldLabel>Buyer / Customer</FieldLabel>
          <p className="text-sm font-black text-foreground mb-1">{agreement.customerName}</p>
          {agreement.customerAddress && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {agreement.customerAddress}
            </p>
          )}
          {agreement.customerPhone && (
            <p className="text-[11px] text-muted-foreground">{agreement.customerPhone}</p>
          )}
          {agreement.customerEmail && (
            <p className="text-[11px] text-muted-foreground">{agreement.customerEmail}</p>
          )}
          {agreement.customerVatNumber && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {invoice.taxName || 'VAT'} Reg. No.: {agreement.customerVatNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product / Equipment ──────────────────────────────────────────────────────

function ProductSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  // Accessories carry a productId too (they're real catalog products) but aren't
  // equipment being rented/leased — including them here used to both mislabel them as
  // "Allocated Machine" hardware AND desync the index-based pairing with `allocations`
  // below (an accessory taking a slot meant for the next real machine's serial number).
  // `allocations` now filters on ProductAllocation's own itemType directly (see its
  // entity comment) rather than relying only on the invoice.items side staying in sync.
  const productItems = (invoice.items || []).filter(
    (i) => (i.itemType === 'PRODUCT' || !!i.productId) && (i.itemType as string) !== 'ACCESSORY',
  );
  const allocations = (invoice.productAllocations || []).filter(
    (a) => a.status === 'ALLOCATED' && a.itemType !== 'ACCESSORY',
  );
  const accessoryItems = getAccessoryItems(invoice);
  const accessoryTotal = getAccessoryTotal(invoice);
  if (productItems.length === 0 && allocations.length === 0 && accessoryItems.length === 0)
    return null;

  return (
    <div className="space-y-4">
      {(productItems.length > 0 || allocations.length > 0) && (
        <div>
          <SectionHeading>Equipment / Product Details</SectionHeading>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                  Description
                </th>
                <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                  Serial No.
                </th>
                <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
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
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-foreground">
                          {item.description}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground">
                          {serial}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">
                          {item.warranty || '—'}
                        </td>
                      </tr>
                    );
                  })
                : allocations.map((alloc, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-semibold text-foreground">Allocated Machine</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-foreground">
                        {alloc.serialNumber}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">—</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {accessoryItems.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-info mb-2">
            Accessories Included
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-info/10">
                <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-widest text-info">
                  Description
                </th>
                <th className="text-center px-3 py-2 font-black text-[10px] uppercase tracking-widest text-info">
                  Qty
                </th>
                <th className="text-right px-3 py-2 font-black text-[10px] uppercase tracking-widest text-info">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {accessoryItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-semibold text-foreground">{item.description}</td>
                  <td className="px-3 py-2 text-center text-foreground">{item.quantity ?? 1}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    {fmtAmt((item.quantity ?? 1) * Number(item.unitPrice ?? 0), currency)}
                  </td>
                </tr>
              ))}
              <tr className="bg-info/10">
                <td
                  colSpan={2}
                  className="px-3 py-2 text-right font-black text-info text-[11px] uppercase"
                >
                  Accessories Total
                </td>
                <td className="px-3 py-2 text-right font-black text-info">
                  {fmtAmt(accessoryTotal, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
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
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="px-3 py-2 text-foreground font-semibold">Subtotal</td>
            <td className="px-3 py-2 text-right font-semibold text-foreground">
              {fmtAmt(subtotal, currency)}
            </td>
          </tr>
          {tax > 0 && (
            <tr>
              <td className="px-3 py-2 text-muted-foreground font-semibold">
                {invoice.taxName || 'VAT'}
                {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-foreground">
                {fmtAmt(tax, currency)}
              </td>
            </tr>
          )}
          {invoice.customerVatStatus === 'EXEMPT' && (
            <tr>
              <td className="px-3 py-2 text-muted-foreground font-semibold">
                {invoice.taxName || 'VAT'}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-foreground">
                {invoice.taxName || 'VAT'} Exempt
              </td>
            </tr>
          )}
          <tr className="bg-muted">
            <td className="px-3 py-2 font-black text-foreground">Total Amount</td>
            <td className="px-3 py-2 text-right font-black text-foreground">
              {fmtAmt(total, currency)}
            </td>
          </tr>
          {advance > 0 && (
            <>
              <tr>
                <td className="px-3 py-2 text-muted-foreground font-semibold">Advance Paid</td>
                <td className="px-3 py-2 text-right font-semibold text-foreground">
                  − {fmtAmt(advance, currency)}
                </td>
              </tr>
              <tr className="bg-muted">
                <td className="px-3 py-2 font-black text-foreground">Balance Due</td>
                <td className="px-3 py-2 text-right font-black text-foreground">
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
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="px-3 py-2 w-32 sm:w-48 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Contract Start
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {fmtDate(invoice.effectiveFrom)}
            </td>
          </tr>
          {invoice.effectiveTo && (
            <tr>
              <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Contract End
              </td>
              <td className="px-3 py-2 font-semibold text-foreground">
                {fmtDate(invoice.effectiveTo)}
              </td>
            </tr>
          )}
          <tr>
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Billing Cycle
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {billingCycleLabel(invoice.rentPeriod)}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Payment Timing
            </td>
            <td className="px-3 py-2 font-semibold text-foreground uppercase">
              {invoice.paymentTiming === 'ARREARS' ? 'Arrears (Postpaid)' : 'Advance'}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Plan Type
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {planLabel(invoice.rentType)}
            </td>
          </tr>
          <tr className="bg-muted">
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Monthly Rate
            </td>
            <td className="px-3 py-2 font-black text-foreground">
              {fmtAmt(invoice.monthlyRent, currency)}
            </td>
          </tr>
          {monthlyRentTax > 0 && (
            <>
              <tr>
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {invoice.taxName || 'VAT'}
                  {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                </td>
                <td className="px-3 py-2 font-semibold text-foreground">
                  {fmtAmt(monthlyRentTax, currency)}
                </td>
              </tr>
              <tr className="bg-muted">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Monthly Rate (Incl. {invoice.taxName || 'VAT'})
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(monthlyRentInclTax, currency)}
                </td>
              </tr>
            </>
          )}

          {/* B&W usage */}
          {bwItem && (
            <>
              {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    B&W Free Limit (A4)
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {Number(bwItem.bwIncludedLimit).toLocaleString()} copies / billing period
                  </td>
                </tr>
              )}
              {(bwItem.bwExcessRate ?? 0) > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    B&W Excess Rate (A4)
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
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
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Color Free Limit
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {Number(colorItem.colorIncludedLimit).toLocaleString()} copies / billing period
                  </td>
                </tr>
              )}
              {(colorItem.colorExcessRate ?? 0) > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Color Excess Rate
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
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
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Combined Free Limit
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {Number(comboItem.combinedIncludedLimit).toLocaleString()} copies / billing
                    period
                  </td>
                </tr>
              )}
              {(comboItem.combinedExcessRate ?? 0) > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Combined Excess Rate
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {currency} {Number(comboItem.combinedExcessRate).toFixed(4)} per copy
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>

      {/* Contract Rental Value */}
      {invoice.effectiveFrom &&
        invoice.effectiveTo &&
        (() => {
          const months = Math.round(
            (new Date(invoice.effectiveTo).getTime() - new Date(invoice.effectiveFrom).getTime()) /
              (1000 * 60 * 60 * 24 * 30.44),
          );
          const rentalValue = (invoice.monthlyRent || 0) * months;
          const isArrears = invoice.paymentTiming === 'ARREARS';
          const firstAdvance = isArrears ? 0 : Number(invoice.advanceAmount || 0);
          const secDeposit = Number(invoice.securityDepositAmount || 0);
          const accessoryTotal = getAccessoryTotal(invoice);
          const initialPayable = firstAdvance + secDeposit + accessoryTotal;

          // Build monthly schedule
          const schedule = [];
          if (months > 0) {
            const start = new Date(invoice.effectiveFrom);
            for (let i = 0; i < months; i++) {
              const pStart = new Date(start);
              pStart.setMonth(pStart.getMonth() + i);
              const pEnd = new Date(pStart);
              pEnd.setMonth(pEnd.getMonth() + 1);
              pEnd.setDate(pEnd.getDate() - 1);
              const actualEnd =
                pEnd > new Date(invoice.effectiveTo) ? new Date(invoice.effectiveTo) : pEnd;
              schedule.push({
                month: i + 1,
                label: pStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                start: pStart,
                end: actualEnd,
                baseRent: invoice.monthlyRent || 0,
              });
            }
          }

          return (
            <div className="mt-6">
              <SectionHeading>Contract Financial Summary</SectionHeading>

              {/* Contract Rental Value */}
              <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">
                  Contract Rental Value
                </p>
                <div className="bg-primary/10 rounded p-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-foreground">Monthly Rent × {months} Months</span>
                    <span className="text-sm font-black text-primary">
                      {fmtAmt(rentalValue, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Initial Payment */}
              <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-success mb-2">
                  Initial Payment
                </p>
                <div className="space-y-1">
                  {!isArrears && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">First Month Advance Payment</span>
                      <span className="font-semibold">{fmtAmt(firstAdvance, currency)}</span>
                    </div>
                  )}
                  {isArrears && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">First Month Advance</span>
                      <span className="text-muted-foreground italic">
                        Not Applicable (Postpaid)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">Security Deposit</span>
                    <span className="font-semibold">
                      {secDeposit > 0 ? fmtAmt(secDeposit, currency) : 'None'}
                    </span>
                  </div>
                  {accessoryTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">Accessories</span>
                      <span className="font-semibold">{fmtAmt(accessoryTotal, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1">
                    <span className="text-success uppercase">Initial Amount Payable</span>
                    <span className="text-success">{fmtAmt(initialPayable, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Schedule */}
              {schedule.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-lease mb-2">
                    Contract Rental Schedule
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-2 py-1 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                          Period
                        </th>
                        <th className="px-2 py-1 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                          Start
                        </th>
                        <th className="px-2 py-1 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                          End
                        </th>
                        <th className="px-2 py-1 text-right text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                          Base Rent
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr key={row.month}>
                          <td className="px-2 py-1 font-semibold">
                            Month {row.month} — {row.label}
                          </td>
                          <td className="px-2 py-1 text-foreground">
                            {fmtDate(row.start.toISOString())}
                          </td>
                          <td className="px-2 py-1 text-foreground">
                            {fmtDate(row.end.toISOString())}
                          </td>
                          <td className="px-2 py-1 text-right font-semibold">
                            {fmtAmt(row.baseRent, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-primary/10">
                        <td
                          colSpan={3}
                          className="px-2 py-1 text-right text-[9px] font-black uppercase tracking-widest text-primary"
                        >
                          Total Contract Rental Value
                        </td>
                        <td className="px-2 py-1 text-right text-xs font-black text-primary">
                          {fmtAmt(rentalValue, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
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
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="px-3 py-2 w-32 sm:w-48 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Lease Type
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {isEMI ? 'EMI — Equal Monthly Installments' : 'FSM — Full-Service Management'}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Tenure
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {invoice.leaseTenureMonths ?? '—'} months
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Contract Start
            </td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {fmtDate(invoice.effectiveFrom)}
            </td>
          </tr>

          {isEMI ? (
            <>
              <tr className="bg-muted">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Monthly EMI
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(invoice.monthlyEmiAmount ?? invoice.monthlyLeaseAmount, currency)}
                </td>
              </tr>
              {monthlyTax > 0 && (
                <>
                  <tr>
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {invoice.taxName || 'VAT'}
                      {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                    </td>
                    <td className="px-3 py-2 font-semibold text-foreground">
                      {fmtAmt(monthlyTax, currency)}
                    </td>
                  </tr>
                  <tr className="bg-muted">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Monthly EMI (Incl. {invoice.taxName || 'VAT'})
                    </td>
                    <td className="px-3 py-2 font-black text-foreground">
                      {fmtAmt(monthlyInclTax, currency)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Total Lease Value
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(invoice.totalLeaseAmount ?? invoice.totalAmount, currency)}
                </td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Service Plan
                </td>
                <td className="px-3 py-2 font-semibold text-foreground">
                  {planLabel(invoice.rentType)}
                </td>
              </tr>
              <tr className="bg-muted">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Monthly Service Amount
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(invoice.monthlyLeaseAmount ?? invoice.monthlyRent, currency)}
                </td>
              </tr>
              {monthlyTax > 0 && (
                <>
                  <tr>
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {invoice.taxName || 'VAT'}
                      {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
                    </td>
                    <td className="px-3 py-2 font-semibold text-foreground">
                      {fmtAmt(monthlyTax, currency)}
                    </td>
                  </tr>
                  <tr className="bg-muted">
                    <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Monthly Service Amount (Incl. {invoice.taxName || 'VAT'})
                    </td>
                    <td className="px-3 py-2 font-black text-foreground">
                      {fmtAmt(monthlyInclTax, currency)}
                    </td>
                  </tr>
                </>
              )}
              {bwItem && (
                <>
                  {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        B&W Free Limit (A4)
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {Number(bwItem.bwIncludedLimit).toLocaleString()} copies / month
                      </td>
                    </tr>
                  )}
                  {(bwItem.bwExcessRate ?? 0) > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        B&W Excess Rate
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {currency} {Number(bwItem.bwExcessRate).toFixed(4)} / copy
                      </td>
                    </tr>
                  )}
                </>
              )}
              {colorItem && (
                <>
                  {(colorItem.colorIncludedLimit ?? 0) > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Color Free Limit
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {Number(colorItem.colorIncludedLimit).toLocaleString()} copies / month
                      </td>
                    </tr>
                  )}
                  {(colorItem.colorExcessRate ?? 0) > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Color Excess Rate
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
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

// ─── First Month Advance & Security Deposit ──────────────────────────────────

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
  const accessoryItems = getAccessoryItems(invoice);
  const accessoryTotal = getAccessoryTotal(invoice);
  const hasAdvance = advance > 0;
  const hasDeposit = secDeposit > 0;
  const hasAccessories = accessoryTotal > 0;
  if (!hasAdvance && !hasDeposit && !hasAccessories) return null;

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
        {saleType === 'LEASE' ? 'Down Payment / Advance' : 'First Month Advance & Security Deposit'}
        {hasAccessories ? ' & Accessories' : ''}
      </SectionHeading>
      <table className="w-full text-xs">
        <tbody>
          {hasAdvance && (
            <>
              <tr>
                <td className="px-3 py-2 w-32 sm:w-48 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {advanceLabel}
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(advanceTax > 0 ? advanceInclTax : advance, currency)}
                </td>
              </tr>
              {advanceTax > 0 && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {invoice.taxName || 'VAT'}
                    {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''} on {advanceLabel}
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {fmtAmt(advanceTax, currency)}{' '}
                    <span className="text-muted-foreground font-normal">
                      (base {fmtAmt(advance, currency)})
                    </span>
                  </td>
                </tr>
              )}
              {invoice.preferredPaymentMode && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Payment Mode
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {paymentModeLabel(invoice.preferredPaymentMode)}
                  </td>
                </tr>
              )}
              <tr className={hasDeposit || hasAccessories ? '' : ''}>
                <td colSpan={2} className="px-3 py-2 text-[10px] text-muted-foreground italic">
                  {advanceNote}
                </td>
              </tr>
            </>
          )}
          {hasDeposit && (
            <>
              <tr className="bg-muted">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Security Deposit
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(secDeposit, currency)}
                </td>
              </tr>
              {invoice.securityDepositMode && (
                <tr>
                  <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Deposit Mode
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {paymentModeLabel(invoice.securityDepositMode)}
                  </td>
                </tr>
              )}
              <tr className={hasAccessories ? '' : ''}>
                <td colSpan={2} className="px-3 py-2 text-[10px] text-muted-foreground italic">
                  {depositNote}
                </td>
              </tr>
            </>
          )}
          {hasAccessories && (
            <>
              <tr className="bg-info/10">
                <td className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-info">
                  Accessories ({accessoryItems.length})
                </td>
                <td className="px-3 py-2 font-black text-foreground">
                  {fmtAmt(accessoryTotal, currency)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-[10px] text-muted-foreground italic">
                  Accessories are collected once, together with the{' '}
                  {hasAdvance ? advanceLabel.toLowerCase() : 'first payment'} above — see Equipment
                  / Product Details for the itemized list.
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
      <div className="px-3 py-2.5 text-xs space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="font-semibold text-foreground">
            {line}
          </p>
        ))}
        <p className="text-[10px] text-muted-foreground mt-1 italic">
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
      <div className="px-3 py-3">
        <pre className="text-[10px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">
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
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Seller */}
        <div className="p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Seller Signature
          </p>
          {agreement.employeeSignatureData ? (
            <div>
              <img
                src={agreement.employeeSignatureData}
                alt="Employee Signature"
                className="max-h-16 w-full object-contain bg-card p-1 mb-1"
              />
              <p className="text-[9px] text-muted-foreground">
                {agreement.employeeSignedByName}
                {agreement.employeeSignedAt
                  ? ` · ${new Date(agreement.employeeSignedAt).toLocaleDateString('en-GB')}`
                  : ''}
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[10px] text-muted-foreground">Awaiting seller signature</p>
            </div>
          )}
          <div className="mt-3 pt-2">
            <p className="text-[9px] text-muted-foreground">Authorised Signatory</p>
            <p className="text-[9px] font-bold text-foreground">{agreement.dealerName}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Customer Signature
          </p>
          {agreement.customerSignedMethod === 'UPLOAD' && agreement.customerSignedDocumentUrl ? (
            <div className="p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-muted-foreground shrink-0" />
                <p className="text-[10px] font-bold text-foreground">Uploaded Document</p>
              </div>
              <a
                href={agreement.customerSignedDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-foreground hover:underline"
              >
                <ExternalLink size={10} />
                View Signed Document
              </a>
              {agreement.customerSignedDocumentNote && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  {agreement.customerSignedDocumentNote}
                </p>
              )}
              <p className="text-[9px] text-muted-foreground">
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
                className="max-h-16 w-full object-contain bg-card p-1 mb-1"
              />
              <p className="text-[9px] text-muted-foreground">
                {agreement.customerSignedByName}
                {agreement.customerSignedAt
                  ? ` · ${new Date(agreement.customerSignedAt).toLocaleDateString('en-GB')}`
                  : ''}
                {agreement.customerSignedMethod === 'REMOTE' && (
                  <span className="ml-1 text-muted-foreground">(Remote)</span>
                )}
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[10px] text-muted-foreground">Awaiting customer signature</p>
            </div>
          )}
          <div className="mt-3 pt-2">
            <p className="text-[9px] text-muted-foreground">Customer / Authorised Representative</p>
            <p className="text-[9px] font-bold text-foreground">{agreement.customerName}</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
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
    // Same stationery the quotations use — letterhead bands top and bottom with the
    // faded trademark behind the content.
    <Letterhead>
      <div style={{ ...docStyleBase }}>
        {/* ── Letterhead / Document Header ── */}
        <DocumentHeader agreement={agreement} saleType={saleType} />

        {/* ── Parties ── */}
        <PartiesSection invoice={invoice} agreement={agreement} />

        {/* ── Equipment ── */}
        <ProductSection invoice={invoice} currency={currency} />

        {/* ── Type-specific terms ── */}
        {saleType === 'SALE' && <SaleTermsSection invoice={invoice} currency={currency} />}
        {saleType === 'RENT' && <RentTermsSection invoice={invoice} currency={currency} />}
        {saleType === 'LEASE' && <LeaseTermsSection invoice={invoice} currency={currency} />}

        {/* ── First Month Advance & Security Deposit ── */}
        <AdvanceSection invoice={invoice} saleType={saleType} currency={currency} />

        {/* ── Warranty ── */}
        <WarrantySection invoice={invoice} />

        {/* ── Terms & Conditions ── */}
        <TermsSection agreement={agreement} />

        {/* ── Signatures ── */}
        <SignaturesSection agreement={agreement} />
      </div>
    </Letterhead>
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
