import { Router, Request, Response, NextFunction } from 'express';
import {
  addproduct,
  bulkCreateProducts,
  deleteproduct,
  getallproducts,
  updateproduct,
  getproductbyid,
  getProductHistoryData,
} from '../controllers/productController';
import {
  getProductInventoryValue,
  getWrittenOffProductValue,
  getDeployedProductValue,
} from '../controllers/sparePartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { uploadProductImage } from '../middlewares/uploadProductImage';
import { Source } from '../config/db';

/**
 * This file handles the Catalog of items we sell and use.
 * It manages product details, pictures, and prices.
 */
const productRoute = Router();

// Internal endpoint — no auth required (service-to-service call from billing_service)
productRoute.get('/inventory-value', getProductInventoryValue);
productRoute.get('/written-off-value', getWrittenOffProductValue);
productRoute.get('/deployed-value', getDeployedProductValue);

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

productRoute.get(
  '/:id/history-data',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FINANCE']),
  getProductHistoryData,
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

// Internal batch fetch — used by billing_service to enrich asset register with product details
productRoute.post(
  '/batch',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      const products = await Source.query(
        // sale_price / wholesale_price / max_discount_amount are returned so Billing can
        // enforce catalogue pricing on quotation lines (retail vs wholesale by customer
        // type, and the per-unit discount ceiling) instead of trusting whatever price the
        // caller sends.
        `SELECT p.id, p.serial_no, p.product_status, p.purchase_price, p.brand,
                p.sale_price, p.wholesale_price, p.max_discount_amount,
                m.model_name, b.name AS brand_name
         FROM products p
         LEFT JOIN model m ON m.id = p.model_id
         LEFT JOIN brands b ON b.id = m.brand_id
         WHERE p.id = ANY($1::uuid[])`,
        [productIds],
      );
      return res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  },
);

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

productRoute.post(
  '/upload-image',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  uploadProductImage.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const file = req.file as unknown as { location?: string };
    return res.status(200).json({ success: true, imageUrl: file.location || '' });
  },
);

export default productRoute;
