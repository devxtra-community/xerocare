'use client';

import { useEffect, useRef, useState } from 'react';
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
import { purchaseService, AddPaymentDto } from '@/services/purchaseService';
import { getMyBranch } from '@/lib/branch';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { CreditCard, Calendar, FileText, Hash, Paperclip, X } from 'lucide-react';

import { getActiveCurrency } from '@/lib/currency';
interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  totalAmount: number;
  paidAmount: number;
  onSuccess: () => void;
}

export default function AddPaymentModal({
  open,
  onOpenChange,
  purchaseId,
  totalAmount,
  paidAmount,
  onSuccess,
}: AddPaymentModalProps) {
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(getActiveCurrency());
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<AddPaymentDto>({
    amount: 0,
    paymentMethod: 'Bank Transfer',
    description: '',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      getMyBranch()
        .then((branch) => setCurrencyCode(branch.currency_code || getActiveCurrency()))
        .catch(() => setCurrencyCode(getActiveCurrency()));
    } else {
      setAttachment(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) {
      toast.error('Only images or PDF receipts are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setAttachment(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (Number(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    if (Number(formData.amount) > remainingAmount + 0.01) {
      toast.error(`Amount exceeds remaining payable: ${formatCurrency(remainingAmount)}`);
      setLoading(false);
      return;
    }

    try {
      await purchaseService.addPayment(purchaseId, formData, attachment);
      toast.success('Payment recorded successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to record payment',
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
              <CreditCard className="text-blue-400" />
              Add Vendor Payment
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-slate-400 text-xs">
            Remaining to pay:{' '}
            <span className="text-white font-bold">{formatCurrency(remainingAmount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase">
              Payment Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currencyCode}
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
            {formData.amount > 0 && formData.amount < remainingAmount && (
              <p className="text-[10px] text-yellow-600 font-medium italic">
                Partial payment recognized
              </p>
            )}
            {formData.amount >= remainingAmount - 0.01 &&
              formData.amount <= remainingAmount + 0.01 && (
                <p className="text-[10px] text-green-600 font-medium italic">
                  Full payment recognized
                </p>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Date
              </Label>
              <Input
                type="date"
                required
                className="h-10 text-xs border-slate-200"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Hash size={12} /> Ref #
              </Label>
              <Input
                placeholder="TRX..."
                className="h-10 text-xs border-slate-200"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
            >
              <SelectTrigger className="h-10 text-xs border-slate-200">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {['Bank Transfer', 'Cash', 'Credit Card', 'Cheque', 'Online Payment'].map((m) => (
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
              placeholder="e.g. Advance payment for shipping"
              className="h-10 text-xs border-slate-200"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Paperclip size={12} /> Receipt / Screenshot
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {attachment ? (
              <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs">
                <span className="truncate text-slate-700 font-medium">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-primary hover:text-primary transition-colors"
              >
                Attach receipt image or PDF (optional)
              </button>
            )}
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
              className="flex-1 bg-primary hover:bg-primary/90 font-bold"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
