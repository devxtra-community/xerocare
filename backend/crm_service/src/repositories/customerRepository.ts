import { Customer } from '../entities/customerEntity';
import { Source } from '../config/datasource';

export class CustomerRepository {
  private get repo() {
    return Source.getRepository(Customer);
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const customer = this.repo.create(data);
    return this.repo.save(customer);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Customer[]> {
    return this.repo.find();
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { email } });
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // Soft delete: set isActive to false
    const result = await this.repo.update(id, { isActive: false });
    // Also ensuring we return boolean
    return (result.affected ?? 0) > 0;
  }
}
