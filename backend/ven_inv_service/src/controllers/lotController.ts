import { NextFunction, Request, Response } from 'express';
import { LotService } from '../services/lotService';

const lotService = new LotService();

export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('=== CREATE LOT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const branchId = req.user?.branchId;
    const lotData = { ...req.body, branchId };
    const lot = await lotService.createLot(lotData);
    console.log('✓ Lot created successfully:', lot.id, lot.lotNumber);
    res.status(201).json({ success: true, data: lot });
  } catch (err) {
    console.error('✗ Lot creation failed:', err);
    next(err);
  }
};

export const getAllLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lots = await lotService.getAllLots();
    // console.log('Fetching all lots:', JSON.stringify(lots, null, 2));
    res.status(200).json({ success: true, data: lots });
  } catch (err) {
    next(err);
  }
};

export const getLotById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lot = await lotService.getLotById(id);
    res.status(200).json({ success: true, data: lot });
  } catch (err) {
    next(err);
  }
};

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

export const uploadLotExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Received file upload request');
    console.log('File:', req.file);
    if (!req.file) {
      console.error('No file found in request');
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
    console.error('Error processing upload:', err);
    next(err);
  }
};

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
