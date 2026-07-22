import { Router } from 'express';
import {
  createLot,
  getAllLots,
  getLotById,
  downloadLotExcel,
  uploadLotExcel,
  downloadLotProductsExcel,
  downloadLotSparePartsExcel,
  getLotStats,
  checkLotNumber,
  updateReceivingQuantities,
  confirmLotReceived,
  uploadLotDocument,
  getLotDocuments,
  deleteLotDocument,
} from '../controllers/lotController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadLotDocuments } from '../middlewares/uploadLotDocuments';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.post('/', createLot);
router.post('/upload', upload.single('file'), uploadLotExcel);
router.get('/', getAllLots);
router.get('/check-number/:lotNumber', checkLotNumber);
router.get('/stats/summary', getLotStats);
router.get('/:id', getLotById);
router.get('/:id/export', downloadLotExcel);
router.get('/:id/export-products', downloadLotProductsExcel);
router.get('/:id/export-spareparts', downloadLotSparePartsExcel);
// Lot receiving workflow
router.patch('/:id/receive', updateReceivingQuantities);
router.post('/:id/confirm', confirmLotReceived);

// Shipping/customs document attachments (bill of lading, customs declaration, etc.)
router.post('/:id/documents', uploadLotDocuments.single('file'), uploadLotDocument);
router.get('/:id/documents', getLotDocuments);
router.delete('/:id/documents/:documentId', deleteLotDocument);

export default router;
