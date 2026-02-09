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
}

export class VendorService {
  constructor(
    private readonly vendorRepo: VendorRepository,
    private readonly requestRepo: VendorRequestRepository,
  ) {}

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

  async getAllVendors(): Promise<Vendor[]> {
    return this.vendorRepo.find({
      where: {
        status: VendorStatus.ACTIVE, // Only Active vendors for the list (soft delete filtering)
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }
    return vendor;
  }

  async updateVendor(id: string, data: Partial<CreateVendorDTO>): Promise<Vendor> {
    const vendor = await this.getVendorById(id);

    // Filter out undefined values and update
    Object.keys(data).forEach((key) => {
      const val = (data as unknown as Record<string, unknown>)[key];
      if (val !== undefined) {
        (vendor as unknown as Record<string, unknown>)[key] = val;
      }
    });

    return this.vendorRepo.save(vendor);
  }

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
  async requestProducts(
    vendorId: string,
    data: RequestProductsDTO,
    userId: string,
    branchId?: string,
  ) {
    const vendor = await this.getVendorById(vendorId);

    // Save history
    await this.requestRepo.createRequest({
      vendor_id: vendorId,
      requested_by: userId,
      branch_id: branchId,
      products: data.products,
      message: data.message,
    });

    await publishEmailJob({
      type: 'REQUEST_PRODUCTS',
      email: vendor.email,
      vendorName: vendor.name,
      productList: data.products,
      message: data.message,
    });

    return { success: true, message: 'Product request email sent' };
  }

  async getVendorRequests(vendorId: string) {
    return this.requestRepo.find({
      where: { vendor_id: vendorId },
      order: { created_at: 'DESC' },
    });
  }
}
