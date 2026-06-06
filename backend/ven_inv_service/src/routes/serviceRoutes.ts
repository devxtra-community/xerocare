import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';

const router = Router();
const controller = new ServiceController();

router.post('/tickets', controller.createTicket);
router.get('/tickets', controller.getTickets);
router.get('/tickets/:id', controller.getTicketById);
router.post('/tickets/:id/assign', controller.assignTechnician);
router.post('/tickets/:id/diagnose', controller.diagnoseTicket);
router.post('/tickets/:id/quote', controller.submitQuotation);
router.patch('/tickets/:id/quotation-link', controller.patchQuotationLink);
router.post('/tickets/:id/customer-approve', controller.customerApprove);
router.post('/tickets/:id/customer-reject', controller.customerReject);
router.post('/tickets/:id/start', controller.startService);
router.post('/tickets/:id/complete', controller.completeService);
router.post('/tickets/:id/cancel', controller.cancelTicket);
router.get('/technicians', controller.getTechnicians);
router.get('/customers/:customerId/history', controller.getCustomerHistory);

export default router;
