'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  FileText,
  Calendar,
  User,
  Package,
  Settings,
  Activity,
  Box,
  ShoppingCart,
  Save,
  Undo2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Lot, LotItemType, lotService, LotStatus } from '@/lib/lot';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { purchaseService, Purchase } from '@/services/purchaseService';
import { Input } from '@/components/ui/input';
import AddPaymentModal from '../purchaseComponents/AddPaymentModal';
import AddPurchaseDialog from '../purchaseComponents/AddPurchaseDialog';
import AddCostModal from '../purchaseComponents/AddCostModal';

interface LotDetailsDialogProps {
  lot: Lot;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog component displaying detailed information about a specific lot.
 * Shows vendor details, items list with usage stats, cost breakdown, and grand total.
 * supports exporting lot data (All, Products, Spare Parts) to Excel.
 * Displays associated purchase record if available.
 */
export default function LotDetailsDialog({ lot, onClose, onSuccess }: LotDetailsDialogProps) {
  const [purchaseRecord, setPurchaseRecord] = useState<Purchase | null>(null);
  const [loadingPurchase, setLoadingPurchase] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivedItems, setReceivedItems] = useState<
    Record<string, { received: number; damaged: number }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentLot, setCurrentLot] = useState<Lot>(lot);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize receivedItems from lot data
    const initial: Record<string, { received: number; damaged: number }> = {};
    (currentLot.items || []).forEach((item) => {
      initial[item.id] = {
        received: item.receivedQuantity || 0,
        damaged: item.damagedQuantity || 0,
      };
    });
    setReceivedItems(initial);
  }, [currentLot.items]);

  const fetchPurchase = React.useCallback(async () => {
    try {
      setLoadingPurchase(true);
      const record = await purchaseService.getPurchaseByLotId(currentLot.id);
      setPurchaseRecord(record);
    } catch (err) {
      console.error('Failed to load purchase record:', err);
    } finally {
      setLoadingPurchase(false);
    }
  }, [currentLot.id]);

  useEffect(() => {
    fetchPurchase();
  }, [currentLot.id, fetchPurchase]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'RECEIVING':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleUpdateQty = (itemId: string, field: 'received' | 'damaged', value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setReceivedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: num,
      },
    }));
  };

  const handleSaveReceiving = async () => {
    try {
      setIsSaving(true);
      const items = Object.entries(receivedItems).map(([id, qtys]) => ({
        item_id: id,
        received_quantity: qtys.received,
        damaged_quantity: qtys.damaged,
      }));

      // Validation
      for (const item of items) {
        const original = (currentLot.items || []).find((i) => i.id === item.item_id);
        if (
          original &&
          item.received_quantity + item.damaged_quantity > original.expectedQuantity
        ) {
          toast.error(
            `Error in item: ${original.itemType === LotItemType.MODEL ? original.model?.model_name || original.customProductName || 'Unnamed Product' : original.sparePart?.part_name || original.customSparePartName || 'Unnamed Spare'}`,
            {
              description: `Total (Received + Damaged) cannot exceed Expected (${original.expectedQuantity})`,
            },
          );
          setIsSaving(false);
          return;
        }
      }

      const updatedLot = await lotService.receiveLot(currentLot.id, items);
      setCurrentLot(updatedLot);
      setIsReceiving(false);
      toast.success('Receiving quantities saved successfully');
      onSuccess?.();
    } catch (err: unknown) {
      toast.error('Failed to save receiving data', {
        description:
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (err as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReceived = async () => {
    try {
      setIsSaving(true);
      const updatedLot = await lotService.confirmLotReceived(currentLot.id);
      setCurrentLot(updatedLot);
      setShowConfirmDialog(false);
      toast.success('Lot confirmed as RECEIVED', {
        description: 'Inventory is now available for this lot.',
      });
      onSuccess?.();
    } catch (err: unknown) {
      toast.error('Failed to confirm reception', {
        description:
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (err as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await lotService.downloadLotExcel(currentLot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${currentLot.lotNumber}-all.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download excel:', error);
    }
  };

  const handleExportProducts = async () => {
    try {
      const response = await lotService.downloadLotProductsExcel(currentLot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${currentLot.lotNumber}-products.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download products excel:', error);
      toast.error('Failed to download products Excel');
    }
  };

  const handleExportSpareParts = async () => {
    try {
      const response = await lotService.downloadLotSparePartsExcel(currentLot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${currentLot.lotNumber}-spareparts.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download spare parts excel:', error);
      toast.error('Failed to download spare parts Excel');
    }
  };

  const itemsTotal = (currentLot.items || []).reduce(
    (sum, item) => sum + Number(item.totalPrice),
    0,
  );
  const hasProducts = (currentLot.items || []).some((item) => item.itemType === LotItemType.MODEL);
  const hasSpareParts = (currentLot.items || []).some(
    (item) => item.itemType === LotItemType.SPARE_PART,
  );

  const handleAddToInventory = (itemId?: string, type?: LotItemType) => {
    if (type === LotItemType.MODEL) {
      const url = `/manager/products?lotId=${currentLot.id}${itemId ? `&itemId=${itemId}` : ''}`;
      router.push(url);
    } else if (type === LotItemType.SPARE_PART) {
      const url = `/manager/spare-parts?lotId=${currentLot.id}${itemId ? `&itemId=${itemId}` : ''}`;
      router.push(url);
    } else {
      // If no type specified, we might need a choice or just do nothing for now
      // But the global buttons specify type.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl w-full max-w-[95vw] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border">
        {/* Header Section */}
        <div className="p-6 border-b bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Lot: {currentLot.lotNumber}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge
                      variant="outline"
                      className={`px-2 py-0 ${getStatusColor(currentLot.status)} font-medium`}
                    >
                      {currentLot.status}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar size={14} className="text-slate-400" />
                      {format(new Date(lot.purchaseDate), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User size={14} className="text-slate-400" />
                      {lot.vendor?.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  className="h-9 gap-2 shadow-sm"
                >
                  <Download size={15} /> Export
                </Button>
                {hasProducts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportProducts}
                    className="h-9 gap-2 shadow-sm text-blue-600 border-blue-100"
                  >
                    <Box size={15} /> Products
                  </Button>
                )}
                {hasSpareParts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSpareParts}
                    className="h-9 gap-2 shadow-sm text-orange-600 border-orange-100"
                  >
                    <Settings size={15} /> Spare Parts
                  </Button>
                )}
              </div>
              <div className="w-px h-8 bg-slate-200 mx-1" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors rounded-full"
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Receiving Mode Banner */}
        {isReceiving && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Receiving Mode Active</p>
                <p className="text-xs text-amber-700">
                  Update actual quantities received and report any damages below.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceiving(false)}
                className="text-amber-700 hover:bg-amber-100"
              >
                <Undo2 size={14} className="mr-2" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReceiving}
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSaving ? (
                  <Activity size={14} className="animate-spin mr-2" />
                ) : (
                  <Save size={14} className="mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {currentLot.status === LotStatus.RECEIVING && !isReceiving && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Receiving Progress Saved</p>
                <p className="text-xs text-blue-700">
                  Verify all items and confirm to finalize inventory reception.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceiving(true)}
                className="text-blue-700 border-blue-200 bg-white hover:bg-blue-50"
              >
                Edit Quantities
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Reception
              </Button>
            </div>
          </div>
        )}

        {currentLot.status === LotStatus.PENDING && !isReceiving && (
          <div className="mx-6 mt-4 p-3 bg-slate-100 border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-lg text-slate-400">
                <Package size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Lot is Pending Reception</p>
                <p className="text-xs text-slate-500">
                  Start the receiving process when the shipment arrives.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsReceiving(true)}
              className="bg-primary text-white"
            >
              Start Receiving
            </Button>
          </div>
        )}

        {/* Mini Stats Board */}
        <div className="grid grid-cols-4 gap-4 px-6 mt-6">
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Items
              </p>
              <p className="text-lg font-bold leading-none">
                {(currentLot.items || []).length} Types
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Quantity
              </p>
              <p className="text-lg font-bold leading-none">
                {(currentLot.items || []).reduce((sum, item) => sum + item.expectedQuantity, 0)}{' '}
                Units
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Usage Overview
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-lg font-bold leading-none">
                  {Math.round(
                    ((currentLot.items || []).reduce((sum, item) => sum + item.usedQuantity, 0) /
                      Math.max(
                        1,
                        (currentLot.items || []).reduce(
                          (sum, item) => sum + item.receivedQuantity,
                          0,
                        ),
                      )) *
                      100,
                  ) || 0}
                  %
                </p>
                <p className="text-[10px] font-medium text-slate-500">Utilization</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Lot Value
              </p>
              <p className="text-lg font-bold leading-none text-primary">
                {formatCurrency(itemsTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 p-6 overflow-hidden flex-1 bg-slate-50/30">
          {/* Left: Items List */}
          <div className="flex-[2] overflow-hidden border rounded-xl bg-white shadow-sm flex flex-col">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Box size={16} className="text-slate-400" />
                Lot Items
              </h3>
              <Badge variant="secondary" className="font-normal text-[10px]">
                {(currentLot.items || []).length} Distinct Entries
              </Badge>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Item Model</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">
                      {isReceiving ? 'Received' : 'Rec.'}
                    </TableHead>
                    <TableHead className="text-right">{isReceiving ? 'Damaged' : 'Dmg.'}</TableHead>
                    {!isReceiving && (
                      <TableHead className="text-center">Inventory Allocation</TableHead>
                    )}
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {currentLot.status === LotStatus.RECEIVED && (
                      <TableHead className="text-center">Inv.</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(currentLot.items || []).map((item) => {
                    const usagePercent = Math.round(
                      (item.usedQuantity / Math.max(1, item.receivedQuantity)) * 100,
                    );
                    const q = receivedItems[item.id] || { received: 0, damaged: 0 };

                    return (
                      <TableRow
                        key={item.id}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.itemType === LotItemType.MODEL ? (
                              <Box size={14} className="text-blue-500" />
                            ) : (
                              <Settings size={14} className="text-orange-500" />
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              {item.itemType === LotItemType.MODEL ? 'PRODUCT' : 'SPARE'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {item.itemType === LotItemType.MODEL
                                ? item.customProductName ||
                                  item.model?.model_name ||
                                  'Unnamed Product'
                                : item.sparePart?.part_name ||
                                  item.customSparePartName ||
                                  'Unnamed Spare'}
                            </span>
                            {item.itemType === LotItemType.SPARE_PART &&
                              item.sparePart?.item_code && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.sparePart.item_code}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        {/* Item Model column */}
                        <TableCell>
                          {item.itemType === LotItemType.MODEL ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {item.model?.model_name || '—'}
                              </span>
                              {item.model?.model_no && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.model.model_no}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-slate-400 font-medium">
                          / {item.expectedQuantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReceiving ? (
                            <Input
                              type="number"
                              className="w-16 h-7 text-right text-xs"
                              value={q.received}
                              onChange={(e) => handleUpdateQty(item.id, 'received', e.target.value)}
                            />
                          ) : (
                            <span className="font-bold text-slate-900">
                              {item.receivedQuantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReceiving ? (
                            <Input
                              type="number"
                              className="w-16 h-7 text-right text-xs text-red-600"
                              value={q.damaged}
                              onChange={(e) => handleUpdateQty(item.id, 'damaged', e.target.value)}
                            />
                          ) : (
                            <span
                              className={`font-bold ${item.damagedQuantity > 0 ? 'text-red-500' : 'text-slate-300'}`}
                            >
                              {item.damagedQuantity}
                            </span>
                          )}
                        </TableCell>
                        {!isReceiving && (
                          <TableCell>
                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                              <div className="flex justify-between text-[10px] font-medium">
                                <span
                                  className={
                                    item.usedQuantity > 0 ? 'text-orange-600' : 'text-slate-400'
                                  }
                                >
                                  {item.usedQuantity} Used
                                </span>
                                <span className="text-green-600">
                                  {item.receivedQuantity - item.usedQuantity} Free
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    usagePercent >= 100
                                      ? 'bg-red-500'
                                      : usagePercent > 70
                                        ? 'bg-orange-500'
                                        : 'bg-primary'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-right text-slate-600">
                          {formatCurrency(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatCurrency(Number(item.totalPrice))}
                        </TableCell>
                        {currentLot.status === LotStatus.RECEIVED && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10 rounded-full"
                              title="Add to Inventory"
                              onClick={() => handleAddToInventory(item.id, item.itemType)}
                            >
                              <ArrowRight size={14} />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="bg-slate-50 border-t p-4 flex justify-between items-center">
              <div className="flex gap-2">
                {currentLot.status === LotStatus.RECEIVED && hasProducts && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => handleAddToInventory(undefined, LotItemType.MODEL)}
                  >
                    <Plus size={12} /> Add Products to Inventory
                  </Button>
                )}
                {currentLot.status === LotStatus.RECEIVED && hasSpareParts && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => handleAddToInventory(undefined, LotItemType.SPARE_PART)}
                  >
                    <Plus size={12} /> Add Spare to Inventory
                  </Button>
                )}
              </div>
              <div className="text-sm">
                Items Total:{' '}
                <span className="font-bold text-primary text-base">
                  {formatCurrency(itemsTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Summary and Purchase Record */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <Card className="p-0 overflow-hidden border-none shadow-sm shrink-0">
              <div className="p-1 bg-slate-50 border-b flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                <h3 className="font-bold text-sm text-slate-700">Summary Info</h3>
              </div>
              <div className="bg-white">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    Notes
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 min-h-[40px] max-h-[100px] overflow-y-auto leading-relaxed">
                    {lot.notes || 'No notes available for this lot.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden border-none shadow-sm flex-1 flex flex-col">
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-slate-400" />
                  <h3 className="font-bold text-sm text-slate-700">Financial Tracking</h3>
                </div>
                {purchaseRecord && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold bg-white text-primary border-primary/20"
                  >
                    {purchaseRecord.status}
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
                {loadingPurchase ? (
                  <div className="text-slate-400 text-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-xs">Loading financials...</p>
                  </div>
                ) : purchaseRecord ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Inventory Cost</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(purchaseRecord.purchaseAmount)}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-dashed">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Additional Costs
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1"
                            onClick={() => setShowEditPurchaseModal(true)}
                          >
                            <Pencil size={10} /> Edit
                          </Button>
                        </div>
                        <div className="space-y-2 pl-3 border-l-2 border-slate-100">
                          {[
                            { label: 'Documentation', value: purchaseRecord.documentationFee },
                            { label: 'Labour', value: purchaseRecord.labourCost },
                            { label: 'Handling', value: purchaseRecord.handlingFee },
                            { label: 'Transportation', value: purchaseRecord.transportationCost },
                            { label: 'Shipping', value: purchaseRecord.shippingCost },
                            { label: 'Groundfield', value: purchaseRecord.groundfieldCost },
                          ].map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-slate-500">{item.label}</span>
                              <span
                                className={`font-bold ${Number(item.value) > 0 ? 'text-slate-700' : 'text-slate-300'}`}
                              >
                                {formatCurrency(Number(item.value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Summary */}
                      <div className="pt-3 border-t border-dashed space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Total Lot Cost</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(purchaseRecord.totalAmount)}
                          </span>
                        </div>

                        {(() => {
                          const paidAmount = purchaseRecord.paidAmount;
                          const remainingAmount = purchaseRecord.remainingAmount;

                          return (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600 font-medium">Paid Amount</span>
                                <span className="font-bold text-green-700">
                                  {formatCurrency(paidAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600 font-bold">Remaining Balance</span>
                                <span
                                  className={`font-black ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}
                                >
                                  {formatCurrency(remainingAmount)}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {purchaseRecord.payments && purchaseRecord.payments.length > 0 && (
                        <div className="pt-3 border-t border-dashed">
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                            Recent Payments
                          </div>
                          <div className="space-y-2">
                            {purchaseRecord.payments.map((p, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">
                                    {p.paymentMethod}
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {format(new Date(p.paymentDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                <span className="font-bold text-green-600">
                                  +{formatCurrency(Number(p.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {purchaseRecord.costs && purchaseRecord.costs.length > 0 && (
                        <div className="pt-3 border-t border-dashed">
                          <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-2">
                            Additional Dynamic Costs
                          </div>
                          <div className="space-y-2">
                            {purchaseRecord.costs.map((c, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">{c.costType}</span>
                                  <span className="text-[9px] text-slate-400">
                                    {format(new Date(c.costDate), 'MMM d, yyyy')}
                                    {c.description && ` - ${c.description}`}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-700">
                                  {formatCurrency(Number(c.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 h-full flex flex-col justify-center">
                    <ShoppingCart className="mx-auto text-slate-200 mb-2" size={32} />
                    <p className="text-xs text-slate-400 font-medium italic">
                      No matching purchase record found.
                    </p>
                  </div>
                )}
              </div>

              {purchaseRecord && (
                <div className="bg-slate-50 p-4 border-t gap-3 flex flex-col shrink-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() => setShowCostModal(true)}
                    >
                      <Plus size={16} /> Add Cost
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 gap-2 shadow-md bg-primary hover:bg-primary/90"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={
                        (purchaseRecord.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ||
                          0) >= purchaseRecord.totalAmount
                      }
                    >
                      <Plus size={16} /> Add Payment
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {showPaymentModal && purchaseRecord && (
          <AddPaymentModal
            open={showPaymentModal}
            onOpenChange={(open) => setShowPaymentModal(open)}
            purchaseId={purchaseRecord.id}
            totalAmount={purchaseRecord.totalAmount}
            paidAmount={purchaseRecord.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0}
            onSuccess={() => {
              fetchPurchase();
              setShowPaymentModal(false);
            }}
          />
        )}

        {showEditPurchaseModal && purchaseRecord && (
          <AddPurchaseDialog
            open={showEditPurchaseModal}
            onOpenChange={(open) => setShowEditPurchaseModal(open)}
            editMode={true}
            purchaseData={purchaseRecord}
            onSuccess={() => {
              fetchPurchase();
              setShowEditPurchaseModal(false);
            }}
          />
        )}

        {showCostModal && purchaseRecord && (
          <AddCostModal
            open={showCostModal}
            onOpenChange={(open) => setShowCostModal(open)}
            purchaseId={purchaseRecord.id}
            onSuccess={() => {
              fetchPurchase();
              setShowCostModal(false);
            }}
          />
        )}
      </div>

      {/* Custom Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <Card className="w-[400px] p-6 shadow-2xl border-none animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Reception?</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-600">
                Are you sure you want to finalize this lot reception?
              </p>
              <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                <li>Inventory will be officially assigned</li>
                <li>Receiving quantities will be locked</li>
                <li>Damaged items will be recorded for return</li>
              </ul>
              <p className="text-[11px] font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReceived}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? <Activity size={14} className="animate-spin mr-2" /> : null}
                Finalize & Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
