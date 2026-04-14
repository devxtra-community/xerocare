'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Control, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Trash2, Upload, FileSpreadsheet, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LotItemType, lotService, Vendor } from '@/lib/lot';
import { getAllModels, Model } from '@/lib/model';
import { getVendors } from '@/lib/vendor';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { getUserFromToken } from '@/lib/auth';
import { brandService, Brand } from '@/services/brandService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getMyBranchWarehouses, Warehouse } from '@/lib/warehouse';
import { MultiSelect } from '@/components/ui/multi-select';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/format';
import { generateLotId } from '@/lib/utils';
import { AddModelDialog } from '../productComponents/AddModelDialog';
import { AddBrandDialog } from '../BrandComponents/AddBrandDialog';
import { Label } from '@/components/ui/label';

// --- Schema Definition ---
const lotItemSchema = z
  .object({
    itemType: z.nativeEnum(LotItemType),
    modelId: z.string().optional(),
    modelIds: z.array(z.string()).optional(),
    sparePartId: z.string().optional(),
    brand: z.string().optional(),
    partName: z.string().optional(),
    isRequestingNewPart: z.boolean().optional(),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z
      .any()
      .transform((val) => (val === '' ? undefined : Number(val)))
      .pipe(z.number().min(0, 'Purchase Price cannot be negative')),
    sellingPrice: z
      .any()
      .transform((val) => (val === '' ? undefined : Number(val)))
      .pipe(z.number().min(0, 'Selling Price cannot be negative').optional()),
    mpn: z.string().optional(),
    compatibleModels: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.itemType === LotItemType.MODEL && !data.modelId) {
        return false;
      }
      if (data.itemType === LotItemType.SPARE_PART && (!data.brand || !data.partName)) {
        return false;
      }
      return true;
    },
    {
      message: 'Brand and Part Name are required for spare parts',
      path: ['brand'],
    },
  );

const createLotSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  notes: z.string().optional(),
  items: z.array(lotItemSchema).min(1, 'At least one item is required'),
});

type CreateLotFormValues = z.infer<typeof createLotSchema>;

interface AddLotDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Dialog component for creating or uploading new inventory lots.
 * Supports manual entry of lot details and items (Products/Spare Parts).
 * Costs are no longer handled within the lot.
 * Also provides functionality to upload lot data via Excel templates.
 */
