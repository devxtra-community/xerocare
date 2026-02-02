'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  submitLeaveApplication,
  LeaveType,
  LeaveApplicationData,
} from '@/lib/leaveApplicationService';

interface EmployeeLeaveApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EmployeeLeaveApplicationDialog({
  open,
  onOpenChange,
  onSuccess,
}: EmployeeLeaveApplicationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeaveApplicationData>({
    start_date: '',
    end_date: '',
    leave_type: LeaveType.CASUAL,
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be on or after start date');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitLeaveApplication(formData);
      toast.success('Leave application submitted successfully');
      setFormData({
        start_date: '',
        end_date: '',
        leave_type: LeaveType.CASUAL,
        reason: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Submit your leave application. Your HR will review and approve/reject it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave_type">
              Leave Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.leave_type}
              onValueChange={(value) =>
                setFormData({ ...formData, leave_type: value as LeaveType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LeaveType.SICK}>Sick Leave</SelectItem>
                <SelectItem value={LeaveType.CASUAL}>Casual Leave</SelectItem>
                <SelectItem value={LeaveType.VACATION}>Vacation</SelectItem>
                <SelectItem value={LeaveType.PERSONAL}>Personal Leave</SelectItem>
                <SelectItem value={LeaveType.EMERGENCY}>Emergency Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your leave (minimum 10 characters)"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              {formData.reason.length}/10 characters minimum
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
