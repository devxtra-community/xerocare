import { Router } from 'express';
import { LeadController } from '../controllers/leadController';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();
const leadController = new LeadController();

router.use(authMiddleware);

router.post('/', requireRole('EMPLOYEE', 'ADMIN'), leadController.createLead);
router.get('/', requireRole('EMPLOYEE', 'ADMIN'), leadController.getAllLeads);
router.get('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.getLeadById);
router.put('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.updateLead);
router.delete('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.deleteLead);
router.post('/:id/convert', requireRole('EMPLOYEE', 'ADMIN'), leadController.convertLead);

export default router;
