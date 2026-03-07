import { Router } from 'express';
import { RfqController } from '../controllers/rfqController';
import { RfqService } from '../services/rfqService';
import { Source } from '../config/db';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import multer from 'multer';

const router = Router();
const rfqService = new RfqService(Source);
const rfqController = new RfqController(rfqService);

// Setup multer for memory storage to process excel files without saving to disk
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), rfqController.createRfq);
router.post(
  '/upload-items',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  upload.single('file'),
  rfqController.uploadItems,
);
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'HR']),
  rfqController.getAllRfqs,
);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), rfqController.getRfqById);

router.post(
  '/:id/send',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.sendRfq,
);

router.get(
  '/:id/download-excel',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.downloadExcel,
);
router.get(
  '/:id/quote/excel/:vendorId/download',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.downloadVendorQuote,
);

// Quote Entry routes
router.post(
  '/:id/quote/manual',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.enterQuoteManual,
);
router.post(
  '/:id/quote/excel/:vendorId',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  upload.single('file'),
  rfqController.enterQuoteExcel,
);

// Comparison & Award routes
router.get(
  '/:id/comparison',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.getComparison,
);
router.post(
  '/:id/award/:vendorId',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.awardVendor,
);

// Lot creation via RFQ
router.post(
  '/:id/create-lot',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  rfqController.createLot,
);

export default router;
