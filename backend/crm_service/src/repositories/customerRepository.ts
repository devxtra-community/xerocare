import { Customer } from '../entities/customerEntity';
import { Source } from '../config/datasource';

// Real, settable columns on Customer — deliberately excludes id/createdAt/updatedAt
// (auto-managed, never client-settable). Callers (controller → service → here) pass
// through whatever the request body contains, which has included stray fields with
// no matching column (e.g. a frontend form's `status`/`totalPurchase`/`source`) —
// harmless for `repo.create()` + `save()` (entity-metadata-based, silently ignores
// unknown properties), but `repo.update()` builds its SET clause directly from the
// given object's own keys and throws when one doesn't map to a real column. Filtering
// here, once, protects both create and update the same way rather than requiring
// every caller to already send an exactly-clean payload.
const CUSTOMER_COLUMNS = [
  'name',
  'email',
  'phone',
  'location',
  'address',
  'vatNumber',
  'vatStatus',
  'exemptionReason',
  'customerType',
  'country',
  'stateProvince',
  'city',
  'bankName',
  'bankAccountNumber',
  'bankAccounts',
  'isActive',
  'branch_id',
  'createdBy',
  'updatedBy',
] as const;

function pickCustomerColumns(data: Partial<Customer>): Partial<Customer> {
  const picked: Partial<Customer> = {};
  for (const key of CUSTOMER_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      (picked as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
    }
  }
  return picked;
}

export class CustomerRepository {
  private get repo() {
    return Source.getRepository(Customer);
  }

  /**
   * Creates a new customer entity.
   */
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const customer = this.repo.create(pickCustomerColumns(data));
    return this.repo.save(customer);
  }

  /**
   * Finds a customer by ID.
   */
  async findById(id: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Retrieves all customers, optionally filtered by branch.
   */
  async findAll(branchId?: string): Promise<Customer[]> {
    const where: { branch_id?: string } = {};
    if (branchId) {
      where.branch_id = branchId;
    }
    return this.repo.find({ where });
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
    await this.repo.update(id, pickCustomerColumns(data));
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Soft deletes a customer.
   */
  async deleteCustomer(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Hard deletes a customer row. Used only as a compensating action when a
   * create-then-update sequence fails mid-way and the row has no dependants yet.
   */
  async hardDeleteCustomer(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
