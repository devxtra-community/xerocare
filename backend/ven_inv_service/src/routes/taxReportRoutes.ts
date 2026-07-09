import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  getInputTaxLocal,
  getInputTaxInternational,
  updatePurchaseTaxStatus,
} from '../controllers/taxReportController';

const router = Router();

router.use(authMiddleware);

router.get('/local', getInputTaxLocal);
router.get('/international', getInputTaxInternational);
router.patch('/:id/tax-status', updatePurchaseTaxStatus);

export default router;
