'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { createBrand, updateBrand, Brand } from '@/lib/brand';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Pass a brand to switch the dialog into edit mode */
  initialData?: Brand | null;
}

/**
 * Dialog component for adding or editing a brand.
 * - When `initialData` is provided, operates in edit mode.
 * - Validates brand name input.
 * - Supports optional description.
 * - Handles asynchronous submission with loading state.
 */
export function AddBrandDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: AddBrandDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // Populate form when switching to edit mode
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({ name: initialData.name, description: initialData.description ?? '' });
      } else {
        reset({ name: '', description: '' });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      if (isEditing && initialData) {
        await updateBrand(initialData.id, data);
        toast.success('Brand updated successfully');
      } else {
        await createBrand(data);
        toast.success('Brand created successfully');
      }
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('error saving brand', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Brand Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Canon, HP" />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Brand'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
