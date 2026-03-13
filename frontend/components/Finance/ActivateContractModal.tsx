import React, { useState } from 'react';
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
} from '@/lib/invoice';
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

  const [readings, setReadings] = useState<Record<string, ReadingInput>>(() => {
    const initial: Record<string, ReadingInput> = {};
    rentalItems.forEach((item) => {
      // Get the product's print_color from the joined product data if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemData = item as any;
      const printColor = itemData.product?.print_color || 'BOTH';

      initial[item.productId || item.id!] = {
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

    // Deposit is shown but optional — skip validation if not filled
    // Backend will handle mandatory cases
    void 0;

    // Validate readings if needed
    if (needsReadings) {
      for (const item of rentalItems) {
        const r = readings[item.productId || item.id!];

        // Validate B&W Readings
        if (r.printColor === 'BOTH' || r.printColor === 'BLACK_WHITE') {
          if (r.bwA4Reading === null || r.bwA4Reading < 0) {
            toast.error(`Please enter valid B&W A4 reading for ${item.description}`);
            return;
          }
          if (r.bwA3Reading === null || r.bwA3Reading < 0) {
            toast.error(`Please enter valid B&W A3 reading for ${item.description}`);
            return;
          }
        }

        // Validate Color Readings
        if (r.printColor === 'BOTH' || r.printColor === 'COLOUR') {
          if (r.colorA4Reading === null || r.colorA4Reading < 0) {
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
      // Prepare item updates (readings)
      const itemUpdates: {
        id: string;
        productId: string;
        initialBwCount?: number;
        initialBwA3Count?: number;
        initialColorCount?: number;
        initialColorA3Count?: number;
      }[] = needsReadings
        ? rentalItems.map((item) => {
            const r = readings[item.productId || item.id!];
            return {
              id: item.id!,
              productId: item.productId!,
              initialBwCount: r.bwA4Reading || 0,
              initialBwA3Count: r.bwA3Reading || 0,
              initialColorCount: r.colorA4Reading || 0,
              initialColorA3Count: r.colorA3Reading || 0,
            };
          })
        : [];

      // Prepare deposit
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

      toast.success('Contract activated successfully!');
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
            Activate Contract - #{invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Complete the activation flow by sending the contract, uploading the confirmation, and
            adding readings.
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
                        const r = readings[item.productId || item.id!];
                        if (!r) return null;

                        const isBw = r.printColor === 'BOTH' || r.printColor === 'BLACK_WHITE';
                        const isColor = r.printColor === 'BOTH' || r.printColor === 'COLOUR';

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
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    SN:{' '}
                                    {(() => {
                                      const alloc = invoice.productAllocations?.find(
                                        (a) =>
                                          a.productId === item.productId ||
                                          a.modelId === item.modelId,
                                      );
                                      return (
                                        alloc?.serialNumber ||
                                        (item as unknown as { product?: { serial_no: string } })
                                          .product?.serial_no ||
                                        'Unknown'
                                      );
                                    })()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-white">
                                  {r.printColor.replace('_', ' ')}
                                </Badge>
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
                                            [item.productId || item.id!]: {
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
                                            [item.productId || item.id!]: {
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
                                            [item.productId || item.id!]: {
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
                                            [item.productId || item.id!]: {
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
              Activate Contract
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
