'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Clock, FileText, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface SalaryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollId: string | null;
}

interface PayrollSummaryRecord {
  id: string;
  salary: string;
  status: string;
  paid_date: string;
  leave_days: number;
}

export function SalaryDetailsDialog({ open, onOpenChange, payrollId }: SalaryDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PayrollSummaryRecord | null>(null);

  const fetchSalaryDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      // Since we don't have a single GET payroll endpoint yet,
      // we'll use the summary one and find the specific record for now.
      // In a real scenario, we'd have GET /e/payroll/:id
      const response = await api.get('/e/payroll/summary');
      const record = response.data.find((r: PayrollSummaryRecord) => r.id === payrollId);
      if (record) {
        setDetails(record);
      }
    } catch (error) {
      console.error('Failed to fetch salary details', error);
    } finally {
      setLoading(false);
    }
  }, [payrollId]);

  useEffect(() => {
    if (open && payrollId) {
      fetchSalaryDetails();
    }
  }, [open, payrollId, fetchSalaryDetails]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Payment Details
          </DialogTitle>
          <DialogDescription>Detailed information about your salary payment.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        ) : details ? (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Amount Paid
                </span>
                <div className="text-lg font-bold text-primary">
                  ₹ {parseFloat(details.salary).toLocaleString()}
                </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </span>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-bold text-green-700">{details.status}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-b border-gray-100 italic">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Paid Date</span>
                </div>
                <span className="text-sm font-medium">
                  {details.paid_date ? new Date(details.paid_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Month/Year</span>
                </div>
                <span className="text-sm font-medium">Current Month</span>
              </div>

              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Leave Count</span>
                </div>
                <span className="text-sm font-medium">{details.leave_days} Days</span>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-xs text-primary/80 leading-relaxed italic">
                Note: This payment has been processed and credited to your registered bank account.
                If you have any queries, please contact the HR department.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => onOpenChange(false)} className="rounded-xl px-8 font-bold">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-500 italic">
            Could not find details for this payroll record.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
