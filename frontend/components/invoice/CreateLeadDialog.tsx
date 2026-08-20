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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { COUNTRY_PHONE_OPTIONS, dialCodeFor, isoToFlag } from '@/lib/countryOptions';
import { Loader2 } from 'lucide-react';
import { createLead, Lead } from '@/lib/lead';
import { toast } from 'sonner';

/** Fallback country when the branch has none — keeps the previous +974 default. */
const DEFAULT_COUNTRY = 'QA';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: Lead) => void;
}

/**
 * Dialog to dynamically create a new Lead.
 * Captures Name, Email, Phone, and Location.
 */
export function CreateLeadDialog({ open, onOpenChange, onCreated }: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [rawPhone, setRawPhone] = useState('');
  const [location, setLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialCode = dialCodeFor(country);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Lead Name is required');
      return;
    }

    if (!location.trim()) {
      setErrorMessage('Location is required to enable quotation/invoice conversion');
      return;
    }

    setLoading(true);
    try {
      const dialCode = dialCodeFor(country);
      const finalPhone = rawPhone.trim()
        ? `${dialCode ? `${dialCode} ` : ''}${rawPhone.trim()}`.trim()
        : undefined;
      const newLead = await createLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: finalPhone,
        location: location.trim(),
        status: 'new',
      });

      toast.success(`Lead "${name}" created successfully!`);

      // Reset form states
      setName('');
      setEmail('');
      setCountry(DEFAULT_COUNTRY);
      setRawPhone('');
      setLocation('');
      setErrorMessage(null);

      // Callback with the newly created lead
      onCreated(newLead);
      onOpenChange(false);
    } catch (error: unknown) {
      console.warn('Failed to create lead:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to create lead. Please check inputs.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-6 rounded-2xl border-none shadow-2xl bg-background">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
            Register a prospect on the fly
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div className="flex-1 leading-normal">{errorMessage}</div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="lead-name" className="text-xs font-bold text-slate-500 uppercase">
              Lead Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lead-name"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="h-10 px-3 rounded-xl border-slate-200 focus-visible:ring-primary/20"
              required
            />
          </div>

          {/*
            Country comes before the number: the dial-code prefix shown inside the
            phone box is derived from it, so it has to be picked first.
          */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase">Country</Label>
            <SearchableSelect
              options={COUNTRY_PHONE_OPTIONS}
              value={country}
              onValueChange={setCountry}
              placeholder="Select country"
              emptyText="No country found."
              disabled={loading}
              className="h-10 w-full justify-between rounded-xl border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone" className="text-xs font-bold text-slate-500 uppercase">
                Phone Number
              </Label>
              <div className="flex items-center h-10 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden relative bg-white">
                <div className="flex items-center gap-1.5 h-full px-2.5 shrink-0 select-none">
                  {country && <span className="text-lg leading-none">{isoToFlag(country)}</span>}
                  <span className="text-xs font-semibold text-slate-500">{dialCode || '+--'}</span>
                </div>

                <div className="h-5 w-[1px] bg-slate-200 shrink-0" />

                <input
                  id="lead-phone"
                  type="tel"
                  value={rawPhone}
                  onChange={(e) => setRawPhone(e.target.value)}
                  placeholder={dialCode ? '5555 1234' : 'select country first'}
                  disabled={loading}
                  className="flex-1 h-full px-3 bg-transparent outline-none border-none text-xs text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email" className="text-xs font-bold text-slate-500 uppercase">
                Email Address
              </Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="e.g. contact@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 px-3 rounded-xl border-slate-200 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-location" className="text-xs font-bold text-slate-500 uppercase">
              Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lead-location"
              placeholder="e.g. Doha, Qatar (Required for Quotations)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
              className="h-10 px-3 rounded-xl border-slate-200 focus-visible:ring-primary/20"
              required
            />
            <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
              Entering the location now ensures immediate and seamless conversion to customer status
              during quotation creation.
            </p>
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold px-4"
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 rounded-xl bg-primary text-white hover:bg-primary/95 shadow-md hover:shadow-lg transition-all font-bold px-5 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
