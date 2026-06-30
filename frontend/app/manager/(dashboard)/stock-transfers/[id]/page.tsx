'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getStockTransfer,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  submitTransfer,
  StockTransfer,
  StockTransferItem,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/stockTransfer';
import { toast } from 'sonner';
import { format } from 'date-fns';

function StatusTimeline({ transfer }: { transfer: StockTransfer }) {
  const steps = [
    { key: 'DRAFT', label: 'Draft', date: transfer.created_at },
    { key: 'PENDING_APPROVAL', label: 'Submitted', date: null },
    { key: 'APPROVED', label: 'Approved', date: null },
    { key: 'IN_TRANSIT', label: 'Dispatched', date: transfer.dispatched_at },
    { key: 'COMPLETED', label: 'Completed', date: transfer.received_at },
  ];
  const statusOrder = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_TRANSIT',
    'RECEIVED',
    'PARTIALLY_RECEIVED',
    'COMPLETED',
  ];
  const currentIdx = statusOrder.indexOf(transfer.status);

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const sIdx = statusOrder.indexOf(s.key);
        const done = sIdx <= currentIdx && !['REJECTED', 'CANCELLED'].includes(transfer.status);
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center min-w-[80px] text-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${done ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-300'}`}
              >
                {done ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div
                className={`text-xs mt-1 font-medium ${done ? 'text-slate-700' : 'text-slate-300'}`}
              >
                {s.label}
              </div>
              {s.date && done && (
                <div className="text-[10px] text-slate-400">
                  {format(new Date(s.date), 'dd MMM')}
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-3.5 min-w-[16px] ${done ? 'bg-primary' : 'bg-slate-200'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ManagerTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStockTransfer(id);
      setTransfer(data);
      if (data.items) {
        const init: Record<string, number> = {};
        for (const item of data.items) {
          const dispatched = item.dispatched_qty ?? item.requested_qty;
          init[item.id] = dispatched - (item.received_qty ?? 0);
        }
        setReceiveQtys(init);
      }
    } catch {
      toast.error('Failed to load transfer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<StockTransfer>) => {
    setActing(true);
    try {
      const updated = await fn();
      setTransfer(updated);
      toast.success('Done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  if (loading)
    return (
      <div className="bg-blue-100 min-h-screen p-6 flex items-center justify-center text-slate-400">
        Loading transfer...
      </div>
    );
  if (!transfer)
    return (
      <div className="bg-blue-100 min-h-screen p-6 flex items-center justify-center text-slate-400">
        Transfer not found.
      </div>
    );

  const isRejectedOrCancelled = ['REJECTED', 'CANCELLED'].includes(transfer.status);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-primary font-mono">
                {transfer.transfer_number}
              </h1>
              <Badge className={`${STATUS_COLORS[transfer.status]} border-0 text-xs`}>
                {STATUS_LABELS[transfer.status]}
              </Badge>
              <Badge
                className={`border-0 text-xs ${transfer.transfer_type === 'INTER_BRANCH' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {transfer.transfer_type === 'INTER_BRANCH' ? 'Inter-Branch' : 'Intra-Branch'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {transfer.source_branch?.name} → {transfer.destination_branch?.name}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {transfer.status === 'DRAFT' && (
            <>
              <Button
                size="sm"
                onClick={() => act(() => submitTransfer(transfer.id))}
                disabled={acting}
              >
                Submit for Approval
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => act(() => cancelTransfer(transfer.id))}
                disabled={acting}
              >
                Cancel
              </Button>
            </>
          )}
          {transfer.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => act(() => approveTransfer(transfer.id))}
                disabled={acting}
                title="Only a different manager or Admin can approve"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={acting}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </>
          )}
          {transfer.status === 'APPROVED' && (
            <>
              <Button
                size="sm"
                onClick={() => act(() => dispatchTransfer(transfer.id))}
                disabled={acting}
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark Dispatched
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => act(() => cancelTransfer(transfer.id))}
                disabled={acting}
              >
                Cancel
              </Button>
            </>
          )}
          {(transfer.status === 'IN_TRANSIT' || transfer.status === 'PARTIALLY_RECEIVED') && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setReceiveOpen(true)}
              disabled={acting}
            >
              <Package className="h-3.5 w-3.5 mr-1.5" /> Confirm Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Self-approval warning for PENDING_APPROVAL */}
      {transfer.status === 'PENDING_APPROVAL' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Waiting for approval. If you created this transfer, you cannot approve it yourself —
          another manager or Admin must approve.
        </div>
      )}

      {!isRejectedOrCancelled && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <StatusTimeline transfer={transfer} />
        </div>
      )}

      {isRejectedOrCancelled && transfer.rejection_reason && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-sm text-red-700">
          <span className="font-semibold">Rejection reason:</span> {transfer.rejection_reason}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-2">
          <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wide">Source</h3>
          <div className="font-medium text-slate-800">{transfer.source_branch?.name}</div>
          <div className="text-sm text-slate-500">{transfer.source_warehouse?.warehouseName}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-2">
          <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wide">
            Destination
          </h3>
          <div className="font-medium text-slate-800">{transfer.destination_branch?.name}</div>
          <div className="text-sm text-slate-500">
            {transfer.destination_warehouse?.warehouseName}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Reason
          </span>
          <p className="text-sm text-slate-700 mt-1">{transfer.reason}</p>
        </div>
        {transfer.notes && (
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Notes
            </span>
            <p className="text-sm text-slate-700 mt-1">{transfer.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <h3 className="font-semibold text-slate-700">Transfer Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-50 bg-blue-50/50">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Item</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Type</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Requested</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Dispatched</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Received</th>
              </tr>
            </thead>
            <tbody>
              {(transfer.items ?? []).map((item: StockTransferItem) => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.item_type === 'PRODUCT'
                      ? (item.product?.name ?? item.product_id)
                      : (item.spare_part?.item_name ?? item.spare_part_id)}
                    <div className="text-xs text-slate-400 font-normal">
                      {item.item_type === 'PRODUCT'
                        ? `SN: ${item.product?.serial_no ?? '—'}`
                        : (item.spare_part?.item_code ?? '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`border-0 text-xs ${item.item_type === 'PRODUCT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {item.item_type === 'PRODUCT' ? 'Machine' : 'Spare Part'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">{item.requested_qty}</td>
                  <td className="px-4 py-3 text-center">{item.dispatched_qty ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {item.received_qty != null ? (
                      <span
                        className={
                          item.received_qty < (item.dispatched_qty ?? item.requested_qty)
                            ? 'text-orange-600 font-medium'
                            : 'text-emerald-600 font-medium'
                        }
                      >
                        {item.received_qty}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || acting}
              onClick={() => {
                setRejectOpen(false);
                act(() => rejectTransfer(transfer.id, rejectReason));
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(transfer.items ?? []).map((item) => {
              const dispatched = item.dispatched_qty ?? item.requested_qty;
              const remaining = dispatched - (item.received_qty ?? 0);
              if (remaining <= 0) return null;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.item_type === 'PRODUCT'
                        ? (item.product?.name ?? item.product_id)
                        : (item.spare_part?.item_name ?? item.spare_part_id)}
                    </div>
                    <div className="text-xs text-slate-400">Remaining: {remaining}</div>
                  </div>
                  {item.item_type === 'SPARE_PART' ? (
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={receiveQtys[item.id] ?? remaining}
                      onChange={(e) =>
                        setReceiveQtys((prev) => ({
                          ...prev,
                          [item.id]: Math.min(
                            remaining,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        }))
                      }
                      className="w-20 h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-600">1 unit</span>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={acting}
              onClick={() => {
                setReceiveOpen(false);
                const itemsToReceive = Object.entries(receiveQtys)
                  .filter(([, qty]) => qty > 0)
                  .map(([itemId, received_qty]) => ({ itemId, received_qty }));
                act(() => receiveTransfer(transfer.id, itemsToReceive));
              }}
            >
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
