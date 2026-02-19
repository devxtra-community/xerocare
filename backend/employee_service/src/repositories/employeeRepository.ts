import { Source } from '../config/dataSource';
import { Employee, EmployeeStatus } from '../entities/employeeEntities';
import { EmployeeRole } from '../constants/employeeRole';

export class EmployeeRepository {
  private repo = Source.getRepository(Employee);

  /**
   * Finds an employee by email.
   */
  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  /**
   * Saves an employee entity.
   */
  async save(employee: Employee) {
    return this.repo.save(employee);
  }

  /**
   * Finds an employee by ID.
   */
  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Creates and saves a new employee.
   */
  async createEmployee(data: Partial<Employee>) {
    const employee = this.repo.create(data);
    return this.repo.save(employee);
  }

  /**
   * Updates an employee's password hash.
   */
  async updatePassword(userId: string, passwordHash: string) {
    return this.repo.update(userId, {
      password_hash: passwordHash,
    });
  }

  /**
   * Retrieves paginated employees with optional filtering.
   */
  async findAll(skip = 0, take = 20, role?: EmployeeRole, branchId?: string) {
    const whereCondition: Record<string, string | EmployeeRole> = role ? { role } : {};

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

  /**
   * Finds an employee by ID, including branch relation.
   */
  async findByIdSafe(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['branch'],
    });
  }
  /**
   * Updates an employee by ID.
   */
  async updateById(id: string, payload: Partial<Employee>): Promise<Employee | null> {
    const employee = await this.findById(id);
    if (!employee) return null;

    Object.assign(employee, payload);
    return this.repo.save(employee);
  }

  /**
   * Counts total employees.
   */
  async count() {
    return this.repo.count();
  }

  /**
   * Counts employees by status.
   */
  async countByStatus(status: EmployeeStatus) {
    return this.repo.count({ where: { status } });
  }

  /**
   * Counts employees by role.
   */
  async countByRole(role: EmployeeRole) {
    return this.repo.count({ where: { role } });
  }

  /**
   * Counts employees by branch.
   */
  async countByBranch(branchId: string) {
    return this.repo.count({ where: { branch_id: branchId } });
  }

  /**
   * Counts employees by status and branch.
   */
  async countByStatusAndBranch(status: EmployeeStatus, branchId: string) {
    return this.repo.count({ where: { status, branch_id: branchId } });
  }

  /**
   * Counts employees by role and branch.
   */
  async countByRoleAndBranch(role: EmployeeRole, branchId: string) {
    return this.repo.count({ where: { role, branch_id: branchId } });
  }

  /**
   * Finds the latest display ID for a given prefix.
   */
  async findLatestDisplayId(prefix: string) {
    const result = await this.repo
      .createQueryBuilder('employee')
      .where('employee.display_id LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('LENGTH(employee.display_id)', 'DESC')
      .addOrderBy('employee.display_id', 'DESC')
      .getOne();
    return result?.display_id;
  }

  /**
   * Retrieves employee growth statistics for the current year.
   */
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

  /**
   * Counts employees created before a given year.
   */
  async countBeforeYear(year: number, branchId?: string) {
    const query = this.repo
      .createQueryBuilder('employee')
      .where('EXTRACT(YEAR FROM employee.createdAt) < :year', { year });

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', { branchId });
    }

    return query.getCount();
  }

  /**
   * Retrieves counts of employees by job type.
   */
  async getJobTypeCounts(branchId?: string) {
    const query = this.repo
      .createQueryBuilder('employee')
      .select('employee.employee_job', 'job')
      .addSelect('employee.finance_job', 'financeJob')
      .addSelect('employee.role', 'role')
      .addSelect('COUNT(employee.id)', 'count')
      .addSelect('SUM(COALESCE(employee.salary, 0))', 'totalSalary');

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', { branchId });
    }

    return query
      .groupBy('employee.employee_job')
      .addGroupBy('employee.finance_job')
      .addGroupBy('employee.role')
      .getRawMany();
  }
}
