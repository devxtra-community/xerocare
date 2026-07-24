'use client';

import { useState } from 'react';
import { Ship, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Lot,
  TransportMode,
  TRANSPORT_MODE_LABELS,
  MODE_DETAIL_FIELDS,
  ShipmentStatus,
  SHIPMENT_STATUS_LABELS,
  lotService,
} from '@/lib/lot';

const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING_DISPATCH]:
    'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400',
  [ShipmentStatus.IN_TRANSIT]:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  [ShipmentStatus.CUSTOMS_CLEARANCE]:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  [ShipmentStatus.ARRIVED]:
    'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400',
  [ShipmentStatus.RELEASED]:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
};

interface ShipmentInfoCardProps {
  lot: Lot;
  onUpdated: (lot: Lot) => void;
}

/**
 * Shipment/logistics info for a lot — transport mode, carrier, dispatch/arrival
 * dates, shipment status, and mode-specific fields (vessel/BL# for sea,
 * airline/AWB# for air, vehicle/LR# for road, ...). Editable any number of
 * times as the shipment progresses; independent of the receiving workflow.
 */
export default function ShipmentInfoCard({ lot, onUpdated }: ShipmentInfoCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<TransportMode | ''>('');
  const [carrierName, setCarrierName] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [actualArrival, setActualArrival] = useState('');
  const [status, setStatus] = useState<ShipmentStatus | ''>('');
  const [details, setDetails] = useState<Record<string, string>>({});

  const openEdit = () => {
    setMode(lot.transportMode || '');
    setCarrierName(lot.carrierName || '');
    setDispatchDate(lot.dispatchDate?.slice(0, 10) || '');
    setEstimatedArrival(lot.estimatedArrival?.slice(0, 10) || '');
    setActualArrival(lot.actualArrival?.slice(0, 10) || '');
    setStatus(lot.shipmentStatus || '');
    setDetails(lot.shipmentDetails || {});
    setOpen(true);
  };

  const handleModeChange = (value: string) => {
    setMode(value as TransportMode);
    setDetails({});
  };

  const handleSave = async () => {
    if (!mode) {
      toast.error('Select a transport mode');
      return;
    }
    setSaving(true);
    try {
      const updated = await lotService.updateShipment(lot.id, {
        transportMode: mode,
        carrierName: carrierName.trim() || undefined,
        dispatchDate: dispatchDate || undefined,
        estimatedArrival: estimatedArrival || undefined,
        actualArrival: actualArrival || undefined,
        shipmentStatus: status || undefined,
        shipmentDetails: details,
      });
      onUpdated(updated);
      toast.success('Shipment info updated');
      setOpen(false);
    } catch (err) {
      console.error('Failed to update shipment info:', err);
      toast.error('Failed to update shipment info');
    } finally {
      setSaving(false);
    }
  };

  const detailFields = mode ? MODE_DETAIL_FIELDS[mode] : [];
  const hasShipmentInfo = !!lot.transportMode;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ship className="h-4 w-4" />
            Shipment Information
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {hasShipmentInfo ? 'Edit' : 'Add'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!hasShipmentInfo ? (
            <p className="text-muted-foreground">No shipment info recorded yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{TRANSPORT_MODE_LABELS[lot.transportMode!]}</Badge>
                {lot.shipmentStatus && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SHIPMENT_STATUS_COLORS[lot.shipmentStatus]}`}
                  >
                    {SHIPMENT_STATUS_LABELS[lot.shipmentStatus]}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {lot.carrierName && (
                  <div>
                    <div className="text-xs text-muted-foreground">Carrier</div>
                    <div>{lot.carrierName}</div>
                  </div>
                )}
                {lot.dispatchDate && (
                  <div>
                    <div className="text-xs text-muted-foreground">Dispatch Date</div>
                    <div>{format(new Date(lot.dispatchDate), 'dd MMM yyyy')}</div>
                  </div>
                )}
                {lot.estimatedArrival && (
                  <div>
                    <div className="text-xs text-muted-foreground">Estimated Arrival</div>
                    <div>{format(new Date(lot.estimatedArrival), 'dd MMM yyyy')}</div>
                  </div>
                )}
                {lot.actualArrival && (
                  <div>
                    <div className="text-xs text-muted-foreground">Actual Arrival</div>
                    <div>{format(new Date(lot.actualArrival), 'dd MMM yyyy')}</div>
                  </div>
                )}
                {lot.transportMode &&
                  MODE_DETAIL_FIELDS[lot.transportMode].map(
                    ({ key, label }) =>
                      lot.shipmentDetails?.[key] && (
                        <div key={key}>
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div>{lot.shipmentDetails[key]}</div>
                        </div>
                      ),
                  )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shipment Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Transport Mode</Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransportMode).map((m) => (
                    <SelectItem key={m} value={m}>
                      {TRANSPORT_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Shipment Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ShipmentStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SHIPMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Carrier Name</Label>
              <Input
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="e.g. MSC, Qatar Airways, ABC Logistics"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Dispatch Date</Label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Estimated Arrival</Label>
                <Input
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                />
              </div>
              <div>
                <Label>Actual Arrival</Label>
                <Input
                  type="date"
                  value={actualArrival}
                  onChange={(e) => setActualArrival(e.target.value)}
                />
              </div>
            </div>

            {detailFields.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {mode && TRANSPORT_MODE_LABELS[mode]} Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {detailFields.map(({ key, label }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input
                        value={details[key] || ''}
                        onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
