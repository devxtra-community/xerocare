import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireJob, EmployeeJob } from '../middlewares/jobMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import {
  initiateMachineSwap,
  getMachineSwapRequests,
  approveMachineSwap,
  rejectMachineSwap,
} from '../controllers/machineSwapController';
import {
  getContractAgreement,
  createOrGetContractAgreement,
  signContractEmployee,
  signContractCustomerInPerson,
  signContractCustomerByUpload,
  generateSigningToken,
  signContractRemote,
  getContractForSigning,
  getInstallationRequestsForBranch,
  createInstallationRequest,
  assignTechnician,
  startInstallation,
  stopInstallation,
  getSalePaymentsForInvoice,
  getPendingSalePayments,
  getAllSalePaymentsForBranch,
  recordSalePayment,
  approveSalePayment,
  rejectSalePayment,
  getSaleContracts,
  updateDeliveryStatus,
  getPendingUsagePayments,
  collectPendingUsagePayment,
  generateSalePaymentReceipt,
  sendSalePaymentReceiptEmail,
  sendSalePaymentReceiptWhatsApp,
} from '../controllers/saleWorkflowController';
import { uploadSignedAgreementDoc } from '../middlewares/uploadMiddleware';

const router = Router();

// ─── Sale Contracts list ──────────────────────────────────────────────────────
router.get('/sale-contracts', authMiddleware, getSaleContracts);
router.patch(
  '/sale-contracts/:id/delivery-status',
  authMiddleware,
  requireJob(EmployeeJob.SERVICE_HELP_DESK),
  updateDeliveryStatus,
);

// ─── Contract Agreements ──────────────────────────────────────────────────────
router.get('/invoices/:id/contract-agreement', authMiddleware, getContractAgreement);
router.post('/invoices/:id/contract-agreement', authMiddleware, createOrGetContractAgreement);
router.post('/invoices/:id/contract-agreement/sign-employee', authMiddleware, signContractEmployee);
router.post(
  '/invoices/:id/contract-agreement/sign-customer',
  authMiddleware,
  signContractCustomerInPerson,
);
router.post(
  '/invoices/:id/contract-agreement/sign-customer-upload',
  authMiddleware,
  uploadSignedAgreementDoc.single('file'),
  signContractCustomerByUpload,
);
router.post('/invoices/:id/contract-agreement/signing-token', authMiddleware, generateSigningToken);

// Public (no auth) — customer remote signing
router.get('/contract/sign/:token', getContractForSigning);
router.post('/contract/sign/:token', signContractRemote);

// ─── Installation Requests ────────────────────────────────────────────────────
router.get('/installation-requests', authMiddleware, getInstallationRequestsForBranch);
router.post(
  '/invoices/:id/installation-request',
  authMiddleware,
  requireJob(EmployeeJob.SERVICE_HELP_DESK),
  createInstallationRequest,
);
router.patch(
  '/installation-requests/:id/assign',
  authMiddleware,
  requireJob(EmployeeJob.SERVICE_HELP_DESK),
  assignTechnician,
);
router.post('/installation-requests/:id/start', authMiddleware, startInstallation);
router.post('/installation-requests/:id/stop', authMiddleware, stopInstallation);

// ─── Pending Usage Payments (Rent/Lease periodic collection shortfalls) ───────
router.get(
  '/usage-payments/pending',
  authMiddleware,
  requireRole(EmployeeRole.FINANCE),
  getPendingUsagePayments,
);
router.post(
  '/usage-records/:id/collect-pending',
  authMiddleware,
  requireRole(EmployeeRole.FINANCE),
  collectPendingUsagePayment,
);

// ─── Sale Payments ────────────────────────────────────────────────────────────
router.get('/sale-payments/pending', authMiddleware, getPendingSalePayments);
router.get('/sale-payments', authMiddleware, getAllSalePaymentsForBranch);
router.get('/invoices/:id/sale-payments', authMiddleware, getSalePaymentsForInvoice);
router.post('/invoices/:id/sale-payments', authMiddleware, recordSalePayment);
router.post('/sale-payments/:id/approve', authMiddleware, approveSalePayment);
router.post('/sale-payments/:id/reject', authMiddleware, rejectSalePayment);
router.post('/sale-payments/:id/generate-receipt', authMiddleware, generateSalePaymentReceipt);
router.post('/sale-payments/:id/notify/email', authMiddleware, sendSalePaymentReceiptEmail);
router.post('/sale-payments/:id/notify/whatsapp', authMiddleware, sendSalePaymentReceiptWhatsApp);

// ─── Machine Swap Requests ────────────────────────────────────────────────────
router.post('/contracts/:contractId/machine-swap', authMiddleware, initiateMachineSwap);
router.get('/machine-swaps', authMiddleware, getMachineSwapRequests);
router.post('/machine-swaps/:id/approve', authMiddleware, approveMachineSwap);
router.post('/machine-swaps/:id/reject', authMiddleware, rejectMachineSwap);

export default router;
