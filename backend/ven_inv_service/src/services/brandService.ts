import { BrandRepository } from '../repositories/brandRepository';
import { Brand, BrandStatus } from '../entities/brandEntity';
import { AppError } from '../errors/appError';

interface CreateBrandDTO {
  name: string;
  description?: string;
  status?: BrandStatus;
}

export class BrandService {
  constructor(private readonly brandRepo: BrandRepository) {}

  /**
   * Creates a new brand ensuring name uniqueness within the branch.
   */
  async createBrand(data: CreateBrandDTO, branchId?: string): Promise<Brand> {
    const existing = await this.brandRepo.findByName(data.name, branchId);
    if (existing) {
      throw new AppError('Brand name already exists in this branch', 409);
    }
    const brand = this.brandRepo.create({ ...data, branch_id: branchId });
    return this.brandRepo.save(brand);
  }

  /**
   * Retrieves all brands, optionally filtered by branch.
   */
  async getAllBrands(branchId?: string): Promise<Brand[]> {
    return this.brandRepo.findAll(branchId);
  }

  /**
   * Updates a brand's details, ensuring branch ownership.
   */
  async updateBrand(id: string, data: Partial<CreateBrandDTO>, branchId?: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) {
      throw new AppError('Brand not found', 404);
    }

    if (branchId && brand.branch_id && brand.branch_id !== branchId) {
      throw new AppError('Unauthorized: Brand belongs to another branch', 403);
    }

    if (data.name && data.name !== brand.name) {
      const existing = await this.brandRepo.findByName(data.name, branchId);
      if (existing) {
        throw new AppError('Brand name already exists in this branch', 409);
      }
    }

    Object.assign(brand, data);
    return this.brandRepo.save(brand);
  }

  /**
   * Deletes a brand if no models are associated and branch ownership matches.
   */
  async deleteBrand(id: string, branchId?: string): Promise<void> {
    const brand = await this.brandRepo.findOne({ where: { id }, relations: ['models'] });
    if (!brand) {
      throw new AppError('Brand not found', 404);
    }

    if (branchId && brand.branch_id && brand.branch_id !== branchId) {
      throw new AppError('Unauthorized: Brand belongs to another branch', 403);
    }

    if (brand.models && brand.models.length > 0) {
      throw new AppError('Cannot delete brand with associated models', 400);
    }
    await this.brandRepo.remove(brand);
  }
}
