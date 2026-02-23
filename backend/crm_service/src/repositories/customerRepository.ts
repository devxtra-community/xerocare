import { Customer } from '../entities/customerEntity';
import { Source } from '../config/datasource';

export class CustomerRepository {
  private get repo() {
    return Source.getRepository(Customer);
  }

  /**
   * Creates a new customer entity.
   */
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const customer = this.repo.create(data);
    return this.repo.save(customer);
  }

  /**
   * Finds a customer by ID.
   */
  async findById(id: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Retrieves all customers.
   */
  async findAll(): Promise<Customer[]> {
    return this.repo.find();
  }

  /**
   * Finds a customer by email.
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { email } });
  }

  /**
   * Updates a customer.
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Soft deletes a customer.
   */
  async deleteCustomer(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }
}
