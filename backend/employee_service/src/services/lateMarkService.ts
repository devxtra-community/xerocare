import { LateMarkRepository } from '../repositories/lateMarkRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { AppError } from '../errors/appError';
import { Source } from '../config/dataSource';
import { logger } from '../config/logger';
import { Notification } from '../entities/notificationEntity';

interface MarkLateData {
  employee_id: string;
  date: string;
  note?: string;
}

export class LateMarkService {
  private lateMarkRepo: LateMarkRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.lateMarkRepo = new LateMarkRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async markLate(markedBy: string, data: MarkLateData) {
    const employee = await this.employeeRepo.findById(data.employee_id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.branch_id) {
      throw new AppError('Employee must be assigned to a branch', 400);
    }

    // Compared as plain 'YYYY-MM-DD' strings, not Date objects — mixing a UTC-parsed
    // date with a local-clamped one drifts by a calendar day in timezones on either
    // side of UTC (see the identical fix in leaveApplicationService).
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (data.date > todayStr) {
      throw new AppError('Cannot mark a future date as late', 400);
    }

    const date = new Date(data.date);

    const existing = await this.lateMarkRepo.findByEmployeeAndDate(data.employee_id, date);
    if (existing) {
      throw new AppError('Employee is already marked late for this date', 400);
    }

    const lateMark = await this.lateMarkRepo.create({
      employee_id: data.employee_id,
      branch_id: employee.branch_id,
      date,
      note: data.note?.trim() || null,
      marked_by: markedBy,
    });

    try {
      const notificationRepo = Source.getRepository(Notification);
      await notificationRepo.save(
        notificationRepo.create({
          employee_id: data.employee_id,
          title: 'Marked Late',
          message: `You were marked late for ${data.date}.${data.note ? ` Note: ${data.note.trim()}` : ''}`,
          type: 'LATE_MARKED',
          data: { lateMarkId: lateMark.id },
        }),
      );
    } catch (err) {
      logger.error('Failed to notify employee of late mark:', err);
    }

    return lateMark;
  }

  async getEmployeeLateCountThisYear(employeeId: string): Promise<number> {
    const year = new Date().getFullYear();
    return this.lateMarkRepo.countByEmployeeIdInYear(employeeId, year);
  }
}
