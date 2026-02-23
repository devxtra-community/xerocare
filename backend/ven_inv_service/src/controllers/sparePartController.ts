import { Request, Response } from 'express';
import { SparePartService } from '../services/sparePartService';
import { logger } from '../config/logger';

const service = new SparePartService();

/**
 * Bulk uploads spare parts.
 */
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

/**
 * Adds a single spare part.
 */
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

/**
 * Lists spare parts. Supports branch and search filters.
 */
export const listSpareParts = async (req: Request, res: Response) => {
  try {
    const { branch, search, year } = req.query as {
      branch?: string;
      search?: string;
      year?: string;
    };
    const userBranchId = req.user?.branchId;
    const userRole = req.user?.role;

    // Default to user's branch if not Admin or if not specified
    let targetBranchId: string | undefined = branch || userBranchId;

    if (userRole === 'ADMIN') {
      // Admin can view any branch or 'all'
      targetBranchId = branch === 'all' || !branch ? undefined : branch;
    } else if (!userBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID required' });
    }

    const inventory = await service.getInventory(
      targetBranchId,
      search,
      year ? parseInt(year) : undefined,
    );

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

/**
 * Updates a spare part.
 */
export const updateSparePart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const branchId = req.user?.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required' });

    const result = await service.updateSparePart(id, req.body);
    res.status(200).json(result);
  } catch (error: unknown) {
    logger.error('Error in updateSparePart:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ success: false, message });
  }
};

/**
 * Deletes a spare part if no inventory exists.
 */
export const deleteSparePart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const branchId = req.user?.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required' });

    const result = await service.deleteSparePart(id);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('inventory') ? 409 : 500;
    res.status(status).json({ success: false, message });
  }
};
