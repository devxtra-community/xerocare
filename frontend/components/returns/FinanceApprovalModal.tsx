'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { CreditNoteRecord } from '@/lib/invoice';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { financeNote: string; damageReason: string; paymentMode: string }) => void;
  record: CreditNoteRecord | null;
}

export default function FinanceApprovalModal({ open, onClose, onConfirm, record }: Props) {
  const [financeNote, setFinanceNote] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const handleSubmit = () => {
    if (!financeNote || !damageReason || !paymentMode) return;
    onConfirm({ financeNote, damageReason, paymentMode });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Credit Note</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 text-sm">
          <div className="rounded-md bg-blue-50 p-3">
            <p className="font-semibold text-blue-800">{record?.creditNoteNo}</p>
            <p className="text-blue-600">
              {record?.productName} - {record?.modelName}
            </p>
            <p className="font-bold text-blue-900 mt-1">
              Amount: ₹{record?.productAmount?.toLocaleString()}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Damage Reason</Label>
            <Select onValueChange={setDamageReason}>
              <SelectTrigger>
                <SelectValue placeholder="Categorize damage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Damaged Product">Damaged Product</SelectItem>
                <SelectItem value="Incomplete Parts">Incomplete Parts</SelectItem>
                <SelectItem value="Defective">Defective</SelectItem>
                <SelectItem value="Wrong Item Delivered">Wrong Item Delivered</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Payment Mode</Label>
            <Select onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Finance Note / Reason</Label>
            <Textarea
              placeholder="Enter approval note..."
              value={financeNote}
              onChange={(e) => setFinanceNote(e.target.value)}
              className="h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!financeNote || !damageReason || !paymentMode}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
