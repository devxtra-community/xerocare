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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Box,
  CreditCard,
  Gauge,
  Calendar,
} from 'lucide-react';
import { Invoice, financeApproveInvoice } from '@/lib/invoice';
import { Product, getAvailableProductsByModel } from '@/lib/product';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface FinanceApprovalModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * High-stakes modal for finance level invoice approval.
 * Performs detailed calculations of usage, rent, and charges before final approval.
 * Updates invoice status and records financial transactions upon approval.
 */
export function FinanceApprovalModal({ invoice, onClose, onSuccess }: FinanceApprovalModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAllocatableItems = () => {
    return invoice.items?.filter((i) => i.itemType === 'PRODUCT' && i.id) || [];
  };

  // Step 1: Allocations
  // Map of InvoiceItemId -> Selected ProductId (Serial Number)
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    invoice.items?.forEach((item) => {
      if (item.itemType === 'PRODUCT' && item.id && item.productId) {
        initial[item.id] = item.productId;
      }
    });
    return initial;
  });

  // Cache of available products by ModelId
  const [availableProducts, setAvailableProducts] = useState<Record<string, Product[]>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Step 2: Security Deposit
  const [deposit, setDeposit] = useState({
    amount: String(invoice.securityDepositAmount || ''),
    mode: (invoice.securityDepositMode || 'CASH') as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER',
    reference: invoice.securityDepositReference || '',
    receivedDate: invoice.securityDepositReceivedDate || new Date().toISOString().split('T')[0],
  });

  // Step 3: Initial Meter Readings
  // Map of InvoiceItemId -> Readings
  const [readings, setReadings] = useState<
    Record<string, { bw: string; bwA3: string; color: string; colorA3: string }>
  >(() => {
    const initial: Record<string, { bw: string; bwA3: string; color: string; colorA3: string }> =
      {};
    invoice.items?.forEach((item) => {
      if (item.itemType === 'PRODUCT' && item.id) {
        initial[item.id] = {
          bw: item.initialBwCount?.toString() || '',
          bwA3: item.initialBwA3Count?.toString() || '',
          color: item.initialColorCount?.toString() || '',
          colorA3: item.initialColorA3Count?.toString() || '',
        };
      }
    });
    return initial;
  });

  // 2. Fetch available products for those needing machine selection
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const uniqueModelIds = Array.from(
        new Set(
          invoice.items
            ?.filter((i) => i.modelId && !i.productId) // Only items needing allocation
            .map((i) => i.modelId!),
        ),
      );

      const productMap: Record<string, Product[]> = {};
      try {
        await Promise.all(
          uniqueModelIds.map(async (mid) => {
            const products = await getAvailableProductsByModel(mid);
            productMap[mid] = products;
          }),
        );
        setAvailableProducts(productMap);
      } catch (error) {
        console.error('Failed to fetch products', error);
        toast.error('Failed to load available inventory. Please retry.');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (invoice.items) fetchProducts();
  }, [invoice]);

  const handleNext = () => {
    // Validation
    if (step === 1) {
      // Ensure all items are allocated
      const itemsToAllocate = getAllocatableItems().filter((i) => !i.productId);
      const allAllocated = itemsToAllocate?.every((i) => allocations[i.id!]);
      if (!allAllocated) {
        toast.error('Please allocate a serial number for every item.');
        return;
      }

      // Check for duplicates
      const selectedSerials = Object.values(allocations);
      const uniqueSerials = new Set(selectedSerials);
      if (selectedSerials.length !== uniqueSerials.size) {
        toast.error('Duplicate serial numbers selected! Each item must have a unique machine.');
        return;
      }

      setStep(2);
    } else if (step === 2) {
      // Validate Deposit if applicable (Mandatory for non-LEASE)
      if (invoice.saleType !== 'LEASE') {
        if (!deposit.amount || Number(deposit.amount) <= 0) {
          toast.error('Security Deposit Amount is required.');
          return;
        }
        if (!deposit.mode) {
          toast.error('Payment Mode is required.');
          return;
        }
        if (!deposit.receivedDate) {
          toast.error('Received Date is required.');
          return;
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    // Validation: Ensure all machines are allocated and readings are entered
    const itemsToAllocate = getAllocatableItems();

    // 1. Check Allocations first (only for items that HAVE a modelId)
    const missingAllocations = itemsToAllocate.filter(
      (i) => i.modelId && !i.productId && !allocations[i.id!],
    );
    if (missingAllocations.length > 0) {
      toast.error(`Please select a Serial Number for: ${missingAllocations[0].description}`);
      setStep(1); // Jump back to step 1
      return;
    }

    for (const item of itemsToAllocate) {
      const reading = readings[item.id!];
      if (!reading || reading.bw === '' || reading.bw === undefined) {
        toast.error(`Please enter Initial B&W Reading for ${item.description}`);
        return;
      }

      if (reading.bwA3 === '' || reading.bwA3 === undefined) {
        toast.error(`Please enter Initial B&W A3 Reading for ${item.description}`);
        return;
      }

      // Check if color reading is required
      const productId = allocations[item.id!];
      const productList = availableProducts[item.modelId!] || [];
      const product = productList.find((p) => p.id === productId);

      if (product?.print_colour !== 'BLACK_WHITE') {
        if (!reading.color || reading.color === '' || reading.color === undefined) {
          toast.error(`Please enter Initial Color Reading for ${item.description}`);
          return;
        }
        if (!reading.colorA3 || reading.colorA3 === '' || reading.colorA3 === undefined) {
          toast.error(`Please enter Initial Color A3 Reading for ${item.description}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Prepare payload for ALL product items to ensure backend has complete state
      const itemUpdates = getAllocatableItems().map((item) => ({
        id: item.id as string,
        productId: (allocations[item.id!] || item.productId || '') as string,
        initialBwCount: readings[item.id!]?.bw
          ? Number(readings[item.id!].bw)
          : item.initialBwCount || 0,
        initialBwA3Count: readings[item.id!]?.bwA3
          ? Number(readings[item.id!].bwA3)
          : item.initialBwA3Count || 0,
        initialColorCount: readings[item.id!]?.color
          ? Number(readings[item.id!].color)
          : item.initialColorCount || 0,
        initialColorA3Count: readings[item.id!]?.colorA3
          ? Number(readings[item.id!].colorA3)
          : item.initialColorA3Count || 0,
      }));

      const payload = {
        deposit:
          invoice.saleType !== 'LEASE'
            ? {
                amount: Number(deposit.amount || 0),
                mode: deposit.mode as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER',
                reference: deposit.reference,
                receivedDate: deposit.receivedDate,
              }
            : undefined,
        itemUpdates,
      };

      console.log('[Finance Approval] Submitting payload:', payload);

      await financeApproveInvoice(invoice.id, payload);

      toast.success('Invoice approved successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Machine Allocation', icon: Box },
    { id: 2, title: 'Security Deposit', icon: CreditCard },
    { id: 3, title: 'Initial Readings', icon: Gauge },
  ];

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="bg-blue-100 text-blue-700 p-1.5 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            Approve Invoice #{invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>Complete the finalization process step by step.</DialogDescription>
        </DialogHeader>

        <div className="flex h-[500px]">
          {/* Left Sidebar - Stepper */}
          <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-6 space-y-8 hidden md:block">
            <div className="space-y-6 relative">
              {/* Vertical Line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200 -z-0" />

              {steps.map((s) => {
                const isActive = step === s.id;
                const isCompleted = step > s.id;
                const Icon = s.icon;

                return (
                  <div key={s.id} className="relative z-10 flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                          : isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-slate-300 text-slate-300'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                    </div>
                    <div
                      className={`transition-all duration-300 ${isActive ? 'translate-x-1' : ''}`}
                    >
                      <p
                        className={`text-sm font-bold ${
                          isActive
                            ? 'text-blue-700'
                            : isCompleted
                              ? 'text-green-600'
                              : 'text-slate-400'
                        }`}
                      >
                        {s.title}
                      </p>
                      {isActive && (
                        <p className="text-[10px] text-blue-500 font-medium">In Progress</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invoice Summary Mini */}
            <div className="mt-12 bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Summary
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Items:</span>
                <span className="font-bold text-slate-700">
                  {getAllocatableItems().length} Machines
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-700 truncate max-w-[100px]">
                  {invoice.customerName}
                </span>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Step 1: Allocations */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Box className="text-blue-500" /> Allocate Stock
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Select specific serial numbers from available inventory for each line item.
                  </p>

                  {isLoadingProducts ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                      <p className="text-xs font-medium">Checking Inventory...</p>
                    </div>
                  ) : (
                    getAllocatableItems().map((item) => {
                      const available = availableProducts[item.modelId!] || [];
                      const selected = allocations[item.id!];

                      return (
                        <Card
                          key={item.id}
                          className="border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-700 text-sm">
                                  {item.description}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[10px] font-mono text-slate-400"
                                >
                                  ID: {item.modelId?.slice(0, 8)}...
                                </Badge>
                              </div>
                              <Badge
                                variant={selected ? 'default' : 'secondary'}
                                className={
                                  selected ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
                                }
                              >
                                {selected ? 'Allocated' : 'Pending'}
                              </Badge>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-500">
                                <Label className="text-xs">Select Serial Number</Label>
                                <span
                                  className={
                                    available.length > 0 ? 'text-green-600' : 'text-red-500'
                                  }
                                >
                                  {available.length} items available
                                </span>
                              </div>
                              <SearchableSelect
                                options={available.map((p) => {
                                  const isTaken = Object.entries(allocations).some(
                                    ([k, v]) => v === p.id && k !== item.id!,
                                  );
                                  return {
                                    value: p.id,
                                    label: p.serial_no || 'Unknown',
                                    description: isTaken
                                      ? 'Currently allocated to another item'
                                      : undefined,
                                    disabled: isTaken,
                                  };
                                })}
                                value={selected}
                                onValueChange={(val) =>
                                  setAllocations({ ...allocations, [item.id!]: val })
                                }
                                placeholder="Search serial number..."
                                emptyText="No machines found"
                                className="bg-white"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}

              {/* Step 2: Deposit */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="text-blue-500" /> Security Deposit
                  </h3>

                  {invoice.saleType === 'LEASE' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-lg">No Deposit Required</h4>
                        <p className="text-sm text-slate-500">
                          Lease contracts typically do not require a security deposit.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNext}>
                        Proceed to Readings <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <Card className="border-slate-100 shadow-sm">
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <div className="text-sm text-blue-800 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Optional Step
                          </div>
                          <Badge variant="secondary" className="bg-white text-blue-600 shadow-sm">
                            Wait for payment?
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Deposit Amount</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                                ₹
                              </span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                className="pl-8 font-bold text-lg h-11"
                                value={deposit.amount}
                                onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select
                              value={deposit.mode}
                              onValueChange={(val) =>
                                setDeposit({
                                  ...deposit,
                                  mode: val as 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER',
                                })
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash Payment</SelectItem>
                                <SelectItem value="UPI">UPI / GPay</SelectItem>
                                <SelectItem value="CHEQUE">Cheque / DD</SelectItem>
                                <SelectItem value="BANK_TRANSFER">
                                  Bank Transfer (NEFT/IMPS)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2 space-y-2">
                            <Label>Reference Details</Label>
                            <Input
                              placeholder="Enter Cheque No, Transaction ID, or Notes..."
                              className="bg-slate-50"
                              value={deposit.reference}
                              onChange={(e) =>
                                setDeposit({ ...deposit, reference: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Received Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                              <Input
                                type="date"
                                className="pl-9"
                                value={deposit.receivedDate}
                                onChange={(e) =>
                                  setDeposit({ ...deposit, receivedDate: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Readings */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Gauge className="text-blue-500" /> Initial Meter Readings
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Capture the starting meter counts for correct billing.
                  </p>

                  {getAllocatableItems().map((item) => {
                    const productId = allocations[item.id!];
                    const productList = availableProducts[item.modelId!] || [];
                    const product = productList.find((p) => p.id === productId);

                    return (
                      <Card key={item.id} className="border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                          <span className="font-bold text-sm text-slate-700">
                            {item.description}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">SN:</span>
                            <Badge variant="outline" className="font-mono bg-white">
                              {product?.serial_no}
                            </Badge>
                            {product?.print_colour && (
                              <Badge
                                variant={
                                  product.print_colour === 'BLACK_WHITE' ? 'secondary' : 'default'
                                }
                                className="text-[10px] h-5"
                              >
                                {product.print_colour.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-slate-600">
                                B&W Counter (A4)
                              </Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={readings[item.id!]?.bw || ''}
                                onChange={(e) =>
                                  setReadings({
                                    ...readings,
                                    [item.id!]: {
                                      ...(readings[item.id!] || {}),
                                      bw: e.target.value,
                                    },
                                  })
                                }
                                className="font-mono border-slate-200 focus-visible:ring-slate-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-slate-600">
                                B&W Counter (A3)
                              </Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={readings[item.id!]?.bwA3 || ''}
                                onChange={(e) =>
                                  setReadings({
                                    ...readings,
                                    [item.id!]: {
                                      ...(readings[item.id!] || {}),
                                      bwA3: e.target.value,
                                    },
                                  })
                                }
                                className="font-mono border-slate-200 focus-visible:ring-slate-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {product?.print_colour !== 'BLACK_WHITE' ? (
                              <>
                                <div className="space-y-2 animate-in fade-in">
                                  <Label className="text-xs font-semibold text-blue-600">
                                    Color Counter (A4)
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={readings[item.id!]?.color || ''}
                                    onChange={(e) =>
                                      setReadings({
                                        ...readings,
                                        [item.id!]: {
                                          ...(readings[item.id!] || {}),
                                          color: e.target.value,
                                        },
                                      })
                                    }
                                    className="font-mono border-blue-200 focus-visible:ring-blue-400 bg-blue-50/30"
                                  />
                                </div>

                                <div className="space-y-2 animate-in fade-in">
                                  <Label className="text-xs font-semibold text-blue-600">
                                    Color Counter (A3)
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={readings[item.id!]?.colorA3 || ''}
                                    onChange={(e) =>
                                      setReadings({
                                        ...readings,
                                        [item.id!]: {
                                          ...(readings[item.id!] || {}),
                                          colorA3: e.target.value,
                                        },
                                      })
                                    }
                                    className="font-mono border-blue-200 focus-visible:ring-blue-400 bg-blue-50/30"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-2 opacity-30 pointer-events-none select-none">
                                  <Label className="text-xs font-semibold">
                                    Color Counter (A4)
                                  </Label>
                                  <Input disabled value="N/A" className="bg-slate-100" />
                                </div>
                                <div className="space-y-2 opacity-30 pointer-events-none select-none">
                                  <Label className="text-xs font-semibold">
                                    Color Counter (A3)
                                  </Label>
                                  <Input disabled value="N/A" className="bg-slate-100" />
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={step === 1 ? onClose : () => setStep(step - 1)}
                disabled={isSubmitting}
                className="border-slate-200 hover:bg-white hover:text-slate-800"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>

              <Button
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={isSubmitting || (step === 1 && isLoadingProducts)}
                className={`
                                    min-w-[140px] font-bold shadow-md transition-all
                                    ${
                                      step === 3
                                        ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    }
                                `}
              >
                {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
                {step === 3 ? 'Confirm & Approve' : 'Next Step'}
                {!isSubmitting && step !== 3 && <ArrowRight className="ml-2 w-4 h-4" />}
                {!isSubmitting && step === 3 && <CheckCircle2 className="ml-2 w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
