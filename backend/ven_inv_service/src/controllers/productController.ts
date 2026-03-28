import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ProductService } from '../services/productService';
import { logger } from '../config/logger';
import { BulkProductRow } from '../dto/product.dto';
import { MulterS3File } from '../types/multer-s3-file';
import { ProductStatus } from '../entities/productEntity';

const service = new ProductService();

/**
 * Fast Add: Create many new products at once by providing a list.
 * Useful when we receive a large shipment of new items.
 */
export const bulkCreateProducts = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('Invalid data', 400);
    }
    const result = await service.bulkCreateProducts(rows as BulkProductRow[]);
    return res.status(201).json({
      success: true,
      inserted: result.success.length,
      failed: result.failed.length,
      errors: result.failed,
    });
  } catch {
    throw new AppError('Failed to bulk create products', 500);
  }
};

/**
 * Add one single new product to our catalog.
 * We also save a photo of the product if one is uploaded.
 */
export const addproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      model_id,
      warehouse_id,
      vendor_id,
      serial_no,
      product_status,
      name,
      brand,
      MFD,
      sale_price,
      tax_rate,
      print_colour,
      max_discount_amount,
      wholesale_price,
      lot_id,
    } = req.body;

    if (!model_id || !warehouse_id || !vendor_id || !serial_no || !name || !brand || !MFD) {
      throw new AppError(
        'Missing required fields. Please ensure all required product details are provided.',
        400,
      );
    }

    const file = req.file as MulterS3File;
    const imageKey = file?.key ?? null;
    const imageUrl = imageKey ? `${process.env.R2_PUBLIC_URL}/${imageKey}` : null;

    logger.info('Adding new product:');
    const newproduct = await service.addProduct({
      model_id,
      warehouse_id,
      vendor_id,
      serial_no,
      product_status,
      name,
      brand,
      MFD,
      sale_price: sale_price ? Number(sale_price) : 0,
      tax_rate: tax_rate ? Number(tax_rate) : 0,
      print_colour,
      max_discount_amount:
        max_discount_amount !== '' && max_discount_amount !== undefined
          ? Number(max_discount_amount)
          : undefined,
      wholesale_price:
        wholesale_price !== '' && wholesale_price !== undefined
          ? Number(wholesale_price)
          : undefined,
      imageUrl,
      lot_id: lot_id || undefined,
    });
    res
      .status(200)
      .json({ message: 'Product added successfully', data: newproduct, success: true });
  } catch (err: unknown) {
    logger.error('Error in addproduct:', err);
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/**
 * List all products currently in the company catalog.
 *
 * Staff members only see products belonging to their own office branch,
 * while Administrators can see everything.
 */
export const getallproducts = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';

    // Admins see all, others only their branch
    const filteredBranchId = isAdmin ? undefined : branchId;
    const modelId = req.query.modelId as string | undefined;
    const status = req.query.status as ProductStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    logger.info(
      `Fetching products for branch: ${filteredBranchId || 'All'}, model: ${modelId || 'All'}, status: ${status || 'Any'}, page: ${page}, limit: ${limit}, search: ${search || 'None'}`,
    );
    const { data, total } = await service.getAllProducts(
      filteredBranchId,
      modelId,
      status,
      page,
      limit,
      search,
    );
    logger.info(`Fetched ${data?.length || 0} products from total ${total}`);

    res.status(200).json({
      message: 'Fetched all products successfully',
      data,
      total,
      page,
      limit,
      success: true,
    });
  } catch (error) {
    logger.error('Error in getallproducts:', error);
    throw new AppError('Failed to fetch products', 500);
  }
};

/**
 * Update the information for an existing product (like its price or status).
 *
 * Staff can only update products stored in their own local office's warehouse.
 */
export const updateproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
    }

    const payload = { ...req.body };

    if (payload.sale_price !== undefined && payload.sale_price !== '')
      payload.sale_price = Number(payload.sale_price);
    if (payload.tax_rate !== undefined && payload.tax_rate !== '')
      payload.tax_rate = Number(payload.tax_rate);
    if (payload.max_discount_amount !== undefined && payload.max_discount_amount !== '')
      payload.max_discount_amount = Number(payload.max_discount_amount);
    if (payload.wholesale_price !== undefined && payload.wholesale_price !== '')
      payload.wholesale_price = Number(payload.wholesale_price);

    const file = req.file as MulterS3File;
    if (file && file.key) {
      payload.imageUrl = `${process.env.R2_PUBLIC_URL}/${file.key}`;
    } else {
      payload.imageUrl = undefined;
    }

    const product = await service.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Branch isolation
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && product.warehouse?.branchId !== req.user?.branchId) {
      throw new AppError('Access denied: Product belongs to another branch', 403);
    }

    await service.updateProduct(id, payload);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
    });
  } catch (err: unknown) {
    logger.error('Error in updateproduct:', err);
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/**
 * Remove a product from our active catalog.
 */
export const deleteproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
    }

    const product = await service.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Branch isolation
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && product.warehouse?.branchId !== req.user?.branchId) {
      throw new AppError('Access denied: Product belongs to another branch', 403);
    }

    await service.deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get the full, specific details of one product.
 */
export const getproductbyid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
    }
    const product = await service.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Branch isolation
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && product.warehouse?.branchId !== req.user?.branchId) {
      throw new AppError('Access denied: Product belongs to another branch', 403);
    }

    return res.status(200).json({
      success: true,
      data: product,
      message: 'Product fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};
