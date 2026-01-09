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
  employeeStatus?: string;
  onConfirm: () => void;
}

export default function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employeeName,
  employeeStatus,
  onConfirm,
}: DeleteEmployeeDialogProps) {
  const isEnabling = employeeStatus === 'INACTIVE';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div
            className={`flex items-center gap-4 mb-4 ${isEnabling ? 'text-blue-600' : 'text-red-600'}`}
          >
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${isEnabling ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}
            >
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-primary">
              {isEnabling ? 'Enable Employee Access' : 'Confirm Action'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 leading-relaxed">
            {isEnabling ? (
              <>
                Are you sure you want to enable access for <strong>{employeeName}</strong>? They
                will be marked as active.
              </>
            ) : (
              <>
                Are you sure you want to disable or delete <strong>{employeeName}</strong>? This
                action will mark the employee as inactive and restrict their access.
              </>
            )}
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
            className={`h-12 px-8 rounded-xl text-white font-bold shadow-lg ${isEnabling ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isEnabling ? 'Confirm Enable' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
