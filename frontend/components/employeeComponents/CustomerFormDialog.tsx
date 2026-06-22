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
import { Loader2, User, Mail, Save, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';

import { Customer, CreateCustomerData } from '@/lib/customer';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null | undefined;
  onSubmit: (customerData: Partial<CreateCustomerData>) => Promise<void>;
}

const COUNTRY_CODES = [
  { code: '+974', flag: '🇶🇦', name: 'Qatar', native: 'قطر' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', native: 'الإمارات' },
  { code: '+91', flag: '🇮🇳', name: 'India', native: 'भारत' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', native: 'السعودية' },
  { code: '+968', flag: '🇴🇲', name: 'Oman', native: 'عُمان' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', native: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', native: 'البحرين' },
];

/**
 * Modal dialog for creating or editing customer profiles.
 * Handles form validation and pre-fills data when editing existing customers.
 */
export default function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+974');
  const [rawPhone, setRawPhone] = useState('');
  const [formData, setFormData] = useState<Partial<CreateCustomerData>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (customer) {
      // Map entity data to form data
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
      });

      if (customer.phone) {
        const cleaned = customer.phone.trim();
        const found = COUNTRY_CODES.find((c) => cleaned.startsWith(c.code));
        if (found) {
          setCountryCode(found.code);
          setRawPhone(cleaned.slice(found.code.length).trim());
        } else {
          const match = cleaned.match(/^(\+\d+)\s*(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setRawPhone(match[2]);
          } else {
            setCountryCode('+974');
            setRawPhone(cleaned);
          }
        }
      } else {
        setCountryCode('+974');
        setRawPhone('');
      }
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'ACTIVE',
      });
      setCountryCode('+974');
      setRawPhone('');
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof CreateCustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalPhone = rawPhone.trim() ? `${countryCode} ${rawPhone.trim()}` : '';
      await onSubmit({ ...formData, phone: finalPhone });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-card">
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
                  className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
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
                    className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Phone Number
                </Label>
                <div className="flex items-center h-12 rounded-xl bg-muted/50 border border-transparent focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-card focus-within:border-transparent transition-all overflow-hidden relative shadow-sm">
                  {/* Country Flag Selector */}
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-full border-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-0 shadow-none px-3 flex gap-1.5 items-center shrink-0 w-auto rounded-none rounded-l-xl data-[state=open]:bg-muted/50 transition-colors">
                      <span className="text-xl leading-none select-none">
                        {COUNTRY_CODES.find((c) => c.code === countryCode)?.flag || '🇶🇦'}
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border-none shadow-xl max-h-[300px]"
                      position="popper"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="cursor-pointer">
                          <div className="flex items-center gap-2 py-0.5">
                            <span className="text-lg">{c.flag}</span>
                            <span className="font-semibold text-foreground text-sm">
                              {c.name} {c.native ? `(${c.native})` : ''}
                            </span>
                            <span className="text-muted-foreground text-xs font-semibold ml-auto pr-4">
                              {c.code}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Vertical Divider */}
                  <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-800 shrink-0" />

                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder="5555 6666"
                    className="flex-1 h-full px-4 bg-transparent outline-none border-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                Full Address
              </Label>
              <div className="relative">
                <Input
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="Ex. 123 Building, Doha, Qatar"
                  className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pl-11"
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400 pl-11 relative text-left">
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

          <div className="p-8 bg-muted/50 flex items-center justify-between border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors"
            >
              Discard
            </button>
            <Button
              type="submit"
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg transition-all flex items-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
              {customer ? 'Update Profile' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
