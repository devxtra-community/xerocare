'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRfqById,
  sendRfq,
  uploadExcelQuote,
  getRfqComparison,
  awardVendor,
  createLotFromRfq,
  downloadRfqExcel,
  downloadVendorQuote,
  Rfq,
  RfqStatus,
} from '@/lib/rfq';
import { formatCurrency } from '@/lib/format';
import { Model, getAllModels } from '@/lib/model';
import { SparePart, getAllSpareParts } from '@/lib/spare-part';
import { getAllProducts, Product } from '@/lib/product';
import { getBrands, Brand } from '@/lib/brand';
import { getMyBranchWarehouses, Warehouse } from '@/lib/warehouse';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Send,
  Upload,
  CheckCircle,
  Package,
  Download,
  Eye,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Warehouse as WarehouseIcon } from 'lucide-react';

interface RfqDetailsProps {
  id: string;
  basePath: string;
}

export default function RfqDetails({ id, basePath }: RfqDetailsProps) {
  const router = useRouter();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'vendors' | 'comparison'>('items');
  const [vendorToAward, setVendorToAward] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [lotLoading, setLotLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [rfqData, mRes, spRes, pRes, bRes, wRes] = await Promise.all([
          getRfqById(id),
          getAllModels({ limit: 1000 }),
          getAllSpareParts(),
          getAllProducts(),
          getBrands(),
          getMyBranchWarehouses(),
        ]);
        setRfq(rfqData);
        setModels(mRes.data || mRes);
        setSpareParts(spRes);
        setProducts(pRes);
        setBrands(bRes.data || bRes);
        setWarehouses(wRes.data || wRes);

        if (['PARTIAL_QUOTED', 'FULLY_QUOTED', 'AWARDED', 'CLOSED'].includes(rfqData.status)) {
          const compData = await getRfqComparison(id);
          setComparison(compData);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load RFQ details');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  const fetchData = async () => {
    try {
      const rfqData = await getRfqById(id);
      setRfq(rfqData);

      if (['PARTIAL_QUOTED', 'FULLY_QUOTED', 'AWARDED', 'CLOSED'].includes(rfqData.status)) {
        const compData = await getRfqComparison(id);
        setComparison(compData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Resolve a human-readable name for an RFQ item.
   * Priority: registered Model name → registered SparePart name → custom name fields → raw ID.
   */
  const getItemName = (item: Record<string, unknown>): string => {
    // Custom names take highest priority (free-text items)
    if (item.custom_product_name) return item.custom_product_name as string;
    if (item.custom_spare_part_name) return item.custom_spare_part_name as string;

    // Registered product lookup
    if (item.product_id) {
      const p = products.find((pr) => pr.id === item.product_id);
      if (p) return p.name;
    }
    // Registered model lookup
    if (item.model_id) {
      const model = models.find((m) => m.id === item.model_id);
      if (model) return model.model_name || model.model_no || (item.model_id as string);
    }
    // Registered spare part lookup
    if (item.spare_part_id) {
      const sp = spareParts.find((s) => s.id === item.spare_part_id);
      if (sp) return sp.part_name;
    }
    return (item.model_id || item.spare_part_id || item.product_id || 'Unknown') as string;
  };

  const getBrandName = (item: Record<string, unknown>): string => {
    if (item.custom_brand_name) return item.custom_brand_name as string;

    if (item.brand_id) {
      const b = brands.find((br) => br.id === item.brand_id);
      if (b) return b.name;
    }

    if (item.model_id) {
      const model = models.find((m) => m.id === item.model_id);
      if (model) {
        const b = brands.find((br) => br.id === (model as { brand_id?: string }).brand_id);
        if (b) return b.name;
        return model.model_no || '-';
      }
    }

    if (item.spare_part_id) {
      const sp = spareParts.find((s) => s.id === item.spare_part_id);
      if (sp) {
        if (sp.brand) return sp.brand;
        const b = brands.find((br) => br.id === (sp as { brand_id?: string }).brand_id);
        if (b) return b.name;
      }
    }

    if (item.product_id) {
      const p = products.find((pr) => pr.id === item.product_id);
      const modelId = p?.model?.id || (p as { model_id?: string })?.model_id;
      if (modelId) {
        const model = models.find((m) => m.id === modelId);
        if (model) {
          const b = brands.find((br) => br.id === (model as { brand_id?: string }).brand_id);
          if (b) return b.name;
          return model.model_no || '-';
        }
      }
    }

    return '-';
  };

  const handleDownloadVendorQuote = async (vendorId: string, vendorName: string) => {
    try {
      toast.loading(`Downloading ${vendorName}'s Quote...`, { id: 'v-download' });
      await downloadVendorQuote(id, vendorId, vendorName);
      toast.success('Downloaded successfully', { id: 'v-download' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to download vendor quote', { id: 'v-download' });
    }
  };

  const handleSendRfq = async () => {
    try {
      setSendLoading(true);
      await sendRfq(id);
      toast.success('RFQ Sent to Vendors');
      fetchData();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to send RFQ',
      );
    } finally {
      setSendLoading(false);
    }
  };

  const handleFileUpload = async (vendorId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Uploading quote...', { id: 'upload' });
      await uploadExcelQuote(id, vendorId, file);
      toast.success('Quote uploaded successfully', { id: 'upload' });
      fetchData();
      if (e.target) e.target.value = '';
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Upload failed',
        { id: 'upload' },
      );
    }
  };

  const confirmAward = async () => {
    if (!vendorToAward) return;
    try {
      await awardVendor(id, vendorToAward);
      toast.success('Vendor awarded successfully');
      fetchData();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to award vendor',
      );
    } finally {
      setVendorToAward(null);
    }
  };

  const handleCreateLot = async () => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setIsWarehouseDialogOpen(true);
      return;
    }

    try {
      setLotLoading(true);
      await createLotFromRfq(id, selectedWarehouseId || undefined);
      toast.success('Lot created successfully');
      router.push(`${basePath}/lots`);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to create lot',
      );
    } finally {
      setLotLoading(false);
      setIsWarehouseDialogOpen(false);
    }
  };

  if (loading && !rfq) return <div className="p-8 text-center animate-pulse">Loading RFQ...</div>;
  if (!rfq) return <div className="p-8 text-center text-red-500">RFQ Not Found</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`${basePath}/rfqs`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-800">{rfq.rfq_number}</h3>
              <Badge
                variant={
                  rfq.status === RfqStatus.DRAFT
                    ? 'secondary'
                    : rfq.status === RfqStatus.AWARDED
                      ? 'default'
                      : 'outline'
                }
              >
                {rfq.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Created {new Date(rfq.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {rfq.status !== RfqStatus.DRAFT && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast.loading('Downloading Excel...', { id: 'download' });
                  await downloadRfqExcel(id, rfq.rfq_number);
                  toast.success('Downloaded successfully', { id: 'download' });
                } catch (error) {
                  console.error(error);
                  toast.error('Failed to download Excel', { id: 'download' });
                }
              }}
              className="bg-white text-slate-700 border-slate-300"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          )}
          {rfq.status === RfqStatus.DRAFT && (
            <Button
              onClick={handleSendRfq}
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
              disabled={sendLoading}
            >
              {sendLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sendLoading ? 'Sending...' : 'Send RFQ'}
            </Button>
          )}
          {rfq.status === RfqStatus.AWARDED && (
            <Button
              onClick={handleCreateLot}
              className="bg-green-600 hover:bg-green-700 min-w-[130px]"
              disabled={lotLoading}
            >
              {lotLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              {lotLoading ? 'Creating...' : 'Create Lot'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-6 flex gap-6">
        <button
          className={`py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('items')}
        >
          Requested Items{' '}
          <Badge variant="secondary" className="ml-2">
            {rfq.items?.length || 0}
          </Badge>
        </button>
        <button
          className={`py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'vendors' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('vendors')}
        >
          Vendors{' '}
          <Badge variant="secondary" className="ml-2">
            {rfq.vendors?.length || 0}
          </Badge>
        </button>
        {comparison && (
          <button
            className={`py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'comparison' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('comparison')}
          >
            Compare Quotes
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 bg-slate-50/30">
        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <div className="grid gap-4">
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3">Requested Item</th>
                    <th className="px-6 py-3">Brand / Model</th>
                    <th className="px-6 py-3">Item Type</th>
                    <th className="px-6 py-3 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(rfq.items as Record<string, unknown>[]).map((item: Record<string, unknown>) => (
                    <tr key={item.id as string} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{getItemName(item)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {(item.model_id || item.spare_part_id || item.product_id) as string}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-600">
                          {getBrandName(item)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {item.item_type as string}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        {item.quantity as number}
                      </td>
                    </tr>
                  ))}
                  {(!rfq.items || rfq.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(rfq.vendors as Record<string, unknown>[]).map((v: Record<string, unknown>) => (
              <div
                key={v.id as string}
                className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden ${v.status === 'AWARDED' ? 'ring-2 ring-primary border-transparent' : ''}`}
              >
                {v.status === 'AWARDED' && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Awarded
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg line-clamp-1">
                    {((v.vendor as Record<string, unknown>)?.name as string) || 'Unknown Vendor'}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {(v.vendor as Record<string, unknown>)?.email as string}
                  </p>
                </div>
                <div className="flex justify-between items-center py-3 border-y border-dashed border-slate-200">
                  <span className="text-sm text-slate-500">Quote Status</span>
                  <Badge
                    variant={
                      v.status === 'QUOTED' || v.status === 'AWARDED' ? 'default' : 'secondary'
                    }
                  >
                    {v.status as string}
                  </Badge>
                </div>
                {!!(v as { total_quoted_amount?: number }).total_quoted_amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Total Quote</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(
                        v.total_quoted_amount as number,
                        (v.vendor as { currency?: string })?.currency || 'QAR',
                      )}
                    </span>
                  </div>
                )}
                <div className="mt-auto pt-2">
                  {v.status === 'INVITED' && ['SENT', 'PARTIAL_QUOTED'].includes(rfq.status) && (
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleFileUpload(v.vendor_id as string, e)}
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-slate-50 group-hover:bg-slate-100 border-dashed border-slate-300 group-hover:border-primary/50 group-hover:text-primary transition-all"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Vendor Response
                      </Button>
                    </div>
                  )}
                  {v.status === 'QUOTED' &&
                    ['SENT', 'PARTIAL_QUOTED', 'FULLY_QUOTED'].includes(rfq.status) && (
                      <div className="relative group mt-2">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => handleFileUpload(v.vendor_id as string, e)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-slate-400 hover:text-primary"
                        >
                          Re-upload Response
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* COMPARISON TAB */}
        {activeTab === 'comparison' && comparison && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-700 min-w-[200px]">
                      Requested Item
                    </th>
                    {(comparison.vendorsSummary as Record<string, unknown>[]).map(
                      (vs: Record<string, unknown>) => (
                        <th
                          key={vs.vendorId as string}
                          className="px-5 py-4 font-semibold text-center min-w-[180px]"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-slate-800 text-base">
                              {vs.vendorName as string}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              onClick={() =>
                                handleDownloadVendorQuote(
                                  vs.vendorId as string,
                                  vs.vendorName as string,
                                )
                              }
                              title="View Vendor Quote"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider mt-1.5">
                            Quote Details
                          </div>
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(comparison.items as Record<string, unknown>[]).map(
                    (item: Record<string, unknown>) => (
                      <tr key={item.rfqItemId as string} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{getItemName(item)}</div>
                          <div className="text-[10px] text-slate-500 gap-2 flex items-center mt-1">
                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase">
                              {item.itemType as string}
                            </Badge>
                            <span className="font-medium">Qty: {item.quantity as number}</span>
                          </div>
                        </td>
                        {(comparison.vendorsSummary as Record<string, unknown>[]).map(
                          (vs: Record<string, unknown>) => {
                            const vp = (item.vendorPrices as Record<string, unknown>[]).find(
                              (p: Record<string, unknown>) => p.vendorId === vs.vendorId,
                            );
                            // Find the raw rfqVendorItem for this vendor and item to show Stock Status
                            const rfqVendor = (rfq.vendors as Record<string, unknown>[]).find(
                              (rv) => rv.vendor_id === vs.vendorId,
                            );
                            const detail = (rfqVendor?.items as Record<string, unknown>[])?.find(
                              (i: Record<string, unknown>) => i.rfq_item_id === item.rfqItemId,
                            );
                            return (
                              <td
                                key={vs.vendorId as string}
                                className={`px-5 py-4 text-center ${vp?.isLowest ? 'bg-green-50/30' : ''}`}
                              >
                                {vp ? (
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`text-base font-bold ${vp.isLowest ? 'text-green-700' : 'text-slate-800'}`}
                                      >
                                        {formatCurrency(
                                          vp.unitPrice as number,
                                          (rfqVendor?.vendor as { currency?: string })?.currency ||
                                            'QAR',
                                        )}
                                      </span>
                                      {!!(vp as { isLowest?: boolean }).isLowest && (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      )}
                                    </div>
                                    {!!vp.estimatedShipmentDate && (
                                      <div className="flex items-center justify-center gap-1 text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded-md">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          Ship by:{' '}
                                          {new Date(
                                            vp.estimatedShipmentDate as string,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    {detail && (
                                      <div className="flex flex-col gap-1 mt-1">
                                        <Badge
                                          variant={
                                            detail.stock_status === 'IN_STOCK'
                                              ? 'default'
                                              : detail.stock_status === 'ON_PRODUCTION'
                                                ? 'secondary'
                                                : 'destructive'
                                          }
                                          className="text-[9px] h-4 px-1 justify-center bg-opacity-80"
                                        >
                                          {(detail.stock_status as string)?.replace('_', ' ')}
                                        </Badge>
                                        {detail.available_quantity !== undefined && (
                                          <div
                                            className={`text-[10px] font-medium ${(detail.available_quantity as number) < (item.quantity as number) ? 'text-orange-600' : 'text-slate-500'}`}
                                          >
                                            Avail: {detail.available_quantity as number} /{' '}
                                            {item.quantity as number}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {(vp.percentDiff as number) > 0 && (
                                      <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold mt-1">
                                        +{(vp.percentDiff as number).toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">No response</span>
                                )}
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ),
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                    <td className="px-5 py-6 text-right text-slate-600 text-sm">
                      Grand Total Summary:
                    </td>
                    {(comparison.vendorsSummary as Record<string, unknown>[]).map(
                      (vs: Record<string, unknown>) => (
                        <td key={vs.vendorId as string} className="px-5 py-6 text-center">
                          {(() => {
                            const rfqVendor = (rfq.vendors as Record<string, unknown>[]).find(
                              (rv) => rv.vendor_id === vs.vendorId,
                            );
                            return (
                              <div
                                className={`text-xl font-black ${vs.isCheapest ? 'text-green-600' : 'text-slate-900'}`}
                              >
                                {formatCurrency(
                                  vs.totalAmount as number,
                                  (rfqVendor?.vendor as { currency?: string })?.currency || 'QAR',
                                )}
                              </div>
                            );
                          })()}
                          {!!(vs as { isCheapest?: boolean }).isCheapest && (
                            <div className="mt-2 flex justify-center">
                              <Badge className="bg-green-600 hover:bg-green-600 animate-pulse text-[10px] px-3">
                                Cheapest Option
                              </Badge>
                            </div>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                  {/* Action Row */}
                  {['PARTIAL_QUOTED', 'FULLY_QUOTED', 'SENT'].includes(rfq.status) && (
                    <tr className="bg-white">
                      <td className="px-5 py-6 text-right text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        Decision:
                      </td>
                      {(comparison.vendorsSummary as Record<string, unknown>[]).map(
                        (vs: Record<string, unknown>) => (
                          <td key={vs.vendorId as string} className="px-5 py-6 text-center">
                            <Button
                              onClick={() => setVendorToAward(vs.vendorId as string)}
                              variant={vs.isCheapest ? 'default' : 'outline'}
                              className={`w-full h-11 transition-all ${vs.isCheapest ? 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg' : 'hover:border-primary/50 hover:text-primary'}`}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Award Vendor
                            </Button>
                          </td>
                        ),
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!vendorToAward} onOpenChange={(open) => !open && setVendorToAward(null)}>
        <AlertDialogContent className="bg-white p-6 sm:p-10 rounded-[2rem] max-w-lg border-none shadow-2xl overflow-y-auto max-h-[calc(100dvh-2rem)]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50/80">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-center text-slate-800 tracking-tight">
              Award Vendor
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500 text-[15px] leading-relaxed px-2">
              Are you sure you want to award this quotation to the selected vendor? This action is
              final and will generate a lot for the awarded items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-2 sm:justify-center flex-col sm:flex-row w-full">
            <AlertDialogCancel className="w-full sm:w-1/2 rounded-xl h-12 text-[15px] font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAward}
              className="w-full sm:w-1/2 rounded-xl h-12 text-[15px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              Confirm Award
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent className="bg-white p-6 sm:p-10 rounded-[2rem] max-w-lg border-none shadow-2xl overflow-y-auto max-h-[calc(100dvh-2rem)]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <DialogHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50/80">
              <WarehouseIcon className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-slate-800 tracking-tight">
              Assign Warehouse
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 text-[15px] leading-relaxed px-2">
              Select a warehouse where the items from this lot will be stored. This step ensures
              accurate inventory tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <SearchableSelect
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.warehouseName} (${w.id})`,
              }))}
              placeholder="Search & Select Warehouse"
              emptyText="No warehouses found."
              className="w-full h-12 rounded-xl border-slate-200 focus:ring-blue-500"
            />
          </div>
          <DialogFooter className="mt-4 gap-3 sm:gap-2 sm:justify-center flex-col sm:flex-row w-full">
            <Button
              variant="outline"
              onClick={() => setIsWarehouseDialogOpen(false)}
              className="w-full sm:w-1/2 rounded-xl h-12 text-[15px] font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLot}
              disabled={!selectedWarehouseId || lotLoading}
              className="w-full sm:w-1/2 rounded-xl h-12 text-[15px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              {lotLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              {lotLoading ? 'Creating...' : 'Create Lot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
