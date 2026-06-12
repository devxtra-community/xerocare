import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const controller = new ServiceController();

router.use(authMiddleware);

router.post('/tickets', controller.createTicket);
router.get('/tickets', controller.getTickets);
router.get('/tickets/:id', controller.getTicketById);

router.post('/contracts', controller.createContract);
router.get('/contracts', controller.getContracts);
router.get('/contracts/:id', controller.getContractById);
router.put('/contracts/:id', controller.updateContract);
router.delete('/contracts/:id', controller.deleteContract);
router.post('/tickets/:id/assign', controller.assignTechnician);
router.post('/tickets/:id/start-diagnosis', controller.startDiagnosis);
router.post('/tickets/:id/diagnose', controller.diagnoseTicket);
router.get('/tickets/:id/estimates', controller.getTicketEstimates);
router.post('/tickets/:id/estimates', controller.createEstimate);
router.post('/tickets/:id/estimates/submit', controller.submitEstimateForApproval);
router.post('/estimates/:estimateId/approve-finance', controller.approveEstimateFinance);
router.post('/estimates/:estimateId/reject-finance', controller.rejectEstimateFinance);
router.post('/estimates/:estimateId/approve-customer', controller.approveEstimateCustomer);
router.post('/estimates/:estimateId/reject-customer', controller.rejectEstimateCustomer);
router.post('/tickets/:id/estimates/revisions', controller.createEstimateRevision);
router.post('/estimates/revisions/:revisionId/approve-finance', controller.approveRevisionFinance);
router.post(
  '/estimates/revisions/:revisionId/approve-customer',
  controller.approveRevisionCustomer,
);
router.post('/tickets/:id/start-repair', controller.startRepair);
router.post('/tickets/:id/quote', controller.submitQuotation);
router.patch('/tickets/:id/quotation-link', controller.patchQuotationLink);
router.patch('/tickets/:id/finance-approved', controller.financeApproved);
router.patch('/tickets/:id/finance-rejected', controller.financeRejected);
router.post('/tickets/:id/customer-approve', controller.customerApprove);
router.post('/tickets/:id/customer-reject', controller.customerReject);
router.post('/tickets/:id/start', controller.startService);
router.post('/tickets/:id/complete', controller.completeService);
router.post('/tickets/:id/cancel', controller.cancelTicket);
router.get('/technicians', controller.getTechnicians);
router.get('/technicians/:technicianId/performance', controller.getTechnicianPerformance);
router.get('/customers/:customerId/history', controller.getCustomerHistory);
router.get('/machines/:serialNumber/lifetime-cost', controller.getMachineLifetimeCost);
router.get('/machines/:serialNumber/context', controller.getMachineContext);
router.get('/machines/:serialNumber/yield-history', controller.getMachineYieldHistory);
router.get('/finance/dashboard', controller.getFinanceDashboard);
router.post('/spare-parts/:id/mark-damaged', controller.markSparePartDamaged);

router.get('/tickets/:id/report', controller.generateReportPDF);
router.get('/machine/:productId/history', controller.getMachineHistory);

export default router;
