'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAllBranches, Branch } from '@/lib/branch';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import {
  createStockTransfer,
  submitTransfer,
  TransferType,
  CreateTransferPayload,
} from '@/lib/stockTransfer';
import api from '@/lib/api';
import { toast } from 'sonner';

interface LineItem {
  item_type: 'SPARE_PART' | 'PRODUCT';
  spare_part_id?: string;
  product_id?: string;
  requested_qty: number;
  unit_cost: number;
  label: string;
  availableQty?: number;
}

const STEPS = ['Transfer Type', 'Source', 'Destination', 'Items & Submit'];

export default function ManagerNewTransferPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [transferType, setTransferType] = useState<TransferType>('INTRA_BRANCH');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    {
      id: string;
      label: string;
      type: 'SPARE_PART' | 'PRODUCT';
      cost: number;
      available?: number;
    }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [submitAfter, setSubmitAfter] = useState(false);

  useEffect(() => {
    getAllBranches().then(setBranches);
    getWarehouses().then((res) => {
      const arr = Array.isArray(res) ? res : (res.data ?? []);
      setWarehouses(arr);
    });
  }, []);

  const sourceWarehouses = warehouses.filter((w) => w.branchId === sourceBranchId || !w.branchId);
  const destWarehouses = warehouses.filter((w) => {
    if (transferType === 'INTRA_BRANCH') return w.branchId === sourceBranchId || !w.branchId;
    return w.branchId === destBranchId || !w.branchId;
  });
  const destBranches =
    transferType === 'INTRA_BRANCH'
      ? branches.filter((b) => b.id === sourceBranchId)
      : branches.filter((b) => b.id !== sourceBranchId);

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return !!sourceBranchId && !!sourceWarehouseId;
    if (step === 2) return !!destBranchId && !!destWarehouseId;
    if (step === 3) return items.length > 0 && !!reason;
    return false;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !sourceWarehouseId) return;
    setSearching(true);
    try {
      const [spRes, prodRes] = await Promise.allSettled([
        api.get(`/i/spare-parts?search=${encodeURIComponent(searchQuery)}`),
        api.get(`/i/products?search=${encodeURIComponent(searchQuery)}`),
      ]);

      const results: typeof searchResults = [];

      if (spRes.status === 'fulfilled') {
        const parts = spRes.value.data?.data ?? spRes.value.data ?? [];
        for (const p of parts.slice(0, 5)) {
          let available = 0;
          try {
            const stockRes = await api.get(`/i/spare-parts/${p.id}/stock`);
            const inv = (stockRes.data?.data ?? []).find(
              (i: { warehouse_id: string; quantity: number }) =>
                i.warehouse_id === sourceWarehouseId,
            );
            available = inv?.quantity ?? 0;
          } catch {
            /* ignore */
          }
          results.push({
            id: p.id,
            label: `${p.item_name} (${p.item_code})`,
            type: 'SPARE_PART',
            cost: p.unit_price ?? 0,
            available,
          });
        }
      }

      if (prodRes.status === 'fulfilled') {
        const prods = prodRes.value.data?.data ?? prodRes.value.data ?? [];
        for (const p of prods
          .filter((x: { warehouse_id: string }) => x.warehouse_id === sourceWarehouseId)
          .slice(0, 5)) {
          results.push({
            id: p.id,
            label: `${p.name} — SN: ${p.serial_no}`,
            type: 'PRODUCT',
            cost: p.purchase_price ?? 0,
            available: 1,
          });
        }
      }

      setSearchResults(results);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addItem = (r: (typeof searchResults)[0]) => {
    if (items.find((i) => (i.spare_part_id ?? i.product_id) === r.id)) {
      toast.info('Item already added');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        item_type: r.type,
        spare_part_id: r.type === 'SPARE_PART' ? r.id : undefined,
        product_id: r.type === 'PRODUCT' ? r.id : undefined,
        requested_qty: 1,
        unit_cost: r.cost,
        label: r.label,
        availableQty: r.available,
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: CreateTransferPayload = {
        transfer_type: transferType,
        source_branch_id: sourceBranchId,
        source_warehouse_id: sourceWarehouseId,
        destination_branch_id: destBranchId,
        destination_warehouse_id: destWarehouseId,
        reason,
        notes: notes || undefined,
        items: items.map((i) => ({
          item_type: i.item_type,
          spare_part_id: i.spare_part_id,
          product_id: i.product_id,
          requested_qty: i.requested_qty,
          unit_cost: i.unit_cost,
        })),
      };

      const transfer = await createStockTransfer(payload);

      if (submitAfter) {
        await submitTransfer(transfer.id);
        toast.success(
          transferType === 'INTRA_BRANCH'
            ? 'Transfer created and approved — ready to dispatch'
            : 'Transfer submitted — another manager must approve before dispatch',
        );
      } else {
        toast.success('Transfer saved as draft');
      }

      router.push(`/manager/stock-transfers/${transfer.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create transfer';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-primary">New Stock Transfer</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  i === step
                    ? 'bg-primary text-white'
                    : i < step
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-white text-slate-400'
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 space-y-5">
          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">Select Transfer Type</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['INTRA_BRANCH', 'INTER_BRANCH'] as TransferType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTransferType(type)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      transferType === type
                        ? 'border-primary bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800">
                      {type === 'INTRA_BRANCH' ? 'Intra-Branch' : 'Inter-Branch'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {type === 'INTRA_BRANCH'
                        ? 'Move stock between warehouses within same branch'
                        : 'Move stock from one branch to another branch'}
                    </div>
                  </button>
                ))}
              </div>
              {transferType === 'INTER_BRANCH' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Inter-branch transfers require approval from a different manager or Admin — you
                  cannot approve your own request.
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">Source Location</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Source Branch</Label>
                  <Select
                    value={sourceBranchId}
                    onValueChange={(v) => {
                      setSourceBranchId(v);
                      setSourceWarehouseId('');
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter((b) => b.status === 'ACTIVE')
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Source Warehouse</Label>
                  <Select
                    value={sourceWarehouseId}
                    onValueChange={setSourceWarehouseId}
                    disabled={!sourceBranchId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceWarehouses
                        .filter((w) => w.status === 'ACTIVE')
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.warehouseName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">Destination Location</h2>
              {transferType === 'INTRA_BRANCH' && (
                <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                  Intra-branch: destination branch locked to source branch
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Destination Branch</Label>
                  <Select
                    value={destBranchId}
                    onValueChange={(v) => {
                      setDestBranchId(v);
                      setDestWarehouseId('');
                    }}
                    disabled={transferType === 'INTRA_BRANCH' && !!sourceBranchId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {destBranches
                        .filter((b) => b.status === 'ACTIVE')
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Destination Warehouse</Label>
                  <Select
                    value={destWarehouseId}
                    onValueChange={setDestWarehouseId}
                    disabled={!destBranchId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {destWarehouses
                        .filter((w) => w.status === 'ACTIVE' && w.id !== sourceWarehouseId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.warehouseName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-700">Items & Details</h2>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Items</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name, code, or serial number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => addItem(r)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 text-left"
                      >
                        <div>
                          <span className="font-medium">{r.label}</span>
                          <Badge
                            className={`ml-2 text-xs border-0 ${r.type === 'PRODUCT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {r.type === 'PRODUCT' ? 'Machine' : 'Spare Part'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Avail: {r.available ?? '?'}</span>
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Available: {item.availableQty ?? '?'}
                        </div>
                      </div>
                      {item.item_type === 'SPARE_PART' && (
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-slate-500 shrink-0">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            max={item.availableQty}
                            value={item.requested_qty}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              setItems((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, requested_qty: qty } : it,
                                ),
                              );
                            }}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Why is this transfer needed?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  placeholder="Additional remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
            disabled={saving}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                if (step === 2 && transferType === 'INTRA_BRANCH') setDestBranchId(sourceBranchId);
                setStep((s) => s + 1);
              }}
              disabled={!canNext()}
            >
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitAfter(false);
                  handleSave();
                }}
                disabled={!canNext() || saving}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => {
                  setSubmitAfter(true);
                  handleSave();
                }}
                disabled={!canNext() || saving}
              >
                {saving
                  ? 'Saving...'
                  : transferType === 'INTRA_BRANCH'
                    ? 'Submit & Approve'
                    : 'Submit for Approval'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
