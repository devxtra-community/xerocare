'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createRfq, uploadRfqExcel, ItemType, RfqItem } from '@/lib/rfq';
import { getVendors, Vendor } from '@/lib/vendor';
import { getAllModels, Model } from '@/lib/model';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { getAllProducts, Product } from '@/lib/product';
import { getBrands, Brand } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  PlusCircle,
  Save,
  ArrowLeft,
  UploadCloud,
  DownloadCloud,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AddModelDialog } from '../productComponents/AddModelDialog';
import { AddBrandDialog } from '../BrandComponents/AddBrandDialog';
import { MultiSelect } from '@/components/ui/multi-select';

interface ExtendedRfqItem extends RfqItem {
  isRequestingNewProduct?: boolean;
  isRequestingNewPart?: boolean;
}

interface RfqCreateFormProps {
  basePath: string;
}

export default function RfqCreateForm({ basePath }: RfqCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [items, setItems] = useState<ExtendedRfqItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vendor search state
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  // Dialog states
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vRes, mRes, spRes, pRes, bRes] = await Promise.all([
        getVendors({ limit: 1000 }),
        getAllModels({ limit: 1000 }),
        getAllSpareParts(),
        getAllProducts(),
        getBrands(),
      ]);
      setVendors(vRes.data || vRes);
      setModels(mRes.data || mRes);
      setSpareParts(spRes);
      setProducts(pRes);
      setBrands(bRes.data || bRes);
    } catch (error) {
      console.error('Failed to load initial data', error);
      toast.error('Failed to load initial data');
    }
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId],
    );
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { itemType: ItemType.PRODUCT, quantity: 1 }]);
  };

  const updateItem = (
    index: number,
    field: keyof ExtendedRfqItem,
    value: string | number | boolean | ItemType | string[] | undefined,
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'itemType') {
        newItems[index].modelId = undefined;
        newItems[index].productId = undefined;
        newItems[index].brandId = undefined;
        newItems[index].sparePartId = undefined;
        newItems[index].customProductName = undefined;
        newItems[index].customSparePartName = undefined;
        newItems[index].customBrandName = undefined;
        newItems[index].hsCode = undefined;
        newItems[index].isRequestingNewProduct = false;
        newItems[index].isRequestingNewPart = false;
      }
      if (field === 'modelId') {
        newItems[index].productId = undefined;
        newItems[index].customProductName = undefined;
        newItems[index].isRequestingNewProduct = false;
      }
      if (field === 'brandId') {
        newItems[index].sparePartId = undefined;
        newItems[index].customSparePartName = undefined;
        newItems[index].isRequestingNewPart = false;
      }
      if (field === 'sparePartId' && value) {
        const sp = spareParts.find((s) => s.id === value);
        if (sp) {
          newItems[index].mpn = sp.mpn;
          newItems[index].compatibleModels = sp.compatible_models;
          const modelIdsRaw = sp.model_ids;
          if (modelIdsRaw) {
            newItems[index].modelIds =
              typeof modelIdsRaw === 'string' ? modelIdsRaw.split(',') : modelIdsRaw;
          } else if (sp.model_id) {
            newItems[index].modelIds = [sp.model_id];
          }
        }
      }
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor before uploading the creation Excel.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setLoading(true);
      await uploadRfqExcel({
        vendorIds: selectedVendors,
        file: file,
      });
      toast.success(
        'RFQ and structured template created successfully! Vendors will receive an email shortly.',
      );
      router.push(`${basePath}/rfqs`);
    } catch (error: unknown) {
      console.error('Error creating RFQ from Excel:', error);
      // Fallback: If it's not a formal creation Excel, maybe it's just a raw list to import into the form?
      // The user wanted a strict workflow, so I'll stick to hitting the backend.
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to create RFQ from Excel. Ensure columns are correct.',
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSampleExcel = () => {
    // Updated header row for the new 2-way workflow
    const rows: (string | number)[][] = [
      [
        'model_id',
        'hs_code',
        'mpn',
        'compatible_models',
        'description',
        'quantity',
        'unit_price',
        'total_price',
        'stock_status',
        'available_quantity',
        'estimated_shipment_date',
        'vendor_note',
      ],
    ];

    // Add a few real Models as examples
    const modelExamples = models.slice(0, 5);
    modelExamples.forEach((m) => {
      rows.push([
        m.id,
        m.hs_code || '',
        m.model_name || m.description || '',
        1,
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    });

    // Fallback if no data is loaded yet
    if (rows.length === 1) {
      rows.push([
        '[Get UUID from Models page]',
        '1234.56.78',
        'Example Product Description',
        10,
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 36 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 30 },
    ];

    const instructions = XLSX.utils.aoa_to_sheet([
      ['HOW TO USE THIS CREATION TEMPLATE'],
      [''],
      ['Column A: model_id', 'MUST be the exact UUID of the Model from XeroCare.'],
      ['Column B: hs_code', 'Optional. The HS code for customs.'],
      ['Column C: description', 'Optional. Notes for your internal reference.'],
      ['Column D: quantity', 'The required quantity (Number > 0).'],
      ['Columns E-J', 'Leave these EMPTY. They will be filled by the vendor in the next phase.'],
      [''],
      ['1. Select your vendors in the form first.'],
      ['2. Upload this Excel to create the RFQ instantly.'],
      ['3. Vendors will receive their own template to fill in the missing details.'],
    ]);
    instructions['!cols'] = [{ wch: 20 }, { wch: 80 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RFQ_Creation');
    XLSX.utils.book_append_sheet(wb, instructions, 'Instructions');

    XLSX.writeFile(wb, 'RFQ_Creation_Template.xlsx');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendors.length === 0) {
      return toast.error('Please select at least one vendor');
    }
    if (items.length === 0) {
      return toast.error('Please add at least one item');
    }
    if (
      items.some(
        (i) =>
          i.quantity <= 0 ||
          (i.itemType === ItemType.PRODUCT && !i.modelId) ||
          (i.itemType === ItemType.SPARE_PART && !i.brandId && !i.customBrandName),
      )
    ) {
      return toast.error('Please complete all item rows properly');
    }

    // Enrich items with backend-required fields before submission
    const enrichedItems: RfqItem[] = items.map((item) => {
      if (item.itemType === ItemType.PRODUCT) {
        const model = models.find((m) => m.id === item.modelId);
        return {
          ...item,
          customProductName:
            item.customProductName ||
            (!item.productId ? model?.model_name || model?.model_no || item.modelId : undefined),
        };
      } else {
        return {
          ...item,
          customSparePartName:
            item.customSparePartName || (!item.sparePartId ? 'Unknown Part' : undefined),
          mpn: item.mpn,
          compatibleModels: item.compatibleModels,
        };
      }
    });

    try {
      setLoading(true);
      await createRfq({
        vendorIds: selectedVendors,
        items: enrichedItems,
      });
      toast.success('RFQ created successfully');
      router.push(`${basePath}/rfqs`);
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to create RFQ',
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
      v.email.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
      (v as { vendor_code?: string }).vendor_code
        ?.toLowerCase()
        .includes(vendorSearchQuery.toLowerCase()),
  );

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    const aSelected = selectedVendors.includes(a.id);
    const bSelected = selectedVendors.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      <AddModelDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        onSuccess={fetchData}
      />
      <AddBrandDialog
        open={brandDialogOpen}
        onOpenChange={setBrandDialogOpen}
        onSuccess={fetchData}
      />
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-semibold text-slate-800">Draft New RFQ</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Vendors Section */}
        <section className="space-y-4">
          <h4 className="font-semibold text-slate-700 text-base border-b pb-2">
            1. Select Vendors
          </h4>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Vendor by Name or Vendor ID"
              value={vendorSearchQuery}
              onChange={(e) => setVendorSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
            {sortedVendors.map((vendor) => {
              const isSelected = selectedVendors.includes(vendor.id);
              return (
                <label
                  key={vendor.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
                    ) : (
                      <div className="h-5 w-5 rounded border border-slate-300 bg-white" />
                    )}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => toggleVendor(vendor.id)}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-slate-800 text-sm truncate">
                      {vendor.name}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{vendor.email}</span>
                  </div>
                </label>
              );
            })}
          </div>
          {vendors.length === 0 && <p className="text-sm text-slate-500">No vendors available.</p>}
          {vendors.length > 0 && sortedVendors.length === 0 && (
            <p className="text-sm text-slate-500">No vendors match your search.</p>
          )}
        </section>

        {/* Items Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end border-b pb-2">
            <h4 className="font-semibold text-slate-700 text-base">2. Request Items</h4>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                onClick={downloadSampleExcel}
              >
                <DownloadCloud size={14} />
                Download Sample
              </Button>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={14} />
                Upload Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={addItemRow}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                {/* Row 1: Type & Model/Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 font-medium">Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:border-slate-300"
                      value={item.itemType}
                      onChange={(e) => updateItem(index, 'itemType', e.target.value as ItemType)}
                    >
                      <option value={ItemType.PRODUCT}>Product</option>
                      <option value={ItemType.SPARE_PART}>Spare Part</option>
                    </select>
                  </div>

                  {item.itemType === ItemType.PRODUCT ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center h-4 mb-1">
                        <Label className="text-xs text-slate-500 font-medium">Model *</Label>
                        <button
                          type="button"
                          onClick={() => setModelDialogOpen(true)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          + Request New Model?
                        </button>
                      </div>
                      <SearchableSelect
                        options={models.map((m) => ({
                          value: m.id,
                          label: `${m.model_no} - ${m.model_name}`,
                        }))}
                        value={item.modelId || ''}
                        onValueChange={(val) => updateItem(index, 'modelId', val)}
                        placeholder="Search Model..."
                        emptyText="No models found"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center h-4 mb-1">
                        <Label className="text-xs text-slate-500 font-medium">Brand *</Label>
                        <button
                          type="button"
                          onClick={() => setBrandDialogOpen(true)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          + Create Brand?
                        </button>
                      </div>
                      <SearchableSelect
                        options={brands.map((b) => ({
                          value: b.id,
                          label: b.name,
                        }))}
                        value={item.brandId || ''}
                        onValueChange={(val) => updateItem(index, 'brandId', val)}
                        placeholder="Search Brand..."
                        emptyText="No brands found"
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: Product/Part & Quantity & Delete */}
                <div className="space-y-4">
                  {/* Selector Row */}
                  <div className="grid grid-cols-[1fr_120px_40px] gap-4 items-end">
                    {item.itemType === ItemType.PRODUCT ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center h-4 mb-1">
                          <Label className="text-xs text-slate-500 font-medium">Product</Label>
                          {item.modelId && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, 'isRequestingNewProduct', true);
                                updateItem(index, 'productId', undefined);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              + Request New Product?
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          options={products
                            .filter(
                              (p) =>
                                !item.modelId ||
                                p.model?.id === item.modelId ||
                                (p as { model_id?: string }).model_id === item.modelId,
                            )
                            .map((p) => ({
                              value: p.id,
                              label: p.name,
                            }))}
                          value={item.productId || ''}
                          onValueChange={(val) => updateItem(index, 'productId', val)}
                          placeholder="Search Product..."
                          emptyText="No products found"
                          disabled={!item.modelId}
                        />
                      </div>
                    ) : item.isRequestingNewPart ? (
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center h-4 mb-1">
                            <Label className="text-xs text-slate-500 font-medium">
                              New Part Name
                            </Label>
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, 'isRequestingNewPart', false);
                                updateItem(index, 'customSparePartName', undefined);
                                updateItem(index, 'hsCode', undefined);
                              }}
                              className="text-[10px] text-red-500 hover:text-red-700 font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                          <Input
                            placeholder="Custom part name"
                            value={item.customSparePartName || ''}
                            onChange={(e) =>
                              updateItem(index, 'customSparePartName', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="w-[120px] space-y-1">
                          <Label className="text-xs text-slate-500 font-medium h-4 mb-1 block">
                            HS Code *
                          </Label>
                          <Input
                            placeholder="00.00"
                            value={item.hsCode || ''}
                            onChange={(e) => updateItem(index, 'hsCode', e.target.value)}
                            required={!!item.customSparePartName}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center h-4 mb-1">
                          <Label className="text-xs text-slate-500 font-medium">Spare Part</Label>
                          {item.brandId && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, 'isRequestingNewPart', true);
                                updateItem(index, 'sparePartId', undefined);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              + Request New Spare Part?
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          options={spareParts
                            .filter((spItem) => {
                              if (!item.brandId) return true;
                              const selectedBrandName = brands.find(
                                (b) => b.id === item.brandId,
                              )?.name;
                              if (!selectedBrandName) return true;
                              return (
                                spItem.brand?.toLowerCase() === selectedBrandName.toLowerCase()
                              );
                            })
                            .map((spItem: { id: string; sku?: string; part_name?: string }) => ({
                              value: spItem.id,
                              label: `${spItem.sku} - ${spItem.part_name}`,
                            }))}
                          value={item.sparePartId || ''}
                          onValueChange={(val) => updateItem(index, 'sparePartId', val)}
                          placeholder="Search Part..."
                          emptyText="No spare parts found"
                          disabled={!item.brandId}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500 font-medium h-4 mb-1 block text-center">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="text-center"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseInt(e.target.value, 10) || 1)
                        }
                        required
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent transition-all h-10 w-10 mb-[1px]"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Metadata Row for Spare Parts */}
                  {item.itemType === ItemType.SPARE_PART && (
                    <div className="grid grid-cols-2 gap-4 pb-2 border-b border-dashed border-slate-100">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500 font-medium">
                          Manufacturing Part # (MPN)
                        </Label>
                        <Input
                          placeholder="Search or enter MPN..."
                          value={item.mpn || ''}
                          className="h-9 text-xs"
                          onChange={(e) => updateItem(index, 'mpn', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500 font-medium font-medium">
                          Compatible Models
                        </Label>
                        <MultiSelect
                          values={item.modelIds || []}
                          onValuesChange={(newValues) => {
                            if (
                              newValues.includes('universal') &&
                              !(item.modelIds || []).includes('universal')
                            ) {
                              updateItem(index, 'modelIds', ['universal']);
                            } else if (newValues.length > 1 && newValues.includes('universal')) {
                              updateItem(
                                index,
                                'modelIds',
                                newValues.filter((v) => v !== 'universal'),
                              );
                            } else {
                              updateItem(index, 'modelIds', newValues);
                            }
                          }}
                          options={[
                            {
                              value: 'universal',
                              label: 'Universal',
                              description: 'Compatible with all',
                            },
                            ...models
                              .filter((m) => {
                                if (!item.brandId) return false;
                                return m.brandRelation?.id === item.brandId;
                              })
                              .map((m) => ({
                                value: m.id,
                                label: m.model_no,
                                description: m.model_name,
                              })),
                          ]}
                          placeholder="Comp. Models"
                          className="h-9 text-xs bg-gray-50/30"
                          disabled={!item.brandId}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
                No items added yet. Click &quot;Add Item&quot; to begin.
              </div>
            )}
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[120px]">
            {loading ? (
              'Creating...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
