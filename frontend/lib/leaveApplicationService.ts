import api from './api';

export enum LeaveType {
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  VACATION = 'VACATION',
  PERSONAL = 'PERSONAL',
  EMERGENCY = 'EMERGENCY',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface LeaveApplication {
  id: string;
  employee_id: string;
  employee: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    display_id: string | null;
    employee_job: string | null;
    finance_job: string | null;
  };
  branch_id: string;
  branch: {
    name: string;
  };
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplicationData {
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
}

export interface LeaveApplicationResponse {
  success: boolean;
  message: string;
  data: {
    leaveApplications: LeaveApplication[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface LeaveStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalCancelled: number;
    totalApplications: number;
  };
}

// Submit leave application
export async function submitLeaveApplication(data: LeaveApplicationData) {
  const response = await api.post('/e/leave-applications', data);
  return response.data;
}

// Get employee's own leave applications
export async function getMyLeaveApplications(page = 1, limit = 10) {
  const response = await api.get<LeaveApplicationResponse>('/e/leave-applications/my', {
    params: { page, limit },
  });
  return response.data;
}

// Get branch leave applications (HR/Admin only)
export async function getBranchLeaveApplications(page = 1, limit = 10, status?: LeaveStatus) {
  const response = await api.get<LeaveApplicationResponse>('/e/leave-applications', {
    params: { page, limit, status },
  });
  return response.data;
}

// Get single leave application
export async function getLeaveApplicationById(id: string) {
  const response = await api.get(`/e/leave-applications/${id}`);
  return response.data;
}

// Approve leave application (HR/Admin only)
export async function approveLeaveApplication(id: string) {
  const response = await api.put(`/e/leave-applications/${id}/approve`);
  return response.data;
}

// Reject leave application (HR/Admin only)
export async function rejectLeaveApplication(id: string, reason: string) {
  const response = await api.put(`/e/leave-applications/${id}/reject`, {
    reason,
  });
  return response.data;
}

// Cancel leave application
export async function cancelLeaveApplication(id: string) {
  const response = await api.delete(`/e/leave-applications/${id}`);
  return response.data;
}

// Get leave statistics (HR/Admin only)
export async function getLeaveStats() {
  const response = await api.get<LeaveStatsResponse>('/e/leave-applications/stats');
  return response.data;
}
