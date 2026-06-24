'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  User,
  Package,
  Tag,
  Building2,
  DollarSign,
  Calendar,
  RotateCcw,
  StickyNote,
  Banknote,
  RefreshCw,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';

import { CreditNoteRecord } from '@/lib/invoice';

interface Props {
  record: CreditNoteRecord | null;
  open: boolean;
  onClose: () => void;
}

/* ── helpers ── */
const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600', Icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Finance', color: 'bg-amber-100 text-amber-700', Icon: Send },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-600', Icon: XCircle },
  COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700', Icon: CheckCircle2 },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  DIRECT_REFUND: {
    label: 'Direct Refund',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: Banknote,
  },
  REPLACEMENT: {
    label: 'Replacement',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: RefreshCw,
  },
  CREDIT_EXCHANGE: {
    label: 'Credit Exchange',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    Icon: CreditCard,
  },
};

function InfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
  accent?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="flex items-center gap-2 text-xs text-slate-400 font-medium min-w-0 shrink-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span
        className={`text-xs font-semibold text-right max-w-[55%] break-words ${
          accent ? 'text-primary' : 'text-slate-700'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CreditNoteViewModal({ record, open, onClose }: Props) {
  if (!record) return null;

  const status = STATUS_CONFIG[record.status] ?? {
    label: record.status,
    color: 'bg-slate-100 text-slate-600',
    Icon: Clock,
  };
  const type = TYPE_CONFIG[record.type] ?? {
    label: record.type.replace('_', ' '),
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    Icon: RotateCcw,
  };
  const StatusIcon = status.Icon;
  const TypeIcon = type.Icon;

  const createdDate = record.createdAt
    ? format(new Date(record.createdAt), 'dd MMM yyyy, hh:mm a')
    : '—';

  const updatedDate =
    record.updatedAt && record.updatedAt !== record.createdAt
      ? format(new Date(record.updatedAt), 'dd MMM yyyy, hh:mm a')
      : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden rounded-2xl border-0 shadow-2xl sm:max-w-none"
        style={{ maxWidth: 580, width: '95vw' }}
      >
        <DialogTitle className="sr-only">Credit Note Details</DialogTitle>

        {/* ── Header ── */}
        <div
          className="relative px-6 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#e8edff 100%)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
                <RotateCcw className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Credit Note
                </p>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                  {record.creditNoteNo}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status + Type pills */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${status.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${type.color}`}
            >
              <TypeIcon className="h-3 w-3" />
              {type.label}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {/* Product Info */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Product Details
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4">
              <InfoRow icon={Package} label="Product" value={record.productName} />
              <InfoRow icon={Tag} label="Model" value={record.modelName} />
              <InfoRow icon={Building2} label="Brand" value={record.brand} />
              <InfoRow icon={Building2} label="Serial No" value={record.serialNumber} mono />
              <InfoRow
                icon={DollarSign}
                label="Amount"
                value={formatCurrency(record.productAmount)}
                accent
              />
            </div>
          </div>

          {/* Customer & Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Customer
              </p>
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-700">{record.customerName || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Invoice
              </p>
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-700">{record.invoiceNumber || '—'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Timeline
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4">
              <InfoRow icon={Calendar} label="Created" value={createdDate} />
              {updatedDate && <InfoRow icon={Calendar} label="Last Updated" value={updatedDate} />}
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <StickyNote className="h-3 w-3" /> Notes
              </p>
              <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                <p className="text-xs text-slate-600 leading-relaxed">{record.notes}</p>
              </div>
            </div>
          )}

          {/* Finance Note (if approved) */}
          {record.financeNote && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Finance Note
              </p>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-xs text-emerald-700 leading-relaxed">{record.financeNote}</p>
              </div>
            </div>
          )}

          {/* Damage Reason (if approved) */}
          {record.damageReason && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <StickyNote className="h-3 w-3" /> Damage Reason
              </p>
              <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
                <p className="text-xs text-orange-700 leading-relaxed">{record.damageReason}</p>
              </div>
            </div>
          )}

          {/* Payment Mode (if selected) */}
          {record.paymentMode && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <Banknote className="h-3 w-3" /> Settlement Method
              </p>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <p className="text-xs font-bold text-indigo-700 leading-relaxed uppercase tracking-wider">
                  {record.paymentMode.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {record.rejectionReason && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <XCircle className="h-3 w-3 text-red-500" /> Rejection Reason
              </p>
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-xs text-red-600 leading-relaxed">{record.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Replacement/Exchange Details */}
          {(record.status === 'PRODUCT_REPLACED' || record.status === 'COMPLETED') &&
            record.replacementSerialNumber && (
              <div className="space-y-4 pt-4 border-t border-dashed">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 text-blue-500" />{' '}
                  {record.type === 'REPLACEMENT' ? 'Replacement' : 'Exchange'} Finalization
                </p>

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                    <div className="bg-white p-1.5 rounded-lg border border-blue-100">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-400">
                        New Unit Assigned
                      </p>
                      <p className="text-xs font-bold text-blue-900">
                        Serial No: {record.replacementSerialNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-blue-500 font-medium">New Item Price</p>
                      <p className="font-bold text-blue-900">
                        {formatCurrency(record.replacementAmount || 0)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-blue-500 font-medium">Returned Credit</p>
                      <p className="font-bold text-blue-900">
                        - {formatCurrency(record.productAmount)}
                      </p>
                    </div>
                    {record.replacementDiscount !== undefined && record.replacementDiscount > 0 && (
                      <div className="space-y-1">
                        <p className="text-emerald-600 font-medium">Extra Discount</p>
                        <p className="font-bold text-emerald-700">
                          - {formatCurrency(record.replacementDiscount || 0)}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t border-blue-200 flex justify-between items-center mt-1">
                      <p className="font-bold text-blue-900">
                        {(record.replacementAmount || 0) -
                          record.productAmount -
                          (record.replacementDiscount || 0) >=
                        0
                          ? 'Payable Gap'
                          : 'Refundable Balance'}
                      </p>
                      <p className="text-sm font-black text-blue-900">
                        {formatCurrency(
                          Math.abs(
                            (record.replacementAmount || 0) -
                              record.productAmount -
                              (record.replacementDiscount || 0),
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-lg px-5 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
