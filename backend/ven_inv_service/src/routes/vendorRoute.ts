import { Router } from 'express';
import { VendorController } from '../controllers/vendorController';
import { VendorService } from '../services/vendorService';
import { VendorRepository } from '../repositories/vendorRepository';
import { Source } from '../config/db';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

/**
 * This file handles our relationships with company Vendors (the suppliers
 * who provide us with products and spare parts).
 */
const router = Router();

import { VendorRequestRepository } from '../repositories/vendorRequestRepository';
import { EmployeeManagerRepository } from '../repositories/employeeManagerRepository';

const vendorRepo = new VendorRepository(Source);
const requestRepo = new VendorRequestRepository(Source);
const employeeManagerRepo = new EmployeeManagerRepository();
const vendorService = new VendorService(vendorRepo, requestRepo, employeeManagerRepo);
const vendorController = new VendorController(vendorService);

// --- 1. Managing Vendor Profiles ---

/**
 * Add a new vendor to our partner directory.
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.createVendor,
);

/**
 * List all the vendors we currently work with.
 */
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'HR', 'MANAGER']),
  vendorController.getVendors,
);

/**
 * Get a high-level summary of our vendor data (e.g., how many active
 * vendors we have).
 */
router.get(
  '/stats',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.getStats,
);

/**
 * Look up the specific contact and business details for one vendor.
 */
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'HR', 'MANAGER']),
  vendorController.getVendorById,
);

/**
 * Update the business information for a vendor (like their phone or address).
 */
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.updateVendor,
);

/**
 * Remove a vendor from our active list.
 */
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.deleteVendor,
);

// --- 2. Product Requests (Ordering) ---

/**
 * Ask a vendor for specific products.
 * This starts the process of ordering new stock.
 */
router.post(
  '/:id/request-products',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.requestProducts,
);

/**
 * See a history of all product requests made to a specific vendor.
 */
router.get(
  '/:id/requests',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  vendorController.getVendorRequests,
);

export default router;
