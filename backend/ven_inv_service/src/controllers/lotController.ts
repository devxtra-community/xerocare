import { NextFunction, Request, Response } from 'express';
import { LotService } from '../services/lotService';

const lotService = new LotService();

/**
 * Creates a new lot.
 */
export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const lotData = { ...req.body, branchId };
    const lot = await lotService.createLot(lotData);
    res.status(201).json({ success: true, data: lot });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all lots, optionally filtered by the user's branch.
 */
export const getAllLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';

    // Admins see all, others only their branch
    const filteredBranchId = isAdmin ? undefined : branchId;

    const lots = await lotService.getAllLots(filteredBranchId);
    res.status(200).json({ success: true, data: lots });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single lot by ID.
 */
export const getLotById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lot = await lotService.getLotById(id);
    res.status(200).json({ success: true, data: lot });
  } catch (err) {
    next(err);
  }
};

/**
 * Generates and downloads an Excel report for a lot.
 */
export const downloadLotExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const buffer = await lotService.generateExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-export-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Uploads an Excel file to create/update a lot.
 */
export const uploadLotExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new Error('Branch ID is required for upload');
    }
    const lot = await lotService.processExcelUpload(req.file.buffer, branchId);

    res.status(201).json({
      success: true,
      message: 'Lot created successfully from Excel',
      data: lot,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Downloads an Excel report of products in a lot.
 */
export const downloadLotProductsExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const buffer = await lotService.generateProductsExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-products-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Downloads an Excel report of spare parts in a lot.
 */
export const downloadLotSparePartsExcel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const buffer = await lotService.generateSparePartsExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-spareparts-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Checks if a lot number already exists.
 */
export const checkLotNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lotNumberRaw = req.params.lotNumber;
    const lotNumber = Array.isArray(lotNumberRaw) ? lotNumberRaw[0] : lotNumberRaw;

    if (!lotNumber) {
      return res.status(400).json({ success: false, message: 'Lot number is required' });
    }
    const lot = await lotService.getLotByNumber(lotNumber);
    res.status(200).json({ success: true, exists: !!lot });
  } catch (err) {
    next(err);
  }
};
/**
 * Retrieves lot statistics (total and monthly spending).
 */
export const getLotStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!branchId && !isAdmin) {
      return res.status(400).json({ success: false, message: 'Branch ID missing' });
    }
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const [total, monthly] = await Promise.all([
      lotService.getLotTotals(branchId, year),
      lotService.getMonthlyLotTotals(branchId, year),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalExpenses: total,
        monthlyExpenses: monthly,
      },
    });
  } catch (err) {
    next(err);
  }
};
