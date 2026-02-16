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
import { Plus, Trash2, Upload, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LotItemType, lotService, Vendor } from '@/lib/lot';
import { getAllModels, Model } from '@/lib/model';
import { getVendors } from '@/lib/vendor';
import { getUserFromToken } from '@/lib/auth';
import { brandService, Brand } from '@/services/brandService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as XLSX from 'xlsx';

// --- Schema Definition ---
const lotItemSchema = z
  .object({
    itemType: z.nativeEnum(LotItemType),
    modelId: z.string().optional(),
    sparePartId: z.string().optional(),
    brand: z.string().optional(),
    partName: z.string().optional(),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.coerce.number().min(0, 'Price cannot be negative'),
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
  lotNumber: z.string().min(1, 'Lot number is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  notes: z.string().optional(),
  items: z.array(lotItemSchema).min(1, 'At least one item is required'),
  transportationCost: z.coerce.number().min(0).optional(),
  documentationCost: z.coerce.number().min(0).optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  groundFieldCost: z.coerce.number().min(0).optional(),
  certificationCost: z.coerce.number().min(0).optional(),
  labourCost: z.coerce.number().min(0).optional(),
});

type CreateLotFormValues = z.infer<typeof createLotSchema>;

interface AddLotDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CostInputProps<T extends import('react-hook-form').FieldValues> {
  control: import('react-hook-form').Control<T>;
  name: import('react-hook-form').Path<T>;
  label: string;
}

const CostInput = <T extends import('react-hook-form').FieldValues>({
  control,
  name,
  label,
}: CostInputProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <div className="flex justify-between items-center">
            <FormLabel className="text-sm font-medium text-gray-700">{label}</FormLabel>
          </div>
          <FormControl>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-10 text-sm pl-7 text-right font-medium"
                {...field}
                value={(field.value as number) || ''}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/**
 * Dialog component for creating or uploading new inventory lots.
 * Supports manual entry of lot details, items (Products/Spare Parts), and associated costs.
 * Also provides functionality to upload lot data via Excel templates.
 */
export default function AddLotDialog({ onClose, onSuccess }: AddLotDialogProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const form = useForm<CreateLotFormValues>({
    resolver: zodResolver(createLotSchema) as Resolver<CreateLotFormValues>,
    defaultValues: {
      vendorId: '',
      lotNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
      items: [
        {
          itemType: LotItemType.MODEL,
          quantity: 1,
          unitPrice: 0,
          modelId: '',
          sparePartId: '',
          brand: '',
          partName: '',
        },
      ],
      transportationCost: 0,
      documentationCost: 0,
      shippingCost: 0,
      groundFieldCost: 0,
      certificationCost: 0,
      labourCost: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vData, mData, bData] = await Promise.all([
          getVendors(),
          getAllModels(),
          brandService.getAllBrands(),
        ]);
        setVendors(vData.data || []);
        setModels(mData || []);
        setBrands(bData || []);
      } catch {
        toast.error('Failed to load form data');
      }
    };
    fetchData();
  }, []);

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
    const rows = [
      ['LOT INFORMATION'],
      ['Vendor', 'Example Vendor'],
      ['Lot Number', 'LOT-001'],
      ['Purchase Date', new Date().toISOString().split('T')[0]],
      ['Notes', 'Optional notes here'],
      [],
      ['ADDITIONAL COSTS'],
      ['Transportation', 0],
      ['Documentation', 0],
      ['Shipping', 0],
      ['Ground Field', 0],
      ['Certification', 0],
      ['Labour', 0],
      [],
      ['LOT ITEMS'],
      ['Item Type', 'Item Name', 'Brand', 'Quantity', 'Unit Price'],
      ['PRODUCT', 'Example Model Name', 'Example Brand', 10, 100],
      ['SPARE PART', 'Example Part Name', 'Example Brand', 5, 50],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wscols = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'lot_upload_template.xlsx');
  };

  // Calculate totals for display
  const watchedItems = form.watch('items');
  const watchedCosts = form.watch([
    'transportationCost',
    'documentationCost',
    'shippingCost',
    'groundFieldCost',
    'certificationCost',
    'labourCost',
  ] as const);

  const calculateItemsTotal = () => {
    return (
      watchedItems?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) ??
      0
    );
  };

  const calculateCostsTotal = () => {
    return watchedCosts?.reduce((sum: number, cost) => sum + (cost || 0), 0) ?? 0;
  };

  const calculateGrandTotal = () => calculateItemsTotal() + calculateCostsTotal();

  const formControl = form.control as unknown as Control<CreateLotFormValues>;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[80vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl"
      >
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
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
                <path d="m6 6 18 18" />
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
                Download the template, fill in your lot details including items and costs, and
                upload it here.
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
                {/* Left Section: Main Form & Items (9 cols) */}
                <div className="col-span-12 lg:col-span-9 flex flex-col h-full overflow-hidden border-r">
                  <div className="p-6 pb-2 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <FormField
                      control={formControl}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Vendor
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select Vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input placeholder="PO-2024-001" {...field} className="h-10" />
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

                  <div className="flex items-center justify-between px-6 py-4 mt-2">
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
                          unitPrice: 0,
                          modelId: '',
                          sparePartId: '',
                          brand: '',
                          partName: '',
                        })
                      }
                      className="h-9 gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                    >
                      <Plus size={16} /> Add
                    </Button>
                  </div>

                  <div className="flex-1 overflow-hidden px-6 pb-6 pt-0">
                    <div className="h-full border rounded-lg flex flex-col overflow-hidden bg-gray-50/50">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-2">Type</div>
                        <div className="col-span-12 md:col-span-5">Item Details</div>
                        <div className="col-span-2">Quantity</div>
                        <div className="col-span-2">Unit Price</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      {/* Table Body */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="grid grid-cols-12 gap-4 items-start bg-white p-4 rounded-lg border shadow-sm"
                          >
                            <div className="col-span-12 md:col-span-2">
                              <div className="text-xs font-semibold text-gray-500 mb-1.5 md:hidden">
                                Type
                              </div>
                              <FormField
                                control={formControl}
                                name={`items.${index}.itemType`}
                                render={({ field }) => (
                                  <Select
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      const currentItem = form.getValues(`items.${index}`);
                                      update(index, {
                                        ...currentItem,
                                        itemType: val as LotItemType,
                                        modelId: '',
                                        sparePartId: '',
                                        brand: '',
                                        partName: '',
                                      });
                                    }}
                                    value={field.value}
                                  >
                                    <SelectTrigger className="h-10 text-sm bg-gray-50/50">
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
                            <div className="col-span-12 md:col-span-5">
                              <div className="text-xs font-semibold text-gray-500 mb-1.5 md:hidden">
                                Item Details
                              </div>
                              <FormField
                                control={formControl}
                                name={`items.${index}.itemType`}
                                render={({ field }) => {
                                  const type = field.value;
                                  return (
                                    <>
                                      {type === LotItemType.MODEL ? (
                                        <FormField
                                          control={formControl}
                                          name={`items.${index}.modelId`}
                                          render={({ field: modelField }) => (
                                            <Select
                                              onValueChange={modelField.onChange}
                                              value={modelField.value}
                                            >
                                              <SelectTrigger className="h-10 text-sm bg-gray-50/50">
                                                <SelectValue placeholder="Select Product" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {models.map((m) => (
                                                  <SelectItem key={m.id} value={m.id}>
                                                    {m.model_name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        />
                                      ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                          <FormField
                                            control={formControl}
                                            name={`items.${index}.brand`}
                                            render={({ field: brandField }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <SearchableSelect
                                                    value={brandField.value}
                                                    onValueChange={brandField.onChange}
                                                    options={brands.map((brand) => ({
                                                      value: brand.name,
                                                      label: brand.name,
                                                      description: brand.description || '',
                                                    }))}
                                                    placeholder="Select Brand"
                                                    emptyText="No brands found."
                                                    className="h-10 text-sm bg-gray-50/50"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={formControl}
                                            name={`items.${index}.partName`}
                                            render={({ field: partNameField }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input
                                                    placeholder="Part Name"
                                                    className="h-10 text-sm bg-gray-50/50"
                                                    {...partNameField}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      )}
                                    </>
                                  );
                                }}
                              />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                              <div className="text-xs font-semibold text-gray-500 mb-1.5 md:hidden">
                                Quantity
                              </div>
                              <FormField
                                control={formControl}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-10 text-sm bg-gray-50/50"
                                    placeholder="Qty"
                                    {...field}
                                  />
                                )}
                              />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                              <div className="text-xs font-semibold text-gray-500 mb-1.5 md:hidden">
                                Unit Price
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                  $
                                </span>
                                <FormField
                                  control={formControl}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="h-10 text-sm pl-7 bg-gray-50/50"
                                      placeholder="0.00"
                                      {...field}
                                    />
                                  )}
                                />
                              </div>
                            </div>
                            <div className="col-span-12 md:col-span-1 flex justify-center pt-2 md:pt-0 items-center h-full">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {fields.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 min-h-[200px]">
                            <p className="text-base font-medium">No items added yet</p>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() =>
                                append({
                                  itemType: LotItemType.MODEL,
                                  quantity: 1,
                                  unitPrice: 0,
                                  modelId: '',
                                  sparePartId: '',
                                  brand: '',
                                  partName: '',
                                })
                              }
                            >
                              Add Item
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="bg-white border-t p-4 text-right flex justify-end items-center gap-2">
                        <span className="text-gray-600 text-sm font-medium">Items Total:</span>
                        <span className="font-bold text-lg text-gray-900">
                          ${calculateItemsTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section: Costs (3 cols) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col h-full overflow-hidden bg-white">
                  <div className="p-6 pb-2">
                    <h3 className="font-bold text-gray-900 text-base">Additional Costs</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-2">
                    <div className="space-y-5">
                      <CostInput
                        control={formControl}
                        name="transportationCost"
                        label="Transportation"
                      />
                      <CostInput
                        control={formControl}
                        name="documentationCost"
                        label="Documentation"
                      />
                      <CostInput control={formControl} name="shippingCost" label="Shipping" />
                      <CostInput
                        control={formControl}
                        name="groundFieldCost"
                        label="Ground / Field"
                      />
                      <CostInput
                        control={formControl}
                        name="certificationCost"
                        label="Certification"
                      />
                      <CostInput control={formControl} name="labourCost" label="Labour" />
                    </div>
                  </div>
                  <div className="p-6 border-t mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm font-medium">Costs Total:</span>
                      <span className="font-bold text-base text-gray-900">
                        $
                        {calculateCostsTotal().toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-4 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-600 font-bold">Grand Total:</span>
                  <span className="text-3xl font-bold tracking-tight text-blue-600">
                    $
                    {calculateGrandTotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
                    disabled={loading}
                    size="lg"
                    className="min-w-[140px] bg-blue-700 hover:bg-blue-800 text-white font-semibold"
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
