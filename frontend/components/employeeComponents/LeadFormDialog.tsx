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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { User, Mail, Phone, Globe, MapPin, FileText, Save, Loader2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_PHONE_OPTIONS,
  applyDialCode,
  countryFromPhone,
  dialCodeFor,
} from '@/lib/countryOptions';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Lead | null;
  onSuccess: () => void;
}

const PRESET_SOURCES = ['Website', 'Instagram', 'Whatsapp'];

/** Shared look for every control in the form, so nothing drifts field to field. */
const CONTROL =
  'h-12 rounded-xl border border-transparent bg-muted/60 text-sm shadow-none transition-colors hover:bg-muted focus-visible:bg-card focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0';
const CONTROL_ICON = cn(CONTROL, 'pl-11');
const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1';

/**
 * Wraps a single control with its leading icon. Each control gets its own
 * wrapper so the icon is centred on that control alone — a shared wrapper
 * mis-centres the icon as soon as a cell holds two stacked inputs.
 */
function IconControl({
  icon: Icon,
  align = 'center',
  children,
}: {
  icon: React.ElementType;
  align?: 'center' | 'start';
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <Icon
        className={cn(
          'pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground',
          align === 'center' ? 'top-1/2 -translate-y-1/2' : 'top-4',
        )}
      />
    </div>
  );
}

function Field({
  htmlFor,
  label,
  required,
  hint,
  className,
  children,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2 pr-1">
        <Label htmlFor={htmlFor} className={LABEL}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-[10px] font-medium text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Comprehensive form dialog for adding or editing lead information.
 * Features fields for personal details, source tracking, and additional notes.
 */
export function LeadFormDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: LeadFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('');
  const [formData, setFormData] = useState<CreateLeadData & { notes: string }>({
    name: '',
    email: '',
    phone: '',
    source: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      const phone = initialData.phone || '';
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone,
        source: initialData.source || '',
        location: initialData.location || '',
        notes: (initialData.metadata?.notes as string) || '',
      });
      // Prefer the country captured at creation; fall back to reading the
      // dialling code off the stored number for leads saved before that.
      setCountry((initialData.metadata?.country as string) || countryFromPhone(phone));
    } else {
      setFormData({ name: '', email: '', phone: '', source: '', location: '', notes: '' });
      setCountry('');
    }
  }, [initialData, open]);

  const dialCode = dialCodeFor(country);
  const isCustomSource = !PRESET_SOURCES.includes(formData.source || '');

  const handleCountryChange = (iso2: string) => {
    setCountry(iso2);
    setFormData((prev) => ({ ...prev, phone: applyDialCode(prev.phone || '', dialCodeFor(iso2)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // A country picked without a number leaves just the dialling code behind,
      // which is not a phone number worth storing.
      const phone = (formData.phone || '').trim();
      const hasNumber = phone !== '' && phone !== dialCode;

      const metadata: Record<string, unknown> = { ...(initialData?.metadata ?? {}) };
      if (formData.notes) metadata.notes = formData.notes;
      else delete metadata.notes;
      if (country) metadata.country = country;
      else delete metadata.country;

      const payload: CreateLeadData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: hasNumber ? phone : undefined,
        source: formData.source || undefined,
        location: formData.location || undefined,
        metadata: Object.keys(metadata).length ? metadata : undefined,
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
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-card">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <User size={22} />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {initialData ? 'Edit Lead' : 'Create New Lead'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground">
                  {initialData ? 'Update lead details' : 'Add details for a new prospect'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-6 overflow-y-auto p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field htmlFor="name" label="Full Name" required>
                <IconControl icon={User}>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={CONTROL_ICON}
                    placeholder="John Doe"
                    required
                  />
                </IconControl>
              </Field>

              <Field htmlFor="email" label="Email Address">
                <IconControl icon={Mail}>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={CONTROL_ICON}
                    placeholder="john@example.com"
                  />
                </IconControl>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Country" hint="Sets the dial code">
                <IconControl icon={Flag}>
                  <SearchableSelect
                    options={COUNTRY_PHONE_OPTIONS}
                    value={country}
                    onValueChange={handleCountryChange}
                    placeholder="Select country"
                    emptyText="No country found."
                    className={cn(CONTROL_ICON, 'w-full justify-between bg-muted/60')}
                  />
                </IconControl>
              </Field>

              <Field htmlFor="phone" label="Phone Number">
                <IconControl icon={Phone}>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={CONTROL_ICON}
                    placeholder={dialCode ? `${dialCode} 50 123 4567` : 'Select a country first'}
                  />
                </IconControl>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field htmlFor="source" label="Lead Source">
                <div className="space-y-2">
                  <IconControl icon={Globe}>
                    <Select
                      value={isCustomSource ? 'Other' : formData.source}
                      onValueChange={(val) =>
                        setFormData({ ...formData, source: val === 'Other' ? '' : val })
                      }
                    >
                      <SelectTrigger className={cn(CONTROL_ICON, 'w-full')}>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_SOURCES.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </IconControl>

                  {isCustomSource && (
                    <IconControl icon={Globe}>
                      <Input
                        id="source"
                        value={formData.source || ''}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        className={CONTROL_ICON}
                        placeholder="Enter custom source"
                      />
                    </IconControl>
                  )}
                </div>
              </Field>

              <Field htmlFor="location" label="Location">
                <IconControl icon={MapPin}>
                  <Input
                    id="location"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={CONTROL_ICON}
                    placeholder="City, Country"
                  />
                </IconControl>
              </Field>
            </div>

            <Field htmlFor="notes" label="Additional Notes">
              <IconControl icon={FileText} align="start">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className={cn(
                    CONTROL,
                    'min-h-[110px] resize-y py-3.5 pl-11 leading-relaxed h-auto',
                  )}
                  placeholder="Interest, budget, potential for sale..."
                />
              </IconControl>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/40 px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Discard
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="flex h-12 items-center gap-2 rounded-xl px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-70"
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
