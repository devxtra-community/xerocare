'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createStockTransfer,
  getAllBranches,
  TransferType,
  TransferItemType,
} from '@/lib/stockTransfer';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { getAllProducts, Product } from '@/lib/product';
import { getMyBranchWarehouses, Warehouse } from '@/lib/warehouse';
import { getUserFromToken } from '@/lib/auth';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Trash2,
  ArrowRightLeft,
  ChevronRight,
  Info,
  Package,
  Settings,
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface DraftItem {
  tempId: string;
  item_type: TransferItemType;
  spare_part_id?: string;
  product_id?: string;
  requested_qty: number;
  item_name: string;
}

export default function ManagerNewStockTransferPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const myBranchId = getUserFromToken()?.branchId;
  const [transferType, setTransferType] = useState<TransferType>('INTER_BRANCH');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [spSearch, setSpSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'spare_parts' | 'products'>('spare_parts');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getAllBranches()
      .then(setBranches)
      .catch(() => toast.error('Failed to load branches'));
    getAllSpareParts()
      .then((r) => setSpareParts(r ?? []))
      .catch(() => {});
    getAllProducts({ status: 'AVAILABLE' })
      .then((r) => setProducts(r ?? []))
      .catch(() => {});
    getMyBranchWarehouses()
      .then((r) => setWarehouses(r.data ?? []))
      .catch(() => {});
  }, []);

  const filteredParts = spareParts.filter(
    (p) =>
      p.part_name.toLowerCase().includes(spSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(spSearch.toLowerCase()),
  );

  const filteredProducts = products.filter(
    (p) =>
      (p.serial_no || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.model?.model_name || p.name || '').toLowerCase().includes(productSearch.toLowerCase()),
  );

  const addSparePart = (part: SparePart) => {
    if (items.some((i) => i.spare_part_id === part.id)) {
      toast.error('Already added');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        item_type: 'SPARE_PART',
        spare_part_id: part.id,
        requested_qty: 1,
        item_name: part.part_name,
      },
    ]);
    setSpSearch('');
  };

  const addProduct = (product: Product) => {
    if (items.some((i) => i.product_id === product.id)) {
      toast.error('Already added');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        item_type: 'PRODUCT',
        product_id: product.id,
        requested_qty: 1,
        item_name: `${product.model?.model_name ?? product.name} (${product.serial_no})`,
      },
    ]);
    setProductSearch('');
  };

  const updateQty = (tempId: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, requested_qty: qty } : i)));
  };

  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (transferType === 'INTER_BRANCH' && !sourceBranchId) {
      toast.error('Select the source branch');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setSubmitting(true);
    try {
      const transfer = await createStockTransfer({
        transfer_type: transferType,
        source_branch_id: transferType === 'INTER_BRANCH' ? sourceBranchId : '',
        source_warehouse_id: transferType === 'INTRA_BRANCH' ? sourceWarehouseId : undefined,
        requesting_warehouse_id: transferType === 'INTRA_BRANCH' ? destWarehouseId : undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          item_type: i.item_type,
          spare_part_id: i.spare_part_id,
          product_id: i.product_id,
          requested_qty: i.requested_qty,
          item_name: i.item_name,
        })),
      });

      if (!asDraft) {
        const { submitTransfer } = await import('@/lib/stockTransfer');
        await submitTransfer(transfer.id);
        toast.success('Request submitted — the source branch manager will be notified');
      } else {
        toast.success('Draft saved');
      }

      router.push('/manager/stock-transfers');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Stock Transfer</h1>
          <p className="text-xs text-gray-500">Step {step} of 4</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 w-10 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Step 1 — Type */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Choose Transfer Type</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTransferType('INTER_BRANCH')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${transferType === 'INTER_BRANCH' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <ArrowRightLeft className="h-6 w-6 mb-2 text-blue-600" />
              <div className="font-semibold text-gray-800">Inter-Branch</div>
              <div className="text-xs text-gray-500 mt-1">Request stock from another branch</div>
            </button>
            <button
              onClick={() => setTransferType('INTRA_BRANCH')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${transferType === 'INTRA_BRANCH' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <ArrowRightLeft className="h-6 w-6 mb-2 text-purple-600" />
              <div className="font-semibold text-gray-800">Intra-Branch</div>
              <div className="text-xs text-gray-500 mt-1">Move stock between your warehouses</div>
            </button>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2 — Source selection */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {transferType === 'INTER_BRANCH' ? (
            <>
              <h2 className="text-base font-semibold text-gray-800">
                Which branch to request from?
              </h2>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  The manager of the selected branch will receive your request and decide what they
                  can send.
                </span>
              </div>
              <select
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select source branch...</option>
                {branches
                  .filter((b) => b.id !== myBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-800">Select Warehouses</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    From Warehouse
                  </label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select source warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    To Warehouse
                  </label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select destination warehouse...</option>
                    {warehouses
                      .filter((w) => w.id !== sourceWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouseName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (transferType === 'INTER_BRANCH' && !sourceBranchId) {
                  toast.error('Select a source branch');
                  return;
                }
                if (transferType === 'INTRA_BRANCH' && (!sourceWarehouseId || !destWarehouseId)) {
                  toast.error('Select both warehouses');
                  return;
                }
                setStep(3);
              }}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Items */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">What do you need?</h2>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('spare_parts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'spare_parts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Settings className="h-3.5 w-3.5" />
              Spare Parts
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Package className="h-3.5 w-3.5" />
              Products / Machines
            </button>
          </div>

          {/* Spare Parts Search */}
          {activeTab === 'spare_parts' && (
            <div className="space-y-2">
              <input
                value={spSearch}
                onChange={(e) => setSpSearch(e.target.value)}
                placeholder="Search by part name or SKU..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {spSearch && filteredParts.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredParts.slice(0, 10).map((part) => (
                    <button
                      key={part.id}
                      onClick={() => addSparePart(part)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                    >
                      <div className="font-medium text-gray-800">{part.part_name}</div>
                      <div className="text-xs text-gray-400">{part.sku}</div>
                    </button>
                  ))}
                </div>
              )}
              {spSearch && filteredParts.length === 0 && (
                <p className="text-xs text-gray-400 px-1">
                  No spare parts found matching &ldquo;{spSearch}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Products Search */}
          {activeTab === 'products' && (
            <div className="space-y-2">
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by model name or serial number..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {productSearch && filteredProducts.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                    >
                      <div className="font-medium text-gray-800">
                        {product.model?.model_name ?? product.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        Serial: {product.serial_no} · {product.product_status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {productSearch && filteredProducts.length === 0 && (
                <p className="text-xs text-gray-400 px-1">
                  No products found matching &ldquo;{productSearch}&rdquo;
                </p>
              )}
              <p className="text-xs text-gray-400">Only AVAILABLE products shown.</p>
            </div>
          )}

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="text-xs font-medium text-gray-600">Items to Request ({items.length})</p>
              {items.map((item) => (
                <div
                  key={item.tempId}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.item_type === 'SPARE_PART' ? 'Spare Part' : 'Product / Machine'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      value={item.requested_qty}
                      onChange={(e) => updateQty(item.tempId, parseInt(e.target.value) || 1)}
                      disabled={item.item_type === 'PRODUCT'}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.tempId)}
                    className="p-1.5 hover:bg-red-100 rounded text-red-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (items.length === 0) {
                  toast.error('Add at least one item');
                  return;
                }
                setStep(4);
              }}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Review & Submit</h2>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium">
                {transferType === 'INTER_BRANCH' ? 'Inter-Branch Request' : 'Intra-Branch Move'}
              </span>
            </div>
            {transferType === 'INTER_BRANCH' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Requesting from</span>
                <span className="font-medium">
                  {branches.find((b) => b.id === sourceBranchId)?.name}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-medium">
                {items.filter((i) => i.item_type === 'SPARE_PART').length} spare part(s),&nbsp;
                {items.filter((i) => i.item_type === 'PRODUCT').length} product(s)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.tempId}
                className="flex justify-between text-sm bg-gray-50 rounded px-3 py-2"
              >
                <div>
                  <span className="text-gray-700">{item.item_name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {item.item_type === 'SPARE_PART' ? '(spare part)' : '(product)'}
                  </span>
                </div>
                <span className="font-medium shrink-0">× {item.requested_qty}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Urgency, reason for request..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {transferType === 'INTER_BRANCH' && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                The source branch manager will review and respond with what they can provide. Stock
                arrives only after they dispatch.
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="flex-1 border border-blue-600 text-blue-600 py-2.5 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
