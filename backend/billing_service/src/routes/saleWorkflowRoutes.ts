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
import { getMyCustomer360Profile } from '../controllers/accountsController';
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
  refundSecurityDeposit,
  getSaleContracts,
  updateDeliveryStatus,
  getPendingUsagePayments,
  collectPendingUsagePayment,
  generateSalePaymentReceipt,
  sendSalePaymentReceiptEmail,
  sendSalePaymentReceiptWhatsApp,
  sendContractAgreementEmail,
  sendContractAgreementWhatsApp,
  getBill,
  generateBillSigningToken,
  sendBillEmail,
  sendBillWhatsApp,
  getBillForSigning,
  approveBillRemote,
  rejectBillRemote,
  markBillApprovedManually,
  getBillsForContract,
  generateAdvanceBill,
  resetBillForResend,
  getAdvanceBillStatus,
  generateSecurityDepositBill,
  getSecurityDepositBillStatus,
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
router.post(
  '/invoices/:id/contract-agreement/notify/email',
  authMiddleware,
  sendContractAgreementEmail,
);
router.post(
  '/invoices/:id/contract-agreement/notify/whatsapp',
  authMiddleware,
  sendContractAgreementWhatsApp,
);

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

// ─── Bill (UsageRecord) creation + customer approval — Stage A ───────────────
router.get('/usage/:id/bill', authMiddleware, getBill);
router.post('/usage/:id/bill/signing-token', authMiddleware, generateBillSigningToken);
router.post('/usage/:id/bill/notify/email', authMiddleware, sendBillEmail);
router.post('/usage/:id/bill/notify/whatsapp', authMiddleware, sendBillWhatsApp);
router.post('/usage/:id/bill/mark-approved', authMiddleware, markBillApprovedManually);
router.post('/usage/:id/bill/reset-for-resend', authMiddleware, resetBillForResend);
router.get('/usage/by-contract/:contractId/bills', authMiddleware, getBillsForContract);

// ─── Advance Bill — same Bill entity/pipeline, billType='ADVANCE' ────────────
router.post('/usage/contract/:contractId/advance-bill', authMiddleware, generateAdvanceBill);
router.get('/usage/advance-bill-status', authMiddleware, getAdvanceBillStatus);

// ─── Security Deposit Bill — same Bill entity/pipeline, billType='SECURITY_DEPOSIT' ──
router.post(
  '/usage/contract/:contractId/security-deposit-bill',
  authMiddleware,
  generateSecurityDepositBill,
);
router.get('/usage/security-deposit-bill-status', authMiddleware, getSecurityDepositBillStatus);

// Public (no auth) — customer remote bill approval
router.get('/bill/sign/:token', getBillForSigning);
router.post('/bill/sign/:token/approve', approveBillRemote);
router.post('/bill/sign/:token/reject', rejectBillRemote);

// ─── Sale Payments ────────────────────────────────────────────────────────────
router.get('/sale-payments/pending', authMiddleware, getPendingSalePayments);
router.get('/sale-payments', authMiddleware, getAllSalePaymentsForBranch);
router.get('/invoices/:id/sale-payments', authMiddleware, getSalePaymentsForInvoice);
router.post('/invoices/:id/sale-payments', authMiddleware, recordSalePayment);
router.post('/sale-payments/:id/approve', authMiddleware, approveSalePayment);
router.post('/sale-payments/:id/reject', authMiddleware, rejectSalePayment);
router.post('/sale-payments/:id/refund-deposit', authMiddleware, refundSecurityDeposit);
router.post('/sale-payments/:id/generate-receipt', authMiddleware, generateSalePaymentReceipt);
router.post('/sale-payments/:id/notify/email', authMiddleware, sendSalePaymentReceiptEmail);
router.post('/sale-payments/:id/notify/whatsapp', authMiddleware, sendSalePaymentReceiptWhatsApp);

// ─── Employee-side Customer 360° Profile (personal-only) ─────────────────────
// Not under the accounts module's gate (Manager/Finance/Admin only) — this is a
// lighter, personal-scope view any authenticated employee can reach for their own
// quotations/contracts/bills/payments/agreements with a customer, within their branch.
router.get('/customers/:customerId/my-360-profile', authMiddleware, getMyCustomer360Profile);

// ─── Machine Swap Requests ────────────────────────────────────────────────────
router.post('/contracts/:contractId/machine-swap', authMiddleware, initiateMachineSwap);
router.get('/machine-swaps', authMiddleware, getMachineSwapRequests);
router.post('/machine-swaps/:id/approve', authMiddleware, approveMachineSwap);
router.post('/machine-swaps/:id/reject', authMiddleware, rejectMachineSwap);

export default router;
