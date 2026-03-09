'use client';

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getAvailableProductsByModel, Product } from '@/lib/product';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { replaceDeviceAllocation, getUsageHistory } from '@/lib/invoice';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface ReplaceDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  allocationId: string;
  oldSerialNumber: string;
  modelId: string;
  onSuccess: () => void;
}

// Product interface is now imported from '@/lib/product'
// interface Product {
//   id: string;
//   serial_no: string;
//   name?: string;
//   model?: {
//     name: string;
//   };
// }

interface UsageHistory {
  periodEnd: string;
  bwA4Count: number;
  bwA3Count: number;
  colorA4Count: number;
  colorA3Count: number;
}

export default function ReplaceDeviceModal({
  isOpen,
  onClose,
  contractId,
  allocationId,
  oldSerialNumber,
  modelId,
  onSuccess,
}: ReplaceDeviceModalProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Load available products for the same model
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [prevUsage, setPrevUsage] = useState<UsageHistory | null>(null);

  const getLocalDatetimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().substring(0, 16);
  };

  const [formData, setFormData] = useState({
    newSerialNumber: '',
    replacementDate: getLocalDatetimeString(),
    replacementReason: 'Device malfunction / Needs replacement',
    currentBwA4: '',
    currentBwA3: '',
    currentColorA4: '',
    currentColorA3: '',
    newInitialBwA4: '',
    newInitialBwA3: '',
    newInitialColorA4: '',
    newInitialColorA3: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        replacementDate: getLocalDatetimeString(),
        newSerialNumber: '',
        currentBwA4: '',
        currentBwA3: '',
        currentColorA4: '',
        currentColorA3: '',
        newInitialBwA4: '',
        newInitialBwA3: '',
        newInitialColorA4: '',
        newInitialColorA3: '',
      }));

      if (contractId) {
        getUsageHistory(contractId)
          .then((history) => {
            if (history && history.length > 0) {
              const sorted = [...history].sort(
                (a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime(),
              );
              setPrevUsage(sorted[0]);
            }
          })
          .catch(console.error);
      }

      if (modelId) {
        const fetchAvailableProducts = async () => {
          setFetchingProducts(true);
          try {
            const response = await getAvailableProductsByModel(modelId);
            setProducts(response || []);
          } catch (error) {
            console.error('Failed to fetch available products:', error);
          } finally {
            setFetchingProducts(false);
          }
        };
        fetchAvailableProducts();
      }
    }
  }, [isOpen, modelId, contractId]);

  const handleSubmit = async () => {
    if (!formData.newSerialNumber.trim()) {
      toast.error('New serial number is required.');
      return;
    }

    if (prevUsage) {
      const oldBwA4 = Number(formData.currentBwA4 || 0);
      const oldBwA3 = Number(formData.currentBwA3 || 0);
      const oldClrA4 = Number(formData.currentColorA4 || 0);
      const oldClrA3 = Number(formData.currentColorA3 || 0);

      if (oldBwA4 > 0 && oldBwA4 < prevUsage.bwA4Count) {
        toast.error(
          `Old B&W A4 meter (${oldBwA4}) cannot be lower than previously billed (${prevUsage.bwA4Count}).`,
        );
        return;
      }
      if (oldBwA3 > 0 && oldBwA3 < prevUsage.bwA3Count) {
        toast.error(
          `Old B&W A3 meter (${oldBwA3}) cannot be lower than previously billed (${prevUsage.bwA3Count}).`,
        );
        return;
      }
      if (oldClrA4 > 0 && oldClrA4 < prevUsage.colorA4Count) {
        toast.error(
          `Old Color A4 meter (${oldClrA4}) cannot be lower than previously billed (${prevUsage.colorA4Count}).`,
        );
        return;
      }
      if (oldClrA3 > 0 && oldClrA3 < prevUsage.colorA3Count) {
        toast.error(
          `Old Color A3 meter (${oldClrA3}) cannot be lower than previously billed (${prevUsage.colorA3Count}).`,
        );
        return;
      }
    }

    const selectedProduct = products.find((p) => p.serial_no === formData.newSerialNumber);

    setLoading(true);
    try {
      await replaceDeviceAllocation({
        contractId,
        allocationId: allocationId,
        newProductId: selectedProduct?.id,
        newSerialNumber: formData.newSerialNumber,
        replacementTimestamp: formData.replacementDate,
        reason: formData.replacementReason,
        oldMeter: {
          bwA4: formData.currentBwA4 ? Number(formData.currentBwA4) : undefined,
          bwA3: formData.currentBwA3 ? Number(formData.currentBwA3) : undefined,
          colorA4: formData.currentColorA4 ? Number(formData.currentColorA4) : undefined,
          colorA3: formData.currentColorA3 ? Number(formData.currentColorA3) : undefined,
        },
        newInitialMeter: {
          bwA4: formData.newInitialBwA4 ? Number(formData.newInitialBwA4) : undefined,
          bwA3: formData.newInitialBwA3 ? Number(formData.newInitialBwA3) : undefined,
          colorA4: formData.newInitialColorA4 ? Number(formData.newInitialColorA4) : undefined,
          colorA3: formData.newInitialColorA3 ? Number(formData.newInitialColorA3) : undefined,
        },
      });

      toast.success('Device replaced successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice', contractId] });
      queryClient.invalidateQueries({ queryKey: ['usage-history', contractId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to replace device.');
    } finally {
      setLoading(false);
    }
  };

  const productOptions = products.map((p) => ({
    value: p.serial_no,
    label: p.serial_no,
    description: p.name || p.model?.model_name,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-card rounded-xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-800">Replace Device</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Replacing <span className="font-bold text-gray-700">{oldSerialNumber}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-600 uppercase">New Serial Number</Label>
            <SearchableSelect
              options={productOptions}
              value={formData.newSerialNumber}
              onValueChange={(val) => setFormData({ ...formData, newSerialNumber: val })}
              placeholder="Search & Select Serial Number..."
              loading={fetchingProducts}
              emptyText="No available products of the same model found."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-600 uppercase">Replacement Time</Label>
            <Input
              type="datetime-local"
              value={formData.replacementDate}
              onChange={(e) => setFormData({ ...formData, replacementDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-600 uppercase">
              Current Final Meter Reading (Old Device)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="B&W A4"
                value={formData.currentBwA4}
                onChange={(e) => setFormData({ ...formData, currentBwA4: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Color A4"
                value={formData.currentColorA4}
                onChange={(e) => setFormData({ ...formData, currentColorA4: e.target.value })}
              />
              <Input
                type="number"
                placeholder="B&W A3"
                value={formData.currentBwA3}
                onChange={(e) => setFormData({ ...formData, currentBwA3: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Color A3"
                value={formData.currentColorA3}
                onChange={(e) => setFormData({ ...formData, currentColorA3: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-blue-600 uppercase">
              New Device Initial Meter
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="B&W A4"
                value={formData.newInitialBwA4}
                onChange={(e) => setFormData({ ...formData, newInitialBwA4: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Color A4"
                value={formData.newInitialColorA4}
                onChange={(e) => setFormData({ ...formData, newInitialColorA4: e.target.value })}
              />
              <Input
                type="number"
                placeholder="B&W A3"
                value={formData.newInitialBwA3}
                onChange={(e) => setFormData({ ...formData, newInitialBwA3: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Color A3"
                value={formData.newInitialColorA3}
                onChange={(e) => setFormData({ ...formData, newInitialColorA3: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-600 uppercase">Reason</Label>
            <Textarea
              value={formData.replacementReason}
              onChange={(e) => setFormData({ ...formData, replacementReason: e.target.value })}
              placeholder="Why is it being replaced?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 sm:justify-start flex gap-2 w-full">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl text-gray-600 hover:bg-gray-100 font-bold h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || fetchingProducts}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-lg shadow-blue-500/20 transition-all"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            Replace Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
