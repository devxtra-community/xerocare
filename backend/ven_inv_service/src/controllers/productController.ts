import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ProductService } from '../services/productService';
import { logger } from '../config/logger';
import { BulkProductRow } from '../dto/product.dto';

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

export const addproduct = async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    logger.info('Adding new product:');
    const newproduct = await service.addProduct(productData);
    res
      .status(200)
      .json({ message: 'Product added successfully', data: newproduct, success: true });
  } catch {
    throw new AppError('Failed to add product', 500);
  }
};

export const getallproducts = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all products');
    const products = await service.getAllProducts();
    logger.info(`Fetched ${products.length} products`);
    if (products.length === 0) {
      return res.status(200).json({ message: 'No products found', data: products, success: true });
    }
    res
      .status(200)
      .json({ message: 'Fetched all products successfully', data: products, success: true });
  } catch (error) {
    logger.error('Error in getallproducts:', error);
    throw new AppError('Failed to fetch products', 500);
  }
};

export const updateproduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid product id', 400);
    }

    const updated = await service.updateProduct(id, req.body);

    if (!updated) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
    });
  } catch (err) {
    next(err);
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
