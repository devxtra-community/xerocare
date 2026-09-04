import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware, requireServiceRole } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new ServiceController();

router.use(authMiddleware);

router.post('/tickets', controller.createTicket);
router.get('/tickets', controller.getTickets);
router.get(
  '/tickets/achievement-summary',
  roleMiddleware(['ADMIN']),
  controller.getAchievementSummary,
);
router.get('/tickets/:id', controller.getTicketById);

router.post('/contracts', controller.createContract);
router.get('/contracts', controller.getContracts);
router.get('/contracts/:id', controller.getContractById);
router.put('/contracts/:id', controller.updateContract);
router.delete('/contracts/:id', controller.deleteContract);
router.post('/contracts/:id/meter-readings', controller.recordContractMeterReading);
router.get('/contracts/:id/meter-readings', controller.getContractMeterReadings);
router.get('/contracts/:id/bills', controller.getContractBills);
router.post('/external-machines', controller.registerExternalMachine);
router.post('/tickets/:id/assign', controller.assignTechnician);
router.post('/tickets/:id/collect-visit-charge', controller.collectVisitCharge);
router.post(
  '/tickets/:id/start-diagnosis',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.startDiagnosis,
);
router.post(
  '/tickets/:id/diagnose',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.diagnoseTicket,
);
router.get('/tickets/:id/estimates', controller.getTicketEstimates);
router.post('/tickets/:id/estimates', controller.createEstimate);
router.post('/tickets/:id/estimates/submit', controller.submitEstimateForApproval);
router.post(
  '/estimates/:estimateId/approve-finance',
  roleMiddleware(['FINANCE', 'ADMIN', 'MANAGER']),
  controller.approveEstimateFinance,
);
router.post(
  '/estimates/:estimateId/reject-finance',
  roleMiddleware(['FINANCE', 'ADMIN', 'MANAGER']),
  controller.rejectEstimateFinance,
);
router.post(
  '/estimates/:estimateId/approve-customer',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.approveEstimateCustomer,
);
router.post(
  '/estimates/:estimateId/reject-customer',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.rejectEstimateCustomer,
);
router.post('/tickets/:id/estimates/revisions', controller.createEstimateRevision);
router.post(
  '/estimates/revisions/:revisionId/approve-finance',
  roleMiddleware(['FINANCE', 'ADMIN', 'MANAGER']),
  controller.approveRevisionFinance,
);
router.post(
  '/estimates/revisions/:revisionId/approve-customer',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.approveRevisionCustomer,
);
router.post(
  '/tickets/:id/start-repair',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.startRepair,
);
router.post(
  '/tickets/:id/pause-repair',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.pauseRepair,
);
router.post(
  '/tickets/:id/resume-repair',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.resumeRepair,
);
router.post('/tickets/:id/quote', controller.submitQuotation);
router.patch('/tickets/:id/quotation-link', controller.patchQuotationLink);
router.patch(
  '/tickets/:id/finance-approved',
  roleMiddleware(['FINANCE', 'ADMIN', 'MANAGER']),
  controller.financeApproved,
);
router.patch(
  '/tickets/:id/finance-rejected',
  roleMiddleware(['FINANCE', 'ADMIN', 'MANAGER']),
  controller.financeRejected,
);
router.post('/tickets/:id/extend-validity', controller.extendValidity);
router.patch('/tickets/:id/revise-estimate', controller.reviseEstimate);
router.get('/tickets/:id/revisions', controller.getRevisions);
router.post(
  '/tickets/:id/customer-approve',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.customerApprove,
);
router.post(
  '/tickets/:id/customer-reject',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.customerReject,
);
router.post(
  '/tickets/:id/start',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.startService,
);
router.post(
  '/tickets/:id/complete',
  requireServiceRole(['SERVICE_TECHNICIAN']),
  controller.completeService,
);
router.get('/tickets/:id/quotation-pdf', controller.getQuotationPdf);
router.get('/tickets/:id/completion-bill-pdf', controller.getCompletionBillPdf);
router.post('/tickets/:id/send-quotation', controller.sendQuotation);
router.post('/tickets/:id/send-completion-bill', controller.sendCompletionBill);
router.post(
  '/tickets/:id/cancel',
  requireServiceRole([], false), // Only ADMIN and MANAGER
  controller.cancelTicket,
);
router.get('/technicians', controller.getTechnicians);
router.get('/accounts/cash-bank', controller.listCashBankAccounts);
router.get('/technicians/:technicianId/performance', controller.getTechnicianPerformance);
router.get('/customers/:customerId/history', controller.getCustomerHistory);
router.get('/machines/:serialNumber/lifetime-cost', controller.getMachineLifetimeCost);
router.get('/machines/:serialNumber/context', controller.getMachineContext);
router.get('/machines/:serialNumber/yield-history', controller.getMachineYieldHistory);
router.get('/finance/dashboard', controller.getFinanceDashboard);
router.post('/spare-parts/:id/mark-damaged', controller.markSparePartDamaged);

router.get('/tickets/:id/report', controller.generateReportPDF);
router.get('/machine/:productId/history', controller.getMachineHistory);

// Internal endpoint for Billing service — returns COGS and labour aggregates
router.get('/internal/cogs-report', controller.getCogsReport);

// Internal endpoint for Billing service — same COGS/labour cost, grouped by
// the service ticket's productId, for Segmented P&L per-machine direct cost.
router.get('/internal/cogs-report-by-product', controller.getCogsReportByProduct);

export default router;
