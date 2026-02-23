'use client';

import { X, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Lot, LotItemType } from '@/lib/lot';
import { format } from 'date-fns';
import api from '@/lib/api'; // Ensure API base URL is accessible
import { formatCurrency } from '@/lib/format';

interface LotDetailsDialogProps {
  lot: Lot;
  onClose: () => void;
}

/**
 * Dialog component displaying detailed information about a specific lot.
 * Shows vendor details, items list with usage stats, cost breakdown, and grand total.
 * supports exporting lot data (All, Products, Spare Parts) to Excel.
 */
export default function LotDetailsDialog({ lot, onClose }: LotDetailsDialogProps) {
  const handleExportAll = async () => {
    try {
      const response = await api.get(`/i/lots/${lot.id}/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-all.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download excel:', error);
    }
  };

  const handleExportProducts = async () => {
    try {
      const response = await api.get(`/i/lots/${lot.id}/export-products`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-products.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      const err = error as { response?: { status?: number } };
      console.error('Failed to download products excel:', error);
      if (err.response?.status === 404) {
        toast.error('No products found in this lot', {
          description: 'This lot may only contain spare parts.',
        });
      } else {
        toast.error('Failed to download products Excel', {
          description: 'Please try again or contact support.',
        });
      }
    }
  };

  const handleExportSpareParts = async () => {
    try {
      const response = await api.get(`/i/lots/${lot.id}/export-spareparts`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-spareparts.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      const err = error as { response?: { status?: number } };
      console.error('Failed to download spare parts excel:', error);
      if (err.response?.status === 404) {
        toast.error('No spare parts found in this lot', {
          description: 'This lot may only contain products.',
        });
      } else {
        toast.error('Failed to download spare parts Excel', {
          description: 'Please try again or contact support.',
        });
      }
    }
  };

  const costBreakdown = [
    { label: 'Transportation', value: lot.transportationCost },
    { label: 'Documentation', value: lot.documentationCost },
    { label: 'Shipping', value: lot.shippingCost },
    { label: 'Ground/Field', value: lot.groundFieldCost },
    { label: 'Certification', value: lot.certificationCost },
    { label: 'Labour', value: lot.labourCost },
  ];

  const totalCosts = costBreakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const itemsTotal = lot.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  // Check if lot has products or spare parts
  const hasProducts = lot.items.some((item) => item.itemType === LotItemType.MODEL);
  const hasSpareParts = lot.items.some((item) => item.itemType === LotItemType.SPARE_PART);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl w-full max-w-5xl p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Lot Details: {lot.lotNumber}</h2>
            <p className="text-sm text-gray-500">
              Vendor: <span className="font-medium text-foreground">{lot.vendor?.name}</span> •
              Date: {format(new Date(lot.purchaseDate), 'PPP')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-2">
              <Download size={16} /> Export All
            </Button>
            {hasProducts && (
              <Button variant="outline" size="sm" onClick={handleExportProducts} className="gap-2">
                <Download size={16} /> Products
              </Button>
            )}
            {hasSpareParts && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSpareParts}
                className="gap-2"
              >
                <Download size={16} /> Spare Parts
              </Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-6 overflow-hidden flex-1">
          {/* Left: Items List */}
          <div className="flex-[2] overflow-y-auto border rounded-lg flex flex-col">
            <div className="p-3 bg-gray-100 border-b font-semibold text-sm">Lot Items</div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty (Total)</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lot.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs text-gray-500">
                        {item.itemType === LotItemType.MODEL ? 'PRODUCT' : 'SPARE PART'}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={
                          item.itemType === LotItemType.MODEL
                            ? item.model?.model_name
                            : item.sparePart?.part_name
                        }
                      >
                        {item.itemType === LotItemType.MODEL
                          ? `${item.model?.model_name} (${item.model?.model_no})`
                          : item.sparePart?.part_name}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {item.usedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {item.quantity - item.usedQuantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(item.totalPrice))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="bg-gray-50 border-t p-3 text-right text-sm">
              Items Total:{' '}
              <span className="font-bold text-primary">{formatCurrency(itemsTotal)}</span>
            </div>
          </div>

          {/* Right: Costs & Summary */}
          <div className="flex-1 border rounded-lg bg-slate-50 flex flex-col">
            <div className="p-3 bg-gray-100 border-b font-semibold text-sm">Cost Breakdown</div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {costBreakdown.map((cost) => (
                <div key={cost.label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{cost.label}</span>
                  <span className="font-medium">{formatCurrency(Number(cost.value || 0))}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
                <span>Costs Total</span>
                <span>{formatCurrency(totalCosts)}</span>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Notes</div>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border min-h-[60px]">
                  {lot.notes || 'No notes.'}
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border-t p-4 flex justify-between items-center">
              <span className="font-bold text-lg text-primary">Grand Total</span>
              <span className="font-bold text-xl text-primary">
                {formatCurrency(Number(lot.totalAmount))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
