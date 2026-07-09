import { Router } from 'express';
import {
  bulkUploadSpareParts,
  listSpareParts,
  addSparePart,
  updateSparePart,
  deleteSparePart,
  getSparePartById,
  getSparePartStock,
  getInventoryValue,
} from '../controllers/sparePartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

// Internal endpoint — no auth required (called service-to-service)
router.get('/inventory-value', getInventoryValue);

router.post('/bulk', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), bulkUploadSpareParts);
router.post('/add', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), addSparePart);
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['MANAGER', 'ADMIN', 'EMPLOYEE', 'FINANCE']),
  listSpareParts,
);
router.get('/:id/stock', authMiddleware, getSparePartStock);
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['MANAGER', 'ADMIN', 'EMPLOYEE', 'FINANCE']),
  getSparePartById,
);
router.put('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), updateSparePart);
router.delete('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), deleteSparePart);

export default router;
