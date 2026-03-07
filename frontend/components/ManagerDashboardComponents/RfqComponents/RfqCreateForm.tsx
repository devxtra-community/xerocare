'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createRfq, uploadRfqExcel, ItemType, RfqItem } from '@/lib/rfq';
import { getVendors, Vendor } from '@/lib/vendor';
import { getAllModels, Model } from '@/lib/model';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, Save, ArrowLeft, UploadCloud, DownloadCloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';

interface RfqCreateFormProps {
  basePath: string;
}

export default function RfqCreateForm({ basePath }: RfqCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);

  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [items, setItems] = useState<RfqItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vRes, mRes, spRes] = await Promise.all([
        getVendors({ limit: 1000 }),
        getAllModels({ limit: 1000 }),
        getAllSpareParts(),
      ]);
      setVendors(vRes.data || vRes);
      setModels(mRes.data || mRes);
      setSpareParts(spRes);
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
    setItems((prev) => [...prev, { itemType: ItemType.MODEL, itemId: '', quantity: 1 }]);
  };

  const updateItem = (index: number, field: keyof RfqItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'itemType') {
      newItems[index].itemId = '';
    }
    setItems(newItems);
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
    if (items.some((i) => !i.itemId || i.quantity <= 0)) {
      return toast.error('Please complete all item rows properly');
    }

    try {
      setLoading(true);
      await createRfq({
        vendorIds: selectedVendors,
        items,
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {vendors.map((vendor) => (
              <label
                key={vendor.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedVendors.includes(vendor.id)
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  checked={selectedVendors.includes(vendor.id)}
                  onChange={() => toggleVendor(vendor.id)}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 text-sm">{vendor.name}</span>
                  <span className="text-xs text-slate-500 line-clamp-1">{vendor.email}</span>
                </div>
              </label>
            ))}
          </div>
          {vendors.length === 0 && <p className="text-sm text-slate-500">No vendors available.</p>}
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
                className="flex flex-wrap sm:flex-nowrap gap-3 items-end p-4 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="w-full sm:w-1/4 space-y-1">
                  <Label className="text-xs text-slate-500">Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={item.itemType}
                    onChange={(e) => updateItem(index, 'itemType', e.target.value as ItemType)}
                  >
                    <option value={ItemType.MODEL}>Model</option>
                    <option value={ItemType.SPARE_PART}>Spare Part</option>
                  </select>
                </div>

                <div className="w-full sm:w-2/4 space-y-1">
                  <Label className="text-xs text-slate-500">Item Name</Label>
                  {item.itemType === ItemType.MODEL ? (
                    <Autocomplete
                      options={models.map(
                        (m): AutocompleteOption => ({
                          value: m.id,
                          label: `${m.model_no} - ${m.model_name}`,
                        }),
                      )}
                      value={item.itemId}
                      onValueChange={(val) => updateItem(index, 'itemId', val)}
                      placeholder="Search Model by Name, Brand or ID..."
                      emptyText="No models found"
                    />
                  ) : (
                    <Autocomplete
                      options={spareParts.map(
                        (sp): AutocompleteOption => ({
                          value: sp.id,
                          label: `${sp.item_code} - ${sp.part_name}`,
                        }),
                      )}
                      value={item.itemId}
                      onValueChange={(val) => updateItem(index, 'itemId', val)}
                      placeholder="Search Spare Part by Name, Brand or Code..."
                      emptyText="No spare parts found"
                    />
                  )}
                </div>

                <div className="w-full sm:w-1/4 space-y-1">
                  <Label className="text-xs text-slate-500">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
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
