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
import { Loader2, X, Eye } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Pagination from '@/components/Pagination';

const leaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.SICK]: 'Sick Leave',
  [LeaveType.CASUAL]: 'Casual Leave',
  [LeaveType.VACATION]: 'Vacation',
  [LeaveType.PERSONAL]: 'Personal Leave',
  [LeaveType.EMERGENCY]: 'Emergency Leave',
};

/**
 * Table displaying an employee's leave application history.
 * Shows status (Pending, Approved, Rejected) and allows cancellation of pending requests.
 */
export default function EmployeeLeaveApplicationsTable() {
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  const totalPages = Math.ceil(leaveApplications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = leaveApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCancelClick = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setCancelDialogOpen(true);
  };

  const handleViewClick = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setViewDialogOpen(true);
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

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-4">
        <div className="overflow-x-auto mb-4">
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
              ) : paginatedApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No leave applications found. Apply for your first leave!
                  </TableCell>
                </TableRow>
              ) : (
                paginatedApplications.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-muted/50/50 transition-colors">
                    <TableCell className="px-3 py-2 font-medium">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      <span className="text-xs text-muted-foreground block">
                        ({calculateDays(leave.start_date, leave.end_date)} days)
                      </span>
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
                        <p
                          className="text-xs text-red-600 mt-1 truncate max-w-[100px]"
                          title={leave.rejection_reason}
                        >
                          {leave.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                      {formatDate(leave.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleViewClick(leave)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {leave.status === LeaveStatus.PENDING && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancelClick(leave.id)}
                            title="Cancel Application"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold uppercase underline mb-4">
              Leave Application
            </DialogTitle>
            <DialogDescription className="hidden">
              Leave Application Details Letter
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="relative space-y-6 text-sm md:text-base text-gray-800 leading-relaxed font-serif">
              {/* Watermark / Stamp */}
              <div
                className={`absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-[6px] border-double rounded-lg px-8 py-2 text-6xl font-black uppercase tracking-widest opacity-20 pointer-events-none rotate-[-15deg] select-none
                  ${
                    selectedLeave.status === LeaveStatus.APPROVED
                      ? 'text-green-600 border-green-600'
                      : selectedLeave.status === LeaveStatus.REJECTED
                        ? 'text-red-600 border-red-600'
                        : selectedLeave.status === LeaveStatus.CANCELLED
                          ? 'text-gray-600 border-gray-600'
                          : 'text-yellow-600 border-yellow-600'
                  }`}
              >
                {selectedLeave.status}
              </div>

              {/* Date */}
              <div className="flex justify-end">
                <p>
                  <strong>Date:</strong> {formatDate(selectedLeave.createdAt)}
                </p>
              </div>

              {/* To Address */}
              <div>
                <p>To,</p>
                <p>The Manager,</p>
                <p className="font-medium">{selectedLeave.branch?.name || 'Head Office'}</p>
              </div>

              {/* Subject */}
              <div className="py-2">
                <p>
                  <strong>Subject:</strong> Application for{' '}
                  {leaveTypeLabels[selectedLeave.leave_type]}
                </p>
              </div>

              {/* Salutation */}
              <div>
                <p>Dear Sir/Madam,</p>
              </div>

              {/* Body */}
              <div className="text-justify">
                <p>
                  I am writing to formally request leave from{' '}
                  <strong>{formatDate(selectedLeave.start_date)}</strong> to{' '}
                  <strong>{formatDate(selectedLeave.end_date)}</strong>. The total duration of this
                  leave is{' '}
                  <strong>
                    {calculateDays(selectedLeave.start_date, selectedLeave.end_date)} day(s)
                  </strong>
                  .
                </p>
                <p className="mt-4">
                  <strong>Reason:</strong> {selectedLeave.reason}
                </p>
              </div>

              {/* Sign-off */}
              <div className="mt-12">
                <p>Sincerely,</p>
                <br />
                <p className="font-bold">
                  {selectedLeave.employee?.first_name} {selectedLeave.employee?.last_name}
                </p>
                <p className="text-xs text-gray-500">{selectedLeave.employee?.email}</p>
                <p className="text-xs text-gray-500">{selectedLeave.employee?.display_id}</p>
              </div>

              {/* Rejection Note */}
              {selectedLeave.status === LeaveStatus.REJECTED && selectedLeave.rejection_reason && (
                <div className="mt-8 border border-red-200 bg-red-50 p-4 rounded-md text-red-800 text-sm">
                  <p className="font-bold mb-1">Manager&apos;s Note:</p>
                  <p>{selectedLeave.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
