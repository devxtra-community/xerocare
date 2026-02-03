import { LeaveApplicationRepository } from '../repositories/leaveApplicationRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { LeaveStatus } from '../constants/leaveStatus';
import { LeaveType } from '../constants/leaveType';
import { AppError } from '../errors/appError';

interface SubmitLeaveApplicationData {
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
}

export class LeaveApplicationService {
  private leaveRepo: LeaveApplicationRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.leaveRepo = new LeaveApplicationRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async submitLeaveApplication(employeeId: string, data: SubmitLeaveApplicationData) {
    // Validate employee exists and get branch info
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.branch_id) {
      throw new AppError('Employee must be assigned to a branch to apply for leave', 400);
    }

    // Parse and validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new AppError('Start date cannot be in the past', 400);
    }

    if (endDate < startDate) {
      throw new AppError('End date must be on or after start date', 400);
    }

    // Validate reason length
    if (!data.reason || data.reason.trim().length < 10) {
      throw new AppError('Reason must be at least 10 characters long', 400);
    }

    // Check for overlapping leave applications
    const overlappingLeaves = await this.leaveRepo.findOverlappingLeaves(
      employeeId,
      startDate,
      endDate,
    );

    if (overlappingLeaves.length > 0) {
      throw new AppError('You already have a leave application for overlapping dates', 400);
    }

    // Create leave application
    const leaveApplication = await this.leaveRepo.createLeaveApplication({
      employee_id: employeeId,
      branch_id: employee.branch_id,
      start_date: startDate,
      end_date: endDate,
      leave_type: data.leave_type,
      reason: data.reason.trim(),
      status: LeaveStatus.PENDING,
    });

    return leaveApplication;
  }

  async getEmployeeLeaveApplications(employeeId: string, page = 1, limit = 10) {
    const result = await this.leaveRepo.findByEmployeeId(employeeId, page, limit);

    return {
      leaveApplications: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async getBranchLeaveApplications(branchId: string, page = 1, limit = 10, status?: LeaveStatus) {
    const result = await this.leaveRepo.findByBranchId(branchId, page, limit, status);

    return {
      leaveApplications: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async getLeaveApplicationById(id: string) {
    const leaveApplication = await this.leaveRepo.findById(id);

    if (!leaveApplication) {
      throw new AppError('Leave application not found', 404);
    }

    return leaveApplication;
  }

  async approveLeaveApplication(leaveId: string, reviewerId: string) {
    const leaveApplication = await this.leaveRepo.findById(leaveId);

    if (!leaveApplication) {
      throw new AppError('Leave application not found', 404);
    }

    if (leaveApplication.status !== LeaveStatus.PENDING) {
      throw new AppError(
        `Cannot approve leave application with status: ${leaveApplication.status}`,
        400,
      );
    }

    await this.leaveRepo.updateStatus(leaveId, LeaveStatus.APPROVED, reviewerId);

    return this.leaveRepo.findById(leaveId);
  }

  async rejectLeaveApplication(leaveId: string, reviewerId: string, reason: string) {
    const leaveApplication = await this.leaveRepo.findById(leaveId);

    if (!leaveApplication) {
      throw new AppError('Leave application not found', 404);
    }

    if (leaveApplication.status !== LeaveStatus.PENDING) {
      throw new AppError(
        `Cannot reject leave application with status: ${leaveApplication.status}`,
        400,
      );
    }

    if (!reason || reason.trim().length < 5) {
      throw new AppError('Rejection reason must be at least 5 characters long', 400);
    }

    await this.leaveRepo.updateStatus(leaveId, LeaveStatus.REJECTED, reviewerId, reason.trim());

    return this.leaveRepo.findById(leaveId);
  }

  async cancelLeaveApplication(leaveId: string, employeeId: string) {
    const leaveApplication = await this.leaveRepo.findById(leaveId);

    if (!leaveApplication) {
      throw new AppError('Leave application not found', 404);
    }

    // Only the employee who created the leave can cancel it
    if (leaveApplication.employee_id !== employeeId) {
      throw new AppError('You can only cancel your own leave applications', 403);
    }

    if (leaveApplication.status !== LeaveStatus.PENDING) {
      throw new AppError('Only pending leave applications can be cancelled', 400);
    }

    await this.leaveRepo.updateStatus(leaveId, LeaveStatus.CANCELLED, employeeId);

    return this.leaveRepo.findById(leaveId);
  }

  async getLeaveStats(branchId?: string) {
    const [totalPending, totalApproved, totalRejected, totalCancelled] = await Promise.all([
      this.leaveRepo.countByStatus(branchId, LeaveStatus.PENDING),
      this.leaveRepo.countByStatus(branchId, LeaveStatus.APPROVED),
      this.leaveRepo.countByStatus(branchId, LeaveStatus.REJECTED),
      this.leaveRepo.countByStatus(branchId, LeaveStatus.CANCELLED),
    ]);

    return {
      totalPending,
      totalApproved,
      totalRejected,
      totalCancelled,
      totalApplications: totalPending + totalApproved + totalRejected + totalCancelled,
    };
  }
}
