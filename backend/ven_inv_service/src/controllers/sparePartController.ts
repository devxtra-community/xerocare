import { Request, Response } from 'express';
import { SparePartService } from '../services/sparePartService';
import { logger } from '../config/logger';
import { Source } from '../config/db';

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

    const result = await service.addSingleSparePart(req.body, branchId, req.user?.userId);
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
 * Gets a single spare part by ID.
 */
export const getSparePartById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const sparePart = await service.findById(id);
    if (!sparePart) {
      return res.status(404).json({ success: false, message: 'Spare part not found' });
    }
    res.status(200).json({ success: true, data: sparePart });
  } catch (error: unknown) {
    logger.error('Error in getSparePartById:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Updates a spare part.
 */
export const updateSparePart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const branchId = req.user?.branchId;
    const role = req.user?.role;

    if (!branchId && role !== 'ADMIN')
      return res.status(400).json({ success: false, message: 'Branch ID required' });

    const sparePart = await service.findById(id);
    if (!sparePart)
      return res.status(404).json({ success: false, message: 'Spare part not found' });

    // Branch isolation
    if (role !== 'ADMIN' && sparePart.branch_id !== branchId) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied: Spare part belongs to another branch' });
    }

    const result = await service.updateSparePart(id, { ...req.body, updated_by: req.user?.userId });
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
    const role = req.user?.role;

    if (!branchId && role !== 'ADMIN')
      return res.status(400).json({ success: false, message: 'Branch ID required' });

    const sparePart = await service.findById(id);
    if (!sparePart)
      return res.status(404).json({ success: false, message: 'Spare part not found' });

    // Branch isolation
    if (role !== 'ADMIN' && sparePart.branch_id !== branchId) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied: Spare part belongs to another branch' });
    }

    const result = await service.deleteSparePart(id);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message.includes('quantity') || message.includes('lot') || message.includes('inventory')
        ? 400
        : 500;
    res.status(status).json({ success: false, message });
  }
};

/**
 * Returns total inventory value (quantity × purchase_price) for spare parts.
 * Internal endpoint — used by billing_service chart-of-accounts.
 */
export const getInventoryValue = async (req: Request, res: Response) => {
  try {
    const branchIds = req.query.branchIds as string | undefined;
    const ids = branchIds ? branchIds.split(',').filter(Boolean) : [];

    let branchClause = '';
    if (ids.length === 1) {
      branchClause = `AND branch_id = '${ids[0]}'`;
    } else if (ids.length > 1) {
      branchClause = `AND branch_id IN (${ids.map((b) => `'${b}'`).join(',')})`;
    }

    const rows = await Source.query<{ total: string }[]>(`
      SELECT COALESCE(SUM(quantity * purchase_price), 0)::numeric AS total
      FROM spare_parts
      WHERE 1=1 ${branchClause}
    `);

    const total = Number(rows[0]?.total ?? 0);
    res.json({ total });
  } catch (error) {
    logger.error('Error in getInventoryValue:', error);
    res.status(500).json({ total: 0 });
  }
};

/**
 * Returns total product inventory value (purchase_price) for AVAILABLE products.
 * Internal endpoint — used by billing_service chart-of-accounts.
 * Products are linked to branches via their warehouse.
 */
export const getProductInventoryValue = async (req: Request, res: Response) => {
  try {
    const branchIds = req.query.branchIds as string | undefined;
    const ids = branchIds ? branchIds.split(',').filter(Boolean) : [];

    let branchClause = '';
    if (ids.length === 1) {
      branchClause = `AND w.branch_id = '${ids[0]}'`;
    } else if (ids.length > 1) {
      branchClause = `AND w.branch_id IN (${ids.map((b) => `'${b}'`).join(',')})`;
    }

    const rows = await Source.query<{ total: string }[]>(`
      SELECT COALESCE(SUM(p.purchase_price), 0)::numeric AS total
      FROM products p
      JOIN warehouses w ON w.id = p.warehouse_id
      WHERE p.product_status = 'AVAILABLE'
        AND p.purchase_price IS NOT NULL
        ${branchClause}
    `);

    const total = Number(rows[0]?.total ?? 0);
    res.json({ total });
  } catch (error) {
    logger.error('Error in getProductInventoryValue:', error);
    res.status(500).json({ total: 0 });
  }
};

/**
 * Gets stock levels of a spare part across warehouses in the user's branch.
 */
export const getSparePartStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userBranchId = req.user?.branchId;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN';

    const stockData = await service.getStock(id, userBranchId, isAdmin);
    if (!stockData) {
      return res.status(404).json({ success: false, message: 'Spare part not found' });
    }

    res.status(200).json({ success: true, data: stockData });
  } catch (error: unknown) {
    logger.error('Error in getSparePartStock:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
};
