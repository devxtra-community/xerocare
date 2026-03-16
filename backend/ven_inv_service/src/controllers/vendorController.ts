import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendorService';

export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Add a new vendor (supplier) to our partner directory.
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
   * List all the vendors we work with.
   *
   * Administrators can see everyone, while other staff members only see
   * vendors associated with their local office branch.
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
   * Get the specific business and contact details for one vendor.
   * Also shows how many orders or items are linked to them in this branch.
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
   * Update a vendor's information (like their phone number or address).
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
   * Remove a vendor from our active partner list.
   * They won't be erased permanently, but they won't show up in our main lists.
   */
  deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.vendorService.deleteVendor(req.params.id as string);

      return res.json({
        success: true,
        message: 'Vendor has been moved to the archive (removed from active list)',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send a formal request for products to a vendor via email.
   * This is used when we want to order new stock.
   */
  requestProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { products, message, total_amount } = req.body;
      const { userId, branchId } = req.user!;

      if (!products) {
        return res
          .status(400)
          .json({ success: false, message: 'A list of products is required to make a request' });
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
        message: 'Your product request has been emailed to the vendor successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * See all the product requests we've ever sent to a specific vendor.
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
   * Get a high-level summary of our vendor data (e.g., total number of vendors).
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
