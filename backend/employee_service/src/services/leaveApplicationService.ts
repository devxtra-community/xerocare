import { LeaveApplicationRepository } from '../repositories/leaveApplicationRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { LeaveStatus } from '../constants/leaveStatus';
import { LeaveType } from '../constants/leaveType';
import { AppError } from '../errors/appError';
import { Source } from '../config/dataSource';
import { logger } from '../config/logger';
import { Notification } from '../entities/notificationEntity';
import { Employee } from '../entities/employeeEntities';
import { LeaveApplication } from '../entities/leaveApplicationEntity';

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
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.branch_id) {
      throw new AppError('Employee must be assigned to a branch to apply for leave', 400);
    }

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

    if (!data.reason || data.reason.trim().length < 10) {
      throw new AppError('Reason must be at least 10 characters long', 400);
    }

    const leaveApplication = await Source.transaction(async (manager) => {
      const leaveRepo = manager.getRepository(LeaveApplication);

      const overlapping = await leaveRepo
        .createQueryBuilder('leave')
        .where('leave.employee_id = :employeeId', { employeeId })
        .andWhere('leave.status != :cancelledStatus', { cancelledStatus: LeaveStatus.CANCELLED })
        .andWhere('leave.status != :rejectedStatus', { rejectedStatus: LeaveStatus.REJECTED })
        .andWhere('(leave.start_date <= :endDate AND leave.end_date >= :startDate)', {
          startDate,
          endDate,
        })
        .setLock('pessimistic_write')
        .getMany();

      if (overlapping.length > 0) {
        throw new AppError('You already have a leave application for overlapping dates', 400);
      }

      const newLeave = leaveRepo.create({
        employee_id: employeeId,
        branch_id: employee.branch_id!,
        start_date: startDate,
        end_date: endDate,
        leave_type: data.leave_type,
        reason: data.reason.trim(),
        status: LeaveStatus.PENDING,
      });
      return leaveRepo.save(newLeave) as Promise<LeaveApplication>;
    });

    // Notify branch manager AND HR of leave submission — HR is a company-wide
    // review role for leave here (see Part 5 of the notifications rollout),
    // not branch-scoped the way MANAGER is, so it's queried without a branch
    // filter.
    try {
      const employeeRepo = Source.getRepository(Employee);
      const notificationRepo = Source.getRepository(Notification);

      const [manager, hrEmployees] = await Promise.all([
        employeeRepo.findOne({
          where: { branch_id: employee.branch_id!, role: 'MANAGER' as never },
        }),
        employeeRepo.find({ where: { role: 'HR' as never } }),
      ]);

      const employeeName =
        `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'An employee';

      const recipientIds = new Set<string>();
      if (manager) recipientIds.add(manager.id);
      for (const hr of hrEmployees) recipientIds.add(hr.id);

      await notificationRepo.save(
        [...recipientIds].map((recipientId) =>
          notificationRepo.create({
            employee_id: recipientId,
            title: 'Leave Application Submitted',
            message: `${employeeName} has submitted a ${data.leave_type} leave request from ${data.start_date} to ${data.end_date}.`,
            type: 'LEAVE_SUBMITTED',
            data: { leaveId: leaveApplication.id, employeeId },
          }),
        ),
      );
    } catch {
      // Non-blocking
    }

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

    // Notify employee of approval
    try {
      const notificationRepo = Source.getRepository(Notification);
      await notificationRepo.save(
        notificationRepo.create({
          employee_id: leaveApplication.employee_id,
          title: 'Leave Approved',
          // start_date/end_date come back from TypeORM as plain 'YYYY-MM-DD'
          // strings here, not Date objects — .toDateString() previously threw
          // and was swallowed by this same try/catch, silently killing every
          // approval notification with zero trace in the logs.
          message: `Your ${leaveApplication.leave_type} leave from ${leaveApplication.start_date} to ${leaveApplication.end_date} has been approved.`,
          type: 'LEAVE_APPROVED',
          data: { leaveId },
        }),
      );
    } catch (err) {
      logger.error('Failed to notify employee of leave approval:', err);
    }

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

    // Notify employee of rejection
    try {
      const notificationRepo = Source.getRepository(Notification);
      await notificationRepo.save(
        notificationRepo.create({
          employee_id: leaveApplication.employee_id,
          title: 'Leave Rejected',
          message: `Your ${leaveApplication.leave_type} leave from ${leaveApplication.start_date} to ${leaveApplication.end_date} was rejected. Reason: ${reason.trim()}`,
          type: 'LEAVE_REJECTED',
          data: { leaveId },
        }),
      );
    } catch (err) {
      logger.error('Failed to notify employee of leave rejection:', err);
    }

    return this.leaveRepo.findById(leaveId);
  }

  async cancelLeaveApplication(leaveId: string, employeeId: string) {
    const leaveApplication = await this.leaveRepo.findById(leaveId);

    if (!leaveApplication) {
      throw new AppError('Leave application not found', 404);
    }

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
