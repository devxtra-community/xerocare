import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  previewCardProcessingFee,
  listCardProcessingFeeRules,
  createCardProcessingFeeRule,
  updateCardProcessingFeeRule,
  deactivateCardProcessingFeeRule,
  getCardSettlements,
} from '../controllers/cardProcessingFeeController';

const router = Router();

// Quote the fee for a card about to be charged. Anyone who can record a payment can
// ask, because the answer is exactly what they are about to be charged anyway.
router.post('/preview', authMiddleware, previewCardProcessingFee);

// Merchant agreement administration — role-checked inside the controller.
// Reconciliation: card receipts with their fee and net, filterable and batched by day.
router.get('/settlements', authMiddleware, getCardSettlements);

router.get('/rules', authMiddleware, listCardProcessingFeeRules);
router.post('/rules', authMiddleware, createCardProcessingFeeRule);
router.patch('/rules/:id', authMiddleware, updateCardProcessingFeeRule);
router.delete('/rules/:id', authMiddleware, deactivateCardProcessingFeeRule);

export default router;
