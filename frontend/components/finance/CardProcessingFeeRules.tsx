'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Loader2, Power, Pencil, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { GCC_COUNTRIES, CARD_NETWORK_LABEL, CardNetwork } from '@/lib/payments/gccCards';

/**
 * Merchant card-processing agreements (MDR).
 *
 * Rates live here because they are negotiated, not universal: two banks in the same
 * country routinely charge different percentages, and the same bank charges a different
 * rate to two merchants. Nothing in this system infers a rate — if a card is charged and
 * no rule here matches it, the payment is refused rather than silently processed at 0%.
 */

interface FeeRule {
  id: string;
  branchId?: string | null;
  issuerCountry: string;
  issuerBank?: string | null;
  cardType?: string | null;
  cardNetwork?: string | null;
  ratePercent: number | string;
  fixedFee: number | string;
  minimumFee?: number | string | null;
  maximumFee?: number | string | null;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  priority: number;
  version: number;
  notes?: string | null;
}

const BLANK = {
  issuerCountry: 'AE',
  issuerBank: '',
  cardType: '',
  cardNetwork: '',
  ratePercent: '',
  fixedFee: '0',
  minimumFee: '',
  maximumFee: '',
  currency: 'AED',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  priority: '0',
  notes: '',
};

export default function CardProcessingFeeRules() {
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/b/card-fees/rules');
      setRules(res.data?.data ?? []);
    } catch {
      toast.error('Could not load card processing fee rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...BLANK });
    setOpen(true);
  };

  const openEdit = (r: FeeRule) => {
    setEditingId(r.id);
    setForm({
      issuerCountry: r.issuerCountry,
      issuerBank: r.issuerBank ?? '',
      cardType: r.cardType ?? '',
      cardNetwork: r.cardNetwork ?? '',
      ratePercent: String(r.ratePercent ?? ''),
      fixedFee: String(r.fixedFee ?? '0'),
      minimumFee: r.minimumFee == null ? '' : String(r.minimumFee),
      maximumFee: r.maximumFee == null ? '' : String(r.maximumFee),
      currency: r.currency,
      effectiveFrom: (r.effectiveFrom ?? '').slice(0, 10),
      effectiveTo: (r.effectiveTo ?? '').slice(0, 10),
      priority: String(r.priority ?? 0),
      notes: r.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (form.ratePercent === '' && form.fixedFee === '') {
      return toast.error('Enter a rate percent, a fixed fee, or both');
    }
    setSaving(true);
    try {
      const body = {
        issuerCountry: form.issuerCountry,
        issuerBank: form.issuerBank || null,
        cardType: form.cardType || null,
        cardNetwork: form.cardNetwork || null,
        ratePercent: Number(form.ratePercent || 0),
        fixedFee: Number(form.fixedFee || 0),
        minimumFee: form.minimumFee === '' ? null : Number(form.minimumFee),
        maximumFee: form.maximumFee === '' ? null : Number(form.maximumFee),
        currency: form.currency,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
        priority: Number(form.priority || 0),
        notes: form.notes || null,
      };
      if (editingId) await api.patch(`/b/card-fees/rules/${editingId}`, body);
      else await api.post('/b/card-fees/rules', body);
      toast.success(editingId ? 'Fee rule updated' : 'Fee rule created');
      setOpen(false);
      load();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save the fee rule';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (r: FeeRule) => {
    try {
      await api.delete(`/b/card-fees/rules/${r.id}`);
      toast.success('Fee rule retired');
      load();
    } catch {
      toast.error('Could not retire the fee rule');
    }
  };

  const wildcard = (v?: string | null) => (v ? v : <span className="text-slate-300">Any</span>);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-800">
            <CreditCard size={20} className="text-indigo-600" />
            Card Processing Fees
          </h1>
          <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
            The commission your acquirer charges on card payments, per your own merchant agreement.
            Blank fields match anything — the most specific matching rule wins. A card with no
            matching rule is refused at the till rather than charged a guessed rate.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus size={15} className="mr-1" /> New Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Info size={22} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-600">No fee rules configured yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Until a rule exists, card payments cannot be recorded — the system will not invent a
            rate. Add your acquirer&apos;s agreed rates to start accepting cards.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-left">Issuing Bank</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Network</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Fixed</th>
                <th className="px-3 py-2 text-right">Min / Max</th>
                <th className="px-3 py-2 text-left">Currency</th>
                <th className="px-3 py-2 text-left">Effective</th>
                <th className="px-3 py-2 text-center">Prio</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className={r.isActive ? '' : 'bg-slate-50/70 text-slate-400'}>
                  <td className="px-3 py-2 font-bold">{r.issuerCountry}</td>
                  <td className="px-3 py-2">{wildcard(r.issuerBank)}</td>
                  <td className="px-3 py-2">{wildcard(r.cardType)}</td>
                  <td className="px-3 py-2">{wildcard(r.cardNetwork)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {Number(r.ratePercent)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Number(r.fixedFee)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {r.minimumFee != null ? Number(r.minimumFee) : '—'} /{' '}
                    {r.maximumFee != null ? Number(r.maximumFee) : '—'}
                  </td>
                  <td className="px-3 py-2">{r.currency}</td>
                  <td className="px-3 py-2 text-xs">
                    {(r.effectiveFrom ?? '').slice(0, 10)}
                    {r.effectiveTo ? ` → ${r.effectiveTo.slice(0, 10)}` : ''}
                  </td>
                  <td className="px-3 py-2 text-center">{r.priority}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        r.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {r.isActive ? 'ACTIVE' : 'RETIRED'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil size={13} />
                      </Button>
                      {r.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => deactivate(r)}>
                          <Power size={13} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Fee Rule' : 'New Fee Rule'}</DialogTitle>
            <DialogDescription className="text-xs">
              Leave a field blank to make it match anything. Editing a rule bumps its version —
              payments already taken keep the rate they were charged under.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Issuer Country *</Label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.issuerCountry}
                onChange={(e) => {
                  const c = GCC_COUNTRIES.find((x) => x.code === e.target.value);
                  setForm((f) => ({
                    ...f,
                    issuerCountry: e.target.value,
                    currency: c?.currency ?? f.currency,
                  }));
                }}
              >
                {GCC_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Settlement Currency *</Label>
              <Input
                className="mt-1"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <Label className="text-xs">Issuing Bank</Label>
              <Input
                className="mt-1"
                placeholder="Any bank"
                value={form.issuerBank}
                onChange={(e) => setForm((f) => ({ ...f, issuerBank: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Card Type</Label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.cardType}
                onChange={(e) => setForm((f) => ({ ...f, cardType: e.target.value }))}
              >
                <option value="">Any</option>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Card Network</Label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.cardNetwork}
                onChange={(e) => setForm((f) => ({ ...f, cardNetwork: e.target.value }))}
              >
                <option value="">Any</option>
                {(Object.keys(CARD_NETWORK_LABEL) as CardNetwork[]).map((n) => (
                  <option key={n} value={n}>
                    {CARD_NETWORK_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Rate Percent (MDR) *</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.0001"
                placeholder="e.g. 2.25"
                value={form.ratePercent}
                onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Fixed Fee per Transaction</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.001"
                value={form.fixedFee}
                onChange={(e) => setForm((f) => ({ ...f, fixedFee: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Input
                className="mt-1"
                type="number"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Minimum Fee</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.001"
                placeholder="No floor"
                value={form.minimumFee}
                onChange={(e) => setForm((f) => ({ ...f, minimumFee: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Maximum Fee (cap)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.001"
                placeholder="No cap"
                value={form.maximumFee}
                onChange={(e) => setForm((f) => ({ ...f, maximumFee: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Effective From *</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Effective To</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.effectiveTo}
                onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes (agreement reference)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Acquirer contract #A-2026-114"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-1 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
