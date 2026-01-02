import { Source } from '../config/dataSource';
import { Employee } from '../entities/employeeEntities';

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

  async findAll(skip = 0, take = 20) {
    const [data, total] = await this.repo.findAndCount({
      select: [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'salary',
        'profile_image_url',
        'createdAt',
        'updatedAt',
        'expire_date',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, total };
  }

  async findByIdSafe(id: string) {
    return this.repo.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'salary',
        'profile_image_url',
        'createdAt',
        'updatedAt',
        'expire_date',
      ],
    });
  }
}
