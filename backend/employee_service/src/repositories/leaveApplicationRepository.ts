import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LeaveApplication } from '../entities/leaveApplicationEntity';
import { LeaveStatus } from '../constants/leaveStatus';
import { Source } from '../config/dataSource';

export class LeaveApplicationRepository {
  private repo: Repository<LeaveApplication>;

  constructor() {
    this.repo = Source.getRepository(LeaveApplication);
  }

  async createLeaveApplication(data: Partial<LeaveApplication>) {
    const leaveApplication = this.repo.create(data);
    return this.repo.save(leaveApplication);
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['employee', 'branch', 'reviewer'],
    });
  }

  async findByEmployeeId(
    employeeId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: LeaveApplication[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repo.findAndCount({
      where: { employee_id: employeeId },
      relations: ['employee', 'branch', 'reviewer'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async findByBranchId(
    branchId: string,
    page = 1,
    limit = 10,
    status?: LeaveStatus,
  ): Promise<{ data: LeaveApplication[]; total: number }> {
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, string | LeaveStatus> = { branch_id: branchId };
    if (status) {
      whereCondition.status = status;
    }

    const [data, total] = await this.repo.findAndCount({
      where: whereCondition,
      relations: ['employee', 'branch', 'reviewer'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    reviewedBy: string,
    rejectionReason?: string,
  ) {
    return this.repo.update(id, {
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      rejection_reason: rejectionReason || null,
    });
  }

  async deleteLeaveApplication(id: string) {
    return this.repo.delete(id);
  }

  // Check for overlapping leave applications for the same employee
  async findOverlappingLeaves(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<LeaveApplication[]> {
    const query = this.repo
      .createQueryBuilder('leave')
      .where('leave.employee_id = :employeeId', { employeeId })
      .andWhere('leave.status != :cancelledStatus', { cancelledStatus: LeaveStatus.CANCELLED })
      .andWhere('leave.status != :rejectedStatus', { rejectedStatus: LeaveStatus.REJECTED })
      .andWhere('(leave.start_date <= :endDate AND leave.end_date >= :startDate)', {
        startDate,
        endDate,
      });

    if (excludeId) {
      query.andWhere('leave.id != :excludeId', { excludeId });
    }

    return query.getMany();
  }

  // Get statistics for dashboard
  async countByStatus(branchId?: string, status?: LeaveStatus): Promise<number> {
    const whereCondition: Record<string, string | LeaveStatus> = {};

    if (branchId) {
      whereCondition.branch_id = branchId;
    }

    if (status) {
      whereCondition.status = status;
    }

    return this.repo.count({ where: whereCondition });
  }

  // Get pending applications for a branch
  async findPendingByBranch(branchId: string): Promise<LeaveApplication[]> {
    return this.repo.find({
      where: {
        branch_id: branchId,
        status: LeaveStatus.PENDING,
      },
      relations: ['employee', 'branch'],
      order: { createdAt: 'ASC' },
    });
  }

  // Get leave applications for a date range
  async findByDateRange(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveApplication[]> {
    return this.repo.find({
      where: {
        branch_id: branchId,
        start_date: LessThanOrEqual(endDate),
        end_date: MoreThanOrEqual(startDate),
        status: LeaveStatus.APPROVED,
      },
      relations: ['employee'],
      order: { start_date: 'ASC' },
    });
  }
}
