'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';

import { Customer, CreateCustomerData } from '@/lib/customer';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null | undefined;
  onSubmit: (customerData: Partial<CreateCustomerData>) => void;
}

export default function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateCustomerData>>({
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (customer) {
      // Map entity data to form data
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
      });
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof CreateCustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <User size={24} />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-primary tracking-tight">
                  {customer ? 'Update Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                  {customer
                    ? `Editing profile ID: ${customer.id}`
                    : 'Create a new customer profile'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 pt-4 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                Full Name
              </Label>
              <div className="relative">
                <Input
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="Ex. John Doe"
                  className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Phone Number
                </Label>
                <div className="relative">
                  <Input
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    placeholder="+1 234 567 890"
                    className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Account Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    handleSelectChange('status', val as 'ACTIVE' | 'INACTIVE')
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400 pl-11 relative text-left">
                    <div
                      className={`absolute left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${formData.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="ACTIVE" className="font-bold text-green-600">
                      ACTIVE
                    </SelectItem>
                    <SelectItem value="INACTIVE" className="font-bold text-red-600">
                      INACTIVE
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Discard
            </button>
            <Button
              type="submit"
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <Save size={18} />
              {customer ? 'Update Profile' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
