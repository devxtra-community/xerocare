'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  totalPurchase: number;
  source: 'LEAD' | 'DIRECT';
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
};

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null | undefined;
  onSubmit: (customerData: Partial<Customer>) => void;
}

export default function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    source: 'DIRECT',
    totalPurchase: 0,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (customer) {
      setFormData({ ...customer });
    } else {
      // Reset form when opening in "Add" mode
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: 'DIRECT',
        totalPurchase: 0,
        status: 'ACTIVE',
      });
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Customer, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            {customer ? `Update Customer: ${customer.id}` : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Full Name
              </label>
              <Input
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Ex. John Doe"
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Email Address
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Phone Number
                </label>
                <Input
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+1 234 567 890"
                  className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Source
                </label>
                <Select
                  value={formData.source}
                  onValueChange={(val) => handleSelectChange('source', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT" className="font-medium text-emerald-600">
                      DIRECT
                    </SelectItem>
                    <SelectItem value="LEAD" className="font-medium text-purple-600">
                      LEAD
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleSelectChange('status', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE" className="font-medium text-green-600">
                      ACTIVE
                    </SelectItem>
                    <SelectItem value="INACTIVE" className="font-medium text-gray-500">
                      INACTIVE
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional: Allow editing Total Purchase if needed, but usually calculated. 
                Including it as manual override or initial value for now. */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Total Purchase (Lifetime Value)
              </label>
              <Input
                name="totalPurchase"
                type="number"
                value={formData.totalPurchase || 0}
                onChange={handleChange}
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white hover:bg-primary/90 font-bold px-8"
            >
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
