'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, PackageCheck, Send, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getMyBranch } from '@/lib/branch';
import {
  getStockTransfer,
  submitTransfer,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  cancelTransfer,
  getAssignableProducts,
  StockTransfer,
  StockTransferItem,
  ApproveLine,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/stockTransfer';
import { toast } from 'sonner';

interface Props {
  transferId: string;
  role: 'admin' | 'manager';
}

interface DraftLine {
  approved_qty: number;
  rejected: boolean;
  assigned: string[]; // product ids, one per approved unit
}

const itemLabel = (item: StockTransferItem): string => {
  if (item.item_type === 'PRODUCT') {
    if (item.product) return `${item.product.serial_no}`;
    if (item.model)
      return `${item.model.brandRelation?.name ? `${item.model.brandRelation.name} ` : ''}${item.model.model_name}`;
    return 'Machine';
  }
  return item.spare_part
    ? `${item.spare_part.brand ? `${item.spare_part.brand} ` : ''}${item.spare_part.part_name}`
    : 'Spare part';
};

export default function TransferDetail({ transferId, role }: Props) {
  const router = useRouter();
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [myBranchId, setMyBranchId] = useState<string | null>(null);

  // Approval working state (giving side)
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});
  const [assignable, setAssignable] = useState<Record<string, { id: string; serial_no: string }[]>>(
    {},
  );
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await getStockTransfer(transferId);
      setTransfer(t);
      const init: Record<string, DraftLine> = {};
      for (const item of t.items ?? []) {
        init[item.id] = {
          approved_qty: item.approved_qty ?? item.requested_qty,
          rejected: false,
          assigned: item.assigned_product_ids ?? [],
        };
      }
      setDraft(init);
    } catch {
      toast.error('Failed to load transfer');
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    load();
    if (role === 'manager') {
      getMyBranch()
        .then((b) => setMyBranchId(b?.id ?? null))
        .catch(() => setMyBranchId(null));
    }
  }, [load, role]);

  const isAdmin = role === 'admin';
  const isInter = transfer?.transfer_type === 'INTER_BRANCH';
  const isSourceSide = isAdmin || (!!myBranchId && myBranchId === transfer?.source_branch_id);
  const isDestSide = isAdmin || (!!myBranchId && myBranchId === transfer?.destination_branch_id);

  // Load the serial picklists once the giver opens a SENT request.
  useEffect(() => {
    if (!transfer || transfer.status !== 'SENT' || !isSourceSide) return;
    for (const item of transfer.items ?? []) {
      if (item.item_type === 'PRODUCT' && item.model_id && !assignable[item.id]) {
        getAssignableProducts(transfer.source_branch_id, item.model_id)
          .then((list) => setAssignable((prev) => ({ ...prev, [item.id]: list })))
          .catch(() => undefined);
      }
    }
  }, [transfer, isSourceSide, assignable]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setActing(true);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const handleApprove = () => {
    if (!transfer) return;
    const lines: ApproveLine[] = [];
    for (const item of transfer.items ?? []) {
      const d = draft[item.id];
      if (!d) continue;
      if (d.rejected || d.approved_qty <= 0) {
        lines.push({ item_id: item.id, approved_qty: 0 });
        continue;
      }
      if (item.item_type === 'PRODUCT') {
        const picked = d.assigned.filter(Boolean);
        if (picked.length !== d.approved_qty) {
          toast.error(`Assign ${d.approved_qty} serial(s) for "${itemLabel(item)}"`);
          return;
        }
        lines.push({
          item_id: item.id,
          approved_qty: d.approved_qty,
          assigned_product_ids: picked,
        });
      } else {
        lines.push({ item_id: item.id, approved_qty: d.approved_qty });
      }
    }
    run(() => approveTransfer(transfer.id, lines), 'Request approved — receiving lot created');
  };

  const timeline = useMemo(() => {
    if (!transfer) return [];
    return isInter
      ? ['DRAFT', 'SENT', 'APPROVED', 'IN_TRANSIT', 'COMPLETED']
      : ['DRAFT', 'IN_TRANSIT', 'COMPLETED'];
  }, [transfer, isInter]);

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading transfer...</div>;
  }
  if (!transfer) {
    return <div className="p-10 text-center text-sm text-slate-500">Transfer not found.</div>;
  }

  const status = transfer.status;
  const terminal = status === 'REJECTED' || status === 'CANCELLED';
  const reachedIdx = timeline.indexOf(status);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-primary">{transfer.transfer_number}</h1>
          <Badge className="border-0 bg-slate-200 text-slate-700">
            {isInter ? 'Inter-Branch' : 'Intra-Branch'}
          </Badge>
          <Badge className={`border-0 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</Badge>
        </div>

        {/* Timeline */}
        {!terminal && (
          <div className="flex items-center gap-1">
            {timeline.map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    i <= reachedIdx ? 'bg-primary text-white' : 'bg-white text-slate-400'
                  }`}
                >
                  {STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
                </div>
                {i < timeline.length - 1 && <div className="flex-1 h-px bg-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Route + meta */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700">
              {transfer.source_branch?.name ?? 'Source'}
              {transfer.source_warehouse ? ` / ${transfer.source_warehouse.warehouseName}` : ''}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-700">
              {transfer.destination_branch?.name ?? 'Destination'}
              {transfer.destination_warehouse
                ? ` / ${transfer.destination_warehouse.warehouseName}`
                : ''}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium">Reason:</span> {transfer.reason}
          </div>
          {transfer.notes && (
            <div className="text-sm text-slate-600">
              <span className="font-medium">Notes:</span> {transfer.notes}
            </div>
          )}
          {transfer.rejection_reason && (
            <div className="text-sm text-red-600">
              <span className="font-medium">Rejection:</span> {transfer.rejection_reason}
            </div>
          )}
          {transfer.lot_id && (
            <div className="text-sm">
              <Link
                href={`/${role}/lots`}
                className="text-primary font-medium underline underline-offset-2"
              >
                Receiving lot: {transfer.lot?.lotNumber ?? `TRF-${transfer.transfer_number}`} →
              </Link>
              {status === 'IN_TRANSIT' && (
                <span className="text-slate-500 ml-2">
                  Confirm the lot as received to complete this transfer.
                </span>
              )}
            </div>
          )}
          {isInter && transfer.lot?.exchangeRateSnapshot != null && (
            <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
              Purchase prices converted to{' '}
              <span className="font-semibold">
                {transfer.lot.currencyCode ?? 'destination currency'}
              </span>{' '}
              at rate <span className="font-semibold">{transfer.lot.exchangeRateSnapshot}</span> —
              sale &amp; wholesale prices are set by the receiving branch.
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
          <h2 className="font-semibold text-slate-700 mb-3">Items</h2>
          <div className="space-y-2">
            {(transfer.items ?? []).map((item) => {
              const d = draft[item.id];
              const approvalMode = status === 'SENT' && isSourceSide;
              const options = (assignable[item.id] ?? []).map((p) => ({
                value: p.id,
                label: p.serial_no,
              }));
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.item_status === 'REJECTED' || d?.rejected
                      ? 'bg-red-50/50 border-red-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {itemLabel(item)}
                        <Badge
                          className={`ml-2 text-xs border-0 ${
                            item.item_type === 'PRODUCT'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.item_type === 'PRODUCT' ? 'Machine' : 'Spare Part'}
                        </Badge>
                        {item.item_status !== 'PENDING' && (
                          <Badge
                            className={`ml-1 text-xs border-0 ${
                              item.item_status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.item_status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Requested: {item.requested_qty}
                        {item.approved_qty != null && ` · Approved: ${item.approved_qty}`}
                        {item.dispatched_qty != null && ` · Dispatched: ${item.dispatched_qty}`}
                        {item.received_qty != null && ` · Received: ${item.received_qty}`}
                        {Number(item.unit_cost) > 0 &&
                          ` · Purchase: ${Number(item.unit_cost).toFixed(2)}${
                            transfer.lot?.currencyCode ? ` ${transfer.lot.currencyCode}` : ''
                          }`}
                      </div>
                      {!approvalMode &&
                        item.item_type === 'PRODUCT' &&
                        (item.assigned_product_ids?.length ?? 0) > 0 && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Assigned serial(s): {item.assigned_product_ids!.length}
                          </div>
                        )}
                    </div>

                    {approvalMode && d && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-500">Approve qty</Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.requested_qty}
                          value={d.approved_qty}
                          disabled={d.rejected}
                          onChange={(e) => {
                            const q = Math.min(
                              item.requested_qty,
                              Math.max(0, parseInt(e.target.value) || 0),
                            );
                            setDraft((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                approved_qty: q,
                                assigned: prev[item.id].assigned.slice(0, q),
                              },
                            }));
                          }}
                          className="w-20 h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            d.rejected ? 'text-slate-500' : 'text-red-500 hover:text-red-600'
                          }
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], rejected: !prev[item.id].rejected },
                            }))
                          }
                        >
                          {d.rejected ? 'Undo' : 'Reject line'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Serial assignment — one pick per approved unit */}
                  {approvalMode && d && !d.rejected && item.item_type === 'PRODUCT' && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      {Array.from({ length: d.approved_qty }).map((_, unitIdx) => (
                        <SearchableSelect
                          key={unitIdx}
                          value={d.assigned[unitIdx] ?? ''}
                          onValueChange={(v) =>
                            setDraft((prev) => {
                              const next = [...prev[item.id].assigned];
                              next[unitIdx] = v;
                              return { ...prev, [item.id]: { ...prev[item.id], assigned: next } };
                            })
                          }
                          placeholder={`Assign serial #${unitIdx + 1}...`}
                          emptyText="No free machines of this model."
                          options={options.filter(
                            (o) => !d.assigned.includes(o.value) || d.assigned[unitIdx] === o.value,
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          {status === 'DRAFT' && isDestSide && isInter && (
            <Button
              onClick={() => run(() => submitTransfer(transfer.id), 'Request sent')}
              disabled={acting}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Submit Request
            </Button>
          )}
          {status === 'DRAFT' && isSourceSide && !isInter && (
            <Button
              onClick={() =>
                run(() => dispatchTransfer(transfer.id), 'Dispatched — receive via the created lot')
              }
              disabled={acting}
            >
              <Truck className="h-4 w-4 mr-1.5" />
              Dispatch
            </Button>
          )}
          {status === 'SENT' && isSourceSide && (
            <>
              <Button variant="outline" onClick={() => setShowReject((v) => !v)} disabled={acting}>
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject All
              </Button>
              <Button onClick={handleApprove} disabled={acting}>
                <PackageCheck className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            </>
          )}
          {status === 'APPROVED' && isSourceSide && (
            <Button
              onClick={() => run(() => dispatchTransfer(transfer.id), 'Dispatched')}
              disabled={acting}
            >
              <Truck className="h-4 w-4 mr-1.5" />
              Dispatch
            </Button>
          )}
          {['DRAFT', 'SENT', 'APPROVED'].includes(status) && (
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-600"
              onClick={() => run(() => cancelTransfer(transfer.id), 'Transfer cancelled')}
              disabled={acting}
            >
              Cancel Transfer
            </Button>
          )}
        </div>

        {showReject && status === 'SENT' && isSourceSide && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100 space-y-2">
            <Label className="text-sm font-medium">Rejection reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              placeholder="Why is this request rejected?"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="text-red-500"
                disabled={!rejectReason.trim() || acting}
                onClick={() =>
                  run(() => rejectTransfer(transfer.id, rejectReason.trim()), 'Request rejected')
                }
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
