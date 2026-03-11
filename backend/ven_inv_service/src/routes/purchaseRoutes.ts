import { Router } from 'express';
import { purchaseController } from '../controllers/purchaseController';

const router = Router();

router.get('/', purchaseController.getAllPurchases);

export default router;
