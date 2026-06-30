'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getStockTransfer,
  submitTransfer,
  respondToTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getBranchInventory,
  StockTransfer,
  STATUS_LABELS,
  STATUS_COLORS,
  RespondPayload,
} from '@/lib/stockTransfer';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, Truck, PackageCheck, Send, Ban, AlertTriangle } from 'lucide-react';

type DialogType = 'respond' | 'dispatch' | 'receive' | 'cancel' | null;

interface BranchInventory {
  spare_part_id: string;
  part_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
}

export default function StockTransferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [submitting, setSubmitting] = useState(false);

  // Respond dialog state
  const [respondItems, setRespondItems] = useState<
    { itemId: string; fulfilled_qty: number; source_warehouse_id: string }[]
  >([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [branchInventory, setBranchInventory] = useState<BranchInventory[]>([]);

  // Receive dialog state
  const [myWarehouses, setMyWarehouses] = useState<Warehouse[]>([]);
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [receiveQtys, setReceiveQtys] = useState<{ itemId: string; received_qty: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const t = await getStockTransfer(id);
      setTransfer(t);
    } catch {
      toast.error('Transfer not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openRespondDialog = async () => {
    if (!transfer) return;
    setDialog('respond');
    setIsRejecting(false);
    setRejectionReason('');
    // Init respond items from requested items
    setRespondItems(
      transfer.items.map((i) => ({
        itemId: i.id,
        fulfilled_qty: i.requested_qty,
        source_warehouse_id: '',
      })),
    );
    // Load source branch inventory
    try {
      const inv = await getBranchInventory(transfer.source_branch_id);
      setBranchInventory(inv.inventory);
    } catch {
      setBranchInventory([]);
    }
  };

  const openReceiveDialog = async () => {
    if (!transfer) return;
    setDialog('receive');
    setDestWarehouseId('');
    setReceiveQtys(
      transfer.items
        .filter((i) => (i.fulfilled_qty ?? 0) > 0)
        .map((i) => ({ itemId: i.id, received_qty: i.fulfilled_qty ?? i.requested_qty })),
    );
    try {
      const wh = await getWarehouses();
      setMyWarehouses(wh.data ?? []);
    } catch {
      setMyWarehouses([]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitTransfer(id);
      toast.success('Request submitted to source branch');
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    setSubmitting(true);
    try {
      const payload: RespondPayload = isRejecting
        ? { items: respondItems, rejection_reason: rejectionReason || 'Rejected by source manager' }
        : { items: respondItems.map((ri) => ({ ...ri, fulfilled_qty: ri.fulfilled_qty })) };
      await respondToTransfer(id, payload);
      toast.success(isRejecting ? 'Request rejected' : 'Response sent');
      setDialog(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    setSubmitting(true);
    try {
      await dispatchTransfer(id);
      toast.success('Transfer dispatched — items deducted from source inventory');
      setDialog(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async () => {
    if (!destWarehouseId) {
      toast.error('Select destination warehouse');
      return;
    }
    setSubmitting(true);
    try {
      await receiveTransfer(id, {
        destination_warehouse_id: destWarehouseId,
        items: receiveQtys,
      });
      toast.success('Items received and added to inventory');
      setDialog(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await cancelTransfer(id);
      toast.success('Transfer cancelled');
      setDialog(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!transfer) return null;

  const canSubmit = transfer.status === 'DRAFT';
  const canRespond = transfer.status === 'PENDING';
  const canDispatch = transfer.status === 'ACCEPTED' || transfer.status === 'PARTIALLY_ACCEPTED';
  const canReceive = transfer.status === 'IN_TRANSIT';
  const canCancel = transfer.status === 'DRAFT' || transfer.status === 'PENDING';

  const getWarehousesWithPart = (sparePartId: string) => {
    return branchInventory.filter((i) => i.spare_part_id === sparePartId && i.quantity > 0);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">
              {transfer.transfer_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[transfer.status]}`}
              >
                {STATUS_LABELS[transfer.status]}
              </span>
              <span className="text-xs text-gray-400">
                {transfer.transfer_type === 'INTER_BRANCH' ? 'Inter-Branch' : 'Intra-Branch'}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Submit Request
            </button>
          )}
          {canRespond && (
            <button
              onClick={openRespondDialog}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Respond
            </button>
          )}
          {canDispatch && (
            <button
              onClick={() => setDialog('dispatch')}
              className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Truck className="h-4 w-4" />
              Dispatch
            </button>
          )}
          {canReceive && (
            <button
              onClick={openReceiveDialog}
              className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <PackageCheck className="h-4 w-4" />
              Receive
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setDialog('cancel')}
              className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Ban className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Requesting Branch (Destination)</p>
          <p className="font-semibold text-gray-800">{transfer.requesting_branch?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Source Branch</p>
          <p className="font-semibold text-gray-800">{transfer.source_branch?.name ?? '—'}</p>
        </div>
        {transfer.requesting_warehouse && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Destination Warehouse</p>
            <p className="font-medium text-gray-700">
              {transfer.requesting_warehouse.warehouseName}
            </p>
          </div>
        )}
        {transfer.responded_at && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Responded At</p>
            <p className="font-medium text-gray-700">
              {new Date(transfer.responded_at).toLocaleString()}
            </p>
          </div>
        )}
        {transfer.dispatched_at && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Dispatched At</p>
            <p className="font-medium text-gray-700">
              {new Date(transfer.dispatched_at).toLocaleString()}
            </p>
          </div>
        )}
        {transfer.received_at && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Received At</p>
            <p className="font-medium text-gray-700">
              {new Date(transfer.received_at).toLocaleString()}
            </p>
          </div>
        )}
        {transfer.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">Notes</p>
            <p className="text-gray-700">{transfer.notes}</p>
          </div>
        )}
        {transfer.rejection_reason && (
          <div className="col-span-2">
            <p className="text-xs text-red-400 mb-0.5">Rejection Reason</p>
            <p className="text-red-700 bg-red-50 rounded p-2">{transfer.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Requested Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Item</th>
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Type</th>
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">
                Requested
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">
                Fulfilled
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs text-center">
                Received
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Source WH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transfer.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {item.spare_part?.part_name ??
                    item.product?.serial_number ??
                    item.item_name ??
                    '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {item.item_type === 'SPARE_PART' ? 'Spare Part' : 'Product'}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{item.requested_qty}</td>
                <td className="px-4 py-3 text-center">
                  {item.fulfilled_qty != null ? (
                    <span
                      className={
                        item.fulfilled_qty === 0
                          ? 'text-red-500'
                          : item.fulfilled_qty < item.requested_qty
                            ? 'text-amber-600'
                            : 'text-green-600'
                      }
                    >
                      {item.fulfilled_qty}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.received_qty != null ? (
                    <span className="text-teal-600">{item.received_qty}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {item.source_warehouse?.warehouseName ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === RESPOND DIALOG === */}
      {dialog === 'respond' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Respond to Request</h2>
              <button onClick={() => setDialog(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Reject toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRejecting(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!isRejecting ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  Accept / Partial
                </button>
                <button
                  onClick={() => setIsRejecting(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isRejecting ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  Reject
                </button>
              </div>

              {isRejecting ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why you cannot fulfill this request..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    For each item, set how many you can provide and which warehouse it&apos;s from.
                    Set to 0 if you cannot fulfill that item.
                  </p>
                  {transfer.items.map((item, idx) => {
                    const ri = respondItems[idx];
                    const partsWarehouses = item.spare_part_id
                      ? getWarehousesWithPart(item.spare_part_id)
                      : [];

                    return (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {item.spare_part?.part_name ?? item.item_name ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">Requested: {item.requested_qty}</p>
                          </div>
                        </div>

                        {/* Availability across warehouses */}
                        {partsWarehouses.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <p className="font-medium text-gray-600">Available in your branch:</p>
                            {partsWarehouses.map((pw) => (
                              <div
                                key={pw.warehouse_id}
                                className="flex justify-between px-2 py-1 bg-gray-50 rounded"
                              >
                                <span>{pw.warehouse_name}</span>
                                <span className="font-semibold text-green-600">
                                  {pw.quantity} units
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Qty to send
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={item.requested_qty}
                              value={ri?.fulfilled_qty ?? 0}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 0;
                                setRespondItems((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, fulfilled_qty: v } : r)),
                                );
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              From warehouse
                            </label>
                            <select
                              value={ri?.source_warehouse_id ?? ''}
                              onChange={(e) => {
                                setRespondItems((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, source_warehouse_id: e.target.value } : r,
                                  ),
                                );
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="">Select warehouse...</option>
                              {partsWarehouses.map((pw) => (
                                <option key={pw.warehouse_id} value={pw.warehouse_id}>
                                  {pw.warehouse_name} ({pw.quantity})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDialog(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-lg font-medium disabled:opacity-60 transition-colors ${
                  isRejecting
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {submitting ? 'Sending...' : isRejecting ? 'Reject Request' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === DISPATCH DIALOG === */}
      {dialog === 'dispatch' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Dispatch Transfer</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold mb-1">Confirm dispatch</p>
                  <p>
                    Items will be deducted from source inventory. The requesting branch will be
                    notified to receive the stock.
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {transfer.items
                  .filter((i) => (i.fulfilled_qty ?? 0) > 0)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between bg-gray-50 rounded px-3 py-2"
                    >
                      <span>{item.spare_part?.part_name ?? item.item_name ?? '—'}</span>
                      <span className="font-medium">× {item.fulfilled_qty}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDialog(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleDispatch}
                disabled={submitting}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-60"
              >
                {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === RECEIVE DIALOG === */}
      {dialog === 'receive' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Receive Stock</h2>
              <button onClick={() => setDialog(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Which warehouse will receive the stock?
                </label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select warehouse...</option>
                  {myWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Confirm received quantities
                </p>
                <div className="space-y-2">
                  {transfer.items
                    .filter((i) => (i.fulfilled_qty ?? 0) > 0)
                    .map((item) => {
                      const rq = receiveQtys.find((r) => r.itemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5"
                        >
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-gray-800">
                              {item.spare_part?.part_name ?? item.item_name ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">Sent: {item.fulfilled_qty}</p>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={item.fulfilled_qty ?? item.requested_qty}
                            value={rq?.received_qty ?? 0}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              setReceiveQtys((prev) =>
                                prev.map((r) =>
                                  r.itemId === item.id ? { ...r, received_qty: v } : r,
                                ),
                              );
                            }}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDialog(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleReceive}
                disabled={submitting}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-60"
              >
                {submitting ? 'Receiving...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CANCEL DIALOG === */}
      {dialog === 'cancel' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Cancel Transfer?</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                This will cancel the transfer request. The source branch will no longer see it as
                pending.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDialog(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Cancelling...' : 'Cancel Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
