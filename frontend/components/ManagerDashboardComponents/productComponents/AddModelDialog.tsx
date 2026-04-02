import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { modelService, CreateModelDTO } from '@/services/modelService';
import { getBrands, Brand } from '@/lib/brand';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

const formSchema = z.object({
  model_no: z.string().min(1, 'Model No is required'),
  model_name: z.string().min(1, 'Model Name is required'),
  brand_id: z.string().min(1, 'Brand is required'),
  hs_code: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddModelDialog({ open, onOpenChange, onSuccess }: AddModelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    if (open) {
      getBrands().then((res) => {
        if (res.success) setBrands(res.data);
      });
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await modelService.createModel(data as CreateModelDTO);
      toast.success('Model created successfully');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('error creating model', error);
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to create model',
      );
    } finally {
      setLoading(false);
    }
  };

  const brandOptions: SearchableSelectOption[] = brands.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={brandOptions}
                value={watch('brand_id')}
                onValueChange={(val) => setValue('brand_id', val)}
                placeholder="Select a brand"
                emptyText="No brands found"
              />
              {errors.brand_id && (
                <p className="text-destructive text-xs mt-1">{errors.brand_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Model Name <span className="text-red-500">*</span>
              </label>
              <Input {...register('model_name')} placeholder="e.g. HP LaserJet 1020" />
              {errors.model_name && (
                <p className="text-destructive text-xs mt-1">{errors.model_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Model No <span className="text-red-500">*</span>
              </label>
              <Input {...register('model_no')} placeholder="e.g. HP-LJ-1020" />
              {errors.model_no && (
                <p className="text-destructive text-xs mt-1">{errors.model_no.message}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">HS Code</label>
              <Input {...register('hs_code')} placeholder="e.g. 84433100" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                {...register('description')}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
