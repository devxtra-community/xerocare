import { CustomerRepository } from '../repositories/customerRepository';
import { Customer } from '../entities/customerEntity';
import { AppError } from '../errors/appError';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    if (data.email) {
      const existingCustomer = await this.customerRepository.findByEmail(data.email);
      if (existingCustomer) {
        throw new AppError('Email already exists', 409);
      }
    }

    return this.customerRepository.createCustomer(data);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.customerRepository.findAll();
  }

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }
    return customer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const updated = await this.customerRepository.updateCustomer(id, data);
    if (!updated) {
      throw new AppError('Customer not found for update', 404);
    }
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    const success = await this.customerRepository.deleteCustomer(id);
    if (!success) {
      throw new AppError('Customer not found for deletion', 404);
    }
  }
}
