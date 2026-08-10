'use client';

import React from 'react';
import { Invoice } from '@/lib/invoice';
import { ContractAgreement } from '@/lib/saleWorkflow';
import {
  Building2,
  User,
  Package,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Banknote,
} from 'lucide-react';

interface Props {
  invoice: Invoice;
  agreement: ContractAgreement;
  currency: string;
}

// ─── Tiny shared layout pieces ────────────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-700">{value || '—'}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}

// ─── Plan type → human label ──────────────────────────────────────────────────

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

// ─── Shared: Parties ──────────────────────────────────────────────────────────

function PartiesSection({
  invoice,
  agreement,
}: {
  invoice: Invoice;
  agreement: ContractAgreement;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
          <Building2 size={9} /> Seller / Dealer
        </p>
        <p className="text-sm font-black text-slate-800">{agreement.dealerName}</p>
        {agreement.dealerAddress && (
          <p className="text-[11px] text-slate-500 mt-0.5">{agreement.dealerAddress}</p>
        )}
        {agreement.dealerPhone && (
          <p className="text-[11px] text-slate-500">{agreement.dealerPhone}</p>
        )}
        {invoice.taxRegistrationNumber && (
          <p className="text-[10px] text-slate-400 mt-1">
            VAT Reg: {invoice.taxRegistrationNumber}
          </p>
        )}
        {invoice.employeeName && (
          <p className="text-[10px] text-slate-500 mt-1.5 font-bold">
            Sales Rep: {invoice.employeeName}
          </p>
        )}
      </div>
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
          <User size={9} /> Buyer / Customer
        </p>
        <p className="text-sm font-black text-slate-800">{agreement.customerName}</p>
        {agreement.customerAddress && (
          <p className="text-[11px] text-slate-500 mt-0.5">{agreement.customerAddress}</p>
        )}
        {agreement.customerPhone && (
          <p className="text-[11px] text-slate-500">{agreement.customerPhone}</p>
        )}
        {agreement.customerEmail && (
          <p className="text-[11px] text-slate-500">{agreement.customerEmail}</p>
        )}
        {agreement.customerVatNumber && (
          <p className="text-[10px] text-slate-400 mt-1">VAT: {agreement.customerVatNumber}</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared: Product details ──────────────────────────────────────────────────

function ProductSection({ invoice }: { invoice: Invoice }) {
  const productItems = (invoice.items || []).filter(
    (i) => i.itemType === 'PRODUCT' || !!i.productId,
  );
  const allocations = (invoice.productAllocations || []).filter((a) => a.status === 'ALLOCATED');

  if (productItems.length === 0 && allocations.length === 0) return null;

  return (
    <div>
      <SectionHead>
        <span className="flex items-center gap-1">
          <Package size={9} />
          Equipment / Product Details
        </span>
      </SectionHead>
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2.5 font-black text-slate-500 text-[10px]">Description</th>
              <th className="text-left p-2.5 font-black text-slate-500 text-[10px]">Serial No.</th>
              <th className="text-left p-2.5 font-black text-slate-500 text-[10px]">Warranty</th>
            </tr>
          </thead>
          <tbody>
            {productItems.length > 0
              ? productItems.map((item, idx) => {
                  // Find matching allocation for serial number if not on item
                  const alloc = allocations[idx];
                  const serial = item.serialNumber || item.sn || alloc?.serialNumber || '—';
                  return (
                    <tr key={idx} className="border-t border-slate-50">
                      <td className="p-2.5 font-bold text-slate-700">{item.description}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">{serial}</td>
                      <td className="p-2.5 text-[11px] text-slate-500">{item.warranty || '—'}</td>
                    </tr>
                  );
                })
              : allocations.map((alloc, idx) => (
                  <tr key={idx} className="border-t border-slate-50">
                    <td className="p-2.5 font-bold text-slate-700">Allocated Machine</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-600">
                      {alloc.serialNumber}
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-500">—</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared: Warranty ─────────────────────────────────────────────────────────

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
      <SectionHead>
        <span className="flex items-center gap-1">
          <ShieldCheck size={9} />
          Warranty
        </span>
      </SectionHead>
      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="text-xs font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={12} className="shrink-0" />
            {line}
          </p>
        ))}
        <p className="text-[10px] text-emerald-600 pt-0.5">
          Warranty applies from the date of installation/delivery and covers manufacturing defects
          under normal operating conditions.
        </p>
      </div>
    </div>
  );
}

// ─── Shared: Signatures ───────────────────────────────────────────────────────

function SignaturesSection({ agreement }: { agreement: ContractAgreement }) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
      {/* Seller */}
      <div>
        <SectionHead>Seller Signature</SectionHead>
        {agreement.employeeSignatureData ? (
          <div className="border border-slate-100 rounded-xl p-2 bg-white">
            <img
              src={agreement.employeeSignatureData}
              alt="Employee Signature"
              className="max-h-20 w-full object-contain"
            />
            <p className="text-[9px] text-slate-400 mt-1 font-bold">
              {agreement.employeeSignedByName}
              {agreement.employeeSignedAt
                ? ` · ${new Date(agreement.employeeSignedAt).toLocaleDateString('en-GB')}`
                : ''}
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold">Awaiting seller signature</p>
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-[9px] text-slate-400">Authorised Signatory</p>
          <p className="text-[9px] text-slate-400">{agreement.dealerName}</p>
        </div>
      </div>

      {/* Customer */}
      <div>
        <SectionHead>Customer Signature</SectionHead>
        {agreement.customerSignedMethod === 'UPLOAD' && agreement.customerSignedDocumentUrl ? (
          <div className="border border-amber-200 rounded-xl p-3 bg-amber-50 space-y-1.5">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-amber-600 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                Uploaded Document
              </p>
            </div>
            <a
              href={agreement.customerSignedDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
            >
              <ExternalLink size={11} />
              View Signed Document
            </a>
            {agreement.customerSignedDocumentNote && (
              <p className="text-[10px] text-amber-700 bg-amber-100 rounded px-2 py-1">
                {agreement.customerSignedDocumentNote}
              </p>
            )}
            <p className="text-[9px] text-slate-400 font-bold">
              {agreement.customerSignedByName}
              {agreement.customerSignedAt
                ? ` · ${new Date(agreement.customerSignedAt).toLocaleDateString('en-GB')}`
                : ''}
            </p>
          </div>
        ) : agreement.customerSignatureData ? (
          <div className="border border-slate-100 rounded-xl p-2 bg-white">
            <img
              src={agreement.customerSignatureData}
              alt="Customer Signature"
              className="max-h-20 w-full object-contain"
            />
            <p className="text-[9px] text-slate-400 mt-1 font-bold">
              {agreement.customerSignedByName}
              {agreement.customerSignedAt
                ? ` · ${new Date(agreement.customerSignedAt).toLocaleDateString('en-GB')}`
                : ''}
              {agreement.customerSignedMethod === 'REMOTE' && (
                <span className="ml-1 text-indigo-500">(Remote)</span>
              )}
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold">Awaiting customer signature</p>
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-[9px] text-slate-400">Customer / Authorised Representative</p>
          <p className="text-[9px] text-slate-400">{agreement.customerName}</p>
        </div>
      </div>

      {/* Footer declaration */}
      <div className="col-span-2 text-center pt-2">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          By signing above, both parties confirm that they have read, understood, and agreed to the
          terms and conditions set out in this agreement.
        </p>
      </div>
    </div>
  );
}

// ─── SALE: type-specific section ──────────────────────────────────────────────

function SaleTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  const subtotal = Number(invoice.totalAmount ?? 0) - Number(invoice.taxAmount ?? 0);
  const tax = Number(invoice.taxAmount ?? 0);
  const total = Number(invoice.totalAmount ?? 0);
  const advance = Number(invoice.advanceAmount ?? 0);
  const balanceDue = Math.max(0, total - advance);

  return (
    <div>
      <SectionHead>Sale Summary</SectionHead>
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-bold text-slate-600">Subtotal</span>
          <span className="font-black text-slate-800">{fmtAmt(subtotal, currency)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-xs">
            <span className="font-bold text-slate-500">
              {invoice.taxName || 'VAT'}
              {invoice.taxPercent ? ` (${invoice.taxPercent}%)` : ''}
            </span>
            <span className="font-black text-slate-700">{fmtAmt(tax, currency)}</span>
          </div>
        )}
        {invoice.customerVatStatus === 'EXEMPT' && (
          <div className="flex justify-between text-xs">
            <span className="font-bold text-slate-500">VAT</span>
            <span className="font-black text-emerald-600">VAT Exempt</span>
          </div>
        )}
        <div className="flex justify-between border-t border-indigo-100 pt-2 text-sm">
          <span className="font-black text-slate-700">Total Amount</span>
          <span className="font-black text-indigo-700">{fmtAmt(total, currency)}</span>
        </div>
        {advance > 0 && (
          <>
            <div className="flex justify-between text-xs text-emerald-600">
              <span className="font-bold">Advance Paid</span>
              <span className="font-black">− {fmtAmt(advance, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-indigo-100 pt-2 text-sm">
              <span className="font-black text-slate-700">Balance Due</span>
              <span className="font-black text-red-600">{fmtAmt(balanceDue, currency)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RENT: type-specific section ──────────────────────────────────────────────

function RentTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
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
      <SectionHead>Rental Terms</SectionHead>
      <div className="border border-blue-100 rounded-xl overflow-hidden">
        {/* Contract period + billing cycle row */}
        <div className="bg-blue-50/60 p-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-blue-500 mb-0.5">
              Contract Period
            </p>
            <p className="text-sm font-black text-slate-700">{fmtDate(invoice.effectiveFrom)}</p>
            {invoice.effectiveTo && (
              <p className="text-[11px] text-slate-500">to {fmtDate(invoice.effectiveTo)}</p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-blue-500 mb-0.5">
              Billing Cycle
            </p>
            <p className="text-sm font-black text-slate-700">
              {billingCycleLabel(invoice.rentPeriod)}
            </p>
          </div>
        </div>

        {/* Plan type + monthly rate */}
        <div className="p-3 grid grid-cols-2 gap-4 border-t border-blue-100">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Plan Type
            </p>
            <p className="text-sm font-bold text-slate-700">{planLabel(invoice.rentType)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Monthly Rate
            </p>
            <p className="text-sm font-black text-blue-700">
              {fmtAmt(invoice.monthlyRent, currency)}
            </p>
          </div>
        </div>

        {/* B&W usage limits */}
        {bwItem && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-700 inline-block" />
              Black & White Usage
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                <InfoRow
                  label="Free Limit (A4)"
                  value={`${Number(bwItem.bwIncludedLimit).toLocaleString()} copies / billing period`}
                />
              )}
              {(bwItem.bwExcessRate ?? 0) > 0 && (
                <InfoRow
                  label="Excess Rate (A4)"
                  value={`${currency} ${Number(bwItem.bwExcessRate).toFixed(4)} per copy`}
                />
              )}
            </div>
          </div>
        )}

        {/* Color usage limits */}
        {colorItem && (
          <div className="p-3 border-t border-slate-100 bg-rose-50/30">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
              Color Usage
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(colorItem.colorIncludedLimit ?? 0) > 0 && (
                <InfoRow
                  label="Free Limit"
                  value={`${Number(colorItem.colorIncludedLimit).toLocaleString()} copies / billing period`}
                />
              )}
              {(colorItem.colorExcessRate ?? 0) > 0 && (
                <InfoRow
                  label="Excess Rate"
                  value={`${currency} ${Number(colorItem.colorExcessRate).toFixed(4)} per copy`}
                />
              )}
            </div>
          </div>
        )}

        {/* Combined/Combo limits */}
        {comboItem && (
          <div className="p-3 border-t border-slate-100 bg-violet-50/30">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
              Combined (B&W + Color)
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(comboItem.combinedIncludedLimit ?? 0) > 0 && (
                <InfoRow
                  label="Free Limit"
                  value={`${Number(comboItem.combinedIncludedLimit).toLocaleString()} copies / billing period`}
                />
              )}
              {(comboItem.combinedExcessRate ?? 0) > 0 && (
                <InfoRow
                  label="Excess Rate"
                  value={`${currency} ${Number(comboItem.combinedExcessRate).toFixed(4)} per copy`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LEASE: type-specific section ────────────────────────────────────────────

function LeaseTermsSection({ invoice, currency }: { invoice: Invoice; currency: string }) {
  const isEMI = invoice.leaseType === 'EMI';

  // For FSM leases, reuse rent pricing rule items
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
      <SectionHead>Lease Terms</SectionHead>
      <div className="border border-violet-100 rounded-xl overflow-hidden">
        {/* Lease type + tenure */}
        <div className="bg-violet-50/60 p-3 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-violet-500 mb-0.5">
              Lease Type
            </p>
            <p className="text-sm font-black text-slate-700">{isEMI ? 'EMI' : 'FSM'}</p>
            <p className="text-[10px] text-slate-500">
              {isEMI ? 'Equal Monthly Installments' : 'Full-Service Management'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-violet-500 mb-0.5">
              Tenure
            </p>
            <p className="text-sm font-black text-slate-700">
              {invoice.leaseTenureMonths ?? '—'} months
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-violet-500 mb-0.5">
              Contract Start
            </p>
            <p className="text-sm font-black text-slate-700">{fmtDate(invoice.effectiveFrom)}</p>
          </div>
        </div>

        {isEMI ? (
          /* EMI details */
          <div className="p-3 border-t border-violet-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Monthly EMI
              </p>
              <p className="text-sm font-black text-violet-700">
                {fmtAmt(invoice.monthlyEmiAmount ?? invoice.monthlyLeaseAmount, currency)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Total Lease Value
              </p>
              <p className="text-sm font-black text-slate-700">
                {fmtAmt(invoice.totalLeaseAmount ?? invoice.totalAmount, currency)}
              </p>
            </div>
          </div>
        ) : (
          /* FSM: plan type + service rate */
          <>
            <div className="p-3 border-t border-violet-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                  Service Plan
                </p>
                <p className="text-sm font-bold text-slate-700">{planLabel(invoice.rentType)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                  Monthly Service Amount
                </p>
                <p className="text-sm font-black text-violet-700">
                  {fmtAmt(invoice.monthlyLeaseAmount ?? invoice.monthlyRent, currency)}
                </p>
              </div>
            </div>

            {bwItem && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/40">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-700 inline-block" />
                  Black & White Usage
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {(bwItem.bwIncludedLimit ?? 0) > 0 && (
                    <InfoRow
                      label="Free Limit (A4)"
                      value={`${Number(bwItem.bwIncludedLimit).toLocaleString()} copies / month`}
                    />
                  )}
                  {(bwItem.bwExcessRate ?? 0) > 0 && (
                    <InfoRow
                      label="Excess Rate"
                      value={`${currency} ${Number(bwItem.bwExcessRate).toFixed(4)} / copy`}
                    />
                  )}
                </div>
              </div>
            )}

            {colorItem && (
              <div className="p-3 border-t border-slate-100 bg-rose-50/30">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                  Color Usage
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {(colorItem.colorIncludedLimit ?? 0) > 0 && (
                    <InfoRow
                      label="Free Limit"
                      value={`${Number(colorItem.colorIncludedLimit).toLocaleString()} copies / month`}
                    />
                  )}
                  {(colorItem.colorExcessRate ?? 0) > 0 && (
                    <InfoRow
                      label="Excess Rate"
                      value={`${currency} ${Number(colorItem.colorExcessRate).toFixed(4)} / copy`}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared: Advance / Deposit / Down-payment section ─────────────────────────

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

  // Label depends on contract type
  const advanceLabel =
    saleType === 'SALE'
      ? 'Advance Payment'
      : saleType === 'LEASE'
        ? 'Down Payment'
        : 'Advance Payment';

  const depositNote =
    saleType === 'RENT'
      ? 'Security deposit is held for the duration of the rental and refunded upon equipment return after final settlement.'
      : null;

  const advanceNote =
    saleType === 'RENT'
      ? 'Advance payment will be adjusted against the first billing period.'
      : saleType === 'LEASE'
        ? 'Down payment is deducted from the total lease value.'
        : 'Advance reduces the final balance due.';

  if (!hasAdvance && !hasDeposit) {
    return (
      <div>
        <SectionHead>
          <span className="flex items-center gap-1">
            <Banknote size={9} />
            Advance / Deposit
          </span>
        </SectionHead>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400">No advance or deposit taken</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHead>
        <span className="flex items-center gap-1">
          <Banknote size={9} />
          {saleType === 'LEASE' ? 'Down Payment / Advance' : 'Advance & Deposit Details'}
        </span>
      </SectionHead>
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {hasAdvance && (
          <div className="p-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                {advanceLabel}
              </p>
              <p className="text-sm font-black text-slate-800">{fmtAmt(advance, currency)}</p>
            </div>
            {invoice.preferredPaymentMode && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                  Payment Mode
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {paymentModeLabel(invoice.preferredPaymentMode)}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-[10px] text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                {advanceNote}
              </p>
            </div>
          </div>
        )}

        {hasDeposit && (
          <div
            className={`p-3 grid grid-cols-2 gap-4 ${
              hasAdvance ? 'border-t border-slate-100 bg-slate-50/40' : ''
            }`}
          >
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Security Deposit
              </p>
              <p className="text-sm font-black text-slate-800">{fmtAmt(secDeposit, currency)}</p>
            </div>
            {invoice.securityDepositMode && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                  Deposit Mode
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {paymentModeLabel(invoice.securityDepositMode)}
                </p>
              </div>
            )}
            {depositNote && (
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  {depositNote}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared: Terms & Conditions ───────────────────────────────────────────────

function TermsSection({ agreement }: { agreement: ContractAgreement }) {
  if (!agreement.termsAndConditions) return null;
  return (
    <div>
      <SectionHead>Terms & Conditions</SectionHead>
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
          {agreement.termsAndConditions}
        </pre>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

const AGREEMENT_META: Record<
  string,
  { title: string; subtitle: string; accentBg: string; accentText: string; borderColor: string }
> = {
  SALE: {
    title: 'Sale Agreement',
    subtitle: 'This document confirms the sale transaction between the parties named below.',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    borderColor: 'border-indigo-100',
  },
  RENT: {
    title: 'Rental Agreement',
    subtitle:
      'This document sets out the terms for rental of equipment between the parties named below.',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    borderColor: 'border-blue-100',
  },
  LEASE: {
    title: 'Lease Agreement',
    subtitle:
      'This document sets out the terms for equipment lease between the parties named below.',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    borderColor: 'border-violet-100',
  },
};

export function ContractDocumentBody({ invoice, agreement, currency }: Props) {
  const saleType = (invoice.saleType || 'SALE').toUpperCase();
  const meta = AGREEMENT_META[saleType] || AGREEMENT_META.SALE;

  return (
    <div className="space-y-5 text-slate-800">
      {/* ── Document Header ──────────────────────────────────────── */}
      <div className={`text-center rounded-xl p-4 border ${meta.accentBg} ${meta.borderColor}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${meta.accentText}`}>
          {meta.title}
        </p>
        <h2 className="text-xl font-black text-slate-800 mt-1">{agreement.agreementNumber}</h2>
        <p className="text-xs text-slate-500 mt-1">{fmtDate(agreement.contractDate)}</p>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
          {meta.subtitle}
        </p>
        <p className="text-[10px] font-bold text-slate-500 mt-2">
          Contract Ref: {invoice.invoiceNumber}
        </p>
      </div>

      <Divider />

      {/* ── Parties ─────────────────────────────────────────────── */}
      <PartiesSection invoice={invoice} agreement={agreement} />

      {/* ── Product / Equipment ─────────────────────────────────── */}
      <ProductSection invoice={invoice} />

      <Divider />

      {/* ── Type-specific terms ──────────────────────────────────── */}
      {saleType === 'SALE' && <SaleTermsSection invoice={invoice} currency={currency} />}
      {saleType === 'RENT' && <RentTermsSection invoice={invoice} currency={currency} />}
      {saleType === 'LEASE' && <LeaseTermsSection invoice={invoice} currency={currency} />}

      <Divider />

      {/* ── Advance / Deposit ───────────────────────────────────── */}
      <AdvanceSection invoice={invoice} saleType={saleType} currency={currency} />

      {/* ── Warranty ────────────────────────────────────────────── */}
      <WarrantySection invoice={invoice} />

      <Divider />

      {/* ── Terms & Conditions ──────────────────────────────────── */}
      <TermsSection agreement={agreement} />

      <Divider />

      {/* ── Signatures ──────────────────────────────────────────── */}
      <SignaturesSection agreement={agreement} />
    </div>
  );
}

// ─── Type-aware default T&C generator (used at agreement creation) ────────────

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
