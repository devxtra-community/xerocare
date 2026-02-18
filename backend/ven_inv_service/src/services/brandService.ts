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
   * Creates a new brand ensuring name uniqueness.
   */
  async createBrand(data: CreateBrandDTO): Promise<Brand> {
    const existing = await this.brandRepo.findByName(data.name);
    if (existing) {
      throw new AppError('Brand name already exists', 409);
    }
    const brand = this.brandRepo.create(data);
    return this.brandRepo.save(brand);
  }

  /**
   * Retrieves all brands sorted by creation date.
   */
  async getAllBrands(): Promise<Brand[]> {
    return this.brandRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Updates a brand's details.
   */
  async updateBrand(id: string, data: Partial<CreateBrandDTO>): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) {
      throw new AppError('Brand not found', 404);
    }

    if (data.name && data.name !== brand.name) {
      const existing = await this.brandRepo.findByName(data.name);
      if (existing) {
        throw new AppError('Brand name already exists', 409);
      }
    }

    Object.assign(brand, data);
    return this.brandRepo.save(brand);
  }

  /**
   * Deletes a brand if no models are associated.
   */
  async deleteBrand(id: string): Promise<void> {
    const brand = await this.brandRepo.findOne({ where: { id }, relations: ['models'] });
    if (!brand) {
      throw new AppError('Brand not found', 404);
    }
    if (brand.models && brand.models.length > 0) {
      throw new AppError('Cannot delete brand with associated models', 400);
    }
    await this.brandRepo.remove(brand);
  }
}
