'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { Loader2, History, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PayrollHistoryItem {
  id: string;
  month: number;
  year: number;
  salary_amount: string | number;
  status: 'PAID' | 'PENDING';
  paid_date: string | null;
  leave_days: number;
}

interface HRPayrollHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  employeeName: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function HRPayrollHistoryDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: HRPayrollHistoryDialogProps) {
  const [history, setHistory] = useState<PayrollHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/e/payroll/history/${employeeId}`);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch payroll history:', err);
      setError('Failed to load payroll history records.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (open && employeeId) {
      fetchHistory();
    }
  }, [open, employeeId, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <History className="h-5 w-5" />
            Payroll History
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-medium">
            Viewing payment records for{' '}
            <span className="text-primary font-bold">{employeeName}</span>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground italic">Fetching records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-destructive">
              <AlertCircle className="h-10 w-10 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic text-sm">
              No payroll history found for this employee.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-primary uppercase">
                      Month/Year
                    </TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase">
                      Paid Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell className="font-medium text-sm py-3">
                        {MONTH_NAMES[record.month - 1]} {record.year}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-blue-700">
                        QAR {parseFloat(record.salary_amount.toString()).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge
                          variant="outline"
                          className={`
                            text-[10px] font-bold px-2 py-0.5 rounded-full
                            ${
                              record.status === 'PAID'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          `}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3">
                        {record.paid_date
                          ? new Date(record.paid_date).toLocaleDateString('en-GB')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
