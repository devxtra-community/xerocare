'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react'; // For contextual help
import { ChartAccount } from '@/lib/finance/finance';

type AccountForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  type: ChartAccount['type'];
  isGroup: boolean; // "Summary Account" in ERP terms
  parentId: string | null;
  status: 'Active' | 'Inactive';
  isControlAccount: boolean; // Prevents manual entry
  currency: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (form: AccountForm) => void;
  mode?: 'create' | 'edit';
  initialData?: AccountForm;
  accounts: ChartAccount[];
};

export default function AddAccountDialog({
  open,
  onClose,
  onSave,
  mode = 'create',
  initialData,
  accounts,
}: Props) {
  const emptyForm = useMemo(
    () =>
      ({
        code: '',
        name: '',
        description: '',
        type: 'Asset' as const,
        isGroup: false,
        parentId: null,
        status: 'Active' as const,
        isControlAccount: false,
        currency: 'AED',
      }) as AccountForm,
    [],
  );

  const getInitialForm = useMemo(() => {
    if (open && mode === 'edit' && initialData) {
      return { ...initialData, parentId: initialData.parentId ?? null };
    }
    return emptyForm;
  }, [open, mode, initialData, emptyForm]);

  const [form, setForm] = useState<AccountForm>(getInitialForm);

  useEffect(() => {
    setForm(getInitialForm);
  }, [getInitialForm]);

  const handleCommit = () => {
    if (!form.code || !form.name) {
      alert('Account Code and Name are mandatory for ledger integrity.');
      return;
    }
    const finalPayload: AccountForm = {
      ...form,
      id: form.id || crypto.randomUUID(),
      parentId: form.isGroup ? null : form.parentId,
    };

    onSave(finalPayload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
        <DialogHeader className="bg-slate-50 p-6 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
            {mode === 'create' ? 'Define General Ledger Account' : 'Modify Account Configuration'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">
            Finance Module • 2026 Core Ledger
          </p>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          {/* Section 1: Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider">
              Identification
            </h3>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Account Code</Label>
              <Input
                placeholder="e.g., 1000, 2000"
                value={form.code}
                disabled={mode === 'edit'}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="bg-slate-50 border-slate-200 h-10 font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Account Name</Label>
              <Input
                placeholder="Official Ledger Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 border-slate-200"
              />
            </div>
          </div>

          {/* Section 2: Classification */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider">
              Classification
            </h3>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Nature/Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ChartAccount['type'] })}
              >
                <SelectTrigger className="h-10 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Currency Alignment</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger className="h-10 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 3: Hierarchy & Audit Controls */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Summary Account</Label>
                  <p className="text-[10px] text-blue-600 font-medium italic">
                    Non-posting group account
                  </p>
                </div>
                <Switch
                  checked={form.isGroup}
                  onCheckedChange={(v: boolean) => setForm({ ...form, isGroup: v, parentId: null })}
                />
              </div>

              {!form.isGroup && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Parent Group</Label>
                  <Select
                    value={form.parentId ?? ''}
                    onValueChange={(v) => setForm({ ...form, parentId: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Root" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {accounts
                        .filter((a: ChartAccount) => a.isGroup)
                        .map((a: ChartAccount) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5 flex items-center gap-1.5">
                  <Label className="text-xs font-bold">Control Account</Label>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <Switch
                  checked={form.isControlAccount}
                  onCheckedChange={(v: boolean) => setForm({ ...form, isControlAccount: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Label className="text-xs font-bold">Active Status</Label>
                <Switch
                  checked={form.status === 'Active'}
                  onCheckedChange={(v: boolean) =>
                    setForm({ ...form, status: v ? 'Active' : 'Inactive' })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 border-t flex flex-row justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-accent transition-colors"
          >
            Dismiss
          </Button>
          <Button
            onClick={handleCommit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest px-8 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            {mode === 'create' ? 'Initialize Account' : 'Commit Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
