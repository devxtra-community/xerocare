import { Router } from 'express';
import { purchaseController } from '../controllers/purchaseController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadReceiptFile } from '../middlewares/uploadReceiptFile';

const router = Router();

router.use(authMiddleware);

router.get('/', purchaseController.getAllPurchases);
router.get('/spend-by-origin', purchaseController.getSpendByOrigin);
router.get('/lot/:lotId', purchaseController.getPurchaseByLotId);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/:id/payments', uploadReceiptFile.single('receipt'), purchaseController.addPayment);
router.post('/:id/costs', uploadReceiptFile.single('attachment'), purchaseController.addCost);
router.patch('/:id', purchaseController.updatePurchase);

// Internal endpoint called by Billing service for P&L cost aggregation
router.get('/internal/cost-report', (req, res, next) =>
  purchaseController.getPurchaseCostReport(req, res, next),
);

// Internal endpoint called by Billing service's Balance Sheet for Accounts Payable (2001)
router.get('/internal/payable-summary', (req, res, next) =>
  purchaseController.getPayableSummary(req, res, next),
);

// Internal endpoint: batch existence check for linked_po_id orphan reconciliation
router.post('/internal/batch-exists', (req, res, next) =>
  purchaseController.batchExistsPurchases(req, res, next),
);

// Internal endpoint: billing_service records a PurchasePayment on Finance approval (no callback loop)
router.post('/internal/record-payment', (req, res, next) =>
  purchaseController.recordPaymentInternal(req, res, next),
);

// Internal endpoint: billing_service voids a PurchasePayment on Finance rejection
router.post('/internal/void-payment', (req, res, next) =>
  purchaseController.voidPaymentInternal(req, res, next),
);

export default router;
