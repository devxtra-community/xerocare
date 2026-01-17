'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LeaveData } from './AddLeaveDialog';

interface UpdateLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leave: (LeaveData & { id: string }) | null;
  onSubmit: (id: string, data: Partial<LeaveData>) => void;
}

export default function UpdateLeaveDialog({
  open,
  onOpenChange,
  leave,
  onSubmit,
}: UpdateLeaveDialogProps) {
  const [formData, setFormData] = useState<LeaveData>({
    employeeId: '',
    name: '',
    email: '',
    branch: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    if (leave) {
      setFormData({
        employeeId: leave.employeeId,
        name: leave.name,
        email: leave.email,
        branch: leave.branch,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
      });
    }
  }, [leave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leave) {
      onSubmit(leave.id, formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Update Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Read-only Employee Info */}
          <div className="grid grid-cols-2 gap-4 opacity-70 pointer-events-none bg-gray-50/50 p-2 rounded-lg">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee ID
              </label>
              <div className="text-sm font-medium">{formData.employeeId}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Name
              </label>
              <div className="text-sm font-medium">{formData.name}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Start Date
              </label>
              <Input
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                End Date
              </label>
              <Input
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Reason
            </label>
            <Textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Reason for leave..."
              className="resize-none rounded-lg bg-gray-50 border-none shadow-sm"
              rows={3}
              required
            />
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
              Update Leave
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
