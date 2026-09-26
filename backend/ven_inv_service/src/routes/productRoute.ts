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
import { r2ViewUrl } from '../utils/r2Url';
import { Source } from '../config/db';
import {
  recordMeterReading,
  getMeterReadingHistory,
  METER_READING_SOURCES,
} from '../helpers/meterReadingHelper';

/**
 * This file handles the Catalog of items we sell and use.
 * It manages product details, pictures, and prices.
 */
const productRoute = Router();

// Internal endpoint — no auth required (service-to-service call from billing_service)
productRoute.get('/inventory-value', getProductInventoryValue);
productRoute.get('/written-off-value', getWrittenOffProductValue);
productRoute.get('/deployed-value', getDeployedProductValue);

// --- Meter readings (shared by every side of the system) ---

/**
 * billing_service pushes Rent/Lease readings here (contract start, installation, monthly
 * usage, machine replacement) so the machine's one current reading — the one the service
 * ticket form shows and validates against — moves with them. Batched: a usage record or
 * a replacement produces several readings at once. Monotonic, so a late or repeated
 * push can never lower a machine's reading.
 */
productRoute.post(
  '/internal/meter-readings',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.headers['x-internal-service'] !== 'billing') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const readings = Array.isArray(req.body?.readings) ? req.body.readings : [];
      const results = [];
      for (const r of readings) {
        if (!METER_READING_SOURCES.includes(r?.source)) continue;
        if (!r?.productId && !r?.serialNo) continue;
        results.push(
          await recordMeterReading({
            productId: r.productId ?? null,
            serialNo: r.serialNo ?? null,
            total: r.total ?? null,
            counters: r.counters,
            source: r.source,
            referenceId: r.referenceId ?? null,
            referenceNo: r.referenceNo ?? null,
            readingDate: r.readingDate ?? null,
            recordedBy: r.recordedBy ?? null,
            logOnlyIfApplied: !!r.logOnlyIfApplied,
          }),
        );
      }
      return res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },
);

/** A machine's reading history across every flow, newest first. */
productRoute.get(
  '/:idOrSerial/meter-readings',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await getMeterReadingHistory(String(req.params.idOrSerial));
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  },
);

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
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const file = req.file as unknown as { key?: string };
    // Never return `file.location` — that is the private S3 API endpoint and a
    // browser <img> cannot load it. `imageUrl` is for showing the upload right
    // away; `imageKey` is what gets persisted.
    return res.status(200).json({
      success: true,
      imageUrl: (await r2ViewUrl(file.key)) || '',
      imageKey: file.key || '',
    });
  },
);

export default productRoute;
