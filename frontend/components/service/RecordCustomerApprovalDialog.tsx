'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import type { CustomerDecisionChannel, RecordCustomerDecisionMeta } from '@/lib/serviceTicket';

const CHANNELS: { value: CustomerDecisionChannel; label: string }[] = [
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (meta: RecordCustomerDecisionMeta) => void | Promise<void>;
  ticketNumber?: string;
  estimateTotal?: number;
  currency?: string;
  submitting?: boolean;
}

export function RecordCustomerApprovalDialog({
  open,
  onClose,
  onConfirm,
  ticketNumber,
  estimateTotal,
  currency = 'QAR',
  submitting = false,
}: Props) {
  const [customerName, setCustomerName] = useState('');
  const [confirmedVia, setConfirmedVia] = useState<CustomerDecisionChannel>('IN_PERSON');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName('');
      setConfirmedVia('IN_PERSON');
      setNote('');
      setAck(false);
    }
  }, [open]);

  const totalText =
    estimateTotal != null
      ? `${currency} ${Number(estimateTotal).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : 'the quoted amount';

  const canSubmit = customerName.trim().length > 1 && ack && !submitting;

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="sm" title="Record the customer's approval">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
          <ShieldCheck className="size-5 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            You&apos;re recording a decision the customer has <strong>already made</strong> — you
            are not approving on their behalf. Once recorded this <strong>cannot be undone</strong>:
            the estimate is locked, spare parts are reserved from stock, and repair work can begin
            {ticketNumber ? ` on ticket ${ticketNumber}` : ''}.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Who approved it? <span className="text-red-500">*</span>
          </label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer / contact person's full name"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            How did they confirm? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((c) => (
              <label
                key={c.value}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                  confirmedVia === c.value
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="confirmedVia"
                  value={c.value}
                  checked={confirmedVia === c.value}
                  onChange={() => setConfirmedVia(c.value)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Confirmed with Mr. Rahul over the phone at 3:15 PM"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm the customer has seen this quotation and authorised the work at{' '}
            <strong>{totalText}</strong>.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="success"
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                customerName: customerName.trim(),
                confirmedVia,
                note: note.trim() || undefined,
              })
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 size-4" />
                Record Approval
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
