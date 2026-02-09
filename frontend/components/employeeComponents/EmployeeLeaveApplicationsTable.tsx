'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getMyLeaveApplications,
  cancelLeaveApplication,
  LeaveApplication,
  LeaveStatus,
  LeaveType,
} from '@/lib/leaveApplicationService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const leaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.SICK]: 'Sick Leave',
  [LeaveType.CASUAL]: 'Casual Leave',
  [LeaveType.VACATION]: 'Vacation',
  [LeaveType.PERSONAL]: 'Personal Leave',
  [LeaveType.EMERGENCY]: 'Emergency Leave',
};

export default function EmployeeLeaveApplicationsTable() {
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchLeaveApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getMyLeaveApplications(1, 20);
      if (response.success) {
        setLeaveApplications(response.data.leaveApplications);
      }
    } catch {
      toast.error('Failed to load leave applications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveApplications();
  }, [fetchLeaveApplications]);

  const handleCancelClick = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedLeaveId) return;

    setIsCancelling(true);
    try {
      await cancelLeaveApplication(selectedLeaveId);
      toast.success('Leave application cancelled successfully');
      fetchLeaveApplications();
      setCancelDialogOpen(false);
      setSelectedLeaveId(null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to cancel leave application');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    const variants: Record<
      LeaveStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
    > = {
      [LeaveStatus.PENDING]: {
        variant: 'outline',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
      },
      [LeaveStatus.APPROVED]: {
        variant: 'default',
        className: 'bg-green-100 text-green-700 border-green-300',
      },
      [LeaveStatus.REJECTED]: {
        variant: 'destructive',
        className: 'bg-red-100 text-red-700 border-red-300',
      },
      [LeaveStatus.CANCELLED]: {
        variant: 'secondary',
        className: 'bg-gray-100 text-gray-700 border-gray-300',
      },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50/50">
            <TableRow>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Date Range
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Leave Type
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Reason
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary text-center">
                Status
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Applied On
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                </TableCell>
              </TableRow>
            ) : leaveApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No leave applications found. Apply for your first leave!
                </TableCell>
              </TableRow>
            ) : (
              leaveApplications.map((leave) => (
                <TableRow key={leave.id} className="hover:bg-muted/50/50 transition-colors">
                  <TableCell className="px-3 py-2 font-medium">
                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className="text-sm">{leaveTypeLabels[leave.leave_type]}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2 max-w-[250px]">
                    <span className="text-sm truncate block" title={leave.reason}>
                      {leave.reason}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center">
                    {getStatusBadge(leave.status)}
                    {leave.status === LeaveStatus.REJECTED && leave.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1" title={leave.rejection_reason}>
                        {leave.rejection_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                    {formatDate(leave.createdAt)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {leave.status === LeaveStatus.PENDING && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleCancelClick(leave.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
