import { VendorRepository } from "../repositories/vendorRepository";
import { Vendor } from "../entities/vendorEntity";
import { AppError } from "../errors/appError";
import { publishEmailJob } from "../queues/emailPublisher";

interface CreateVendorDTO {
  name: string;
  email: string;
  phone?: string;
}

export class VendorService {
  constructor(private readonly vendorRepo: VendorRepository) {}

  async createVendor(data: CreateVendorDTO): Promise<Vendor> {
    const existingByEmail = await this.vendorRepo.findByEmail(data.email);
    if (existingByEmail) {
      throw new AppError("Vendor email already exists", 409);
    }

    const existingByName = await this.vendorRepo.findByName(data.name);
    if (existingByName) {
      throw new AppError("Vendor name already exists", 409);
    }

    const vendor = this.vendorRepo.create(data);

    await publishEmailJob({
      type: "VENDOR_WELCOME",
      email: vendor.email,
      vendorName: vendor.name,
    });
    return this.vendorRepo.save(vendor);
  }

  async getAllVendors(): Promise<Vendor[]> {
    return this.vendorRepo.find({
      order: { createdAt: "DESC" },
    });
  }

  async getVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }
    return vendor;
  }

  async updateVendor(
    id: string,
    data: Partial<CreateVendorDTO>
  ): Promise<Vendor> {
    const vendor = await this.getVendorById(id);

    Object.assign(vendor, data);
    return this.vendorRepo.save(vendor);
  }
}
