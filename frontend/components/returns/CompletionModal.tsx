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
import { CreditNoteRecord } from '@/lib/invoice';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface CompletionData {
  replacementSerialNumber: string;
  replacementProductId?: string;
  replacementProductName?: string;
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
  const [newSerial, setNewSerial] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockChecked, setStockChecked] = useState(false);

  const isExchange = record?.type === 'CREDIT_EXCHANGE';

  // Fetch available stock whenever the modal opens
  useEffect(() => {
    if (!open || !record?.productId) {
      setAvailableProducts([]);
      setSelectedProduct(null);
      setNewSerial('');
      setStockChecked(false);
      return;
    }

    const fetchStock = async () => {
      setLoadingStock(true);
      setStockChecked(false);
      setAvailableProducts([]);
      setSelectedProduct(null);
      setNewSerial('');

      try {
        // Step 1: Get the original product to find its model ID
        const originalProduct = await getProductById(record.productId);
        const modelId = originalProduct?.model?.id;

        if (!modelId && !isExchange) {
          // Fallback: just allow manual serial entry
          setStockChecked(true);
          return;
        }

        // Step 2: Get available products
        // If it's an exchange, show ALL models. If replacement, same model only.
        const filter = isExchange ? {} : { modelId };
        const allProducts = await getAllProducts({ ...filter, limit: 1000 });

        const available = allProducts.filter(
          (p) =>
            p.product_status === ProductStatus.AVAILABLE &&
            p.serial_no !== record.serialNumber &&
            (!isExchange || p.model?.id !== modelId),
        );

        setAvailableProducts(available);
      } catch (err) {
        console.error('Failed to fetch available stock:', err);
        toast.error('Could not fetch stock. You may enter a serial manually.');
      } finally {
        setLoadingStock(false);
        setStockChecked(true);
      }
    };

    fetchStock();
  }, [open, record?.productId, record?.serialNumber]);

  const handleSelectUnit = (product: Product) => {
    setSelectedProduct(product);
    setNewSerial(product.serial_no);
  };

  const handleSubmit = () => {
    const serial = newSerial.trim();
    if (!serial) {
      toast.error('Please select or enter a new Serial Number');
      return;
    }

    // For exchanges, the replacementAmount is the NEW product's price
    // replacementAmount = selectedProduct?.sale_price || 0;
    // However, the backend expects replacementAmount to be the "final" set value.
    // If it's an exchange, we'll send the new product's price.

    onConfirm({
      replacementSerialNumber: serial,
      replacementProductId: selectedProduct?.id,
      replacementProductName: selectedProduct
        ? `${selectedProduct.name}${selectedProduct.model?.model_name ? ` ${selectedProduct.model.model_name}` : ''}`
        : undefined,
      replacementAmount: isExchange ? selectedProduct?.sale_price || 0 : record?.productAmount,
      replacementDiscount: discount,
    });
  };

  const originalValue = record?.productAmount || 0;
  const newValue = selectedProduct?.sale_price || 0;
  const variation = newValue - originalValue - discount;

  const isOutOfStock = stockChecked && !loadingStock && availableProducts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Complete Physical {record?.type === 'REPLACEMENT' ? 'Replacement' : 'Exchange'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 text-sm">
          {/* Original Item Info */}
          <div className="rounded-md bg-orange-50 p-3">
            <p className="font-semibold text-orange-800">Original Item</p>
            <p className="text-orange-600">
              {record?.productName} ({record?.serialNumber})
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
                <p className="font-semibold text-red-700">Product Currently Out of Stock</p>
                <p className="text-xs text-red-500 mt-0.5">
                  No available units of this model. You can still enter a serial number manually if
                  a unit is being sourced.
                </p>
              </div>
            </div>
          ) : availableProducts.length > 0 ? (
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span>
                  {availableProducts.length} Unit{availableProducts.length > 1 ? 's' : ''} Available
                </span>
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
                {availableProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectUnit(p)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${
                      selectedProduct?.id === p.id ? 'bg-blue-100 font-semibold text-blue-700' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">SN: {p.serial_no}</span>
                      <span className="text-muted-foreground font-normal">
                        QAR {p.sale_price?.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.name} {p.model?.model_name ? `- ${p.model.model_name}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Serial Number input (always shown) */}
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
                // If user types manually, deselect the dropdown pick
                if (selectedProduct && e.target.value !== selectedProduct.serial_no) {
                  setSelectedProduct(null);
                }
              }}
            />
            {selectedProduct && (
              <div className="text-[11px] text-green-600 mt-1.5 space-y-0.5">
                <p className="font-bold">
                  ✓ Selected: {selectedProduct.name}{' '}
                  {selectedProduct.model?.model_name ? `(${selectedProduct.model.model_name})` : ''}
                </p>
                <p>Sale Price: QAR {selectedProduct.sale_price?.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Exchange variation details (only for CREDIT_EXCHANGE) */}
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
                  <span>New Product Price:</span>
                  <span className="font-semibold">QAR {newValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Returned Credit:</span>
                  <span className="font-semibold">- QAR {originalValue.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Extra Discount:</span>
                    <span className="font-semibold">- QAR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-sm">
                  <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                    {variation >= 0 ? 'Payable Gap:' : 'Refundable Balance:'}
                  </span>
                  <span className={variation >= 0 ? 'text-blue-900' : 'text-green-700'}>
                    QAR {Math.abs(variation).toLocaleString()}
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
