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
} from '../controllers/lotController';
import { authMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.post('/', createLot);
router.post('/upload', upload.single('file'), uploadLotExcel);
router.get('/', getAllLots);
router.get('/:id', getLotById);
router.get('/:id/export', downloadLotExcel);
router.get('/:id/export-products', downloadLotProductsExcel);
router.get('/:id/export-spareparts', downloadLotSparePartsExcel);
router.get('/stats/summary', getLotStats);

export default router;
