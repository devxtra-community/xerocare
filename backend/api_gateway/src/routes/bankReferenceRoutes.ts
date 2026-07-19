import { Router } from 'express';
import { getBanksByCountry, lookupIfsc } from '../controllers/bankReferenceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/banks/:countryCode', getBanksByCountry);
router.get('/ifsc/:code', lookupIfsc);

export default router;
