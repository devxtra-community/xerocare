import { Router } from 'express';
import { BrandController } from '../controllers/brandController';
import { BrandService } from '../services/brandService';
import { BrandRepository } from '../repositories/brandRepository';
import { Source } from '../config/db';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware, requireServiceRole } from '../middlewares/roleMiddleware';

const router = Router();
const brandRepo = new BrandRepository(Source);
const brandService = new BrandService(brandRepo);
const brandController = new BrandController(brandService);

// Creating a brand is additive and low-risk (unlike editing/deleting one that
// may already be in use elsewhere), and is a routine sub-step of registering
// an external machine for a service ticket or contract — a flow already open
// to technicians/help desk with no role gate at all. Restricting just this
// one step to ADMIN/MANAGER blocked that flow outright; scoped to the jobs
// that actually hit it, rather than opening it to every employee.
router.post(
  '/',
  authMiddleware,
  requireServiceRole(['SERVICE_TECHNICIAN', 'SERVICE_HELP_DESK']),
  brandController.createBrand,
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE', 'FINANCE']),
  brandController.getAllBrands,
);

router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  brandController.updateBrand,
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  brandController.deleteBrand,
);

export default router;
