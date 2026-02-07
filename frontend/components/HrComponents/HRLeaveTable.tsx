'use client';

import React, { useState, useEffect } from 'react';
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
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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

const leaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.SICK]: 'Sick Leave',
  [LeaveType.CASUAL]: 'Casual Leave',
  [LeaveType.VACATION]: 'Vacation',
  [LeaveType.PERSONAL]: 'Personal Leave',
  [LeaveType.EMERGENCY]: 'Emergency Leave',
};

export default function HRLeaveTable() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLeaveApplications = async () => {
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
  };

  useEffect(() => {
    fetchLeaveApplications();
  }, [statusFilter]);

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
                      <div className="font-medium text-primary">
                        {leave.employee.first_name} {leave.employee.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{leave.employee.email}</div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm">
                      {leaveTypeLabels[leave.leave_type]}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 max-w-[200px] truncate" title={leave.reason}>
                      {leave.reason}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-center">
                      {getStatusBadge(leave.status)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-sm text-muted-foreground">
                      {formatDate(leave.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right">
                      {leave.status === LeaveStatus.PENDING && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(leave)}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRejectClick(leave)}
                            disabled={isProcessing}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
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
    </>
  );
}
