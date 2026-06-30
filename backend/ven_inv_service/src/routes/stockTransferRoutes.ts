import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  createTransfer,
  submitTransfer,
  respondTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  listTransfers,
  getTransfer,
  getPendingCount,
  getBranchInventoryForTransfer,
} from '../controllers/stockTransferController';

const router = Router();

const auth = authMiddleware;
const managerOrAdmin = roleMiddleware(['MANAGER', 'ADMIN']);

// Must be before /:id
router.get('/pending-count', auth, managerOrAdmin, getPendingCount);
router.get('/branch-inventory/:branchId', auth, managerOrAdmin, getBranchInventoryForTransfer);

router.get('/', auth, managerOrAdmin, listTransfers);
router.post('/', auth, managerOrAdmin, createTransfer);

router.get('/:id', auth, managerOrAdmin, getTransfer);
router.post('/:id/submit', auth, managerOrAdmin, submitTransfer);
router.post('/:id/respond', auth, managerOrAdmin, respondTransfer);
router.post('/:id/dispatch', auth, managerOrAdmin, dispatchTransfer);
router.post('/:id/receive', auth, managerOrAdmin, receiveTransfer);
router.post('/:id/cancel', auth, managerOrAdmin, cancelTransfer);

export default router;
