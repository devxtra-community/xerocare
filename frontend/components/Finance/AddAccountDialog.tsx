import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartAccount } from '@/lib/finance/finance';

interface AddAccountDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: Partial<ChartAccount>;
  accounts: ChartAccount[];
  onSave: (account: Partial<ChartAccount>) => void;
}

export default function AddAccountDialog({ open, onClose }: AddAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account (Placeholder)</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center text-muted-foreground">
          This component is a placeholder to fix build errors.
        </div>
      </DialogContent>
    </Dialog>
  );
}
