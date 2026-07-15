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
import { Loader2, User, Mail, Save, MapPin, Plus, Star, Trash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

import { Customer, CreateCustomerData, CustomerBankAccount } from '@/lib/customer';
import { getCountryDataList } from 'countries-list';
import { State } from 'country-state-city';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null | undefined;
  onSubmit: (customerData: Partial<CreateCustomerData>) => Promise<void>;
}

const ALL_COUNTRIES = getCountryDataList();

/** ISO2 → flag emoji via regional indicator symbols. */
const isoToFlag = (iso2: string) =>
  iso2.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));

// Sorted by name so scrolling matches alphabetical expectation; string labels keep
// the SearchableSelect text filter working (it matches on the label).
const COUNTRY_OPTIONS: SearchableSelectOption[] = [...ALL_COUNTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => ({
    value: c.iso2,
    label: `${isoToFlag(c.iso2)} ${c.name} (${c.iso2})`,
  }));

/** Dial code for an ISO2 country, e.g. "QA" → "+974". */
const dialCodeForCountry = (iso2?: string | null) => {
  if (!iso2) return undefined;
  const country = ALL_COUNTRIES.find((c) => c.iso2 === iso2);
  return country?.phone?.length ? `+${country.phone[0]}` : undefined;
};

const BLANK_BANK: CustomerBankAccount = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  accountType: undefined,
  routingNumber: '',
  swiftCode: '',
  iban: '',
  address: '',
  isPrimary: false,
};

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
  // Dial code parsed from an existing phone; used only when no country is selected.
  const [parsedDial, setParsedDial] = useState<string | null>(null);
  const [rawPhone, setRawPhone] = useState('');
  const [addingBank, setAddingBank] = useState(false);
  const [bankDraft, setBankDraft] = useState<CustomerBankAccount>({ ...BLANK_BANK });
  const [bankAccounts, setBankAccounts] = useState<CustomerBankAccount[]>([]);
  const [formData, setFormData] = useState<Partial<CreateCustomerData>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'ACTIVE',
    stateProvince: '',
  });

  useEffect(() => {
    setAddingBank(false);
    setBankDraft({ ...BLANK_BANK });
    if (customer) {
      // Map entity data to form data
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
        vatNumber: customer.vatNumber ?? undefined,
        country: customer.country ?? undefined,
        stateProvince: customer.stateProvince ?? undefined,
      });

      // Prefer the structured list; fall back to the legacy flat pair.
      if (customer.bankAccounts && customer.bankAccounts.length > 0) {
        setBankAccounts(customer.bankAccounts);
      } else if (customer.bankName || customer.bankAccountNumber) {
        setBankAccounts([
          {
            ...BLANK_BANK,
            bankName: customer.bankName || '',
            accountHolderName: customer.name,
            accountNumber: customer.bankAccountNumber || '',
            isPrimary: true,
          },
        ]);
      } else {
        setBankAccounts([]);
      }

      if (customer.phone) {
        const cleaned = customer.phone.trim();
        const match = cleaned.match(/^(\+\d+)\s*(.*)$/);
        if (match) {
          setParsedDial(match[1]);
          setRawPhone(match[2]);
        } else {
          setParsedDial(null);
          setRawPhone(cleaned);
        }
      } else {
        setParsedDial(null);
        setRawPhone('');
      }
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'ACTIVE',
        stateProvince: '',
      });
      setBankAccounts([]);
      setParsedDial(null);
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

  // The phone dial code is derived from the selected country.
  const handleCountryChange = (iso2: string) => {
    setFormData((prev) => ({ ...prev, country: iso2, stateProvince: '' }));
  };

  const addBankAccount = () => {
    if (!bankDraft.bankName || !bankDraft.accountNumber || !bankDraft.accountHolderName) {
      toast.error('Bank name, account holder name and account number are required');
      return;
    }
    const newAccounts = bankDraft.isPrimary
      ? bankAccounts.map((a) => ({ ...a, isPrimary: false }))
      : [...bankAccounts];
    setBankAccounts([...newAccounts, { ...bankDraft }]);
    setBankDraft({ ...BLANK_BANK });
    setAddingBank(false);
  };

  const removeBankAccount = (idx: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== idx));
  };

  const setPrimary = (idx: number) => {
    setBankAccounts((prev) => prev.map((a, i) => ({ ...a, isPrimary: i === idx })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-commit the bank draft if the inline form is open and has any data.
    let finalBankAccounts = bankAccounts;
    const draftHasData =
      bankDraft.bankName || bankDraft.accountHolderName || bankDraft.accountNumber;
    if (addingBank && draftHasData) {
      if (!bankDraft.bankName || !bankDraft.accountHolderName || !bankDraft.accountNumber) {
        toast.error(
          'Please complete the bank account details (Bank Name, Account Holder Name, Account Number) or cancel the bank form before saving',
        );
        return;
      }
      const existingAccounts = bankDraft.isPrimary
        ? bankAccounts.map((a) => ({ ...a, isPrimary: false }))
        : [...bankAccounts];
      finalBankAccounts = [...existingAccounts, { ...bankDraft }];
    }

    setLoading(true);
    try {
      const finalPhone = rawPhone.trim()
        ? dialCode
          ? `${dialCode} ${rawPhone.trim()}`
          : rawPhone.trim()
        : '';
      // Keep the legacy flat pair in sync with the primary (or first) account.
      const primary = finalBankAccounts.find((a) => a.isPrimary) || finalBankAccounts[0];
      await onSubmit({
        ...formData,
        phone: finalPhone,
        bankAccounts: finalBankAccounts,
        bankName: primary?.bankName || '',
        bankAccountNumber: primary?.accountNumber || '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Country selection drives the dial code; an existing phone's prefix is the fallback.
  const dialCode = dialCodeForCountry(formData.country) || parsedDial;

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
                  Country
                </Label>
                <SearchableSelect
                  options={COUNTRY_OPTIONS}
                  value={formData.country ?? ''}
                  onValueChange={handleCountryChange}
                  placeholder="Select country"
                  emptyText="No country found."
                  className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Phone Number
                </Label>
                <div className="flex items-center h-12 rounded-xl bg-muted/50 border border-transparent focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-card focus-within:border-transparent transition-all overflow-hidden relative shadow-sm">
                  {/* Dial-code prefix — derived from the selected country */}
                  <div className="flex items-center gap-1.5 px-3 h-full bg-blue-50 border-r border-blue-100 shrink-0 min-w-[64px] justify-center">
                    {formData.country && (
                      <span className="text-base leading-none select-none">
                        {isoToFlag(formData.country)}
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-blue-600 whitespace-nowrap select-none">
                      {dialCode || '+--'}
                    </span>
                  </div>

                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder={dialCode ? '5555 6666' : 'select country first'}
                    className="flex-1 h-full px-4 bg-transparent outline-none border-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {formData.country &&
                (() => {
                  const states = State.getStatesOfCountry(formData.country);
                  const label =
                    formData.country === 'AE'
                      ? 'Emirate'
                      : ['US', 'IN', 'AU', 'MX', 'BR'].includes(formData.country)
                        ? 'State'
                        : formData.country === 'CA'
                          ? 'Province'
                          : 'City / District';
                  return (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                        {label}
                      </Label>
                      {states.length > 0 ? (
                        <Select
                          value={formData.stateProvince ?? ''}
                          onValueChange={(val) => handleSelectChange('stateProvince', val)}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                            <SelectValue placeholder={`Select ${label}`} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-xl max-h-64">
                            {states.map((s) => (
                              <SelectItem key={s.isoCode} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          name="stateProvince"
                          value={formData.stateProvince ?? ''}
                          onChange={handleChange}
                          placeholder={`Enter ${label}`}
                          className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                        />
                      )}
                    </div>
                  );
                })()}
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
                  VAT Number
                </Label>
                <Input
                  name="vatNumber"
                  value={formData.vatNumber ?? ''}
                  onChange={handleChange}
                  placeholder="Tax registration / VAT No."
                  className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
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

            {/* Bank Accounts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Bank Accounts ({bankAccounts.length})
                </Label>
                {!addingBank && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 border-blue-200 text-blue-700"
                    onClick={() => {
                      setAddingBank(true);
                      setBankDraft({ ...BLANK_BANK });
                    }}
                  >
                    <Plus className="h-3 w-3" /> Add Bank Account
                  </Button>
                )}
              </div>

              {/* Existing bank accounts list */}
              {bankAccounts.length > 0 && (
                <div className="space-y-2">
                  {bankAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${acc.isPrimary ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-card'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{acc.bankName}</span>
                          {acc.isPrimary && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">{acc.accountHolderName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-mono text-gray-600">{acc.accountNumber}</p>
                          {acc.accountType && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                              {acc.accountType}
                            </span>
                          )}
                        </div>
                        {(acc.swiftCode || acc.iban || acc.address) && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {acc.swiftCode && `SWIFT: ${acc.swiftCode}`}
                            {acc.iban && ` • IBAN: ${acc.iban}`}
                            {acc.address && ` • ${acc.address}`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {!acc.isPrimary && (
                          <button
                            type="button"
                            title="Set as primary"
                            onClick={() => setPrimary(idx)}
                            className="p-1 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeBankAccount(idx)}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add bank account inline form */}
              {addingBank && (
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-3">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    New Bank Account
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Bank Name *
                      </label>
                      <Input
                        placeholder="e.g. QNB"
                        value={bankDraft.bankName}
                        onChange={(e) => setBankDraft((d) => ({ ...d, bankName: e.target.value }))}
                        className="h-9 text-sm rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Account Holder *
                      </label>
                      <Input
                        placeholder="Full name on account"
                        value={bankDraft.accountHolderName}
                        onChange={(e) =>
                          setBankDraft((d) => ({ ...d, accountHolderName: e.target.value }))
                        }
                        className="h-9 text-sm rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Account Number *
                      </label>
                      <Input
                        placeholder="Account number"
                        value={bankDraft.accountNumber}
                        onChange={(e) =>
                          setBankDraft((d) => ({ ...d, accountNumber: e.target.value }))
                        }
                        className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Account Type
                      </label>
                      <Select
                        value={bankDraft.accountType || ''}
                        onValueChange={(v) =>
                          setBankDraft((d) => ({
                            ...d,
                            accountType: v as CustomerBankAccount['accountType'],
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-sm rounded-lg bg-card border-none shadow-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Savings Account">Savings Account</SelectItem>
                          <SelectItem value="Current Account">Current Account</SelectItem>
                          <SelectItem value="Business Account">Business Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        SWIFT / BIC
                      </label>
                      <Input
                        placeholder="e.g. QNBAQAQA"
                        value={bankDraft.swiftCode || ''}
                        onChange={(e) => setBankDraft((d) => ({ ...d, swiftCode: e.target.value }))}
                        className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">IBAN</label>
                      <Input
                        placeholder="IBAN (if applicable)"
                        value={bankDraft.iban || ''}
                        onChange={(e) => setBankDraft((d) => ({ ...d, iban: e.target.value }))}
                        className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Address
                      </label>
                      <Input
                        placeholder="Bank address"
                        value={bankDraft.address || ''}
                        onChange={(e) => setBankDraft((d) => ({ ...d, address: e.target.value }))}
                        className="h-9 text-sm rounded-lg bg-card border-none shadow-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!bankDraft.isPrimary}
                          onChange={(e) =>
                            setBankDraft((d) => ({ ...d, isPrimary: e.target.checked }))
                          }
                          className="rounded"
                        />
                        <span className="text-xs font-semibold text-gray-600">
                          Set as primary account
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={addBankAccount}
                    >
                      Add Account
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setAddingBank(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