export default function AddLotDialog({ onClose, onSuccess }: AddLotDialogProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isValidatingLot, setIsValidatingLot] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  const form = useForm<CreateLotFormValues>({
    resolver: zodResolver(createLotSchema) as Resolver<CreateLotFormValues>,
    defaultValues: {
      vendorId: '',
      warehouseId: '',
      lotNumber: generateLotId(),
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
      items: [
        {
          itemType: LotItemType.MODEL,
          quantity: 1,
          unitPrice: '' as unknown as number,
          sellingPrice: '' as unknown as number,
          modelId: '',
          modelIds: [],
          sparePartId: '',
          brand: '',
          partName: '',
          mpn: '',
          isRequestingNewPart: true,
        },
      ],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const fetchData = async () => {
    try {
      const [vData, mData, bData, spData, wData] = await Promise.all([
        getVendors(),
        getAllModels(),
        brandService.getAllBrands(),
        getAllSpareParts(),
        getMyBranchWarehouses(),
      ]);
      setVendors(vData.data || []);
      setModels(mData.data || []);
      setBrands(bData || []);
      setSpareParts(spData || []);
      setWarehouses(wData.data || []);
    } catch {
      toast.error('Failed to load form data');
    }
  };

  // Load initial data
  useEffect(() => {
    fetchData();
  }, []);

  const watchLotNumber = form.watch('lotNumber');

  // Real-time lot number validation
  useEffect(() => {
    const checkLotUniqueness = async () => {
      if (!watchLotNumber || watchLotNumber.trim() === '') {
        form.clearErrors('lotNumber');
        return;
      }

      setIsValidatingLot(true);
      try {
        const exists = await lotService.checkLotNumber(watchLotNumber);
        if (exists) {
          form.setError('lotNumber', {
            type: 'manual',
            message: 'Lot number already exists. Please use a unique number.',
          });
        } else {
          form.clearErrors('lotNumber');
        }
      } catch (error) {
        console.error('Failed to check lot number uniqueness:', error);
      } finally {
        setIsValidatingLot(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkLotUniqueness();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchLotNumber, form]);

  const onSubmit = async (data: CreateLotFormValues) => {
    setLoading(true);
    try {
      const user = getUserFromToken();
      await lotService.createLot({
        ...data,
        branchId: user?.branchId,
        createdBy: user?.userId,
      });
      toast.success('Lot created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating lot:', error);
      toast.error('Failed to create lot');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return toast.error('Please select a file first');

    setLoading(true);
    try {
      await lotService.uploadLotExcel(uploadFile);
      toast.success('Lot uploaded successfully');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to upload lot';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Item Type',
      'Item Name',
      'Brand',
      'MPN',
      'Quantity',
      'Purchase Price',
      'Selling Price',
    ];
    const rows = [
      ['LOT INFORMATION'],
      ['Vendor', 'Example Vendor'],
      ['Lot Number', 'LOT-001'],
      ['Purchase Date', new Date().toISOString().split('T')[0]],
      ['Notes', 'Optional notes here'],
      [],
      ['LOT ITEMS'],
      headers,
      ['SPARE PART', 'Oil Filter', 'Toyota', 'OF-12345', '10', '25.50', '45.00'],
      ['PRODUCT', 'Kyocera TaskAlpha 2554ci', 'Kyocera', '', '1', '4500.00', '5200.00'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wscols = [
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'lot_upload_template.xlsx');
  };

  // Calculate totals for display
  const watchedItems = form.watch('items');
  const calculateItemsTotal = () => {
    return (
      watchedItems?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) ??
      0
    );
  };

  const calculateGrandTotal = () => calculateItemsTotal();

  const formControl = form.control as unknown as Control<CreateLotFormValues>;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[80vw] lg:max-w-7xl h-[96vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl"
      >
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
        <DialogHeader className="px-6 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-xl font-bold">
              {isUploadMode ? 'Upload Lot from Excel' : 'Create New Lot'}
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              {isUploadMode
                ? 'Upload a pre-filled Excel sheet to create a lot.'
                : 'Fill in the details below to create a new lot inventory.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isUploadMode ? 'secondary' : 'outline'}
              onClick={() => setIsUploadMode(!isUploadMode)}
              className="gap-2"
            >
              {isUploadMode ? (
                <>
                  <Plus className="w-4 h-4" /> Switch to Manual Entry
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Upload Excel
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </DialogHeader>

        {isUploadMode ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 gap-8">
            <div className="text-center space-y-4 max-w-lg">
              <div className="p-4 rounded-full inline-flex items-center justify-center bg-gray-100 mb-2">
                <FileSpreadsheet size={48} className="text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold">Upload Data</h3>
              <p className="text-gray-500 text-base">
                Download the template, fill in your lot details and items, and upload it here.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <div
                className="border rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center text-center gap-3"
                onClick={handleDownloadTemplate}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Download className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Download Template</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Get the properly formatted Excel file
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center text-center gap-3 relative overflow-hidden">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-600" />
                </div>
                <div className="z-0">
                  <h4 className="font-semibold">{uploadFile ? 'Change File' : 'Select File'}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadFile ? uploadFile.name : '.xlsx or .xls files only'}
                  </p>
                </div>
              </div>
            </div>

            {uploadFile && (
              <div className="w-full max-w-md">
                <Button onClick={handleUpload} disabled={loading} size="lg" className="w-full">
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading ? 'Processing...' : `Upload ${uploadFile.name}`}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-hidden grid grid-cols-12 gap-0">
                {/* Items Section (Full Width) */}
                <div className="col-span-12 flex flex-col h-full overflow-hidden">
                  <div className="p-4 pb-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={formControl}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Vendor
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={vendors.map((v) => ({
                                value: v.id,
                                label: `${v.name} (${v.id})`,
                              }))}
                              placeholder="Select Vendor"
                              emptyText="No vendors found."
                              className="h-10 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formControl}
                      name="warehouseId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Warehouse
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={warehouses.map((w) => ({
                                value: w.id,
                                label: `${w.warehouseName} (${w.id})`,
                              }))}
                              placeholder="Select Warehouse"
                              emptyText="No warehouses found."
                              className="h-10 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formControl}
                      name="lotNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Lot / Order Number
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                placeholder="LT-XXXX-XXXX"
                                {...field}
                                className="h-10 bg-gray-50 font-mono"
                                readOnly
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => form.setValue('lotNumber', generateLotId())}
                                className="h-10 w-10 shrink-0"
                                title="Regenerate Lot ID"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formControl}
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formControl}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">Notes</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional..." {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between px-4 py-2 mt-0">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      Lot Items
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        append({
                          itemType: LotItemType.MODEL,
                          quantity: 1,
                          unitPrice: '' as unknown as number,
                          sellingPrice: '' as unknown as number,
                          modelId: '',
                          modelIds: [],
                          sparePartId: '',
                          brand: '',
                          partName: '',
                          mpn: '',
                          isRequestingNewPart: true,
                        })
                      }
                      className="h-9 gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                    >
                      <Plus size={16} /> Add
                    </Button>
                  </div>

                  <div className="flex-1 overflow-hidden px-4 pb-4 pt-0">
                    <div className="h-full border border-transparent rounded-lg flex flex-col overflow-hidden bg-transparent">
                      {/* Table Body */}
                      <div className="flex-1 overflow-y-auto space-y-3">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex flex-col gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-sm"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-medium">Type</Label>
                                <FormField
                                  control={formControl}
                                  name={`items.${index}.itemType`}
                                  render={({ field: typeField }) => (
                                    <Select
                                      onValueChange={(val) => {
                                        typeField.onChange(val);
                                        const currentItem = form.getValues(`items.${index}`);
                                        update(index, {
                                          ...currentItem,
                                          itemType: val as LotItemType,
                                          modelId: '',
                                          modelIds: [],
                                          sparePartId: '',
                                          brand: '',
                                          partName: '',
                                          compatibleModels: '', // Reset
                                        });
                                      }}
                                      value={typeField.value}
                                    >
                                      <SelectTrigger className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:border-slate-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={LotItemType.MODEL}>Product</SelectItem>
                                        <SelectItem value={LotItemType.SPARE_PART}>
                                          Spare Part
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>

                              <FormField
                                control={formControl}
                                name={`items.${index}.itemType`}
                                render={({ field: itemTypeField }) => (
                                  <>
                                    {itemTypeField.value === LotItemType.MODEL ? (
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4 mb-1">
                                          <Label className="text-xs text-slate-500 font-medium">
                                            Brand *
                                          </Label>
                                          <button
                                            type="button"
                                            onClick={() => setBrandDialogOpen(true)}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                          >
                                            + Create Brand?
                                          </button>
                                        </div>
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.brand`}
                                          render={({ field: brandField }) => (
                                            <FormItem>
                                              <FormControl>
                                                <SearchableSelect
                                                  options={brands.map((b) => ({
                                                    value: b.name,
                                                    label: b.name,
                                                  }))}
                                                  value={brandField.value || ''}
                                                  onValueChange={(val) => {
                                                    brandField.onChange(val);
                                                    form.setValue(`items.${index}.modelId`, '');
                                                  }}
                                                  placeholder="Search Brand..."
                                                  emptyText="No brands found"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4 mb-1">
                                          <Label className="text-xs text-slate-500 font-medium">
                                            Brand *
                                          </Label>
                                          <button
                                            type="button"
                                            onClick={() => setBrandDialogOpen(true)}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                          >
                                            + Create Brand?
                                          </button>
                                        </div>
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.brand`}
                                          render={({ field: brandField }) => (
                                            <FormItem>
                                              <FormControl>
                                                <SearchableSelect
                                                  options={brands.map((b) => ({
                                                    value: b.name,
                                                    label: b.name,
                                                  }))}
                                                  value={brandField.value || ''}
                                                  onValueChange={(val) => {
                                                    brandField.onChange(val);
                                                    form.setValue(`items.${index}.modelId`, '');
                                                    form.setValue(`items.${index}.modelIds`, []);
                                                  }}
                                                  placeholder="Search Brand..."
                                                  emptyText="No brands found"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                              />
                            </div>

                            <FormField
                              control={formControl}
                              name={`items.${index}.itemType`}
                              render={({ field: itemTypeField }) => (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-4 items-end">
                                    {itemTypeField.value === LotItemType.MODEL ? (
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4 mb-1">
                                          <Label className="text-xs text-slate-500 font-medium">
                                            Model *
                                          </Label>
                                          <button
                                            type="button"
                                            onClick={() => setModelDialogOpen(true)}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                          >
                                            + Create New Model?
                                          </button>
                                        </div>
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.modelId`}
                                          render={({ field: modelField }) => {
                                            const itemBrand = form.watch(`items.${index}.brand`);
                                            return (
                                              <FormItem>
                                                <FormControl>
                                                  <SearchableSelect
                                                    options={models
                                                      .filter(
                                                        (m) =>
                                                          !itemBrand ||
                                                          m.brandRelation?.name === itemBrand,
                                                      )
                                                      .map((m) => ({
                                                        value: m.id,
                                                        label: `${m.model_no} - ${m.model_name}`,
                                                      }))}
                                                    value={modelField.value || ''}
                                                    onValueChange={modelField.onChange}
                                                    placeholder="Search Model..."
                                                    emptyText={
                                                      itemBrand
                                                        ? 'No models found for this brand'
                                                        : 'Select a brand first'
                                                    }
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            );
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4 mb-1">
                                          <Label className="text-xs text-slate-500 font-medium">
                                            Part Name *
                                          </Label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = form.getValues(
                                                `items.${index}.isRequestingNewPart`,
                                              );
                                              form.setValue(
                                                `items.${index}.isRequestingNewPart`,
                                                current === false ? true : false,
                                              ); // toggle
                                              form.setValue(`items.${index}.partName`, '');
                                              form.setValue(`items.${index}.sparePartId`, '');
                                              form.setValue(`items.${index}.mpn`, '');
                                              form.setValue(`items.${index}.modelIds`, []);
                                            }}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                          >
                                            {form.watch(`items.${index}.isRequestingNewPart`) !==
                                            false
                                              ? '+ Existing Spare Part?'
                                              : '+ New Spare Part?'}
                                          </button>
                                        </div>
                                        {form.watch(`items.${index}.isRequestingNewPart`) !==
                                        false ? (
                                          <FormField
                                            control={formControl}
                                            name={`items.${index}.partName`}
                                            render={({ field: partNameField }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input
                                                    placeholder="Enter part name..."
                                                    {...partNameField}
                                                    className="h-10"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        ) : (
                                          <FormField
                                            control={formControl}
                                            name={`items.${index}.sparePartId`}
                                            render={({ field: sparePartField }) => {
                                              const itemBrand = form.watch(`items.${index}.brand`);
                                              return (
                                                <FormItem>
                                                  <FormControl>
                                                    <SearchableSelect
                                                      options={spareParts
                                                        .filter(
                                                          (sp) =>
                                                            !itemBrand || sp.brand === itemBrand,
                                                        )
                                                        .map((sp) => ({
                                                          value: sp.id,
                                                          label: `${sp.part_name} ${sp.mpn ? `(${sp.mpn})` : ''}`,
                                                        }))}
                                                      value={sparePartField.value || ''}
                                                      onValueChange={(val) => {
                                                        sparePartField.onChange(val);
                                                        const sp = spareParts.find(
                                                          (s) => s.id === val,
                                                        );
                                                        if (sp) {
                                                          form.setValue(
                                                            `items.${index}.partName`,
                                                            sp.part_name,
                                                          );
                                                          form.setValue(
                                                            `items.${index}.mpn`,
                                                            sp.mpn || '',
                                                          );
                                                          form.setValue(
                                                            `items.${index}.modelIds`,
                                                            Array.isArray(sp.model_ids)
                                                              ? sp.model_ids
                                                              : [],
                                                          );
                                                        }
                                                      }}
                                                      placeholder="Search Existing Part..."
                                                      emptyText={
                                                        itemBrand
                                                          ? 'No parts found for this brand'
                                                          : 'Select a brand first'
                                                      }
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              );
                                            }}
                                          />
                                        )}
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-500 font-medium h-4 mb-1 block text-center">
                                        Qty
                                      </Label>
                                      <FormField
                                        control={formControl}
                                        name={`items.${index}.quantity`}
                                        render={({ field: qtyField }) => (
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="Qty"
                                            {...qtyField}
                                            className="text-center h-10 bg-white"
                                          />
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-500 font-medium h-4 mb-1 block text-center">
                                        Purchase
                                      </Label>
                                      <FormField
                                        control={formControl}
                                        name={`items.${index}.unitPrice`}
                                        render={({ field: buyField }) => (
                                          <div className="relative">
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                                              Q
                                            </div>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              placeholder=""
                                              {...buyField}
                                              className="h-10 pl-5 pr-1 text-right bg-white"
                                            />
                                          </div>
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-500 font-medium h-4 mb-1 block text-center">
                                        Selling
                                      </Label>
                                      <FormField
                                        control={formControl}
                                        name={`items.${index}.sellingPrice`}
                                        render={({ field: sellField }) => (
                                          <div className="relative">
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                                              Q
                                            </div>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              placeholder="0.00"
                                              {...sellField}
                                              className="h-10 pl-5 pr-1 text-right font-bold text-blue-600 bg-white"
                                            />
                                          </div>
                                        )}
                                      />
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent transition-all h-10 w-10 mb-[1px]"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </div>

                                  {itemTypeField.value === LotItemType.SPARE_PART && (
                                    <div className="grid grid-cols-2 gap-4 pb-2 border-t border-dashed border-slate-200 mt-2 pt-4">
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 font-medium">
                                          Manufacturing Part # (MPN)
                                        </Label>
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.mpn`}
                                          render={({ field: mpnField }) => (
                                            <Input
                                              placeholder="Search or enter MPN..."
                                              className="h-10 bg-white"
                                              {...mpnField}
                                            />
                                          )}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 font-medium">
                                          Compatible Models
                                        </Label>
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.modelIds`}
                                          render={({ field: modelIdsField }) => {
                                            const itemBrand = form.watch(`items.${index}.brand`);
                                            return (
                                              <MultiSelect
                                                values={modelIdsField.value || []}
                                                onValuesChange={(newValues) => {
                                                  if (
                                                    newValues.includes('universal') &&
                                                    !(modelIdsField.value || []).includes(
                                                      'universal',
                                                    )
                                                  ) {
                                                    modelIdsField.onChange(['universal']);
                                                  } else if (
                                                    newValues.length > 1 &&
                                                    newValues.includes('universal')
                                                  ) {
                                                    modelIdsField.onChange(
                                                      newValues.filter((v) => v !== 'universal'),
                                                    );
                                                  } else {
                                                    modelIdsField.onChange(newValues);
                                                  }
                                                }}
                                                options={[
                                                  {
                                                    value: 'universal',
                                                    label: 'Universal',
                                                    description: 'Compatible with all',
                                                  },
                                                  ...models
                                                    .filter((m) =>
                                                      itemBrand
                                                        ? m.brandRelation?.name === itemBrand
                                                        : true,
                                                    )
                                                    .map((m) => ({
                                                      value: m.id,
                                                      label: m.model_no,
                                                      description: m.model_name,
                                                    })),
                                                ]}
                                                placeholder="Comp. Models"
                                                className="bg-white min-h-10 text-xs"
                                                disabled={!itemBrand}
                                              />
                                            );
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        ))}
                        {fields.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm mt-4">
                            No items added yet. Click &quot;Add&quot; to begin.
                          </div>
                        )}
                      </div>
                      <div className="bg-transparent pt-3 text-right flex justify-end items-center gap-2">
                        <span className="text-gray-600 text-sm font-medium">Items Total:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(calculateItemsTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-2 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-4 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base text-gray-600 font-bold">Grand Total:</span>
                  <span className="text-2xl font-bold tracking-tight text-blue-600">
                    {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || isValidatingLot || !!form.formState.errors.lotNumber}
                    size="sm"
                    className="min-w-[120px] bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Saving...' : 'Save Lot'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
