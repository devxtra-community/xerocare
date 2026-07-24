'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
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
  Paperclip,
  Upload,
  Trash2,
  FileArchive,
  StickyNote,
  X,
} from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Lot,
  LotItemType,
  lotService,
  LotStatus,
  LotDocument,
  LotDocumentType,
  LOT_DOCUMENT_TYPE_LABELS,
  LotDocumentCategory,
  LOT_DOCUMENT_CATEGORY_LABELS,
  LOT_DOCUMENT_TYPE_CATEGORY,
} from '@/lib/lot';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { purchaseService, Purchase } from '@/services/purchaseService';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseOriginBadge } from '@/components/PurchaseOriginBadge';
import AddPaymentModal from '@/components/ManagerDashboardComponents/purchaseComponents/AddPaymentModal';
import AddPurchaseDialog from '@/components/ManagerDashboardComponents/purchaseComponents/AddPurchaseDialog';
import AddCostModal from '@/components/ManagerDashboardComponents/purchaseComponents/AddCostModal';
import ShipmentInfoCard from '@/components/ManagerDashboardComponents/lotComponents/ShipmentInfoCard';
import api from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';

/**
 * Dedicated lot detail page — vendor/purchase info, items, receiving workflow,
 * shipping documents, and full financial tracking for a single lot.
 */
