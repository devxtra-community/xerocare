import { Router } from 'express';
import { purchaseController } from '../controllers/purchaseController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', purchaseController.getAllPurchases);
router.get('/spend-by-origin', purchaseController.getSpendByOrigin);
router.get('/lot/:lotId', purchaseController.getPurchaseByLotId);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/:id/payments', purchaseController.addPayment);
router.post('/:id/costs', purchaseController.addCost);
router.patch('/:id', purchaseController.updatePurchase);

// Internal endpoint called by Billing service for P&L cost aggregation
router.get('/internal/cost-report', (req, res, next) =>
  purchaseController.getPurchaseCostReport(req, res, next),
);

// Internal endpoint: batch existence check for linked_po_id orphan reconciliation
router.post('/internal/batch-exists', (req, res, next) =>
  purchaseController.batchExistsPurchases(req, res, next),
);

export default router;
