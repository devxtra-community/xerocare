import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendorService';

export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await this.vendorService.createVendor(req.body);

      return res.status(201).json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  getVendors = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const vendors = await this.vendorService.getAllVendors();

      return res.json({
        success: true,
        data: vendors,
      });
    } catch (error) {
      next(error);
    }
  };

  getVendorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await this.vendorService.getVendorById(req.params.id as string);

      return res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  updateVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await this.vendorService.updateVendor(req.params.id as string, req.body);

      return res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.vendorService.deleteVendor(req.params.id as string);

      return res.json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  requestProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { products, message } = req.body;
      const { userId, branchId } = req.user!; // Auth middleware ensures user exists

      if (!products) {
        return res.status(400).json({ success: false, message: 'Product list is required' });
      }

      await this.vendorService.requestProducts(
        req.params.id as string,
        { products, message },
        userId,
        branchId,
      );

      return res.json({
        success: true,
        message: 'Product request email sent successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getVendorRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await this.vendorService.getVendorRequests(req.params.id as string);
      return res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  };
}
