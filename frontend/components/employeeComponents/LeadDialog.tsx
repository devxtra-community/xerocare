'use client';

import React, { useState, useEffect } from 'react';
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

export type Lead = {
  id: string;
  name: string;
  contact: string; // Phone/Email
  source: 'Website' | 'Instagram' | 'Whatsapp';
  product: string;
  status: 'New' | 'Contacted' | 'Follow-up' | 'Converted';
  priority: 'Hot' | 'Warm' | 'Cold';
};

type LeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Lead | null;
  onSave: (lead: Lead) => void;
};

const emptyLead: Lead = {
  id: '',
  name: '',
  contact: '',
  source: 'Website',
  product: '',
  status: 'New',
  priority: 'Warm',
};

export default function LeadDialog({ open, onOpenChange, initialData, onSave }: LeadDialogProps) {
  const [formData, setFormData] = useState<Lead>(emptyLead);

  useEffect(() => {
    if (open) {
      setFormData(initialData || { ...emptyLead, id: Math.random().toString(36).substr(2, 9) });
    }
  }, [open, initialData]);

  const handleChange = (field: keyof Lead, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Update Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="contact">Phone / Email</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                placeholder="+1 234 567 890"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={formData.source} onValueChange={(val) => handleChange('source', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product Interested</Label>
              <Input
                id="product"
                value={formData.product}
                onChange={(e) => handleChange('product', e.target.value)}
                placeholder="Product Name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
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
            <Button type="submit" className="bg-primary text-white">
              {initialData ? 'Update Lead' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
