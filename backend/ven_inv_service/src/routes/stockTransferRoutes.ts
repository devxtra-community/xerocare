import { Router } from 'express';
import {
  createTransfer,
  listTransfers,
  getTransfer,
  submitTransfer,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  cancelTransfer,
  getPendingCount,
  getBranchInventoryForTransfer,
  getAssignableProducts,
} from '../controllers/stockTransferController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

const managerOrAdmin = roleMiddleware(['MANAGER', 'ADMIN']);

// Static paths must come before /:id
router.get('/pending-count', authMiddleware, managerOrAdmin, getPendingCount);
router.get(
  '/branch-inventory/:branchId',
  authMiddleware,
  managerOrAdmin,
  getBranchInventoryForTransfer,
);
router.get(
  '/assignable-products/:branchId/:modelId',
  authMiddleware,
  managerOrAdmin,
  getAssignableProducts,
);

router.get('/', authMiddleware, managerOrAdmin, listTransfers);
router.post('/', authMiddleware, managerOrAdmin, createTransfer);
router.get('/:id', authMiddleware, managerOrAdmin, getTransfer);
router.post('/:id/submit', authMiddleware, managerOrAdmin, submitTransfer);
router.post('/:id/approve', authMiddleware, managerOrAdmin, approveTransfer);
router.post('/:id/reject', authMiddleware, managerOrAdmin, rejectTransfer);
router.post('/:id/dispatch', authMiddleware, managerOrAdmin, dispatchTransfer);
router.post('/:id/cancel', authMiddleware, managerOrAdmin, cancelTransfer);

export default router;
