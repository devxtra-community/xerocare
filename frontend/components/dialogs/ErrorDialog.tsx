'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title = 'Action Prevented',
  message,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-warning/10 px-6 py-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center text-warning shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl font-bold text-warning">{title}</DialogTitle>
            <DialogDescription className="text-warning font-medium leading-relaxed">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="p-4 bg-card flex justify-center border-t border-warning/30">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full px-10 font-bold transition-all hover:scale-105 active:scale-95"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
