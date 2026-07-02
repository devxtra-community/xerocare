import { Router } from 'express';
import {
  createTransfer,
  listTransfers,
  getTransfer,
  submitTransfer,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getPendingCount,
} from '../controllers/stockTransferController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/pending-count', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), getPendingCount);
router.get('/', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), listTransfers);
router.get('/:id', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), getTransfer);
router.post('/', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), createTransfer);
router.post('/:id/submit', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), submitTransfer);
router.post('/:id/approve', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), approveTransfer);
router.post('/:id/reject', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), rejectTransfer);
router.post(
  '/:id/dispatch',
  authMiddleware,
  roleMiddleware(['MANAGER', 'ADMIN']),
  dispatchTransfer,
);
router.post('/:id/receive', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), receiveTransfer);
router.post('/:id/cancel', authMiddleware, roleMiddleware(['MANAGER', 'ADMIN']), cancelTransfer);

export default router;
