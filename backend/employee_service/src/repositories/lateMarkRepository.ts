import { Repository } from 'typeorm';
import { LateMark } from '../entities/lateMarkEntity';
import { Source } from '../config/dataSource';

export class LateMarkRepository {
  private repo: Repository<LateMark>;

  constructor() {
    this.repo = Source.getRepository(LateMark);
  }

  async create(data: Partial<LateMark>) {
    const lateMark = this.repo.create(data);
    return this.repo.save(lateMark);
  }

  async findByEmployeeAndDate(employeeId: string, date: Date) {
    return this.repo.findOne({ where: { employee_id: employeeId, date } });
  }

  async countByEmployeeIdInYear(employeeId: string, year: number): Promise<number> {
    return this.repo
      .createQueryBuilder('lateMark')
      .where('lateMark.employee_id = :employeeId', { employeeId })
      .andWhere('EXTRACT(YEAR FROM lateMark.date) = :year', { year })
      .getCount();
  }
}
