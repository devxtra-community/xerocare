'use client';

import React, { useEffect, useState } from 'react';
import { CreateLeadData, createLead, updateLead, Lead } from '@/lib/lead';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { User, Mail, Phone, Globe, FileText, Save } from 'lucide-react';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Lead | null;
  onSuccess: () => void;
}

export function LeadFormDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: LeadFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateLeadData & { notes: string }>({
    name: '',
    email: '',
    phone: '',
    source: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        source: initialData.source || '',
        notes: (initialData.metadata?.notes as string) || '',
      });
    } else {
      setFormData({ name: '', email: '', phone: '', source: '', notes: '' });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: CreateLeadData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        source: formData.source || undefined,
        metadata: formData.notes ? { notes: formData.notes } : undefined,
      };

      if (initialData) {
        await updateLead(initialData._id, payload);
        toast.success('Lead updated successfully');
      } else {
        await createLead(payload);
        toast.success('Lead created successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(initialData ? 'Failed to update lead' : 'Failed to create lead');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
                  {initialData ? 'Edit Lead' : 'Create New Lead'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                  {initialData ? 'Update lead details' : 'Add details for a new prospect'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 pt-4 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 pl-10"
                    placeholder="John Doe"
                    required
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 pl-10"
                    placeholder="john@example.com"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1"
                >
                  Phone Number
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 pl-10"
                    placeholder="+1 234 567 890"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="source"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1"
                >
                  Lead Source
                </Label>
                <div className="relative">
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="h-12 rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 pl-10"
                    placeholder="e.g. Website, Referral"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1"
              >
                Additional Notes
              </Label>
              <div className="relative">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="min-h-[100px] rounded-xl border-none bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 pl-10 pt-3"
                  placeholder="Interest, budget, potential for sale..."
                />
                <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
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
              disabled={loading}
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg disabled:opacity-70 transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {initialData ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);
