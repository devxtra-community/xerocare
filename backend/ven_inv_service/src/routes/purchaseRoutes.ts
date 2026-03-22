import { Router } from 'express';
import { purchaseController } from '../controllers/purchaseController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', purchaseController.getAllPurchases);
router.get('/lot/:lotId', purchaseController.getPurchaseByLotId);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/:id/payments', purchaseController.addPayment);
router.post('/:id/costs', purchaseController.addCost);
router.patch('/:id', purchaseController.updatePurchase);

export default router;
