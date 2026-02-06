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

export default function UpdatePayrollDialog({
  open,
  onOpenChange,
  record,
  onSubmit,
}: UpdatePayrollDialogProps) {
  const [formData, setFormData] = useState<Partial<PayrollRecord>>({
    salaryPerMonth: '',
    workingDays: 0,
    leaveDays: 0,
    grossSalary: '',
    status: 'PENDING',
    paidDate: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        salaryPerMonth: record.salaryPerMonth,
        workingDays: record.workingDays,
        leaveDays: record.leaveDays,
        grossSalary: record.grossSalary,
        status: record.status,
        paidDate: record.paidDate,
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
          <div className="grid grid-cols-2 gap-4 opacity-70 pointer-events-none bg-muted/50/50 p-2 rounded-lg">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee Name
              </label>
              <div className="text-sm font-medium">{record?.name}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee ID
              </label>
              <div className="text-sm font-medium">{record?.employeeId}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                Gross Salary
              </label>
              <Input
                name="grossSalary"
                value={formData.grossSalary}
                onChange={handleChange}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Working Days
              </label>
              <Input
                name="workingDays"
                type="number"
                value={formData.workingDays}
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
