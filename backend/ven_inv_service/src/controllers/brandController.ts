import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/brandService';

export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  /**
   * Creates a new brand.
   */
  createBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const brand = await this.brandService.createBrand(req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves all brands.
   */
  getAllBrands = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const brands = await this.brandService.getAllBrands();
      res.json({ success: true, data: brands });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates a brand.
   */
  updateBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const brand = await this.brandService.updateBrand(req.params.id as string, req.body);
      res.json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a brand.
   */
  deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.brandService.deleteBrand(req.params.id as string);
      res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
