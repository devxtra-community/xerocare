'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  onConfirm: () => void;
}

export default function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employeeName,
  onConfirm,
}: DeleteEmployeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-4 text-red-600 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-blue-900">Confirm Action</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 leading-relaxed">
            Are you sure you want to disable or delete <strong>{employeeName}</strong>? This action will mark the employee as inactive and restrict their access.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end items-center gap-6 pt-8">
          <button 
            type="button" 
            onClick={() => onOpenChange(false)} 
            className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <Button 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }} 
            className="h-12 px-8 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
