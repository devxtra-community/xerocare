'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, CreateLeadData } from '@/lib/lead';

type LeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Lead | null;
  onSave: (lead: CreateLeadData & { id?: string }) => Promise<void>;
};

const emptyLead: CreateLeadData = {
  name: '',
  email: '',
  phone: '',
  source: 'Website',
  metadata: {
    product: '',
    priority: 'Warm',
  },
};

export default function LeadDialog({ open, onOpenChange, initialData, onSave }: LeadDialogProps) {
  const [formData, setFormData] = useState<CreateLeadData>(emptyLead);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Lead['status']>('new');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          source: initialData.source || 'Website',
          metadata: initialData.metadata || { product: '', priority: 'Warm' },
        });
        setStatus(initialData.status);
      } else {
        setFormData(emptyLead);
        setStatus('new');
      }
    }
  }, [open, initialData]);

  const handleChange = (field: keyof CreateLeadData | 'product' | 'priority', value: string) => {
    if (field === 'product' || field === 'priority') {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        id: initialData?._id,
        status: status,
      } as unknown as CreateLeadData & { id?: string });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Update Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Lead Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={
                  ['Website', 'Instagram', 'Whatsapp'].includes(formData.source || '')
                    ? formData.source
                    : 'Other'
                }
                onValueChange={(val) => {
                  if (val === 'Other') {
                    handleChange('source', '');
                  } else {
                    handleChange('source', val);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {!['Website', 'Instagram', 'Whatsapp'].includes(formData.source || 'Website') && (
                <Input
                  className="mt-2"
                  placeholder="Enter source"
                  value={formData.source || ''}
                  onChange={(e) => handleChange('source', e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product Interested</Label>
              <Input
                id="product"
                value={(formData.metadata as { product?: string })?.product || ''}
                onChange={(e) => handleChange('product', e.target.value)}
                placeholder="Ex. Canon ImageRunner"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(val: Lead['status']) => setStatus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={(formData.metadata as { priority?: string })?.priority || 'Warm'}
                onValueChange={(val) => handleChange('priority', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update Lead' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
