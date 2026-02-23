'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { convertLead, Lead } from '@/lib/lead';
import { toast } from 'sonner';

interface LeadConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConverted: (customerId: string) => void;
}

/**
 * Dialog to convert a qualified Lead into a Customer.
 * Prompts for missing essential information (Name, Email, Phone) required for customer creation.
 */
export function LeadConversionDialog({
  open,
  onOpenChange,
  lead,
  onConverted,
}: LeadConversionDialogProps) {
  const [loading, setLoading] = useState(false);
  // State for potentially missing fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Pre-fill when lead changes
  // useEffect not strictly needed if we just use defaultValues, but for controlled:
  // We'll initialize state when the dialog opens or lead is set.
  // For simplicity, let's use key={} on the component or useEffect.
  // Let's use a neat trick: derived state or effect? Effect is safer for reset.
  // Actually, we can just use defaultValue if we don't need two-way binding with parent.
  // But we might want to edit lead's existing data if it's wrong?
  // Requirement: "frontend sends only missing fields".
  // So we should only ask for what's missing.

  const isNameMissing = !lead?.name;
  const isContactMissing = !lead?.email && !lead?.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);
    try {
      // Construct payload of MISSING or EDITABLE fields
      // Construct payload of MISSING or EDITABLE fields
      interface ConversionPayload {
        name?: string;
        email?: string;
        phone?: string;
      }
      const payload: ConversionPayload = {};
      if (isNameMissing || name) payload.name = name || lead.name;
      if (email) payload.email = email;
      if (phone) payload.phone = phone;

      // Simple validation
      if (!payload.name && !lead.name) {
        toast.error('Name is required');
        setLoading(false);
        return;
      }
      if (!payload.email && !payload.phone && !lead.email && !lead.phone) {
        toast.error('Email or Phone is required');
        setLoading(false);
        return;
      }

      const customerId = await convertLead(lead._id, payload);
      toast.success('Lead converted to customer!');
      onConverted(customerId);
      onOpenChange(false);
    } catch (error) {
      console.error('Conversion failed', error);
      toast.error('Failed to convert lead');
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  if (!lead.location || lead.location.trim() === '') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-bold">Validation Error</DialogTitle>
            <DialogDescription className="text-base text-foreground pt-4">
              Location is required before converting this lead to a customer.
              <br />
              <br />
              Please update the lead details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Customer Profile</DialogTitle>
          <DialogDescription>
            To create an invoice, we need a few more details to convert{' '}
            <b>{lead.name || 'this lead'}</b> into a customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name {isNameMissing && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="name"
              defaultValue={lead.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer Name"
              required={isNameMissing}
              disabled={!!lead.name && !isNameMissing} // Optional: allow editing even if present? User said "ask only missing". Let's enable editing for flexibility but default to disabled if present implies "don't ask".
              // Actually "Do not ask for fields already present" implies hiding or disabling.
              // Let's hide if present to reduce friction?
              // Or show as read-only. Read-only is better context.
              readOnly={!!lead.name}
              className={lead.name ? 'bg-slate-100' : ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={lead.email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              readOnly={!!lead.email}
              className={lead.email ? 'bg-slate-100' : ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              defaultValue={lead.phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 890"
              readOnly={!!lead.phone}
              className={lead.phone ? 'bg-slate-100' : ''}
            />
          </div>
          {isContactMissing && (
            <p className="text-xs text-amber-600 font-medium">
              Please provide at least one contact method.
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Converting...' : 'Continue to Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
