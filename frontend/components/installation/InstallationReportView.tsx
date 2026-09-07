'use client';

import React from 'react';
import { CheckCircle2, Printer as PrinterIcon } from 'lucide-react';
import {
  formatReportDate,
  formatReportDateTime,
  type InstallationReportDetail,
} from '@/lib/installationReport';
import { formatDuration } from '@/lib/saleWorkflow';

/**
 * The installation report document itself — shared, presentational, and identical on
 * the technician's screen, the customer's signing page and the printout, so all three
 * parties are demonstrably looking at the same document.
 */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-right text-xs font-bold text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function ReadingCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-black text-slate-800">{value.toLocaleString()}</p>
    </div>
  );
}

export function InstallationReportView({ detail }: { detail: InstallationReportDetail }) {
  const { request, contract, machines, fallbackReading, signature, customer, siteAddress } = detail;
  const isMetered = request.saleType === 'RENT' || request.saleType === 'LEASE';

  return (
    <div className="space-y-4 text-slate-800">
      {/* ── Header ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Installation Report
            </p>
            <p className="text-lg font-black text-slate-900">{request.invoiceNumber}</p>
            <p className="text-xs font-bold text-slate-500">
              {contract?.saleType ?? request.saleType ?? '—'}
              {contract?.rentPeriod ? ` · ${contract.rentPeriod}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                request.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {request.status === 'COMPLETED' && <CheckCircle2 size={11} />}
              {request.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Customer & location ── */}
      <Section title="Customer">
        <Row label="Customer Name" value={contract?.customerName || request.customerName} />
        <Row label="Location / Address" value={siteAddress || '—'} />
        {customer?.phone && <Row label="Phone" value={customer.phone} />}
        {customer?.email && <Row label="Email" value={customer.email} />}
        <Row label="Contract No" value={request.invoiceNumber} />
        {contract?.effectiveFrom && (
          <Row label="Contract From" value={formatReportDate(contract.effectiveFrom)} />
        )}
        {contract?.effectiveTo && (
          <Row label="Contract To" value={formatReportDate(contract.effectiveTo)} />
        )}
      </Section>

      {/* ── Machines installed ── */}
      <Section title={machines.length > 1 ? 'Machines Installed' : 'Machine Installed'}>
        {machines.length === 0 ? (
          <p className="py-2 text-xs font-bold text-slate-400">
            No machine allocation is recorded against this contract.
          </p>
        ) : (
          <div className="space-y-3">
            {machines.map((m, i) => (
              <div
                key={m.allocationId}
                className={i > 0 ? 'border-t border-slate-100 pt-3' : undefined}
              >
                <Row label="Product" value={m.productName || '—'} />
                <Row label="Brand" value={m.brand || '—'} />
                <Row label="Model" value={m.modelName || '—'} />
                <Row
                  label="Serial Number"
                  value={<span className="font-mono">{m.serialNumber || '—'}</span>}
                />
                {m.allocationStatus && m.allocationStatus !== 'ALLOCATED' && (
                  <Row
                    label="Since"
                    value={
                      <span className="text-amber-600">
                        {m.allocationStatus === 'REPLACED' ? 'Replaced' : 'Returned'}
                      </span>
                    }
                  />
                )}
                {isMetered && (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Initial Meter Reading
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <ReadingCell label="B&W A4" value={m.initialReading.bwA4} />
                      <ReadingCell label="B&W A3" value={m.initialReading.bwA3} />
                      <ReadingCell label="Colour A4" value={m.initialReading.colorA4} />
                      <ReadingCell label="Colour A3" value={m.initialReading.colorA3} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contract-level reading, shown only when no allocation carries one. */}
        {machines.length === 0 && fallbackReading && isMetered && (
          <div className="mt-2">
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Initial Meter Reading
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              <ReadingCell label="B&W A4" value={fallbackReading.bwA4} />
              <ReadingCell label="B&W A3" value={fallbackReading.bwA3} />
              <ReadingCell label="Colour A4" value={fallbackReading.colorA4} />
              <ReadingCell label="Colour A3" value={fallbackReading.colorA3} />
            </div>
          </div>
        )}
      </Section>

      {/* ── The visit ── */}
      <Section title="Installation Visit">
        <Row label="Technician" value={request.technicianName || '—'} />
        <Row label="Assigned By" value={request.assignedByEmployeeName || '—'} />
        <Row label="Started" value={formatReportDateTime(request.startTime)} />
        <Row label="Completed" value={formatReportDateTime(request.endTime)} />
        <Row
          label="Duration"
          value={request.durationSeconds != null ? formatDuration(request.durationSeconds) : '—'}
        />
        {isMetered && request.initialReadingEnteredByName && (
          <>
            <Row label="Reading Taken By" value={request.initialReadingEnteredByName} />
            <Row
              label="Reading Date"
              value={formatReportDate(
                request.initialReadingTakenDate || request.initialReadingEnteredAt,
              )}
            />
          </>
        )}
        {request.notes && <Row label="Notes" value={request.notes} />}
      </Section>

      {/* ── Customer acceptance ── */}
      <Section title="Customer Acceptance">
        {signature.signed ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-slate-500">
              The customer confirmed the machine was installed and working, and that the readings
              above are correct.
            </p>
            {signature.data && (
              // A base64 data URI, so next/image would add nothing but a loader.
              <img
                src={signature.data}
                alt="Customer signature"
                className="h-24 w-auto rounded-lg border border-slate-200 bg-white"
              />
            )}
            <Row label="Signed By" value={signature.name || '—'} />
            <Row label="Signed On" value={formatReportDateTime(signature.signedAt)} />
            <Row
              label="Method"
              value={signature.method === 'REMOTE_LINK' ? 'Signed remotely' : 'Signed in person'}
            />
            {signature.note && <Row label="Remarks" value={signature.note} />}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-500">
              By signing, the customer confirms the machine listed above was installed and is
              working, and that the initial readings recorded are correct.
            </p>
            {/* Printed copies are signed by hand, so leave a real ruled space. */}
            <div className="hidden print:block">
              <div className="mt-10 border-t border-slate-400 pt-1">
                <p className="text-[10px] font-bold text-slate-500">
                  Customer signature &amp; date
                </p>
              </div>
            </div>
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-400 print:hidden">
              Not yet signed.
            </p>
          </div>
        )}
      </Section>

      <p className="flex items-center justify-center gap-1 pt-1 text-[9px] font-bold uppercase tracking-widest text-slate-300">
        <PrinterIcon size={9} /> Xerocare · Installation Report · {request.invoiceNumber}
      </p>
    </div>
  );
}
