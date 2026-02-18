import { Source } from '../config/db';
import { EmployeeManager } from '../entities/employeeManagerEntity';

export class EmployeeManagerRepository {
  private get repo() {
    return Source.getRepository(EmployeeManager);
  }

  /**
   * Finds an active manager by employee ID.
   */
  async findActiveManager(employeeId: string) {
    return this.repo.findOne({
      where: {
        employee_id: employeeId,
        status: 'ACTIVE',
      },
    });
  }
}