export default function LotDetailPage() {
  const { id } = useParams();
  const lotId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const currency = useBranchCurrency();
  const isAdmin = getUserFromToken()?.role === 'ADMIN';

  const [lot, setLot] = useState<Lot | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseRecord, setPurchaseRecord] = useState<Purchase | null>(null);
  const [loadingPurchase, setLoadingPurchase] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivedItems, setReceivedItems] = useState<
    Record<string, { received: number; damaged: number }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);

  const [documents, setDocuments] = useState<LotDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [docType, setDocType] = useState<LotDocumentType>(LotDocumentType.BILL_OF_LADING);
  const [docName, setDocName] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const fetchLot = React.useCallback(async () => {
    if (!lotId) return;
    try {
      setLoading(true);
      const data = await lotService.getLotById(lotId);
      setLot(data);
      const notYetStarted = data.status === LotStatus.PENDING;
      const initial: Record<string, { received: number; damaged: number }> = {};
      (data.items || []).forEach((item) => {
        initial[item.id] = {
          received: notYetStarted ? item.expectedQuantity : item.receivedQuantity || 0,
          damaged: item.damagedQuantity || 0,
        };
      });
      setReceivedItems(initial);
    } catch (err) {
      console.error('Failed to load lot:', err);
      toast.error('Failed to load lot details');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  const fetchPurchase = React.useCallback(async () => {
    if (!lotId) return;
    try {
      setLoadingPurchase(true);
      const record = await purchaseService.getPurchaseByLotId(lotId);
      setPurchaseRecord(record);
    } catch (err) {
      console.error('Failed to load purchase record:', err);
    } finally {
      setLoadingPurchase(false);
    }
  }, [lotId]);

  const fetchDocuments = React.useCallback(async () => {
    if (!lotId) return;
    try {
      setLoadingDocuments(true);
      const docs = await lotService.getLotDocuments(lotId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load lot documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  }, [lotId]);

  useEffect(() => {
    fetchLot();
    fetchPurchase();
    fetchDocuments();
  }, [fetchLot, fetchPurchase, fetchDocuments]);

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
      [itemId]: { ...prev[itemId], [field]: num },
    }));
  };

  const handleSaveReceiving = async () => {
    if (!lot) return;
    try {
      setIsSaving(true);
      const items = Object.entries(receivedItems).map(([itemId, qtys]) => ({
        item_id: itemId,
        received_quantity: qtys.received,
        damaged_quantity: qtys.damaged,
      }));

      for (const item of items) {
        const original = (lot.items || []).find((i) => i.id === item.item_id);
        if (
          original &&
          item.received_quantity + item.damaged_quantity !== original.expectedQuantity
        ) {
          toast.error(
            `Error in item: ${original.itemType === LotItemType.MODEL ? original.model?.model_name || original.customProductName || 'Unnamed Product' : original.sparePart?.part_name || original.customSparePartName || 'Unnamed Spare'}`,
            {
              description: `Total (Received + Damaged) must equal Expected (${original.expectedQuantity})`,
            },
          );
          setIsSaving(false);
          return;
        }
      }

      const updatedLot = await lotService.receiveLot(lot.id, items);
      setLot(updatedLot);
      setIsReceiving(false);
      toast.success('Receiving quantities saved successfully');
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
    if (!lot) return;
    try {
      setIsSaving(true);
      const updatedLot = await lotService.confirmLotReceived(lot.id);
      setLot(updatedLot);
      setShowConfirmDialog(false);
      toast.success('Lot confirmed as RECEIVED', {
        description: 'Inventory is now available for this lot.',
      });
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

  const extractBlobErrorMessage = async (err: unknown): Promise<string> => {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    const data = axiosErr.response?.data;
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        return parsed.message || axiosErr.message || 'Unknown error';
      } catch {
        return axiosErr.message || 'Unknown error';
      }
    }
    return (data as { message?: string })?.message || axiosErr.message || 'Unknown error';
  };

  const handleExportAll = async () => {
    if (!lot) return;
    try {
      const response = await lotService.downloadLotExcel(lot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-all.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download excel:', error);
      toast.error('Failed to download Excel');
    }
  };

  const handleExportProducts = async () => {
    if (!lot) return;
    try {
      const response = await lotService.downloadLotProductsExcel(lot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-products.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download products excel:', error);
      toast.error('Failed to download products Excel');
    }
  };

  const handleExportSpareParts = async () => {
    if (!lot) return;
    try {
      const response = await lotService.downloadLotSparePartsExcel(lot.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lot-${lot.lotNumber}-spareparts.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download spare parts excel:', error);
      toast.error('Failed to download spare parts Excel');
    }
  };

  const handlePrintProductBarcodes = async () => {
    if (!lot) return;
    try {
      const response = await api.get(`/i/inventory/products/barcode-pdf?lotId=${lot.id}`, {
        responseType: 'blob',
      });
      const fileUrl = URL.createObjectURL(response.data);
      window.open(fileUrl);
    } catch (err: unknown) {
      const message = await extractBlobErrorMessage(err);
      toast.error('Cannot print product barcodes', {
        description: message.includes('No products found')
          ? 'Products have not been added to inventory yet. Use "Add Products to Inventory" first — barcodes are generated during registration.'
          : message,
      });
    }
  };

  const handlePrintSparePartBarcodes = async () => {
    if (!lot) return;
    try {
      const response = await api.get(`/i/inventory/spare-parts/barcode-pdf?lotId=${lot.id}`, {
        responseType: 'blob',
      });
      const fileUrl = URL.createObjectURL(response.data);
      window.open(fileUrl);
    } catch (err: unknown) {
      const message = await extractBlobErrorMessage(err);
      toast.error('Cannot print spare part barcodes', {
        description: message.includes('No registered spare parts')
          ? 'Spare parts have not been added to inventory yet. Use "Add Spare to Inventory" first — barcodes are generated during registration.'
          : message,
      });
    }
  };

  const handleAddToInventory = (itemId?: string, type?: LotItemType) => {
    if (!lot) return;
    if (type === LotItemType.MODEL) {
      router.push(`/manager/products?lotId=${lot.id}${itemId ? `&itemId=${itemId}` : ''}`);
    } else if (type === LotItemType.SPARE_PART) {
      router.push(`/manager/spare-parts?lotId=${lot.id}${itemId ? `&itemId=${itemId}` : ''}`);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lot) return;
    if (!docFile) {
      toast.error('Choose a file to upload');
      return;
    }
    if (!docName.trim()) {
      toast.error('Document name is required');
      return;
    }

    try {
      setIsUploadingDoc(true);
      const doc = await lotService.uploadLotDocument(
        lot.id,
        docFile,
        docType,
        docName.trim(),
        docNotes.trim() || undefined,
      );
      setDocuments((prev) => [doc, ...prev]);
      setDocName('');
      setDocNotes('');
      setDocFile(null);
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      toast.success('Document uploaded');
    } catch (err: unknown) {
      toast.error('Failed to upload document', {
        description:
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (err as Error).message,
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!lot) return;
    try {
      await lotService.deleteLotDocument(lot.id, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast.success('Document deleted');
    } catch (err: unknown) {
      toast.error('Failed to delete document', {
        description:
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (err as Error).message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-slate-500">Lot not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const itemsTotal = (lot.items || []).reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const hasProducts = (lot.items || []).some((item) => item.itemType === LotItemType.MODEL);
  const hasSpareParts = (lot.items || []).some((item) => item.itemType === LotItemType.SPARE_PART);
  const hasRegisteredProducts = (lot.items || []).some(
    (item) => item.itemType === LotItemType.MODEL && item.usedQuantity > 0,
  );
  const hasRegisteredSpareParts = (lot.items || []).some(
    (item) => item.itemType === LotItemType.SPARE_PART && (item.sparePartId || item.sparePart),
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => router.push('/manager/lots')}
              title="Back to Lots"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Package className="text-primary" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Lot: {lot.lotNumber}</h1>
                <Badge
                  variant="outline"
                  className={`px-2 py-0 ${getStatusColor(lot.status)} font-medium`}
                >
                  {lot.status}
                </Badge>
                <PurchaseOriginBadge origin={lot.purchaseOrigin} />
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar size={14} className="text-slate-400" />
                  {format(new Date(lot.purchaseDate), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User size={14} className="text-slate-400" />
                  {lot.vendor?.name ?? (lot.transferOrigin ? 'Internal Transfer' : '—')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-2">
              <Download size={15} /> Export
            </Button>
            {hasProducts && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProducts}
                className="gap-2 text-blue-600 border-blue-100"
              >
                <Box size={15} /> Products
              </Button>
            )}
            {hasSpareParts && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSpareParts}
                className="gap-2 text-orange-600 border-orange-100"
              >
                <Settings size={15} /> Spare Parts
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-6 space-y-6">
        {/* Receiving Mode Banner */}
        {isReceiving && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
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

        {lot.status === LotStatus.RECEIVING && !isReceiving && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
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

        {lot.status === LotStatus.PENDING && !isReceiving && (
          <div className="p-3 bg-slate-100 border rounded-xl flex items-center justify-between">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Items
              </p>
              <p className="text-lg font-bold leading-none">{(lot.items || []).length} Types</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Quantity
              </p>
              <p className="text-lg font-bold leading-none">
                {(lot.items || []).reduce((sum, item) => sum + item.expectedQuantity, 0)} Units
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
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
                    ((lot.items || []).reduce((sum, item) => sum + item.usedQuantity, 0) /
                      Math.max(
                        1,
                        (lot.items || []).reduce((sum, item) => sum + item.receivedQuantity, 0),
                      )) *
                      100,
                  ) || 0}
                  %
                </p>
                <p className="text-[10px] font-medium text-slate-500">Utilization</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Lot Value
              </p>
              <p className="text-lg font-bold leading-none text-primary">
                {formatCurrency(itemsTotal, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Shipment Info — how the goods are physically moving from vendor to warehouse */}
        <ShipmentInfoCard lot={lot} onUpdated={setLot} />

        {/* Lot Items — full width */}
        <Card className="p-0 overflow-hidden border-none shadow-sm">
          <CardHeader className="p-4 bg-slate-50 border-b flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Box size={16} className="text-slate-400" /> Lot Items
            </CardTitle>
            <Badge variant="secondary" className="font-normal text-[10px]">
              {(lot.items || []).length} Distinct Entries
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[85px]">Type</TableHead>
                    <TableHead>Item</TableHead>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lot.items || []).map((item) => {
                    const usagePercent = Math.round(
                      (item.usedQuantity / Math.max(1, item.receivedQuantity)) * 100,
                    );
                    const q = receivedItems[item.id] || { received: 0, damaged: 0 };

                    return (
                      <TableRow key={item.id} className="group hover:bg-slate-50/50">
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
                            {(item.sparePart?.sku || item.sparePart?.mpn || item.mpn) && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.sparePart?.sku}
                                {item.sparePart?.sku && (item.sparePart?.mpn || item.mpn)
                                  ? ' · '
                                  : ''}
                                {(item.sparePart?.mpn || item.mpn) && (
                                  <span className="text-blue-500">
                                    MPN {item.sparePart?.mpn || item.mpn}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-slate-400 font-medium">
                          {item.expectedQuantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReceiving ? (
                            <Input
                              type="number"
                              className="w-16 h-7 text-right text-xs ml-auto"
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
                              className="w-16 h-7 text-right text-xs text-red-600 ml-auto"
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
                          {formatCurrency(Number(item.unitPrice), currency)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatCurrency(Number(item.totalPrice), currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="bg-slate-50 border-t p-4 flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {lot.status === LotStatus.RECEIVED && hasProducts && (
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 border-blue-200 text-blue-700"
                      onClick={() => handleAddToInventory(undefined, LotItemType.MODEL)}
                    >
                      <Plus size={12} /> Add Products to Inventory
                    </Button>
                    <span
                      title={
                        hasRegisteredProducts
                          ? undefined
                          : 'Add products to inventory first — barcodes are generated during registration'
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 border-indigo-200 text-indigo-700"
                        disabled={!hasRegisteredProducts}
                        onClick={handlePrintProductBarcodes}
                      >
                        <FileText size={12} /> Print Barcodes
                      </Button>
                    </span>
                  </div>
                )}
                {lot.status === LotStatus.RECEIVED && hasSpareParts && (
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 border-orange-200 text-orange-700"
                      onClick={() => handleAddToInventory(undefined, LotItemType.SPARE_PART)}
                    >
                      <Plus size={12} /> Add Spare to Inventory
                    </Button>
                    <span
                      title={
                        hasRegisteredSpareParts
                          ? undefined
                          : 'Add spare parts to inventory first — barcodes are generated during registration'
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 border-amber-200 text-amber-700"
                        disabled={!hasRegisteredSpareParts}
                        onClick={handlePrintSparePartBarcodes}
                      >
                        <FileText size={12} /> Print Barcodes
                      </Button>
                    </span>
                  </div>
                )}
                {lot.status !== LotStatus.RECEIVED && hasSpareParts && (
                  <span
                    title={
                      hasRegisteredSpareParts
                        ? undefined
                        : 'Add spare parts to inventory first — barcodes are generated during registration'
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 border-amber-200 text-amber-700"
                      disabled={!hasRegisteredSpareParts}
                      onClick={handlePrintSparePartBarcodes}
                    >
                      <FileText size={12} /> Print Spare Barcodes
                    </Button>
                  </span>
                )}
              </div>
              <div className="text-sm font-medium">
                Items Total:{' '}
                <span className="font-bold text-primary text-base">
                  {formatCurrency(itemsTotal, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Below: Shipping Documents, Financial Tracking, Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Shipping Documents */}
          <Card className="p-0 overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 bg-slate-50 border-b flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileArchive size={16} className="text-slate-400" /> Shipping Documents
              </CardTitle>
              <Badge variant="secondary" className="font-normal text-[10px]">
                {documents.length} File{documents.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form
                onSubmit={handleUploadDocument}
                className="space-y-3 p-4 rounded-lg border bg-slate-50/50"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Document Name *
                  </label>
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder="e.g. Bill of Lading - Container XYZ4521"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                  <Select value={docType} onValueChange={(v) => setDocType(v as LotDocumentType)}>
                    <SelectTrigger className="h-9 text-xs w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LotDocumentType).map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {LOT_DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">File *</label>
                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                  {docFile ? (
                    <div className="flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs">
                      <span className="truncate text-slate-700 font-medium">{docFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDocFile(null);
                          if (docFileInputRef.current) docFileInputRef.current.value = '';
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current?.click()}
                      className="w-full h-9 rounded-md border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500 hover:border-primary hover:text-primary transition-colors"
                    >
                      Choose image, PDF, or Word file
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Note (optional)
                  </label>
                  <Textarea
                    className="text-xs min-h-[60px] bg-white"
                    placeholder="Any context worth keeping with this document..."
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8 gap-1.5 text-xs"
                  disabled={isUploadingDoc}
                >
                  {isUploadingDoc ? (
                    <Activity size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  Upload Document
                </Button>
              </form>

              <div className="space-y-4">
                {loadingDocuments ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">
                    Loading documents...
                  </p>
                ) : documents.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">
                    No shipping documents attached yet.
                  </p>
                ) : (
                  Object.values(LotDocumentCategory)
                    .map((category) => ({
                      category,
                      docs: documents.filter(
                        (doc) => LOT_DOCUMENT_TYPE_CATEGORY[doc.documentType] === category,
                      ),
                    }))
                    .filter(({ docs }) => docs.length > 0)
                    .map(({ category, docs }) => (
                      <div key={category} className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {LOT_DOCUMENT_CATEGORY_LABELS[category]}
                        </p>
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 min-w-0 hover:text-primary"
                              >
                                <Paperclip size={12} className="shrink-0 text-slate-400 mt-0.5" />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold truncate">{doc.documentName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {LOT_DOCUMENT_TYPE_LABELS[doc.documentType]} ·{' '}
                                    {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </a>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-slate-400 hover:text-red-600"
                                  title="Delete document"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              )}
                            </div>
                            {doc.notes && (
                              <p className="text-[11px] text-slate-500 pl-[18px] leading-snug">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Tracking */}
          <Card className="p-0 overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 bg-slate-50 border-b flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity size={16} className="text-slate-400" /> Financial Tracking
              </CardTitle>
              {purchaseRecord && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold bg-white text-primary border-primary/20"
                >
                  {purchaseRecord.status}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {loadingPurchase ? (
                <div className="text-slate-400 text-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-xs">Loading financials...</p>
                </div>
              ) : purchaseRecord ? (
                <div className="space-y-5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Inventory Cost</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(purchaseRecord.purchaseAmount, currency)}
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
                            {formatCurrency(Number(item.value), currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-dashed space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">
                        Total Lot Cost (incl. additional costs)
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(purchaseRecord.totalAmount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium">Paid to Vendor</span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(purchaseRecord.paidAmount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600 font-bold">Vendor Remaining Balance</span>
                      <span
                        className={`font-black ${purchaseRecord.remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {formatCurrency(purchaseRecord.remainingAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {purchaseRecord.payments && purchaseRecord.payments.length > 0 && (
                    <div className="pt-3 border-t border-dashed">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                        Payments
                      </div>
                      <div className="space-y-2">
                        {purchaseRecord.payments.map((p, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{p.paymentMethod}</span>
                              <span className="text-[9px] text-slate-400">
                                {format(new Date(p.paymentDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.attachmentUrl && (
                                <a
                                  href={p.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-primary transition-colors"
                                  title="View receipt"
                                >
                                  <Paperclip size={12} />
                                </a>
                              )}
                              <span className="font-bold text-green-600">
                                +{formatCurrency(Number(p.amount), currency)}
                              </span>
                            </div>
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
                            <div className="flex items-center gap-2">
                              {c.attachmentUrl && (
                                <a
                                  href={c.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-primary transition-colors"
                                  title="View attachment"
                                >
                                  <Paperclip size={12} />
                                </a>
                              )}
                              <span className="font-bold text-slate-700">
                                {formatCurrency(Number(c.amount), currency)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
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
                      disabled={purchaseRecord.paidAmount >= purchaseRecord.purchaseAmount}
                    >
                      <Plus size={16} /> Add Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                  <ShoppingCart className="mx-auto text-slate-200 mb-2" size={32} />
                  <p className="text-xs text-slate-400 font-medium italic">
                    No matching purchase record found.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="p-0 overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <StickyNote size={16} className="text-slate-400" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {lot.notes || 'No notes available for this lot.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPaymentModal && purchaseRecord && (
        <AddPaymentModal
          open={showPaymentModal}
          onOpenChange={(open) => setShowPaymentModal(open)}
          purchaseId={purchaseRecord.id}
          payableAmount={purchaseRecord.purchaseAmount}
          paidAmount={purchaseRecord.paidAmount}
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

      {/* Confirm Reception Dialog */}
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
