'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type LeaveData = {
  employeeId: string;
  name: string;
  email: string;
  branch: string;
  startDate: string;
  endDate: string;
  reason: string;
};

interface AddLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeaveData) => void;
}

export default function AddLeaveDialog({ open, onOpenChange, onSubmit }: AddLeaveDialogProps) {
  const [formData, setFormData] = useState<LeaveData>({
    employeeId: '',
    name: '',
    email: '',
    branch: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      branch: '',
      startDate: '',
      endDate: '',
      reason: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Add Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee ID
              </label>
              <Input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="EMP001"
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee Name
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Branch
              </label>
              <Input
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Main Branch"
                className="h-10 rounded-lg bg-gray-50 border-none shadow-sm"
                required
              />
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
              Add Leave
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
