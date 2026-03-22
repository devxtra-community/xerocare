'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseService, AddCostDto } from '@/services/purchaseService';
import { toast } from 'sonner';
import { Calendar, FileText, Banknote } from 'lucide-react';

interface AddCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  onSuccess: () => void;
}

export default function AddCostModal({
  open,
  onOpenChange,
  purchaseId,
  onSuccess,
}: AddCostModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AddCostDto>({
    amount: 0,
    costType: 'Other',
    description: '',
    costDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (Number(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      await purchaseService.addCost(purchaseId, formData);
      toast.success('Cost recorded successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to record cost',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="bg-slate-900 px-6 py-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Banknote className="text-emerald-400" />
              Add Purchase Cost
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-slate-400 text-xs">
            Record additional expenses related to this purchase.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase">
              Cost Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                QAR
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="pl-12 h-11 text-lg font-bold border-slate-200 focus:ring-primary"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={12} /> Date
            </Label>
            <Input
              type="date"
              required
              className="h-10 text-xs border-slate-200"
              value={formData.costDate}
              onChange={(e) => setFormData({ ...formData, costDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Cost Type</Label>
            <Select
              value={formData.costType}
              onValueChange={(val) => setFormData({ ...formData, costType: val })}
            >
              <SelectTrigger className="h-10 text-xs border-slate-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'Labour',
                  'Handling',
                  'Shipping',
                  'Documentation',
                  'Transportation',
                  'Groundfield',
                  'Other',
                ].map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <FileText size={12} /> Description
            </Label>
            <Input
              placeholder="e.g. Extra workers for unloading"
              className="h-10 text-xs border-slate-200"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Cost'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
