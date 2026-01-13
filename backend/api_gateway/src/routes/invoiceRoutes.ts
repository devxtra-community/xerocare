import { Router } from 'express';
import { getAllInvoices, getInvoiceById } from '../controllers/invoiceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);

export default router;
