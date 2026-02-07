import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddJournalDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AddJournalDialog({ open, onClose }: AddJournalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Journal Entry (Placeholder)</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center text-muted-foreground">
          This component is a placeholder to fix build errors.
        </div>
      </DialogContent>
    </Dialog>
  );
}
