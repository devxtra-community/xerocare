import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ProductService } from '../services/productService';
import { logger } from '../config/logger';
import { BulkProductRow } from '../dto/product.dto';
import { MulterS3File } from '../types/multer-s3-file';

const service = new ProductService();

export const bulkCreateProducts = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    console.log(rows);
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
  } catch (e) {
    console.log(e);
    throw new AppError('Failed to bulk create products', 500);
  }
};

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
    } = req.body;

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
      max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
      imageUrl,
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

export const getallproducts = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all products');
    const products = await service.getAllProducts();
    logger.info(`Fetched ${products?.length || 0} products`);

    if (!products || products.length === 0) {
      return res.status(200).json({ message: 'No products found', data: [], success: true });
    }

    res
      .status(200)
      .json({ message: 'Fetched all products successfully', data: products, success: true });
  } catch (error) {
    logger.error('Error in getallproducts:', error);
    // User said: "if the data cant fetch then only show error".
    // So 500 is correct for database connection failure etc.
    // The issue was likely treating empty results as errors (which I fixed above for products just in case).
    throw new AppError('Failed to fetch products', 500);
  }
};

export const updateproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
    }

    const payload = { ...req.body };

    if (payload.sale_price) payload.sale_price = Number(payload.sale_price);
    if (payload.tax_rate) payload.tax_rate = Number(payload.tax_rate);
    if (payload.max_discount_amount)
      payload.max_discount_amount = Number(payload.max_discount_amount);

    const file = req.file as MulterS3File;
    if (file && file.key) {
      payload.imageUrl = `${process.env.R2_PUBLIC_URL}/${file.key}`;
    } else {
      payload.imageUrl = undefined;
    }

    const updated = await service.updateProduct(id, payload);

    if (!updated) {
      throw new AppError('Product not found', 404);
    }

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

export const deleteproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
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
    return res.status(200).json({
      success: true,
      data: product,
      message: 'Product fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};
