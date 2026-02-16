import bcrypt from 'bcrypt';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { EmployeeRole } from '../constants/employeeRole';
import { generateRandomPassword } from '../utlis/passwordGenerator';
import { getSignedIdProofUrl } from '../utlis/r2SignedUrl';
import { publishEmailJob } from '../queues/emailProducer';
import { AppError } from '../errors/appError';
import { EmployeeStatus } from '../entities/employeeEntities';
import { EmployeeJob } from '../constants/employeeJob';
import { FinanceJob } from '../constants/financeJob';
import { publishEmployeeEvent } from '../events/publishers/eventPublisher';
import { EmployeeEventType } from '../events/employeeEvents';
import { logger } from '../config/logger';
import { Source } from '../config/dataSource';
import { Branch } from '../entities/branchEntity';

interface GrowthStat {
  month: string;
  count: string;
}

interface JobCountStat {
  job: string | null;
  financeJob: string | null;
  count: string;
}

export class EmployeeService {
  private employeeRepo = new EmployeeRepository();

  /**
   * Adds a new employee, validating unique email and role constraints.
   */
  async addEmployee(payload: {
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
    employee_job?: EmployeeJob;
    finance_job?: FinanceJob;
    expireDate?: Date;
    salary?: number | null;
    profile_image_url?: string | null;
    id_proof_key?: string | null;
    branchId?: string;
  }) {
    const {
      first_name,
      last_name,
      email,
      role,
      employee_job,
      finance_job,
      expireDate,
      salary,
      profile_image_url,
      id_proof_key,
      branchId,
    } = payload;

    const existing = await this.employeeRepo.findByEmail(email);
    if (existing) {
      throw new AppError('Employee already Exist', 409);
    }

    if (role === EmployeeRole.ADMIN) {
      throw new AppError('You cannot create another admin', 403);
    }

    if (payload.role && !Object.values(EmployeeRole).includes(payload.role as EmployeeRole)) {
      throw new AppError('Invalid role', 400);
    }

    const roleEnum = (role ?? EmployeeRole.EMPLOYEE) as EmployeeRole;

    if (employee_job && !Object.values(EmployeeJob).includes(employee_job)) {
      throw new AppError('Invalid employee job', 400);
    }

    if (roleEnum === EmployeeRole.EMPLOYEE && !employee_job) {
      throw new AppError('Employee job is required for EMPLOYEE role', 400);
    }

    if (finance_job && !Object.values(FinanceJob).includes(finance_job)) {
      throw new AppError('Invalid finance job', 400);
    }

    if (roleEnum === EmployeeRole.FINANCE && !finance_job) {
      throw new AppError('Finance job is required for FINANCE role', 400);
    }

    if (branchId) {
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { branch_id: branchId } });
      if (!branch) {
        throw new AppError('Invalid Branch ID', 400);
      }
    }

    const prefix =
      roleEnum === EmployeeRole.ADMIN
        ? 'A'
        : roleEnum === EmployeeRole.HR
          ? 'H'
          : roleEnum === EmployeeRole.MANAGER
            ? 'M'
            : roleEnum === EmployeeRole.FINANCE
              ? 'F'
              : 'E';

    const lastDisplayId = await this.employeeRepo.findLatestDisplayId(prefix);
    let nextNum = 1;
    if (lastDisplayId) {
      const numPart = lastDisplayId.substring(prefix.length);
      if (!isNaN(Number(numPart))) {
        nextNum = Number(numPart) + 1;
      }
    }
    const display_id = `${prefix}${String(nextNum).padStart(2, '0')}`;

    const plainPassword = generateRandomPassword();

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const employee = await this.employeeRepo.createEmployee({
      first_name,
      last_name,
      email,
      display_id,
      password_hash: passwordHash,
      role: roleEnum,
      employee_job: employee_job ?? null,
      finance_job: finance_job ?? null,
      salary: salary ?? null,
      profile_image_url: profile_image_url ?? null,
      id_proof_key: id_proof_key ?? null,
      expire_date: expireDate ?? null,
      branch_id: branchId ?? null,
    });

    await publishEmployeeEvent(EmployeeEventType.CREATED, {
      employeeId: employee.id,
      email: employee.email,
      role: employee.role,
      status: employee.status,
      name: `${employee.first_name} ${employee.last_name}`,
    });

    publishEmailJob({
      type: 'WELCOME',
      email,
      password: plainPassword,
    }).catch((err) => logger.error('Failed to publish employee welcome email job', err));

    return employee;
  }

  /**
   * Generates a signed URL for the employee's ID proof.
   */
  async getEmployeeIdProof(employeeId: string) {
    const employee = await this.employeeRepo.findById(employeeId);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.id_proof_key) {
      throw new AppError('No ID proof uploaded', 404);
    }

    const signedUrl = await getSignedIdProofUrl(employee.id_proof_key);

    return {
      url: signedUrl,
      expiresIn: '5 minutes',
    };
  }

  /**
   * Retrieves paginated list of employees.
   */
  async getAllEmployees(page = 1, limit = 20, role?: EmployeeRole, branchId?: string) {
    const skip = (page - 1) * limit;

    const { data, total } = await this.employeeRepo.findAll(skip, limit, role, branchId);

    return {
      employees: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single employee by ID, ensuring they exist.
   */
  async getEmployeeById(id: string) {
    const employee = await this.employeeRepo.findByIdSafe(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return employee;
  }

  /**
   * Retrieves public profile data for an employee.
   */
  async getPublicEmployeeProfile(id: string) {
    const employee = await this.employeeRepo.findByIdSafe(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      role: employee.role,
      branchId: employee.branch_id,
    };
  }

  /**
   * Updates an employee's details, handling file uploads and role/job validation.
   */
  async updateEmployee(
    id: string,
    payload: {
      first_name?: string;
      last_name?: string;
      role?: EmployeeRole;
      employee_job?: EmployeeJob | null;
      finance_job?: FinanceJob | null;
      salary?: number | null;
      profile_image_url?: string | null;
      id_proof_key?: string | null;
      expireDate?: Date | null;
      status?: EmployeeStatus;
      branchId?: string | null;
    },
  ) {
    const employee = await this.employeeRepo.findById(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (employee.status === EmployeeStatus.DELETED) {
      throw new AppError('Cannot update deleted employee', 400);
    }

    if (payload.role && !Object.values(EmployeeRole).includes(payload.role)) {
      throw new AppError('Invalid role', 400);
    }

    if (payload.employee_job !== undefined && payload.employee_job !== null) {
      if (!Object.values(EmployeeJob).includes(payload.employee_job)) {
        throw new AppError('Invalid employee job', 400);
      }
    }

    if (payload.finance_job !== undefined && payload.finance_job !== null) {
      if (!Object.values(FinanceJob).includes(payload.finance_job)) {
        throw new AppError('Invalid finance job', 400);
      }
    }

    if (payload.branchId) {
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { branch_id: payload.branchId } });
      if (!branch) {
        throw new AppError('Invalid Branch ID', 400);
      }
    }

    const updated = await this.employeeRepo.updateById(id, {
      ...payload,
      expire_date: payload.expireDate !== undefined ? payload.expireDate : employee.expire_date,
      branch_id: payload.branchId !== undefined ? payload.branchId : employee.branch_id,
    });

    if (!updated) {
      throw new AppError('Failed to update employee', 500);
    }

    await publishEmployeeEvent(EmployeeEventType.UPDATED, {
      employeeId: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      name: `${updated.first_name} ${updated.last_name}`,
    });

    return updated;
  }

  /**
   * Soft deletes an employee (sets status to INACTIVE).
   */
  async deleteEmployee(id: string) {
    const employee = await this.employeeRepo.findById(id);

    if (!employee) {
      throw new AppError('Employee not exist', 404);
    }

    // Toggle status to INACTIVE instead of hard delete
    const updated = await this.employeeRepo.updateById(id, { status: EmployeeStatus.INACTIVE });

    await publishEmployeeEvent(EmployeeEventType.DELETED, {
      employeeId: employee.id,
    });

    return !!updated;
  }

  /**
   * Aggregates HR statistics for the dashboard.
   */
  async getHRStats(branchId?: string) {
    const total = branchId
      ? await this.employeeRepo.countByBranch(branchId)
      : await this.employeeRepo.count();

    const active = branchId
      ? await this.employeeRepo.countByStatusAndBranch(EmployeeStatus.ACTIVE, branchId)
      : await this.employeeRepo.countByStatus(EmployeeStatus.ACTIVE);

    const inactive = branchId
      ? await this.employeeRepo.countByStatusAndBranch(EmployeeStatus.INACTIVE, branchId)
      : await this.employeeRepo.countByStatus(EmployeeStatus.INACTIVE);

    const roles = Object.values(EmployeeRole);
    const byRole: Record<string, number> = {};

    for (const role of roles) {
      byRole[role] = branchId
        ? await this.employeeRepo.countByRoleAndBranch(role as EmployeeRole, branchId)
        : await this.employeeRepo.countByRole(role as EmployeeRole);
    }

    const rawGrowthData = await this.employeeRepo.getEmployeeGrowthStats(branchId);

    const monthsOrder = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const currentYear = new Date().getFullYear();
    const baseCount = await this.employeeRepo.countBeforeYear(currentYear, branchId);
    let cumulativeCount = baseCount;

    const growthMap = new Map<string, number>();
    rawGrowthData.forEach((item: GrowthStat) => {
      growthMap.set(item.month.trim(), parseInt(item.count, 10));
    });

    const growthData = monthsOrder.map((month) => {
      const count = growthMap.get(month) || 0;
      cumulativeCount += count;
      return { month, count: cumulativeCount };
    });

    const jobCounts = await this.employeeRepo.getJobTypeCounts(branchId);

    const byJob: Record<string, number> = {};
    jobCounts.forEach((item: JobCountStat) => {
      if (item.financeJob) {
        byJob[item.financeJob] = (byJob[item.financeJob] || 0) + parseInt(item.count, 10);
      } else if (item.job) {
        byJob[item.job] = (byJob[item.job] || 0) + parseInt(item.count, 10);
      } else {
        byJob['OTHER'] = (byJob['OTHER'] || 0) + parseInt(item.count, 10);
      }
    });

    return {
      total,
      active,
      inactive,
      byRole,
      byJob,
      growthData,
    };
  }
}
