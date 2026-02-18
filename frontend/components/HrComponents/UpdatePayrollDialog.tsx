'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PayrollRecord } from './HRPayrollTable';

interface UpdatePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PayrollRecord | null;
  onSubmit: (id: string, data: Partial<PayrollRecord>) => void;
}

/**
 * Dialog component for updating an existing payroll record.
 * Enables modifying salary, leave days, payment status, and date.
 * Displays read-only employee details for context.
 */
export default function UpdatePayrollDialog({
  open,
  onOpenChange,
  record,
  onSubmit,
}: UpdatePayrollDialogProps) {
  const [formData, setFormData] = useState<Partial<PayrollRecord>>({
    salaryPerMonth: '',
    leaveDays: 0,
    status: 'PENDING',
    paidDate: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        salaryPerMonth: record.salaryPerMonth,
        leaveDays: record.leaveDays,
        status: record.status,
        paidDate: record.paidDate,
        payrollId: record.payrollId,
      });
    }
  }, [record]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: 'PAID' | 'PENDING') => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record) {
      onSubmit(record.id, formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Update Payroll</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Read-only Employee Info */}
          <div className="space-y-4">
            <div className="opacity-70 pointer-events-none bg-muted/50 p-2 rounded-lg text-center">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Employee Name
                </label>
                <div className="text-sm font-medium capitalize">{record?.name}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="opacity-70 pointer-events-none bg-muted/50 p-2 rounded-lg text-center">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Branch
                  </label>
                  <div className="text-[10px] font-bold uppercase">{record?.branchName}</div>
                </div>
              </div>
              <div className="opacity-70 pointer-events-none bg-muted/50 p-2 rounded-lg text-center">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Role
                  </label>
                  <div className="text-[10px] font-bold uppercase">{record?.role}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Salary / Month
            </label>
            <Input
              name="salaryPerMonth"
              value={formData.salaryPerMonth}
              onChange={handleChange}
              className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Leave Days
            </label>
            <Input
              name="leaveDays"
              type="number"
              value={formData.leaveDays}
              onChange={handleChange}
              className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value: 'PAID' | 'PENDING') => handleStatusChange(value)}
              >
                <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Paid Date
              </label>
              <Input
                name="paidDate"
                type="date"
                value={formData.paidDate}
                onChange={handleChange}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold text-gray-600"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary font-bold">
              Update Payroll
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
