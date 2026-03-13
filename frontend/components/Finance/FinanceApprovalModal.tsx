import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Box } from 'lucide-react';
import { Invoice, allocateMachinesInvoice } from '@/lib/invoice';
import { Product, getAvailableProductsByModel } from '@/lib/product';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useQueryClient } from '@tanstack/react-query';

interface FinanceApprovalModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Step 1 of Finance Approval: Allocate Machines.
 */
export function FinanceApprovalModal({ invoice, onClose, onSuccess }: FinanceApprovalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const getAllocatableItems = () => {
    return invoice.items?.filter((i) => i.itemType === 'PRODUCT' && i.id) || [];
  };

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

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const uniqueModelIds = Array.from(
        new Set(
          invoice.items
            ?.filter((i) => i.modelId) // Fetch for ALL items with a modelId
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

  const handleSubmit = async () => {
    // Ensure all items are allocated
    const itemsToAllocate = getAllocatableItems();
    const missingAllocations = itemsToAllocate.filter((i) => i.modelId && !allocations[i.id!]);
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

    setIsSubmitting(true);
    try {
      const itemUpdates = itemsToAllocate.map((item) => ({
        id: item.id as string,
        productId: (allocations[item.id!] || item.productId || '') as string,
      }));

      await allocateMachinesInvoice(invoice.id, { itemUpdates });

      toast.success('Machines allocated successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to allocate machines');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="bg-blue-100 text-blue-700 p-1.5 rounded-lg">
              <Box className="w-5 h-5" />
            </span>
            Allocate Machines - #{invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>Select specific serial numbers for each item.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
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
                            <h4 className="font-bold text-slate-700 text-sm">{item.description}</h4>
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
                              className={available.length > 0 ? 'text-green-600' : 'text-red-500'}
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
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-200 hover:bg-white hover:text-slate-800"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingProducts}
              className="bg-blue-600 hover:bg-blue-700 shadow-blue-200 min-w-[140px] font-bold shadow-md transition-all"
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
              Confirm Allocation
              {!isSubmitting && <Box className="ml-2 w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
