'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { getAllBranches, getMyBranch, Branch } from '@/lib/branch';
import { getWarehouses, Warehouse } from '@/lib/warehouse';
import {
  createStockTransfer,
  submitTransfer,
  dispatchTransfer,
  getTransferBranchInventory,
  TransferType,
  CreateTransferPayload,
  BranchInventory,
} from '@/lib/stockTransfer';
import { toast } from 'sonner';

interface LineItem {
  item_type: 'SPARE_PART' | 'PRODUCT';
  spare_part_id?: string;
  model_id?: string;
  product_id?: string;
  requested_qty: number;
  label: string;
  availableQty: number;
}

const STEPS = ['Transfer Type', 'Source', 'Destination', 'Items & Submit'];

export default function ManagerNewTransferPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [transferType, setTransferType] = useState<TransferType>('INTRA_BRANCH');
  const [myBranch, setMyBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');

  const [inventory, setInventory] = useState<BranchInventory | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const isInter = transferType === 'INTER_BRANCH';

  useEffect(() => {
    getAllBranches().then(setBranches);
    getMyBranch()
      .then(setMyBranch)
      .catch(() => toast.error('Could not load your branch'));
    getWarehouses().then((res) => {
      const arr = Array.isArray(res) ? res : (res.data ?? []);
      setWarehouses(arr);
    });
  }, []);

  // Managers operate from their own branch: INTRA moves stock within it,
  // INTER requests stock from another branch INTO it. Branch ids are derived, not selected.
  useEffect(() => {
    if (!myBranch) return;
    if (transferType === 'INTRA_BRANCH') {
      setSourceBranchId(myBranch.id);
      setDestBranchId(myBranch.id);
    } else {
      setDestBranchId(myBranch.id);
      setSourceBranchId((prev) => (prev === myBranch.id ? '' : prev));
    }
  }, [myBranch, transferType]);

  const sourceWarehouses = warehouses.filter((w) => w.branchId === sourceBranchId);
  const destWarehouses = warehouses.filter((w) => w.branchId === destBranchId);

  const loadInventory = useCallback(async () => {
    if (!sourceBranchId || (!isInter && !sourceWarehouseId)) return;
    setLoadingInventory(true);
    try {
      const inv = await getTransferBranchInventory(
        sourceBranchId,
        isInter ? undefined : sourceWarehouseId,
      );
      setInventory(inv);
    } catch {
      toast.error('Failed to load source inventory');
    } finally {
      setLoadingInventory(false);
    }
  }, [sourceBranchId, sourceWarehouseId, isInter]);

  useEffect(() => {
    if (step === 3) loadInventory();
  }, [step, loadInventory]);

  const addLine = (line: LineItem) => {
    const key = line.product_id ?? line.model_id ?? line.spare_part_id;
    if (items.some((i) => (i.product_id ?? i.model_id ?? i.spare_part_id) === key)) {
      toast.info('Item already added');
      return;
    }
    setItems((prev) => [...prev, line]);
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return isInter ? !!sourceBranchId : !!sourceBranchId && !!sourceWarehouseId;
    if (step === 2) return !!destBranchId && !!destWarehouseId;
    if (step === 3) return items.length > 0 && !!reason;
    return false;
  };

  const handleSave = async (action: 'draft' | 'go') => {
    setSaving(true);
    try {
      const payload: CreateTransferPayload = {
        transfer_type: transferType,
        source_branch_id: sourceBranchId,
        source_warehouse_id: isInter ? undefined : sourceWarehouseId,
        destination_branch_id: destBranchId,
        destination_warehouse_id: destWarehouseId,
        reason,
        notes: notes || undefined,
        items: items.map((i) => ({
          item_type: i.item_type,
          spare_part_id: i.spare_part_id,
          model_id: i.model_id,
          product_id: i.product_id,
          requested_qty: i.requested_qty,
        })),
      };
      const transfer = await createStockTransfer(payload);

      if (action === 'go') {
        if (isInter) {
          await submitTransfer(transfer.id);
          toast.success('Request sent — the giving branch manager must approve it');
        } else {
          await dispatchTransfer(transfer.id);
          toast.success('Transfer dispatched — receive it via the created lot');
        }
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
          {/* Step 1: Type */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">Select Transfer Type</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['INTRA_BRANCH', 'INTER_BRANCH'] as TransferType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTransferType(type);
                      setItems([]);
                    }}
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
                        ? 'Move stock between your warehouses'
                        : 'Request stock from another branch'}
                    </div>
                  </button>
                ))}
              </div>
              {isInter && (
                <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                  The giving branch manager reviews, can adjust quantities, assigns machines and
                  approves before anything moves.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Source */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">
                {isInter ? 'Request From Branch' : 'Source Warehouse'}
              </h2>
              <div className="space-y-3">
                {isInter ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Branch to request from</Label>
                      <div className="mt-1">
                        <SearchableSelect
                          value={sourceBranchId}
                          onValueChange={(v) => {
                            setSourceBranchId(v);
                            setSourceWarehouseId('');
                            setItems([]);
                          }}
                          placeholder="Select branch..."
                          emptyText="No branches found."
                          options={branches
                            .filter((b) => b.status === 'ACTIVE' && b.id !== myBranch?.id)
                            .map((b) => ({ value: b.id, label: b.name }))}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                      You will pick items from that branch&apos;s live inventory in the last step.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                      Intra-branch transfer within{' '}
                      <span className="font-semibold">{myBranch?.name ?? 'your branch'}</span> —
                      pick the warehouse to move stock from.
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Source Warehouse</Label>
                      <div className="mt-1">
                        <SearchableSelect
                          value={sourceWarehouseId}
                          onValueChange={(v) => {
                            setSourceWarehouseId(v);
                            setItems([]);
                          }}
                          disabled={!sourceBranchId}
                          placeholder="Select warehouse..."
                          emptyText="No warehouses found."
                          options={sourceWarehouses
                            .filter((w) => w.status === 'ACTIVE')
                            .map((w) => ({ value: w.id, label: w.warehouseName }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Destination */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-700">Destination Warehouse</h2>
              <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                {isInter ? 'Receiving into' : 'Moving stock within'}{' '}
                <span className="font-semibold">{myBranch?.name ?? 'your branch'}</span> — pick the
                warehouse that will receive the items.
              </div>
              <div>
                <Label className="text-sm font-medium">Destination Warehouse</Label>
                <div className="mt-1">
                  <SearchableSelect
                    value={destWarehouseId}
                    onValueChange={setDestWarehouseId}
                    disabled={!destBranchId}
                    placeholder="Select warehouse..."
                    emptyText="No warehouses found."
                    options={destWarehouses
                      .filter((w) => w.status === 'ACTIVE' && w.id !== sourceWarehouseId)
                      .map((w) => ({ value: w.id, label: w.warehouseName }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Items */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-700">Items & Details</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">
                    {isInter ? 'Add machine (by model)' : 'Add machine (by serial)'}
                  </Label>
                  <div className="mt-1">
                    <SearchableSelect
                      value=""
                      loading={loadingInventory}
                      onValueChange={(v) => {
                        if (isInter) {
                          const m = inventory?.models.find((x) => x.model_id === v);
                          if (m)
                            addLine({
                              item_type: 'PRODUCT',
                              model_id: m.model_id,
                              requested_qty: 1,
                              label: `${m.brand ? `${m.brand} ` : ''}${m.model_name}`,
                              availableQty: m.available,
                            });
                        } else {
                          const p = inventory?.products.find((x) => x.id === v);
                          if (p)
                            addLine({
                              item_type: 'PRODUCT',
                              product_id: p.id,
                              requested_qty: 1,
                              label: `${p.model_name} — SN: ${p.serial_no}`,
                              availableQty: 1,
                            });
                        }
                      }}
                      placeholder="Select machine..."
                      emptyText="No machines available."
                      options={
                        isInter
                          ? (inventory?.models ?? []).map((m) => ({
                              value: m.model_id,
                              label: `${m.brand ? `${m.brand} ` : ''}${m.model_name}`,
                              description: `${m.available} available`,
                            }))
                          : (inventory?.products ?? []).map((p) => ({
                              value: p.id,
                              label: `${p.model_name} — ${p.serial_no}`,
                            }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Add spare part</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      value=""
                      loading={loadingInventory}
                      onValueChange={(v) => {
                        const sp = inventory?.spare_parts.find((x) => x.spare_part_id === v);
                        if (sp)
                          addLine({
                            item_type: 'SPARE_PART',
                            spare_part_id: sp.spare_part_id,
                            requested_qty: 1,
                            label: `${sp.part_name} (${sp.item_code})`,
                            availableQty: sp.available,
                          });
                      }}
                      placeholder="Select spare part..."
                      emptyText="No spare parts in stock."
                      options={(inventory?.spare_parts ?? []).map((sp) => ({
                        value: sp.spare_part_id,
                        label: `${sp.brand ? `${sp.brand} ` : ''}${sp.part_name}`,
                        description: `${sp.available} in stock`,
                      }))}
                    />
                  </div>
                </div>
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
                          <Badge
                            className={`ml-2 text-xs border-0 ${item.item_type === 'PRODUCT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {item.item_type === 'PRODUCT' ? 'Machine' : 'Spare Part'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Available: {item.availableQty}
                        </div>
                      </div>
                      {!(item.item_type === 'PRODUCT' && !isInter) && (
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-slate-500 shrink-0">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            max={item.availableQty}
                            value={item.requested_qty}
                            onChange={(e) => {
                              const qty = Math.min(
                                item.availableQty,
                                Math.max(1, parseInt(e.target.value) || 1),
                              );
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

        {/* Nav */}
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
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Next
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={!canNext() || saving}
              >
                Save as Draft
              </Button>
              <Button onClick={() => handleSave('go')} disabled={!canNext() || saving}>
                {saving ? 'Saving...' : isInter ? 'Submit Request' : 'Create & Dispatch'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
