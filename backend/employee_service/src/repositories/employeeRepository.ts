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

  async findAll(skip = 0, take = 20, role?: EmployeeRole) {
    const whereCondition = role ? { role } : {};

    const [data, total] = await this.repo.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, total };
  }

  async findByIdSafe(id: string) {
    return this.repo.findOne({
      where: { id },
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
}
