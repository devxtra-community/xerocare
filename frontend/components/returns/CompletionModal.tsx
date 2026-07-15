'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getProductById, getAllProducts, Product, ProductStatus } from '@/lib/product';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { CreditNoteRecord } from '@/lib/invoice';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

export interface CompletionData {
  // Product
  replacementSerialNumber?: string;
  replacementProductId?: string;
  replacementProductName?: string;
  // Spare part
  replacementSparePartId?: string;
  replacementSparePartName?: string;
  replacementSparePartSku?: string;
  replacementQuantity?: number;
  // Shared
  replacementAmount?: number;
  replacementDiscount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CompletionData) => void;
  record: CreditNoteRecord | null;
}

export default function CompletionModal({ open, onClose, onConfirm, record }: Props) {
  const currency = useBranchCurrency();
  const isSpare = record?.itemCategory === 'SPARE_PART';
  const isExchange = record?.type === 'CREDIT_EXCHANGE';

  // ── Product state ──
  const [newSerial, setNewSerial] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  // ── Spare part state ──
  const [selectedSparePart, setSelectedSparePart] = useState<SparePart | null>(null);
  const [availableSpareParts, setAvailableSpareParts] = useState<SparePart[]>([]);
  const [replacementQty, setReplacementQty] = useState<number>(1);

  // ── Shared ──
  const [discount, setDiscount] = useState<number>(0);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockChecked, setStockChecked] = useState(false);

  useEffect(() => {
    if (!open || !record) {
      setNewSerial('');
      setSelectedProduct(null);
      setSelectedSparePart(null);
      setAvailableProducts([]);
      setAvailableSpareParts([]);
      setDiscount(0);
      setStockChecked(false);
      setReplacementQty(record?.quantity || 1);
      return;
    }

    setReplacementQty(record.quantity || 1);
    const fetchStock = async () => {
      setLoadingStock(true);
      try {
        if (isSpare) {
          // Fetch available spare parts
          const all = await getAllSpareParts({ limit: 1000 });
          const available = all.filter((p) => {
            if ((p.quantity ?? 0) <= 0) return false;
            // REPLACEMENT: same spare part SKU (or any with stock if no SKU match — allow manual)
            // CREDIT_EXCHANGE: different SKU than the returned one
            if (isExchange) return p.id !== record.sparePartId;
            return p.id !== record.sparePartId; // For replacement: different unit of any spare part with stock
          });
          setAvailableSpareParts(available);
        } else {
          // Fetch available products (existing logic)
          const originalProduct = await getProductById(record.productId!);
          const modelId = originalProduct?.model?.id;
          const filter = isExchange ? {} : { modelId };
          const allProducts = await getAllProducts({ ...filter, limit: 1000 });
          const available = allProducts.filter(
            (p) =>
              p.product_status === ProductStatus.AVAILABLE &&
              p.serial_no !== record.serialNumber &&
              (!isExchange || p.model?.id !== modelId),
          );
          setAvailableProducts(available);
        }
      } catch (err) {
        console.error('Failed to fetch available stock:', err);
        toast.error('Could not fetch stock. You may enter manually.');
      } finally {
        setLoadingStock(false);
        setStockChecked(true);
      }
    };

    fetchStock();
  }, [open, record, isSpare, isExchange]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setNewSerial(product.serial_no);
  };

  const handleSelectSparePart = (part: SparePart) => {
    setSelectedSparePart(part);
  };

  const handleSubmit = () => {
    if (isSpare) {
      if (!selectedSparePart && !isExchange) {
        // For replacement, warn but allow if they've somehow chosen
        if (!selectedSparePart) {
          toast.error('Please select a replacement spare part');
          return;
        }
      }
      if (isExchange && !selectedSparePart) {
        toast.error('Please select a spare part for exchange');
        return;
      }
      if (!selectedSparePart) {
        toast.error('Please select a replacement spare part');
        return;
      }

      const newUnitPrice = selectedSparePart.base_price || 0;
      const replacementAmount = isExchange ? newUnitPrice * replacementQty : record?.productAmount;

      onConfirm({
        replacementSparePartId: selectedSparePart.id,
        replacementSparePartName: selectedSparePart.part_name,
        replacementSparePartSku: selectedSparePart.sku,
        replacementQuantity: replacementQty,
        replacementAmount,
        replacementDiscount: discount,
      });
    } else {
      const serial = newSerial.trim();
      if (!serial) {
        toast.error('Please select or enter a new Serial Number');
        return;
      }
      onConfirm({
        replacementSerialNumber: serial,
        replacementProductId: selectedProduct?.id,
        replacementProductName: selectedProduct
          ? `${selectedProduct.name}${selectedProduct.model?.model_name ? ` ${selectedProduct.model.model_name}` : ''}`
          : undefined,
        replacementAmount: isExchange ? selectedProduct?.sale_price || 0 : record?.productAmount,
        replacementDiscount: discount,
      });
    }
  };

  // ── Variance calculation (for CREDIT_EXCHANGE) ──
  const originalValue = record?.productAmount || 0;
  const newValue = isSpare
    ? (selectedSparePart?.base_price || 0) * replacementQty
    : selectedProduct?.sale_price || 0;
  const variation = newValue - originalValue - discount;

  const isOutOfStock =
    stockChecked &&
    !loadingStock &&
    (isSpare ? availableSpareParts.length === 0 : availableProducts.length === 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Complete Physical {record?.type === 'REPLACEMENT' ? 'Replacement' : 'Exchange'}
            {isSpare ? ' — Spare Part' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 text-sm">
          {/* Original Item Info */}
          <div className="rounded-md bg-orange-50 p-3">
            <p className="font-semibold text-orange-800">
              {isSpare ? 'Original Spare Part' : 'Original Item'}
            </p>
            <p className="text-orange-600">
              {isSpare
                ? `${record?.productName} (${record?.sku || '—'}) × ${record?.quantity || 1}`
                : `${record?.productName} (${record?.serialNumber})`}
            </p>
          </div>

          {/* Stock status */}
          {loadingStock ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Checking available stock...</span>
            </div>
          ) : isOutOfStock ? (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-700">
                  {isSpare ? 'No Replacement Stock Available' : 'Product Currently Out of Stock'}
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  {isSpare
                    ? 'No spare parts meet the exchange criteria. Source externally before completing.'
                    : 'No available units of this model. You can still enter a serial manually if a unit is being sourced.'}
                </p>
              </div>
            </div>
          ) : null}

          {/* ── SPARE PART selector ── */}
          {isSpare && availableSpareParts.length > 0 && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span>
                  {availableSpareParts.length} SKU{availableSpareParts.length > 1 ? 's' : ''} in
                  Stock
                </span>
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
                {availableSpareParts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectSparePart(p)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${
                      selectedSparePart?.id === p.id
                        ? 'bg-blue-100 font-semibold text-blue-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {p.part_name} ({p.sku})
                      </span>
                      <span className="text-muted-foreground font-normal">
                        {formatCurrency(p.base_price, currency)} × {p.quantity} in stock
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{p.brand}</div>
                  </button>
                ))}
              </div>
              {selectedSparePart && (
                <p className="text-[11px] text-green-600 font-bold">
                  ✓ Selected: {selectedSparePart.part_name} ({selectedSparePart.sku})
                </p>
              )}
            </div>
          )}

          {/* ── SPARE PART quantity ── */}
          {isSpare && (
            <div className="grid gap-2">
              <Label>Quantity to Replace</Label>
              <Input
                type="number"
                min={1}
                max={record?.quantity || 1}
                value={replacementQty}
                onChange={(e) => setReplacementQty(Math.max(1, Number(e.target.value)))}
              />
              <p className="text-[10px] text-muted-foreground">
                Original returned quantity: {record?.quantity || 1}
              </p>
            </div>
          )}

          {/* ── PRODUCT serial selector ── */}
          {!isSpare && (
            <>
              {!loadingStock && availableProducts.length > 0 && (
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>
                      {availableProducts.length} Unit{availableProducts.length > 1 ? 's' : ''}{' '}
                      Available
                    </span>
                  </Label>
                  <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
                    {availableProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${
                          selectedProduct?.id === p.id
                            ? 'bg-blue-100 font-semibold text-blue-700'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">SN: {p.serial_no}</span>
                          <span className="text-muted-foreground font-normal">
                            {formatCurrency(p.sale_price ?? 0, currency)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.name} {p.model?.model_name ? `- ${p.model.model_name}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label>New Unit Serial Number</Label>
                <Input
                  placeholder={
                    isOutOfStock
                      ? 'Enter serial manually (if sourced externally)...'
                      : 'Scan or enter new serial...'
                  }
                  value={newSerial}
                  onChange={(e) => {
                    setNewSerial(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.serial_no) {
                      setSelectedProduct(null);
                    }
                  }}
                />
                {selectedProduct && (
                  <div className="text-[11px] text-green-600 mt-1.5 space-y-0.5">
                    <p className="font-bold">
                      ✓ Selected: {selectedProduct.name}{' '}
                      {selectedProduct.model?.model_name
                        ? `(${selectedProduct.model.model_name})`
                        : ''}
                    </p>
                    <p>Sale Price: {formatCurrency(selectedProduct.sale_price ?? 0, currency)}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── CREDIT_EXCHANGE variance panel (both product and spare part) ── */}
          {isExchange && (
            <div className="space-y-4 pt-2 border-t mt-2">
              <div className="grid gap-2">
                <Label className="text-orange-700">Extra Discount (if any)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="border-orange-200 focus:ring-orange-500"
                />
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-100 p-3 space-y-2">
                <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider">
                  Account Adjustment
                </h4>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>{isSpare ? 'New Spare Part(s) Price:' : 'New Product Price:'}</span>
                  <span className="font-semibold">{formatCurrency(newValue, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Returned Credit:</span>
                  <span className="font-semibold">- {formatCurrency(originalValue, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Extra Discount:</span>
                    <span className="font-semibold">- {formatCurrency(discount, currency)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-sm">
                  <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                    {variation >= 0 ? 'Payable Gap:' : 'Refundable Balance:'}
                  </span>
                  <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                    {formatCurrency(Math.abs(variation), currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loadingStock}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loadingStock ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm and Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
