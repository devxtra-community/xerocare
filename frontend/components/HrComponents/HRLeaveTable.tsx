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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, Loader2, FileText, Printer } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  getBranchLeaveApplications,
  approveLeaveApplication,
  rejectLeaveApplication,
  LeaveApplication,
  LeaveStatus,
  LeaveType,
} from '@/lib/leaveApplicationService';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';

const leaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.SICK]: 'Sick Leave',
  [LeaveType.CASUAL]: 'Casual Leave',
  [LeaveType.VACATION]: 'Vacation',
  [LeaveType.PERSONAL]: 'Personal Leave',
  [LeaveType.EMERGENCY]: 'Emergency Leave',
};

/**
 * Leave Management Table for HR.
 * Lists all leave applications with details (employee, type, dates, reason).
 * Supports approval/rejection workflows, filtering by status, and generating leave letters.
 */
export default function HRLeaveTable() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false);

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getDepartment = (emp: LeaveApplication['employee'] | undefined) => {
    if (!emp) return 'General';
    if (emp.employee_job)
      return EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob] || emp.employee_job;
    if (emp.finance_job)
      return FINANCE_JOB_LABELS[emp.finance_job as FinanceJob] || emp.finance_job;
    return 'General';
  };

  const fetchLeaveApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === 'ALL' ? undefined : (statusFilter as LeaveStatus);
      const response = await getBranchLeaveApplications(1, 100, status);
      if (response.success) {
        setLeaves(response.data.leaveApplications);
      }
    } catch {
      toast.error('Failed to fetch leave applications');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeaveApplications();
  }, [fetchLeaveApplications]);

  const filteredLeaves = leaves.filter(
    (leave) =>
      leave.employee.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      leave.employee.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      leave.employee.display_id?.toLowerCase().includes(search.toLowerCase()) ||
      leave.employee.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApprove = async (leave: LeaveApplication) => {
    if (leave.status !== LeaveStatus.PENDING) {
      toast.error('Only pending leave applications can be approved');
      return;
    }

    setIsProcessing(true);
    try {
      await approveLeaveApplication(leave.id);
      toast.success('Leave application approved successfully');
      fetchLeaveApplications();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve leave application');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (leave: LeaveApplication) => {
    if (leave.status !== LeaveStatus.PENDING) {
      toast.error('Only pending leave applications can be rejected');
      return;
    }
    setSelectedLeave(leave);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedLeave) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      toast.error('Rejection reason must be at least 5 characters long');
      return;
    }

    setIsProcessing(true);
    try {
      await rejectLeaveApplication(selectedLeave.id, rejectionReason.trim());
      toast.success('Leave application rejected successfully');
      setIsRejectDialogOpen(false);
      setSelectedLeave(null);
      setRejectionReason('');
      fetchLeaveApplications();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reject leave application');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    const variants: Record<LeaveStatus, { className: string }> = {
      [LeaveStatus.PENDING]: { className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      [LeaveStatus.APPROVED]: { className: 'bg-green-100 text-green-700 border-green-300' },
      [LeaveStatus.REJECTED]: { className: 'bg-red-100 text-red-700 border-red-300' },
      [LeaveStatus.CANCELLED]: { className: 'bg-gray-100 text-gray-700 border-gray-300' },
    };

    const config = variants[status];
    return (
      <Badge variant="outline" className={config.className}>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-none shadow-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value={LeaveStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={LeaveStatus.APPROVED}>Approved</SelectItem>
              <SelectItem value={LeaveStatus.REJECTED}>Rejected</SelectItem>
              <SelectItem value={LeaveStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50/50">
              <TableRow>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  Employee ID
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  Name
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  Department
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  From
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  To
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary text-center">
                  Days
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                  Reason
                </TableHead>
                <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary text-center">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-right font-bold text-xs uppercase tracking-wider text-primary">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                  </TableCell>
                </TableRow>
              ) : filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-muted/50/50 transition-colors">
                    <TableCell className="px-3 py-1.5 font-medium text-primary">
                      {leave.employee.display_id || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5">
                      <div className="font-medium text-primary line-clamp-1">
                        {leave.employee.first_name} {leave.employee.last_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {leave.employee.email}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm">
                      <Badge variant="secondary" className="font-normal text-[11px]">
                        {getDepartment(leave.employee)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm whitespace-nowrap">
                      {formatDate(leave.start_date)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm whitespace-nowrap">
                      {formatDate(leave.end_date)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center font-bold text-primary">
                      {calculateDays(leave.start_date, leave.end_date)}
                    </TableCell>
                    <TableCell
                      className="px-3 py-1.5 max-w-[150px] truncate text-sm"
                      title={leave.reason}
                    >
                      {leave.reason}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center">
                      {getStatusBadge(leave.status)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Letter"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setIsLetterOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {leave.status === LeaveStatus.PENDING && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                              onClick={() => handleApprove(leave)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                              onClick={() => handleRejectClick(leave)}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No leave records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection_reason"
              placeholder="Enter reason for rejection (minimum 5 characters)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
              minLength={5}
            />
            <p className="text-xs text-muted-foreground">
              {rejectionReason.length}/5 characters minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleRejectConfirm} disabled={isProcessing} variant="destructive">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isLetterOpen} onOpenChange={setIsLetterOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-6 text-primary-foreground space-y-0">
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-2xl font-bold">Leave Application</DialogTitle>
                <DialogDescription className="text-primary-foreground/80 text-[13px] mt-1 font-medium">
                  Reference: {selectedLeave?.id?.slice(0, 8).toUpperCase()}
                </DialogDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
            <div className="flex justify-between text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  From
                </p>
                <p className="font-bold text-lg">
                  {selectedLeave?.employee?.first_name} {selectedLeave?.employee?.last_name}
                </p>
                <p>{selectedLeave?.employee?.email}</p>
                <p className="text-muted-foreground italic">
                  {getDepartment(selectedLeave?.employee)} Department
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Date Applied
                </p>
                <p className="font-bold">{selectedLeave && formatDate(selectedLeave.createdAt)}</p>
                <Badge variant="outline" className="mt-2">
                  {selectedLeave?.leave_type && leaveTypeLabels[selectedLeave.leave_type]}
                </Badge>
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                Subject: Application for Leave
              </p>
              <div className="space-y-4 text-sm leading-relaxed">
                <p>Dear Management,</p>
                <p>
                  I am writing to formally request leave from{' '}
                  <strong>{selectedLeave && formatDate(selectedLeave.start_date)}</strong> to
                  <strong> {selectedLeave && formatDate(selectedLeave.end_date)}</strong>, totaling
                  <strong>
                    {' '}
                    {selectedLeave &&
                      calculateDays(selectedLeave.start_date, selectedLeave.end_date)}{' '}
                    days
                  </strong>
                  .
                </p>
                <div>
                  <p className="font-semibold mb-1">Reason for Leave:</p>
                  <div className="bg-muted/30 p-4 rounded-lg italic">
                    &quot;{selectedLeave?.reason}&quot;
                  </div>
                </div>
                <p>
                  I will ensure that all my current tasks are up to date before my leave starts.
                  Thank you for considering my application.
                </p>
                <div className="pt-4">
                  <p>Sincerely,</p>
                  <p className="font-bold mt-1">
                    {selectedLeave?.employee?.first_name} {selectedLeave?.employee?.last_name}
                  </p>
                </div>
              </div>
            </div>

            {selectedLeave?.status === LeaveStatus.REJECTED && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-bold text-red-600 uppercase mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-700">{selectedLeave.rejection_reason}</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsLetterOpen(false)} className="h-10">
              Close
            </Button>
            {selectedLeave?.status === LeaveStatus.PENDING && (
              <>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 px-6 font-semibold"
                  onClick={() => {
                    setIsLetterOpen(false);
                    handleRejectClick(selectedLeave);
                  }}
                  disabled={isProcessing}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 font-semibold shadow-sm"
                  onClick={() => {
                    handleApprove(selectedLeave);
                    setIsLetterOpen(false);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve Application
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
