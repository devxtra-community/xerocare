import { Router } from 'express';
import {
  bulkUploadSpareParts,
  listSpareParts,
  addSparePart,
  updateSparePart,
  deleteSparePart,
} from '../controllers/sparePartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

router.post('/bulk', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), bulkUploadSpareParts);
router.post('/add', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), addSparePart);
router.get('/', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), listSpareParts);
router.put('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), updateSparePart);
router.delete('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), deleteSparePart);

export default router;
