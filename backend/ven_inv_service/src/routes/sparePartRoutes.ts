import { Router } from 'express';
import {
  bulkUploadSpareParts,
  listSpareParts,
  addSparePart,
  updateSparePart,
  deleteSparePart,
  getSparePartById,
} from '../controllers/sparePartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

router.post('/bulk', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), bulkUploadSpareParts);
router.post('/add', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), addSparePart);
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['MANAGER', 'ADMIN', 'EMPLOYEE', 'FINANCE']),
  listSpareParts,
);
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['MANAGER', 'ADMIN', 'EMPLOYEE', 'FINANCE']),
  getSparePartById,
);
router.put('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), updateSparePart);
router.delete('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), deleteSparePart);

export default router;
