import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadExpenseProof } from '../middlewares/uploadMiddleware';
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
  createExpenseRequestFromPurchasePayment,
  createManagerPurchasePaymentRequest,
} from '../controllers/expenseRequestController';

const router = Router();

// Internal route — no JWT required, validated by x-internal-service header
router.post('/internal/purchase-payment', createExpenseRequestFromPurchasePayment);

router.use(authMiddleware);

// Summary must come before /:id to avoid "summary" being treated as an id
router.get('/summary', getExpenseRequestSummary);

// Manager purchase payment request — goes to approval queue, cash held until Finance approves.
// Accepts multipart with optional `proof` file (payment proof uploaded by the Manager).
router.post(
  '/manager-purchase',
  uploadExpenseProof.single('proof'),
  createManagerPurchasePaymentRequest,
);

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
