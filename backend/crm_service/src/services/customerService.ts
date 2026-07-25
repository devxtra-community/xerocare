import { CustomerRepository } from '../repositories/customerRepository';
import { Customer, CustomerVatStatus, CustomerExemptionReason } from '../entities/customerEntity';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

// Server-side backstop — the frontend form also enforces this, but the API must
// not accept EXEMPT without a reason regardless of caller (never trust the client
// alone for a compliance-relevant field).
function validateVatFields(data: Partial<Customer>): void {
  if (data.vatStatus === undefined) return;
  if (!Object.values(CustomerVatStatus).includes(data.vatStatus)) {
    throw new AppError(`Invalid vatStatus: ${data.vatStatus}`, 400);
  }
  if (data.vatStatus === CustomerVatStatus.EXEMPT) {
    if (
      !data.exemptionReason ||
      !Object.values(CustomerExemptionReason).includes(data.exemptionReason)
    ) {
      throw new AppError(
        'exemptionReason is required and must be a valid reason when vatStatus is EXEMPT',
        400,
      );
    }
  } else if (data.exemptionReason) {
    // Not exempt — an exemption reason on a Registered/Unregistered-Standard
    // customer would be stale/misleading data, so it's cleared rather than kept.
    data.exemptionReason = null;
  }
}

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
        logger.warn('Customer creation failed: Email already exists', { email: data.email });
        throw new AppError('Email already exists', 409);
      }
    }
    validateVatFields(data);

    const customer = await this.customerRepository.createCustomer(data);
    logger.info('Customer created successfully', { customerId: customer.id });
    return customer;
  }

  /**
   * Retrieves all customers, optionally filtered by branch.
   */
  async getAllCustomers(branchId?: string): Promise<Customer[]> {
    return this.customerRepository.findAll(branchId);
  }

  /**
   * Retrieves a customer by email address.
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepository.findByEmail(email);
  }

  /**
   * Retrieves a single customer by ID.
   */
  async getCustomerById(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      logger.warn('Customer not found', { customerId: id });
      throw new AppError('Customer not found', 404);
    }
    return customer;
  }

  /**
   * Updates an existing customer and publishes an update event.
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    validateVatFields(data);
    const updated = await this.customerRepository.updateCustomer(id, data);
    if (!updated) {
      logger.warn('Customer update failed: Not found', { customerId: id });
      throw new AppError('Customer not found for update', 404);
    }

    logger.info('Customer updated successfully', { customerId: id });

    if (updated.name) {
      try {
        const { publishCustomerUpdated } = await import('../events/publishers/customerPublisher');
        await publishCustomerUpdated({ id: updated.id, name: updated.name });
      } catch (err) {
        logger.error('Failed to publish customer update event', { customerId: id, error: err });
      }
    }

    return updated;
  }

  /**
   * Soft deletes a customer.
   */
  async deleteCustomer(id: string): Promise<void> {
    const success = await this.customerRepository.deleteCustomer(id);
    if (!success) {
      logger.warn('Customer deletion failed: Not found', { customerId: id });
      throw new AppError('Customer not found for deletion', 404);
    }
    logger.info('Customer deleted successfully', { customerId: id });
  }

  /**
   * Hard deletes a customer row. Only for compensating a failed lead conversion
   * where the Postgres insert succeeded but the MongoDB update failed, and the
   * row has no other references yet.
   */
  async hardDeleteCustomer(id: string): Promise<void> {
    await this.customerRepository.hardDeleteCustomer(id);
    logger.info('Customer hard-deleted (compensation)', { customerId: id });
  }
}
