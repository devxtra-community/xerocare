import { Source } from '../config/dataSource';
import { Employee, EmployeeStatus } from '../entities/employeeEntities';
import { EmployeeRole } from '../constants/employeeRole';

export class EmployeeRepository {
  private repo = Source.getRepository(Employee);

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async save(employee: Employee) {
    return this.repo.save(employee);
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async createEmployee(data: Partial<Employee>) {
    const employee = this.repo.create(data);
    return this.repo.save(employee);
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.repo.update(userId, {
      password_hash: passwordHash,
    });
  }

  async findAll(skip = 0, take = 20, role?: EmployeeRole, branchId?: string) {
    const whereCondition: Record<string, string | EmployeeRole> = role ? { role } : {};

    // Add branch filter if provided (for non-admin users)
    if (branchId) {
      whereCondition.branch_id = branchId;
    }

    const [data, total] = await this.repo.findAndCount({
      where: whereCondition,
      relations: ['branch'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, total };
  }

  async findByIdSafe(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['branch'],
    });
  }
  async updateById(id: string, payload: Partial<Employee>): Promise<Employee | null> {
    const employee = await this.findById(id);
    if (!employee) return null;

    Object.assign(employee, payload);
    return this.repo.save(employee);
  }

  async count() {
    return this.repo.count();
  }

  async countByStatus(status: EmployeeStatus) {
    return this.repo.count({ where: { status } });
  }

  async countByRole(role: EmployeeRole) {
    return this.repo.count({ where: { role } });
  }

  async countByBranch(branchId: string) {
    return this.repo.count({ where: { branch_id: branchId } });
  }

  async countByStatusAndBranch(status: EmployeeStatus, branchId: string) {
    return this.repo.count({ where: { status, branch_id: branchId } });
  }

  async countByRoleAndBranch(role: EmployeeRole, branchId: string) {
    return this.repo.count({ where: { role, branch_id: branchId } });
  }

  async findLatestDisplayId(prefix: string) {
    const result = await this.repo
      .createQueryBuilder('employee')
      .where('employee.display_id LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('LENGTH(employee.display_id)', 'DESC')
      .addOrderBy('employee.display_id', 'DESC')
      .getOne();
    return result?.display_id;
  }

  async getEmployeeGrowthStats(branchId?: string) {
    const query = this.repo
      .createQueryBuilder('employee')
      .select("TO_CHAR(employee.createdAt, 'Mon')", 'month')
      .addSelect('COUNT(employee.id)', 'count')
      .where('EXTRACT(YEAR FROM employee.createdAt) = EXTRACT(YEAR FROM CURRENT_DATE)');

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', { branchId });
    }

    return query
      .groupBy("TO_CHAR(employee.createdAt, 'Mon')")
      .orderBy('MIN(employee.createdAt)', 'ASC')
      .getRawMany();
  }

  async countBeforeYear(year: number, branchId?: string) {
    const query = this.repo
      .createQueryBuilder('employee')
      .where('EXTRACT(YEAR FROM employee.createdAt) < :year', { year });

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', { branchId });
    }

    return query.getCount();
  }

  async getJobTypeCounts(branchId?: string) {
    const query = this.repo
      .createQueryBuilder('employee')
      .select('employee.employee_job', 'job')
      .addSelect('employee.finance_job', 'financeJob')
      .addSelect('COUNT(employee.id)', 'count');

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', { branchId });
    }

    return query.groupBy('employee.employee_job').addGroupBy('employee.finance_job').getRawMany();
  }
}
