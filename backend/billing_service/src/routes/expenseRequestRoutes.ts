import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  createExpenseRequest,
  getExpenseRequests,
  getExpenseRequestSummary,
  getExpenseRequestById,
  updateExpenseRequest,
  deleteExpenseRequest,
  submitExpenseRequest,
  approveExpenseRequest,
  rejectExpenseRequest,
  payExpenseRequest,
} from '../controllers/expenseRequestController';

const router = Router();

router.use(authMiddleware);

// Summary must come before /:id to avoid "summary" being treated as an id
router.get('/summary', getExpenseRequestSummary);

router.get('/', getExpenseRequests);
router.post('/', createExpenseRequest);

router.get('/:id', getExpenseRequestById);
router.patch('/:id', updateExpenseRequest);
router.delete('/:id', deleteExpenseRequest);
router.post('/:id/submit', submitExpenseRequest);
router.post('/:id/approve', approveExpenseRequest);
router.post('/:id/reject', rejectExpenseRequest);
router.post('/:id/pay', payExpenseRequest);

export default router;
