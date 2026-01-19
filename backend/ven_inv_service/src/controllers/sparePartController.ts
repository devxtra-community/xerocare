import { Request, Response } from 'express';
import { SparePartService } from '../services/sparePartService';
import { logger } from '../config/logger';

const service = new SparePartService();

export const bulkUploadSpareParts = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    const branchId = req.user?.branchId;
    if (!branchId)
      return res.status(400).json({ success: false, message: 'Branch context missing' });

    const result = await service.bulkUpload(rows, branchId);
    res.status(200).json({
      success: true,
      message: 'Bulk upload processed',
      data: result,
    });
  } catch (error) {
    logger.error('Error in bulkUploadSpareParts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addSparePart = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId)
      return res.status(400).json({ success: false, message: 'User branch context missing' });

    const result = await service.addSingleSparePart(req.body, branchId);
    res.status(201).json({ success: true, message: 'Spare part added successfully', data: result });
  } catch (error: unknown) {
    logger.error('Error in addSparePart:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ success: false, message });
  }
};

export const listSpareParts = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID required' });
    }

    const inventory = await service.getInventoryByBranch(branchId);

    if (!inventory || inventory.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No spare parts found' });
    }

    res.status(200).json({ success: true, data: inventory });
  } catch (error: unknown) {
    logger.error('Error in listSpareParts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
};
