import { Request, Response, NextFunction } from 'express';
import { RfqService } from '../services/rfqService';
import * as xlsx from 'xlsx';
import { AppError } from '../errors/appError';

export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  createRfq = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, vendorIds } = req.body;
      const { branchId, userId } = req.user!;

      const rfq = await this.rfqService.createRfq({
        branchId: branchId as string,
        createdBy: userId,
        items,
        vendorIds,
      });

      return res.status(201).json({ success: true, data: rfq });
    } catch (error) {
      next(error);
    }
  };

  sendRfq = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rfq = await this.rfqService.sendRfq(req.params.id as string);
      return res.json({ success: true, data: rfq });
    } catch (error) {
      next(error);
    }
  };

  enterQuoteManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vendorId, quotes } = req.body;
      const rfqVendor = await this.rfqService.enterQuote(req.params.id as string, vendorId, quotes);
      return res.json({ success: true, data: rfqVendor });
    } catch (error) {
      next(error);
    }
  };

  uploadItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const { vendorIds } = req.body;
      const { branchId, userId } = req.user!;

      // vendorIds might be a string if sent via FormData, parse it
      const parsedVendorIds = typeof vendorIds === 'string' ? JSON.parse(vendorIds) : vendorIds;

      const rfq = await this.rfqService.uploadRfqItems(
        req.file.buffer,
        branchId as string,
        userId,
        parsedVendorIds,
      );

      return res.status(201).json({ success: true, data: rfq });
    } catch (error) {
      next(error);
    }
  };

  enterQuoteExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const vendorId = req.params.vendorId as string;
      const rfqId = req.params.id as string;

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<
        string,
        unknown
      >[];

      const quotes = data.map((row: Record<string, unknown>) => {
        // model_id (strict) is used to match, but we need rfqItemId from the system
        // However, the service uses rfqItemId.
        // The vendor Excel should contain something to link it back, like rfqItemId hidden or just use model_id if we have it.
        // Re-reading user request: "model_id will be filled by user... vendor will fill unit price..."
        // I will add model_id to rfqItemId mapping in rfqService or just use model_id here if possible.
        // BEST: The Excel sent to vendor should have ID columns they shouldn't touch.

        const rfqItemId = (row.rfq_item_id || row.id) as string;
        if (!rfqItemId) throw new AppError('Missing item identifier in Excel', 400);

        const unitPrice = parseFloat(row.unit_price as string);
        const stockStatus = String(row.stock_status || '').toUpperCase();
        const availableQuantity = parseInt(row.available_quantity as string);
        const estimatedShipmentDate = row.estimated_shipment_date as string | number | Date;
        const vendorNote = (row.vendor_note as string) || undefined;

        if (isNaN(unitPrice)) throw new AppError(`Invalid unitPrice for item ${rfqItemId}`, 400);
        if (!['IN_STOCK', 'OUT_OF_STOCK', 'ON_PRODUCTION'].includes(stockStatus)) {
          throw new AppError(
            `Invalid stock_status for item ${rfqItemId}. Must be IN_STOCK, OUT_OF_STOCK, or ON_PRODUCTION`,
            400,
          );
        }

        return {
          rfqItemId,
          unitPrice,
          stockStatus: stockStatus as 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_PRODUCTION',
          availableQuantity: isNaN(availableQuantity) ? 0 : availableQuantity,
          estimatedShipmentDate: estimatedShipmentDate
            ? new Date(estimatedShipmentDate)
            : undefined,
          vendorNote,
        };
      });

      const rfqVendor = await this.rfqService.enterQuote(rfqId, vendorId, quotes);

      return res.json({ success: true, data: rfqVendor });
    } catch (error) {
      next(error);
    }
  };

  getComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comparison = await this.rfqService.getComparison(req.params.id as string);
      return res.json({ success: true, data: comparison });
    } catch (error) {
      next(error);
    }
  };

  awardVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.rfqService.awardVendor(
        req.params.id as string,
        req.params.vendorId as string,
      );
      return res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createLot = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lot = await this.rfqService.createLotFromRfq(req.params.id as string, req.user!.userId);
      return res.json({ success: true, data: lot });
    } catch (error) {
      next(error);
    }
  };

  getAllRfqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
      const rfqs = await this.rfqService.getAllRfqs(branchId);
      return res.json({ success: true, data: rfqs });
    } catch (error) {
      next(error);
    }
  };

  getRfqById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rfq = await this.rfqService.getRfqById(req.params.id as string);
      if (!rfq) throw new AppError('RFQ not found', 404);
      return res.json({ success: true, data: rfq });
    } catch (error) {
      next(error);
    }
  };
}
