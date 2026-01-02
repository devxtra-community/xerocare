import { Request, Response } from "express";
import { VendorService } from "../services/vendorService"

export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  createVendor = async (req: Request, res: Response) => {
    const vendor = await this.vendorService.createVendor(req.body);
    return res.status(201).json({
      success: true,
      data: vendor,
    });
  };

  getVendors = async (_req: Request, res: Response) => {
    const vendors = await this.vendorService.getAllVendors();
    return res.json({
      success: true,
      data: vendors,
    });
  };

  getVendorById = async (req: Request, res: Response) => {
    const vendor = await this.vendorService.getVendorById(req.params.id);
    return res.json({
      success: true,
      data: vendor,
    });
  };

  updateVendor = async (req: Request, res: Response) => {
    const vendor = await this.vendorService.updateVendor(
      req.params.id,
      req.body
    );
    return res.json({
      success: true,
      data: vendor,
    });
  };

  deleteVendor = async(req:Request, res:Response)=>{
    await this.vendorService.deleteVendor(req.params.id);

    return res.json({
      success:true,
      message:"vendor deleted successfully"
    })
  }
}
