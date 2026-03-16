import { Router } from 'express';
import {
  addproduct,
  bulkCreateProducts,
  deleteproduct,
  getallproducts,
  updateproduct,
  getproductbyid,
} from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { uploadProductImage } from '../middlewares/uploadProductImage';

/**
 * This file handles the Catalog of items we sell and use.
 * It manages product details, pictures, and prices.
 */
const productRoute = Router();

// --- 1. Basic Product Management ---

/**
 * Add a brand new product to the company catalog.
 * This also handles saving a picture of the product.
 */
productRoute.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  uploadProductImage.single('image'),
  addproduct,
);

/**
 * List all products currently in our catalog.
 * Accessible to most staff members so they can look up prices and details.
 */
productRoute.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FINANCE']),
  getallproducts,
);

/**
 * Look up the full details for one specific product.
 */
productRoute.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FINANCE']),
  getproductbyid,
);

/**
 * Update a product's details (like its name, price, or description).
 */
productRoute.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  uploadProductImage.single('image'),
  updateproduct,
);

/**
 * Remove a product from our catalog.
 */
productRoute.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), deleteproduct);

// --- 2. Advanced Management ---

/**
 * Add many products at once:
 * Instead of adding them one by one, management can upload a large
 * list of products to save time.
 */
productRoute.post(
  '/bulk',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  bulkCreateProducts,
);

export default productRoute;
