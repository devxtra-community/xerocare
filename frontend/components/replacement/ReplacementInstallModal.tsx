'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Gauge, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  getReplacement,
  getReplacementLastReading,
  installReplacement,
  type ReplacementDetail,
  type MeterReading,
} from '@/lib/replacement';

/**
 * Stage 06 — the technician's job sheet, and the only place the machine actually
 * changes on the contract.
 *
 * Both meters are captured together because they are two halves of one boundary: the
 * outgoing unit's closing count ends its billing, the incoming unit's opening count
 * starts the next. Submitting writes both DeviceMeterReading rows and swaps the
 * allocation in a single server-side transaction.
 */

interface Props {
  requestId: string;
  onClose: () => void;
  onDone: () => void;
}

const COUNTERS = [
  ['bwA4', 'B&W A4'],
  ['bwA3', 'B&W A3'],
  ['colorA4', 'Colour A4'],
  ['colorA3', 'Colour A3'],
] as const;

type CounterKey = (typeof COUNTERS)[number][0];

export function ReplacementInstallModal({ requestId, onClose, onDone }: Props) {
  const [detail, setDetail] = useState<ReplacementDetail | null>(null);
  const [floor, setFloor] = useState<MeterReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [oldMeter, setOldMeter] = useState<Record<CounterKey, string>>({
    bwA4: '',
    bwA3: '',
    colorA4: '',
    colorA3: '',
  });
  const [newMeter, setNewMeter] = useState<Record<CounterKey, string>>({
    bwA4: '0',
    bwA3: '0',
    colorA4: '0',
    colorA3: '0',
  });
  const [installedOn, setInstalledOn] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, f] = await Promise.all([
          getReplacement(requestId),
          getReplacementLastReading(requestId),
        ]);
        if (cancelled) return;
        setDetail(d);
        setFloor(f);
        // Seed the closing meter from the machine's last known reading — the technician
        // types the real figure over it, but starting from the floor makes an accidental
        // under-read obvious rather than silent.
        setOldMeter({
          bwA4: String(f.bwA4),
          bwA3: String(f.bwA3),
          colorA4: String(f.colorA4),
          colorA3: String(f.colorA3),
        });
      } catch (err) {
        toast.error('Failed to load the job', { description: getApiErrorMessage(err) });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, onClose]);

  /** Per-counter floor breach — the same rule the server enforces, surfaced early. */
  const belowFloor = (k: CounterKey) =>
    floor !== null && oldMeter[k] !== '' && Number(oldMeter[k]) < floor[k];

  const anyBelowFloor = COUNTERS.some(([k]) => belowFloor(k));
  const allFilled = COUNTERS.every(([k]) => oldMeter[k] !== '' && newMeter[k] !== '');

  const submit = async () => {
    if (!allFilled || anyBelowFloor) return;
    setSaving(true);
    try {
      await installReplacement(requestId, {
        oldMeter: {
          bwA4: Number(oldMeter.bwA4),
          bwA3: Number(oldMeter.bwA3),
          colorA4: Number(oldMeter.colorA4),
          colorA3: Number(oldMeter.colorA3),
        },
        newMeter: {
          bwA4: Number(newMeter.bwA4),
          bwA3: Number(newMeter.bwA3),
          colorA4: Number(newMeter.colorA4),
          colorA3: Number(newMeter.colorA3),
        },
        installedOn,
        photos,
      });
      toast.success('Replacement installed — the contract now bills on the new machine');
      onDone();
      onClose();
    } catch (err) {
      toast.error('Could not complete the install', { description: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const r = detail?.request;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Record Replacement Install</DialogTitle>

        <div className="bg-white p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Gauge size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Record Replacement Install
              </p>
              <p className="text-base font-black text-slate-800">
                {r?.requestNo ?? '…'} · {r?.customerName ?? ''}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-700">
                  Removing
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {r?.oldSerialNumber}
                </p>
                <p className="text-[11px] text-slate-500">{detail?.oldProduct?.name}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
                  Installing
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {r?.newSerialNumber}
                </p>
                <p className="text-[11px] text-slate-500">{detail?.newProduct?.name}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Installation date
              </Label>
              <Input
                type="date"
                value={installedOn}
                onChange={(e) => setInstalledOn(e.target.value)}
                className="h-10 text-sm font-bold"
              />
              <p className="text-[11px] text-slate-400">
                This date sets the billing boundary between the two machines.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Counter
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-widest text-red-600">
                      Old — closing
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-widest text-emerald-700">
                      New — opening
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COUNTERS.map(([key, label]) => (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {label}
                        {floor && (
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            last {floor[key].toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={oldMeter[key]}
                          onChange={(e) => setOldMeter((m) => ({ ...m, [key]: e.target.value }))}
                          className={`h-9 text-right font-mono text-sm tabular-nums ${
                            belowFloor(key) ? 'border-red-400 bg-red-50' : ''
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={newMeter[key]}
                          onChange={(e) => setNewMeter((m) => ({ ...m, [key]: e.target.value }))}
                          className="h-9 text-right font-mono text-sm tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {anyBelowFloor && (
              <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <p className="text-[12px] leading-relaxed text-red-800">
                  A closing reading is below what this machine was last recorded at. A meter cannot
                  run backwards — check the figure before submitting.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Meter photos (optional)
              </Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                className="text-xs"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-xs font-black"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!allFilled || anyBelowFloor || saving}
            className="h-9 bg-primary text-xs font-black text-white hover:bg-primary/90"
          >
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Complete Replacement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
