'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { recordUsage } from '@/lib/invoice';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UsageRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
  onSuccess: () => void;
}

export default function UsageRecordingModal({
  isOpen,
  onClose,
  contractId,
  customerName,
  onSuccess,
}: UsageRecordingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    bwA4Count: 0,
    bwA3Count: 0,
    colorA4Count: 0,
    colorA3Count: 0,
    remarks: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('contractId', contractId);
      payload.append('billingPeriodStart', formData.billingPeriodStart);
      payload.append('billingPeriodEnd', formData.billingPeriodEnd);
      payload.append('bwA4Count', String(formData.bwA4Count));
      payload.append('bwA3Count', String(formData.bwA3Count));
      payload.append('colorA4Count', String(formData.colorA4Count));
      payload.append('colorA3Count', String(formData.colorA3Count));
      payload.append('remarks', formData.remarks);
      payload.append('reportedBy', 'EMPLOYEE'); // Or FINANCE if context allows

      if (file) {
        payload.append('file', file);
      }

      await recordUsage(payload);

      toast.success('Usage recorded successfully');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to record usage');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Usage for {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                required
                value={formData.billingPeriodStart}
                onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                required
                value={formData.billingPeriodEnd}
                onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>BW A4 Count</Label>
              <Input
                type="number"
                min="0"
                value={formData.bwA4Count}
                onChange={(e) => setFormData({ ...formData, bwA4Count: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>BW A3 Count</Label>
              <Input
                type="number"
                min="0"
                value={formData.bwA3Count}
                onChange={(e) => setFormData({ ...formData, bwA3Count: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color A4 Count</Label>
              <Input
                type="number"
                min="0"
                value={formData.colorA4Count}
                onChange={(e) => setFormData({ ...formData, colorA4Count: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color A3 Count</Label>
              <Input
                type="number"
                min="0"
                value={formData.colorA3Count}
                onChange={(e) => setFormData({ ...formData, colorA3Count: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meter Image (Required for verification)</Label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
