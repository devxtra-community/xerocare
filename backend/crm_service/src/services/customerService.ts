import { CustomerRepository } from '../repositories/customerRepository';
import { Customer } from '../entities/customerEntity';
import { AppError } from '../errors/appError';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  /**
   * Creates a new customer after checking for duplicates.
   */
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    if (data.email) {
      const existingCustomer = await this.customerRepository.findByEmail(data.email);
      if (existingCustomer) {
        throw new AppError('Email already exists', 409);
      }
    }

    return this.customerRepository.createCustomer(data);
  }

  /**
   * Retrieves all customers, optionally filtered by branch.
   */
  async getAllCustomers(branchId?: string): Promise<Customer[]> {
    return this.customerRepository.findAll(branchId);
  }

  /**
   * Retrieves a single customer by ID.
   */
  async getCustomerById(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }
    return customer;
  }

  /**
   * Updates an existing customer and publishes an update event.
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const updated = await this.customerRepository.updateCustomer(id, data);
    if (!updated) {
      throw new AppError('Customer not found for update', 404);
    }

    if (updated.name) {
      const { publishCustomerUpdated } = await import('../events/publishers/customerPublisher');
      await publishCustomerUpdated({ id: updated.id, name: updated.name });
    }

    return updated;
  }

  /**
   * Soft deletes a customer.
   */
  async deleteCustomer(id: string): Promise<void> {
    const success = await this.customerRepository.deleteCustomer(id);
    if (!success) {
      throw new AppError('Customer not found for deletion', 404);
    }
  }
}
