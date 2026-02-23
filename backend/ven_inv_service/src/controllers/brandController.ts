import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/brandService';

export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  /**
   * Creates a new brand.
   */
  createBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const brand = await this.brandService.createBrand(req.body, branchId);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves all brands, optionally filtered by branch.
   */
  getAllBrands = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const brands = await this.brandService.getAllBrands(filteredBranchId);
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
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const brand = await this.brandService.updateBrand(
        req.params.id as string,
        req.body,
        filteredBranchId,
      );
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
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      await this.brandService.deleteBrand(req.params.id as string, filteredBranchId);
      res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
