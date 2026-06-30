import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, UploadCloud } from 'lucide-react';
import {
  Invoice,
  InvoiceItem,
  activateContractInvoice,
  uploadContractConfirmationInvoice,
  allocateMachinesInvoice,
} from '@/lib/invoice';
import { Product, getAvailableProductsByModel } from '@/lib/product';
import { SparePart, getAvailableSparePartsByModel, getAllSpareParts } from '@/lib/spare-part';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

interface ActivateContractModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReadingInput {
  productId: string;
  bwA4Reading: number | null;
  bwA3Reading: number | null;
  colorA4Reading: number | null;
  colorA3Reading: number | null;
  printColor: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
}
interface InvoiceItemWithProduct extends InvoiceItem {
  product?: {
    print_color?: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  };
}

/**
 * Step 2 of Finance Approval: Upload Confirmation, Deposit, Initial Readings.
 */
export function ActivateContractModal({ invoice, onClose, onSuccess }: ActivateContractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  // Flow State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [contractConfirmationUrl, setContractConfirmationUrl] = useState<string>('');

  // Deposit Details — always show for RENT/LEASE contracts
  const isDepositNeeded = invoice.saleType === 'RENT' || invoice.saleType === 'LEASE';
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositMode, setDepositMode] = useState<'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER'>(
    'BANK_TRANSFER',
  );
  const [depositRef, setDepositRef] = useState('');

  // Meter Readings
  const rentalItems =
    invoice.items?.filter((i: InvoiceItem) => i.itemType === 'PRODUCT' && i.productId) || [];
  const needsReadings = invoice.saleType === 'RENT' || invoice.saleType === 'LEASE';

  // Map of InvoiceItemId -> Selected ProductId (Serial Number)
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    invoice.items?.forEach((item) => {
      if (item.id) {
        // Look up in invoice.productAllocations
        const alloc = invoice.productAllocations?.find(
          (a) => a.productId === item.productId || a.modelId === item.modelId,
        );
        if (alloc) {
          initial[item.id] = alloc.productId;
        } else if (item.productId) {
          initial[item.id] = item.productId;
        }
      }
    });
    return initial;
  });

  // Cache of available items by ModelId
  const [availableItems, setAvailableItems] = useState<Record<string, (Product | SparePart)[]>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoadingProducts(true);

      const uniqueModelIds = Array.from(
        new Set(invoice.items?.filter((i) => i.modelId).map((i) => i.modelId!) || []),
      );
      const sparePartIds = Array.from(
        new Set(
          invoice.items
            ?.filter((i) => i.itemType === 'SPAREPART' && i.productId)
            .map((i) => i.productId!) || [],
        ),
      );

      const itemsMap: Record<string, (Product | SparePart)[]> = {};
      try {
        await Promise.all(
          uniqueModelIds.map(async (mid) => {
            const itemTypes = new Set(
              invoice.items?.filter((i) => i.modelId === mid).map((i) => i.itemType),
            );
            let combined: (Product | SparePart)[] = [];
            if (itemTypes.has('PRODUCT')) {
              const products = await getAvailableProductsByModel(mid);
              combined = [...combined, ...products];
            }
            if (itemTypes.has('SPAREPART')) {
              const parts = await getAvailableSparePartsByModel(mid);
              combined = [...combined, ...parts];
            }
            if (combined.length === 0) {
              const products = await getAvailableProductsByModel(mid);
              combined = [...combined, ...products];
              const parts = await getAvailableSparePartsByModel(mid);
              combined = [...combined, ...parts];
            }
            itemsMap[mid] = combined;
          }),
        );

        if (sparePartIds.length > 0) {
          const allParts = await getAllSpareParts();
          sparePartIds.forEach((pid) => {
            const matches = allParts.filter((p) => p.id === pid);
            if (matches.length > 0) {
              itemsMap[pid] = matches;
            }
          });
        }

        setAvailableItems(itemsMap);
      } catch (error) {
        console.error('Failed to fetch items', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (invoice.items) fetchInventory();
  }, [invoice]);

  const [readings, setReadings] = useState<Record<string, ReadingInput>>(() => {
    const initial: Record<string, ReadingInput> = {};
    rentalItems.forEach((item) => {
      // Get the product's print_color from the joined product data if available
      const itemData = item as InvoiceItemWithProduct;
      const printColor = itemData.product?.print_color || 'BOTH';

      initial[item.id!] = {
        productId: item.productId || '',
        bwA4Reading: 0,
        bwA3Reading: 0,
        colorA4Reading: 0,
        colorA3Reading: 0,
        printColor: printColor,
      };
    });
    return initial;
  });

  const getPrintColor = (item: InvoiceItem) => {
    const selectedPid = allocations[item.id!];
    if (selectedPid) {
      const available = availableItems[item.modelId!] || availableItems[item.productId!] || [];
      const prod = available.find((p) => p.id === selectedPid);
      if (prod && 'print_color' in prod) {
        return prod.print_color || 'BOTH';
      }
    }
    const itemData = item as InvoiceItemWithProduct;
    return itemData.product?.print_color || 'BOTH';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsUploading(true);
    try {
      const response = await uploadContractConfirmationInvoice(invoice.id, file);
      setContractConfirmationUrl(response.url);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('File upload failed', error);
      toast.error('Failed to upload document. Please try again.');
      setUploadFile(null); // Reset on failure
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!contractConfirmationUrl) {
      toast.error('Please upload the signed contract confirmation document.');
      return;
    }

    // Validate allocations are present
    const missingAllocations = rentalItems.filter((i) => !allocations[i.id!]);
    if (missingAllocations.length > 0) {
      toast.error(`Please select a Serial Number for: ${missingAllocations[0].description}`);
      return;
    }

    // Check for duplicates
    const selectedSerials = Object.values(allocations);
    const uniqueSerials = new Set(selectedSerials);
    if (selectedSerials.length !== uniqueSerials.size) {
      toast.error('Duplicate serial numbers selected! Each item must have a unique machine.');
      return;
    }

    // Validate readings if needed
    if (needsReadings) {
      for (const item of rentalItems) {
        const r = readings[item.id!];
        const printColor = getPrintColor(item);

        // Validate B&W Readings
        if (printColor === 'BOTH' || printColor === 'BLACK_WHITE') {
          if (!r || r.bwA4Reading === null || r.bwA4Reading < 0) {
            toast.error(`Please enter valid B&W A4 reading for ${item.description}`);
            return;
          }
          if (r.bwA3Reading === null || r.bwA3Reading < 0) {
            toast.error(`Please enter valid B&W A3 reading for ${item.description}`);
            return;
          }
        }

        // Validate Color Readings
        if (printColor === 'BOTH' || printColor === 'COLOUR') {
          if (!r || r.colorA4Reading === null || r.colorA4Reading < 0) {
            toast.error(`Please enter valid Color A4 reading for ${item.description}`);
            return;
          }
          if (r.colorA3Reading === null || r.colorA3Reading < 0) {
            toast.error(`Please enter valid Color A3 reading for ${item.description}`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Save machine allocations first
      const itemAllocUpdates = rentalItems.map((item) => ({
        id: item.id as string,
        productId: allocations[item.id!] as string,
      }));
      await allocateMachinesInvoice(invoice.id, { itemUpdates: itemAllocUpdates });

      // 2. Prepare readings updates
      const itemUpdates = needsReadings
        ? rentalItems.map((item) => {
            const r = readings[item.id!];
            return {
              id: item.id!,
              productId: allocations[item.id!] as string,
              initialBwCount: r?.bwA4Reading || 0,
              initialBwA3Count: r?.bwA3Reading || 0,
              initialColorCount: r?.colorA4Reading || 0,
              initialColorA3Count: r?.colorA3Reading || 0,
            };
          })
        : [];

      // 3. Prepare deposit
      let depositPayload = undefined;
      if (isDepositNeeded && Number(depositAmount) > 0) {
        depositPayload = {
          amount: Number(depositAmount),
          mode: depositMode,
          reference: depositRef,
          receivedDate: new Date().toISOString().split('T')[0],
        };
      }

      await activateContractInvoice(invoice.id, {
        contractConfirmationUrl,
        deposit: depositPayload,
        itemUpdates,
      });

      toast.success('Contract processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to activate contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="bg-green-100 text-green-700 p-1.5 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            {invoice.saleType === 'RENT' || invoice.saleType === 'LEASE'
              ? 'Process Agreement'
              : 'Activate Contract'}{' '}
            - #{invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Complete the processing flow by uploading the confirmation, reviewing machine
            allocations, and adding initial readings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto max-h-[70vh] space-y-8">
            {/* Step 1: Upload Document */}
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${contractConfirmationUrl ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  1
                </span>
                Upload Customer Confirmation
              </h3>

              {!contractConfirmationUrl ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center gap-3 relative transition-colors hover:bg-slate-100">
                  <input
                    type="file"
                    accept=".pdf, image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm font-medium text-slate-600">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <UploadCloud className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          Click or drag document here
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF or Images up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Document Uploaded Successfully
                      </p>
                      <p className="text-xs text-green-600">
                        {uploadFile?.name || 'Contract confirmation'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-red-500"
                    onClick={() => {
                      setContractConfirmationUrl('');
                      setUploadFile(null);
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Deposit & Readings */}
            {contractConfirmationUrl && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Deposit */}
                {isDepositNeeded && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        2
                      </span>
                      Security Deposit
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Amount (QAR)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Mode of Payment</Label>
                        <Select
                          value={depositMode}
                          onValueChange={(val) =>
                            setDepositMode(val as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER')
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI / Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-slate-500">Reference / Check No.</Label>
                        <Input
                          value={depositRef}
                          onChange={(e) => setDepositRef(e.target.value)}
                          placeholder="Optional reference..."
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Readings */}
                {needsReadings && rentalItems.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {isDepositNeeded ? '3' : '2'}
                      </span>
                      Initial Meter Readings
                    </h3>
                    <div className="space-y-3">
                      {rentalItems.map((item) => {
                        const r = readings[item.id!];
                        if (!r) return null;

                        const printColor = getPrintColor(item);
                        const isBw = printColor === 'BOTH' || printColor === 'BLACK_WHITE';
                        const isColor = printColor === 'BOTH' || printColor === 'COLOUR';

                        return (
                          <Card
                            key={item.id}
                            className="border-slate-200 bg-slate-50 border shadow-sm"
                          >
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {item.description}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400">
                                    Model ID: {item.modelId || 'N/A'}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-white">
                                  {(printColor as string).replace('_', ' ')}
                                </Badge>
                              </div>

                              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-100">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <Label className="text-xs">Machine Allocation</Label>
                                  {(() => {
                                    const available =
                                      availableItems[item.modelId!] ||
                                      availableItems[item.productId!] ||
                                      [];
                                    return (
                                      <span
                                        className={
                                          available.length > 0 ? 'text-green-600' : 'text-red-500'
                                        }
                                      >
                                        {available.length} items available
                                      </span>
                                    );
                                  })()}
                                </div>
                                {isLoadingProducts ? (
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="animate-spin h-3.5 w-3.5 text-blue-500" />
                                    <span>Checking inventory...</span>
                                  </div>
                                ) : (
                                  <SearchableSelect
                                    options={(
                                      availableItems[item.modelId!] ||
                                      availableItems[item.productId!] ||
                                      []
                                    ).map((p) => {
                                      const isTaken = Object.entries(allocations).some(
                                        ([k, v]) => v === p.id && k !== item.id!,
                                      );
                                      return {
                                        value: p.id,
                                        label:
                                          'serial_no' in p
                                            ? p.serial_no
                                            : `${p.sku} (Lot: ${p.lotNumber})`,
                                        description: isTaken
                                          ? 'Currently allocated to another item'
                                          : undefined,
                                        disabled: isTaken,
                                      };
                                    })}
                                    value={allocations[item.id!]}
                                    onValueChange={(val: string) => {
                                      setAllocations({
                                        ...allocations,
                                        [item.id!]: val,
                                      });
                                    }}
                                    placeholder="Select machine serial number..."
                                  />
                                )}
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-slate-100">
                                {isBw && (
                                  <>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                                        B&W A4
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={r.bwA4Reading === null ? '' : r.bwA4Reading}
                                        onChange={(e) =>
                                          setReadings({
                                            ...readings,
                                            [item.id!]: {
                                              ...r,
                                              bwA4Reading: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            },
                                          })
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                                        B&W A3
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={r.bwA3Reading === null ? '' : r.bwA3Reading}
                                        onChange={(e) =>
                                          setReadings({
                                            ...readings,
                                            [item.id!]: {
                                              ...r,
                                              bwA3Reading: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            },
                                          })
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </>
                                )}
                                {isColor && (
                                  <>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                                        Color A4
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={r.colorA4Reading === null ? '' : r.colorA4Reading}
                                        onChange={(e) =>
                                          setReadings({
                                            ...readings,
                                            [item.id!]: {
                                              ...r,
                                              colorA4Reading: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            },
                                          })
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] uppercase font-bold text-slate-500">
                                        Color A3
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={r.colorA3Reading === null ? '' : r.colorA3Reading}
                                        onChange={(e) =>
                                          setReadings({
                                            ...readings,
                                            [item.id!]: {
                                              ...r,
                                              colorA3Reading: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            },
                                          })
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="border-slate-200 hover:bg-white hover:text-slate-800"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading || !contractConfirmationUrl}
              className="bg-green-600 hover:bg-green-700 shadow-green-200 min-w-[140px] font-bold shadow-md transition-all text-white"
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
              {invoice.saleType === 'RENT' || invoice.saleType === 'LEASE'
                ? 'Process & Activate'
                : 'Activate Contract'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
