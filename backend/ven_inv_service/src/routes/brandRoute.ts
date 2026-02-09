import { Router } from 'express';
import { BrandController } from '../controllers/brandController';
import { BrandService } from '../services/brandService';
import { BrandRepository } from '../repositories/brandRepository';
import { Source } from '../config/db';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
const brandRepo = new BrandRepository(Source);
const brandService = new BrandService(brandRepo);
const brandController = new BrandController(brandService);

router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), brandController.createBrand);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'HR']),
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
