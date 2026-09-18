'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, AlertTriangle, CheckCircle2, Search, PackageSearch } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  // ── Stock list filters ──
  // A branch with real stock puts dozens of units behind this picker, and the list was a
  // bare scroll: the only way to reach a specific machine was to drag a 140px-tall box
  // past everything else. Searching by serial is how staff actually look — the serial is
  // what is printed on the unit in front of them.
  const [stockQuery, setStockQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('ALL');

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
      setStockQuery('');
      setModelFilter('ALL');
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

  /** Models present in the available stock, for the filter dropdown. */
  const modelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of availableProducts) {
      const id = p.model?.id;
      const name = p.model?.model_name || p.name;
      if (id && !seen.has(id)) seen.set(id, name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    return availableProducts.filter((p) => {
      if (modelFilter !== 'ALL' && p.model?.id !== modelFilter) return false;
      if (!q) return true;
      // Serial first — it is the thing staff read off the machine — then the names, so a
      // search for "canon" still narrows the list to that make.
      return [p.serial_no, p.name, p.model?.model_name, p.brand]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [availableProducts, stockQuery, modelFilter]);

  const filteredSpareParts = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return availableSpareParts;
    return availableSpareParts.filter((p) =>
      [p.part_name, p.sku, p.brand]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [availableSpareParts, stockQuery]);

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
      // An exchange settles money against the incoming unit's price, and that price comes
      // only from a unit matched in stock. Confirming on an unmatched serial submitted a
      // replacement value of 0, which Accounts would have settled as a refund of the full
      // original amount. A replacement is unaffected — it moves no money — so it is not
      // gated here.
      if (isExchange && !selectedProduct) {
        toast.error(
          'Pick the incoming unit from the stock list. A hand-typed serial has no price, so the exchange difference cannot be calculated.',
        );
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
  // VAT on the exchange difference, mirroring the server: exclusive, and levied on the
  // consideration after discount. Shown so nobody agrees a figure with the customer that
  // differs from what Accounts will actually collect or refund.
  const exchangeTaxPercent = Number(record?.taxPercent ?? 0);
  const exchangeVat = Math.abs(variation) * (exchangeTaxPercent / 100);
  const exchangeTotal = Math.abs(variation) + exchangeVat;

  /**
   * Whether the incoming item's price is actually known yet.
   *
   * Until a unit is chosen `newValue` is 0, which made the panel state a confident
   * "Refund to Customer: <the whole original amount>" before anything had been picked —
   * a figure that is wrong, is the one staff read out to the customer, and silently
   * becomes the real settlement if they confirm on a hand-typed serial that matches no
   * unit in stock. The panel now withholds the numbers until there is a price behind them.
   */
  const hasPricedReplacement = isSpare ? !!selectedSparePart : !!selectedProduct;

  const isOutOfStock =
    stockChecked &&
    !loadingStock &&
    (isSpare ? availableSpareParts.length === 0 : availableProducts.length === 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* The body grows with stock, the adjustment panel and any warnings, and had no
          height budget — on a laptop the Confirm button was pushed off the bottom of the
          screen with no way to reach it. The dialog now claims at most 90vh and scrolls
          its middle, so the title and the actions stay put however long the contents. */}
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>
            Complete Physical {record?.type === 'REPLACEMENT' ? 'Replacement' : 'Exchange'}
            {isSpare ? ' — Spare Part' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-4 text-sm flex-1 overflow-y-auto min-h-0">
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
                  {filteredSpareParts.length !== availableSpareParts.length && (
                    <span className="text-slate-400 font-normal">
                      {' '}
                      — showing {filteredSpareParts.length}
                    </span>
                  )}
                </span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  placeholder="Search part name, SKU or brand…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                {filteredSpareParts.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <PackageSearch className="h-5 w-5 text-slate-300" />
                    <p className="text-xs text-slate-400">No spare part matches that search.</p>
                  </div>
                ) : null}
                {filteredSpareParts.map((p) => (
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
                      {filteredProducts.length !== availableProducts.length && (
                        <span className="text-slate-400 font-normal">
                          {' '}
                          — showing {filteredProducts.length}
                        </span>
                      )}
                    </span>
                  </Label>
                  {/* Search + model filter. Two controls rather than one because they
                      answer different questions: the search finds a unit you already know
                      ("is SN 12347889 still here?"), the dropdown narrows to a make when
                      the customer only said what they want, not which one. */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input
                        value={stockQuery}
                        onChange={(e) => setStockQuery(e.target.value)}
                        placeholder="Search serial, product or brand…"
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                    {modelOptions.length > 1 && (
                      <Select value={modelFilter} onValueChange={setModelFilter}>
                        <SelectTrigger className="h-9 w-[40%] text-xs">
                          <SelectValue placeholder="All models" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">
                            All models ({availableProducts.length})
                          </SelectItem>
                          {modelOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">
                              {m.name} (
                              {availableProducts.filter((p) => p.model?.id === m.id).length})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                    {filteredProducts.length === 0 ? (
                      <div className="flex flex-col items-center gap-1 py-6 text-center">
                        <PackageSearch className="h-5 w-5 text-slate-300" />
                        <p className="text-xs text-slate-400">
                          No unit matches that search
                          {modelFilter !== 'ALL' ? ' in this model' : ''}.
                        </p>
                      </div>
                    ) : null}
                    {filteredProducts.map((p) => (
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
                    const typed = e.target.value;
                    setNewSerial(typed);
                    // Scanning a barcode fills this box rather than clicking the list, so a
                    // scanned unit used to stay "unselected" and its price never reached the
                    // adjustment below. Matching the typed serial back to stock makes the
                    // scanner and the list behave identically.
                    const match = availableProducts.find(
                      (p) => p.serial_no.toLowerCase() === typed.trim().toLowerCase(),
                    );
                    setSelectedProduct(match ?? null);
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
                {!hasPricedReplacement ? (
                  <div className="flex items-start gap-2 py-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {isSpare
                        ? 'Select a spare part above to work out the difference.'
                        : 'Select a unit from stock above to work out the difference. A serial typed by hand carries no price, so the settlement cannot be calculated from it.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>{isSpare ? 'New Spare Part(s) Price:' : 'New Product Price:'}</span>
                      <span className="font-semibold">{formatCurrency(newValue, currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Returned Credit:</span>
                      <span className="font-semibold">
                        - {formatCurrency(originalValue, currency)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Extra Discount:</span>
                        <span className="font-semibold">
                          - {formatCurrency(discount, currency)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-blue-200 flex justify-between text-xs text-blue-700">
                      <span>Net Difference:</span>
                      <span className="font-semibold">
                        {formatCurrency(Math.abs(variation), currency)}
                      </span>
                    </div>
                    {exchangeTaxPercent > 0 && (
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>VAT ({exchangeTaxPercent}%):</span>
                        <span className="font-semibold">
                          {formatCurrency(exchangeVat, currency)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-sm">
                      <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                        {variation >= 0 ? 'Customer Pays:' : 'Refund to Customer:'}
                      </span>
                      <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                        {formatCurrency(exchangeTotal, currency)}
                      </span>
                    </div>
                    <p className="pt-1 text-[10px] text-blue-600">
                      Goes to Accounts for approval — no money moves until it is approved and
                      settled.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0">
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
