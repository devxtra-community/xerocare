import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

/**
 * This file sets up the communication paths for managing our list
 * of official customers.
 */
const router = Router();
const customerController = new CustomerController();

// All customer actions require the user to be logged in.
router.use(authMiddleware);

/**
 * Add a new official customer to our records.
 */
router.post('/', requireRole('ADMIN', 'EMPLOYEE'), customerController.createCustomer);

/**
 * List every official customer we have in our memory bank.
 */
router.get(
  '/',
  requireRole('ADMIN', 'EMPLOYEE', 'FINANCE', 'MANAGER'),
  customerController.getAllCustomers,
);

/**
 * Get the full details and history for one specific customer.
 */
router.get(
  '/:id',
  requireRole('ADMIN', 'EMPLOYEE', 'FINANCE', 'MANAGER'),
  customerController.getCustomerById,
);

/**
 * Update the details (like name, contact info, or address) of an existing customer.
 */
router.put('/:id', requireRole('ADMIN', 'EMPLOYEE'), customerController.updateCustomer);

/**
 * Remove a customer from our active list.
 * Only an Administrator can perform this action for safety.
 */
router.delete('/:id', requireRole('ADMIN'), customerController.deleteCustomer);

export default router;
