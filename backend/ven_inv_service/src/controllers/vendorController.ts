import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendorService';

export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Creates a new vendor.
   */
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

  /**
   * Retrieves all active vendors, optionally filtered by branch.
   */
  getVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const vendors = await this.vendorService.getAllVendors(filteredBranchId);

      return res.json({
        success: true,
        data: vendors,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves a vendor by ID, with branch-specific stats.
   */
  getVendorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const vendor = await this.vendorService.getVendorById(
        req.params.id as string,
        filteredBranchId,
      );

      return res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates a vendor.
   */
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

  /**
   * Soft deletes a vendor.
   */
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

  /**
   * Sends a product request to a vendor.
   */
  requestProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { products, message, total_amount } = req.body;
      const { userId, branchId } = req.user!;

      if (!products) {
        return res.status(400).json({ success: false, message: 'Product list is required' });
      }

      await this.vendorService.requestProducts(
        req.params.id as string,
        { products, message, total_amount },
        userId,
        req.user!.email!,
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

  /**
   * Retrieves all requests made to a vendor, optionally filtered by branch.
   */
  getVendorRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const requests = await this.vendorService.getVendorRequests(
        req.params.id as string,
        filteredBranchId,
      );
      return res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves summary statistics for all vendors, optionally filtered by branch.
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const stats = await this.vendorService.getVendorStats(filteredBranchId);
      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
