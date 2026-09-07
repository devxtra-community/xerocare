'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  ReplacementDetail,
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_CLASS,
  formatWorkDuration,
} from '@/lib/replacement';

/** dd MMM yyyy, tolerant of nulls and bad values — the same shape used across the app. */
function safeFormatDate(val?: string | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** dd MMM yyyy HH:mm — the work timer needs the time of day, not just the date. */
function safeFormatTime(val?: string | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The whole replacement, rendered read-only.
 *
 * One component serves Finance's review, the service desk's view, the technician's job
 * sheet and the customer-facing report — the difference between those is only which
 * actions sit around it, never which facts are shown. Deliberately carries no pricing:
 * a replacement is a service event, not a sale.
 */

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value ?? '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-1.5">
        {title}
      </h4>
      {children}
    </div>
  );
}

function PhotoStrip({ urls, label }: { urls: string[]; label: string }) {
  if (!urls?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
            <Image
              src={u}
              alt={label}
              width={104}
              height={104}
              unoptimized
              className="h-26 w-26 rounded-lg border border-slate-200 object-cover hover:opacity-90 transition-opacity"
              style={{ height: 104, width: 104 }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Counters side by side — the figures the next bill is computed from. */
function MeterTable({ detail }: { detail: ReplacementDetail }) {
  const r = detail.request;
  if (r.oldMeterBwA4 === undefined || r.oldMeterBwA4 === null) return null;

  const rows: Array<[string, number | undefined, number | undefined]> = [
    ['B&W A4', r.oldMeterBwA4, r.newMeterBwA4],
    ['B&W A3', r.oldMeterBwA3, r.newMeterBwA3],
    ['Colour A4', r.oldMeterColorA4, r.newMeterColorA4],
    ['Colour A3', r.oldMeterColorA3, r.newMeterColorA3],
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">
              Counter
            </th>
            <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
              Removed · closing
            </th>
            <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
              Installed · opening
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, oldV, newV]) => (
            <tr key={label} className="border-t border-slate-100">
              <td className="px-3 py-2 font-semibold text-slate-700">{label}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-800">
                {(oldV ?? 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-800">
                {(newV ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MachineCard({
  heading,
  tone,
  serial,
  product,
}: {
  heading: string;
  tone: 'out' | 'in';
  serial?: string;
  product?: {
    name?: string;
    brand?: string;
    model_name?: string;
    description?: string;
    image_url?: string;
  } | null;
}) {
  const ring =
    tone === 'out' ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40';
  const chip = tone === 'out' ? 'text-red-700' : 'text-emerald-700';
  return (
    <div className={`rounded-xl border p-3.5 space-y-2.5 ${ring}`}>
      <p className={`text-[9px] font-black uppercase tracking-widest ${chip}`}>{heading}</p>
      {product?.image_url && (
        <Image
          src={product.image_url}
          alt={product?.name || serial || 'Machine'}
          width={320}
          height={160}
          unoptimized
          className="w-full rounded-lg border border-white object-cover"
          style={{ maxHeight: 160 }}
        />
      )}
      <div className="space-y-1.5">
        <p className="text-sm font-black text-slate-800">{product?.name || '—'}</p>
        <p className="font-mono text-xs text-slate-600">{serial || '—'}</p>
        {(product?.brand || product?.model_name) && (
          <p className="text-[11px] font-semibold text-slate-500">
            {[product?.brand, product?.model_name].filter(Boolean).join(' · ')}
          </p>
        )}
        {product?.description && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{product.description}</p>
        )}
      </div>
    </div>
  );
}

export function ReplacementDetailView({ detail }: { detail: ReplacementDetail }) {
  const r = detail.request;
  const c = detail.contract;

  const durationLabel = (() => {
    if (!c?.effectiveFrom || !c?.effectiveTo) return '—';
    return `${safeFormatDate(c.effectiveFrom)} → ${safeFormatDate(c.effectiveTo)}`;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold text-blue-600">{r.requestNo}</p>
          <p className="text-lg font-black text-slate-800">{r.customerName}</p>
        </div>
        <Badge className={`border ${REPLACEMENT_STATUS_CLASS[r.status]}`}>
          {REPLACEMENT_STATUS_LABEL[r.status]}
        </Badge>
      </div>

      <Section title="Customer & Contract">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Customer" value={r.customerName} />
          <Field label="Email" value={r.customerEmail} />
          <Field label="Phone" value={r.customerPhone} />
          <Field label="Contract" value={c?.invoiceNumber || r.contractNumber} />
          <Field label="Type" value={c?.saleType} />
          <Field label="Contract duration" value={durationLabel} />
          <Field
            label="Machine installed on"
            value={safeFormatDate(detail.installation?.installedOn)}
          />
          <Field label="Installing technician" value={detail.installation?.technicianName} />
          <Field label="Requested on" value={safeFormatDate(r.raisedAt)} />
        </div>
      </Section>

      <Section title="Machines">
        <div className="grid gap-3 md:grid-cols-2">
          <MachineCard
            heading="Removed"
            tone="out"
            serial={r.oldSerialNumber}
            product={detail.oldProduct}
          />
          <MachineCard
            heading={r.newSerialNumber ? 'Installed' : 'Replacement — not yet selected'}
            tone="in"
            serial={r.newSerialNumber}
            product={detail.newProduct}
          />
        </div>
      </Section>

      <Section title="Reason & Evidence">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Reason" value={r.reason} />
          <Field label="Raised by" value={r.raisedByEmployeeName} />
        </div>
        <Field label="Notes" value={r.notes} />
        <PhotoStrip urls={r.proofPhotoUrls} label="Fault evidence" />
      </Section>

      {r.oldMeterBwA4 !== undefined && r.oldMeterBwA4 !== null && (
        <Section title="Meter readings at swap">
          <MeterTable detail={detail} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Replacement installed on" value={safeFormatDate(r.installedOn)} />
            <Field label="Technician" value={r.technicianName} />
            <Field label="Recorded at" value={safeFormatDate(r.installedAt)} />
          </div>
          {/* Time on site — from the technician starting the removal to submitting the
              new machine's meter. Absent on jobs done before the timer existed. */}
          {(r.workStartedAt || r.workDurationSeconds != null) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Work started" value={safeFormatTime(r.workStartedAt)} />
              <Field label="Work finished" value={safeFormatTime(r.workEndedAt)} />
              <Field
                label="Time taken"
                value={
                  r.workDurationSeconds != null
                    ? formatWorkDuration(r.workDurationSeconds)
                    : 'In progress'
                }
              />
            </div>
          )}
          <PhotoStrip urls={r.installPhotoUrls} label="Install photos" />
        </Section>
      )}

      <Section title="Progress">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field
            label="Finance decision"
            value={
              r.reviewedAt
                ? `${r.status === 'REJECTED' ? 'Rejected' : 'Approved'} by ${r.reviewedByName} · ${safeFormatDate(r.reviewedAt)}`
                : undefined
            }
          />
          <Field
            label="Unit selected"
            value={
              r.selectedAt ? `${r.selectedByName} · ${safeFormatDate(r.selectedAt)}` : undefined
            }
          />
          <Field
            label="Delivered"
            value={
              r.deliveredAt ? `${r.deliveredByName} · ${safeFormatDate(r.deliveredAt)}` : undefined
            }
          />
          <Field
            label="Technician assigned"
            value={
              r.assignedAt ? `${r.technicianName} · ${safeFormatDate(r.assignedAt)}` : undefined
            }
          />
          <Field
            label="Report sent"
            value={
              r.reportSentAt ? `${r.reportChannel} · ${safeFormatDate(r.reportSentAt)}` : undefined
            }
          />
          <Field
            label="Customer approved"
            value={
              r.customerApprovedAt
                ? `${r.customerApprovalName} · ${safeFormatDate(r.customerApprovedAt)}`
                : undefined
            }
          />
        </div>
        {r.rejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600">
              Rejection reason
            </p>
            <p className="text-sm text-red-800 mt-1">{r.rejectionReason}</p>
          </div>
        )}
        {r.approvalNote && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
              Customer note
            </p>
            <p className="text-sm text-emerald-900 mt-1">{r.approvalNote}</p>
          </div>
        )}
      </Section>
    </div>
  );
}
