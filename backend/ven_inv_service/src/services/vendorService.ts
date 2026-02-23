import { VendorRepository } from '../repositories/vendorRepository';
import { Vendor, VendorStatus } from '../entities/vendorEntity';
import { AppError } from '../errors/appError';
import { publishEmailJob } from '../queues/emailPublisher';
import { VendorRequestRepository } from '../repositories/vendorRequestRepository';

interface CreateVendorDTO {
  name: string;
  email: string;
  phone?: string;
  type?: 'Supplier' | 'Distributor' | 'Service';
  contactPerson?: string;
  status?: VendorStatus;
}

interface RequestProductsDTO {
  products: string;
  message: string;
  total_amount?: number;
}

import { EmployeeManagerRepository } from '../repositories/employeeManagerRepository';

export class VendorService {
  constructor(
    private readonly vendorRepo: VendorRepository,
    private readonly requestRepo: VendorRequestRepository,
    private readonly employeeManagerRepo: EmployeeManagerRepository,
  ) {}

  /**
   * Creates a new vendor, validating uniqueness and sending a welcome email.
   */
  async createVendor(data: CreateVendorDTO): Promise<Vendor> {
    const existingByEmail = await this.vendorRepo.findByEmail(data.email);
    if (existingByEmail) {
      throw new AppError('Vendor email already exists', 409);
    }

    const existingByName = await this.vendorRepo.findByName(data.name);
    if (existingByName) {
      throw new AppError('Vendor name already exists', 409);
    }

    const vendor = this.vendorRepo.create(data);

    await publishEmailJob({
      type: 'VENDOR_WELCOME',
      email: vendor.email,
      vendorName: vendor.name,
    });
    return this.vendorRepo.save(vendor);
  }

  /**
   * Retrieves all active vendors.
   */
  async getAllVendors(): Promise<Vendor[]> {
    return this.vendorRepo.find({
      where: {
        status: VendorStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a vendor by ID.
   */
  async getVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }
    return vendor;
  }

  /**
   * Updates a vendor's details.
   */
  async updateVendor(id: string, data: Partial<CreateVendorDTO>): Promise<Vendor> {
    const vendor = await this.getVendorById(id);

    Object.keys(data).forEach((key) => {
      const val = (data as unknown as Record<string, unknown>)[key];
      if (val !== undefined) {
        (vendor as unknown as Record<string, unknown>)[key] = val;
      }
    });

    return this.vendorRepo.save(vendor);
  }

  /**
   * Soft deletes a vendor.
   */
  async deleteVendor(id: string) {
    const vendor = await this.vendorRepo.findById(id);

    if (!vendor) {
      throw new AppError('vendor not found', 404);
    }

    if (vendor.status === VendorStatus.DELETED) {
      throw new AppError('Vendor already deleted', 400);
    }

    vendor.status = VendorStatus.DELETED;

    await this.vendorRepo.save(vendor);

    return true;
  }
  /**
   * Creates a product request for a vendor and notifies via email.
   */
  async requestProducts(
    vendorId: string,
    data: RequestProductsDTO,
    userId: string,
    email: string,
    branchId?: string,
  ) {
    const vendor = await this.getVendorById(vendorId);

    // Check if the user exists in the employee manager table
    let manager = await this.employeeManagerRepo.findActiveManager(userId);

    if (!manager) {
      manager = await this.employeeManagerRepo.save({
        employee_id: userId,
        email: email,
        status: 'ACTIVE',
      });
    }

    await this.requestRepo.createRequest({
      vendor_id: vendorId,
      requested_by: userId,
      branch_id: branchId,
      products: data.products,
      message: data.message,
      total_amount: data.total_amount,
    });

    vendor.totalOrders = (vendor.totalOrders || 0) + 1;
    if (data.total_amount) {
      const currentPurchaseValue = Number(vendor.purchaseValue) || 0;
      vendor.purchaseValue = currentPurchaseValue + Number(data.total_amount);
    }
    await this.vendorRepo.save(vendor);

    await publishEmailJob({
      type: 'REQUEST_PRODUCTS',
      email: vendor.email,
      vendorName: vendor.name,
      productList: data.products,
      message: data.message,
    });

    return { success: true, message: 'Product request email sent' };
  }

  /**
   * Retrieves all product requests for a vendor.
   */
  async getVendorRequests(vendorId: string) {
    return this.requestRepo.find({
      where: { vendor_id: vendorId },
      relations: ['branch', 'manager'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Retrieves summary statistics for all vendors.
   */
  async getVendorStats() {
    const total = await this.vendorRepo.count({
      where: {
        status: VendorStatus.ACTIVE,
      },
    });

    const vendors = await this.vendorRepo.find({
      where: {
        status: VendorStatus.ACTIVE,
      },
    });

    const active = vendors.length;
    let totalSpending = 0;
    let totalOrders = 0;

    vendors.forEach((v) => {
      totalSpending += Number(v.purchaseValue) || 0;
      totalOrders += Number(v.totalOrders) || 0;
    });

    return {
      total,
      active,
      totalSpending,
      totalOrders,
    };
  }
}
