import { Router } from 'express';
import { LeadController } from '../controllers/leadController';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

/**
 * This file sets up the communication paths for managing "Leads"—which
 * are potential new customers who haven't officially signed up yet.
 */
const router = Router();
const leadController = new LeadController();

// All actions here require the user to be logged in.
router.use(authMiddleware);

/**
 * Record a new potential customer (Lead) in our system.
 */
router.post('/', requireRole('EMPLOYEE', 'ADMIN'), leadController.createLead);

/**
 * List all the potential customers currently in our pipeline.
 */
router.get('/', requireRole('EMPLOYEE', 'ADMIN'), leadController.getAllLeads);

/**
 * Get the specific details of one potential customer.
 */
router.get('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.getLeadById);

/**
 * Update the details of a potential customer as we learn more about them.
 */
router.put('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.updateLead);

/**
 * Remove a potential customer from the list if they are no longer interested.
 */
router.delete('/:id', requireRole('EMPLOYEE', 'ADMIN'), leadController.deleteLead);

/**
 * The "Success" button: Turn a potential customer (Lead) into an official
 * Customer once they agree to a deal.
 */
router.post('/:id/convert', requireRole('EMPLOYEE', 'ADMIN'), leadController.convertLead);

export default router;
