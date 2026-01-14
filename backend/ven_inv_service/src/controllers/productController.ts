import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ProductService } from '../services/productService';
import { logger } from '../config/logger';
import { BulkProductRow } from '../dto/product.dto';

const service = new ProductService();

export const bulkCreateProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('Invalid data', 400);
    }
    const result = await service.bulkCreateProducts(rows as BulkProductRow[]);
    return res.status(201).json({
      success: true,
      inserted: result.success.length,
      failed: result.failed,
    });
  } catch (e) {
    next(e);
  }
};

export const addproduct = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
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
  } catch {
    throw new AppError('Failed to fetch products', 500);
  }
};

export const updateproduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const productData = req.body;
    const updated = await service.updateProduct(id, productData);
    if (!updated) {
      throw new AppError('Product not found', 404);
    }
    res.status(200).json({ message: 'Product updated successfully', success: true });
  } catch {
    throw new AppError('Failed to update product', 500);
  }
};

export const deleteproduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const deleted = await service.deleteProduct(id);
    if (!deleted) {
      throw new AppError('Product not found', 404);
    }
    return res.status(200).json({ message: 'Product deleted successfully', success: true });
  } catch {
    throw new AppError('Failed to delete product', 500);
  }
};
