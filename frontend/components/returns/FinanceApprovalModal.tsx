'use client';

import { useEffect, useState } from 'react';
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
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    financeNote: string;
    damageReason: string;
    paymentMode: string;
    returnedMachineDisposition?: 'STOCK' | 'WORKING_STOCK' | 'DAMAGED';
  }) => void;
  record: CreditNoteRecord | null;
}

export default function FinanceApprovalModal({ open, onClose, onConfirm, record }: Props) {
  const currency = useBranchCurrency();
  const [financeNote, setFinanceNote] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [returnedMachineDisposition, setReturnedMachineDisposition] = useState('');
  const needsMachineDisposition =
    record?.itemCategory !== 'SPARE_PART' &&
    (record?.type === 'REPLACEMENT' || record?.type === 'CREDIT_EXCHANGE');

  useEffect(() => {
    setReturnedMachineDisposition('');
  }, [record?.id]);

  const handleSubmit = () => {
    if (!financeNote || !damageReason || !paymentMode) return;
    if (needsMachineDisposition && !returnedMachineDisposition) return;
    onConfirm({
      financeNote,
      damageReason,
      paymentMode,
      returnedMachineDisposition: needsMachineDisposition
        ? (returnedMachineDisposition as 'STOCK' | 'WORKING_STOCK' | 'DAMAGED')
        : undefined,
    });
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
              Amount: {formatCurrency(record?.productAmount ?? 0, currency)}
            </p>
          </div>

          {needsMachineDisposition && (
            <div className="grid gap-2">
              <Label>Returned Machine Destination</Label>
              <Select onValueChange={setReturnedMachineDisposition}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose inventory destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK">Stock — returned, pending handling</SelectItem>
                  <SelectItem value="WORKING_STOCK">
                    Working stock — available to use or sell
                  </SelectItem>
                  <SelectItem value="DAMAGED">Damaged — remove from sellable stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
            disabled={
              !financeNote ||
              !damageReason ||
              !paymentMode ||
              (needsMachineDisposition && !returnedMachineDisposition)
            }
            className="bg-green-600 hover:bg-green-700"
          >
            Approve Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
