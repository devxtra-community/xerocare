import { Router } from 'express';
import { VendorController } from '../controllers/vendorController';
import { VendorService } from '../services/vendorService';
import { VendorRepository } from '../repositories/vendorRepository';
import { Source } from '../config/db';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

const vendorRepo = new VendorRepository(Source);
const vendorService = new VendorService(vendorRepo);
const vendorController = new VendorController(vendorService);

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), vendorController.createVendor);
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'HR']), vendorController.getVendors);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN', 'HR']), vendorController.getVendorById);
router.patch('/:id', authMiddleware, roleMiddleware(['ADMIN']), vendorController.updateVendor);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), vendorController.deleteVendor);

export default router;
