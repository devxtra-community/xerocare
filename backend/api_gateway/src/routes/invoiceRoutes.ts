import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { UserRole } from '../constants/userRole';
import { AppError } from '../errors/appError';

import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  approveQuotation,
  employeeApprove,
  allocateMachines,
  activateContract,
  financeReject,
  generateFinalInvoice,
  updateQuotation,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getGlobalSales,
  getGlobalSalesTotals,
  getAdminSalesStats,
  createNextMonthInvoice,
  getInvoiceHistory,
  getCompletedCollections,
  downloadInvoice,
  sendInvoice,
  getFinanceReport,
  getBranchFinanceStats,
  sendEmailNotification,
  sendWhatsappNotification,
  uploadContractConfirmation,
  replaceDeviceAllocation,
  processReturn,
  financeApproveQuotation,
  convertToTransaction,
  createDirectSale,
  createQuotationTemplate,
  getQuotationTemplates,
  assignQuotationTemplate,
  getTemplateAssignments,
  assignCustomerToQuotation,
  retakeQuotationAssignment,
  bulkRetakeQuotationAssignments,
  getEmployeeAssignedQuotations,
  updateStatus,
  deleteInvoice,
  getAuditLogs,
} from '../controllers/invoiceController';

/**
 * This file defines all the paths (routes) for handling Invoices.
 * Invoices are the bills and financial records our system creates.
 */
const requireDirectSaleRoles = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }
  const { role, employeeJob } = req.user;
  if (role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCE') {
    return next();
  }
  if (
    role === 'EMPLOYEE' &&
    (employeeJob === 'SALES' || employeeJob === 'RENT_AND_LEASE' || employeeJob === 'MANAGER')
  ) {
    return next();
  }
  return next(new AppError('Access denied: insufficient permissions', 403));
};

const requireQuotationRoles = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }
  const { role, employeeJob } = req.user;
  if (role === 'ADMIN' || role === 'MANAGER') {
    return next();
  }
  if (
    role === 'EMPLOYEE' &&
    (employeeJob === 'SALES' || employeeJob === 'RENT_AND_LEASE' || employeeJob === 'MANAGER')
  ) {
    return next();
  }
  return next(new AppError('Access denied: insufficient permissions', 403));
};

const router = Router();

// This setup allows us to handle file uploads, like scanning and saving a contract.
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Security Check: Logged-in Users Only.
 * All the paths below this line require the user to be signed into the system.
 */
router.use(authMiddleware);

// --- 1. General Info and Statistics ---

/**
 * Get a quick overview of how we are doing (Statistics).
 * Available for: Admins, Finance team, Managers, and Employees.
 */
router.get(
  '/stats',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getStats,
);

/**
 * Show me only the invoices I have created.
 */
router.get(
  '/my-invoices',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getMyInvoices,
);

/**
 * List every single invoice in the system.
 */
router.get(
  '/',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getAllInvoices,
);

/**
 * List invoices belonging to a specific branch or office.
 */
router.get(
  '/branch-invoices',
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.EMPLOYEE),
  getBranchInvoices,
);

/**
 * Count how many tasks are waiting for someone to take action.
 */
router.get(
  '/pending-counts',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER),
  getPendingCounts,
);

/**
 * Detailed financial report for the whole business.
 */
router.get(
  '/finance/report',
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE),
  getFinanceReport,
);

/**
 * Alerts for when we need to collect money from customers.
 */
router.get('/alerts', requireRole(UserRole.ADMIN, UserRole.FINANCE), getCollectionAlerts);

/**
 * View the history of changes made to an invoice.
 */
router.get(
  '/history',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.EMPLOYEE),
  getInvoiceHistory,
);

/**
 * List all the money we have successfully collected.
 */
router.get(
  '/completed-collections',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getCompletedCollections,
);

/**
 * Download a PDF copy of a finished collection record.
 */
router.get(
  '/completed-collections/:contractId/download',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  downloadInvoice,
);

/**
 * Send a finished collection record to the customer via email.
 */
router.post(
  '/completed-collections/:contractId/send',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  sendInvoice,
);

// --- 2. Sales and Performance Data ---

/**
 * Global overview of sales across the entire company.
 */
router.get('/sales/global-overview', requireRole(UserRole.ADMIN, UserRole.FINANCE), getGlobalSales);

/**
 * Total sales numbers for the whole company.
 */
router.get(
  '/sales/global-totals',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getGlobalSalesTotals,
);

/**
 * Internal sales statistics specifically for the Administrator.
 */
router.get('/sales/admin-stats', requireRole(UserRole.ADMIN), getAdminSalesStats);

/**
 * Financial performance of each individual branch.
 */
router.get(
  '/sales/branch-finance-stats',
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE),
  getBranchFinanceStats,
);

// --- 3. Taking Action on Invoices and Contracts ---

/**
 * Approve a price estimate (Quotation) to move it forward.
 */
router.put('/:id/approve', requireRole(UserRole.EMPLOYEE), approveQuotation);

/**
 * Finance approves the quotation pricing.
 */
router.post(
  '/:id/finance-approve-quotation',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  financeApproveQuotation,
);

/**
 * Employee converts an approved quotation into an active transaction.
 */
router.post(
  '/:id/convert-to-transaction',
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER),
  convertToTransaction,
);

/**
 * Manager or Employee approval for a next-step action.
 */
router.post(
  '/:id/employee-approve',
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER),
  employeeApprove,
);

/**
 * Link specific machines to a customer's order.
 */
router.post(
  '/:id/allocate-machines',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  allocateMachines,
);

/**
 * Formally start a contract once everything is ready.
 */
router.post('/:id/activate-contract', authMiddleware, activateContract);

/**
 * Upload a signed document to confirm the contract is official.
 */
router.post(
  '/:id/upload-confirmation',
  authMiddleware,
  upload.single('file'),
  uploadContractConfirmation,
);

/**
 * The finance department can reject an invoice if something is wrong.
 */
router.post('/:id/finance-reject', requireRole(UserRole.ADMIN, UserRole.FINANCE), financeReject);

/**
 * Swap out a machine that was assigned to a customer.
 */
router.post(
  '/allocations/replace',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  replaceDeviceAllocation,
);

/**
 * Create the final bill for a customer.
 */
router.post(
  '/settlements/generate',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  generateFinalInvoice,
);

/**
 * Prepare the bill for the upcoming month.
 */
router.post(
  '/settlements/next-month',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  createNextMonthInvoice,
);

/**
 * Accept a return credit for an invoice item.
 */
router.post(
  '/:id/returns',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  processReturn,
);

/**
 * Create a brand new invoice/quotation.
 */
router.post('/', requireQuotationRoles, createInvoice);
router.post('/quotation', requireQuotationRoles, createInvoice);

/**
 * Create a new direct sale (Final Invoice) bypassing the quotation flow.
 */
router.post('/direct-sale', requireDirectSaleRoles, createDirectSale);

router.put('/:id', requireRole(UserRole.EMPLOYEE), updateQuotation);

/**
 * Update the status of an invoice or quotation.
 */
router.put(
  '/:id/status',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  updateStatus,
);

// --- Manager Quotation Template & Assignment System ---
router.post(
  '/quotation/template',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  createQuotationTemplate,
);

router.post('/template', requireRole(UserRole.MANAGER, UserRole.ADMIN), createQuotationTemplate);

router.get(
  '/quotation/template',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  getQuotationTemplates,
);

router.get(
  '/quotation/template/:id/assignments',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  getTemplateAssignments,
);

router.post(
  '/quotation/template/:id/assign',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  assignQuotationTemplate,
);

router.post(
  '/template/:id/assign',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  assignQuotationTemplate,
);

router.post(
  '/quotation/template/:id/retake-all',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  bulkRetakeQuotationAssignments,
);

router.post(
  '/quotation/:id/retake',
  requireRole(UserRole.MANAGER, UserRole.ADMIN),
  retakeQuotationAssignment,
);

router.post(
  '/quotation/:id/assign-customer',
  requireRole(UserRole.EMPLOYEE),
  assignCustomerToQuotation,
);

router.get('/quotation/assigned', requireRole(UserRole.EMPLOYEE), getEmployeeAssignedQuotations);

// --- 4. Notifications ---

/**
 * Send a notification to the customer via Email.
 */
router.post(
  '/:id/notify/email',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  sendEmailNotification,
);

/**
 * Send a notification to the customer via WhatsApp.
 */
router.post(
  '/:id/notify/whatsapp',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  sendWhatsappNotification,
);

// --- 5. Lookup ---

/**
 * Find one specific invoice using its unique ID number.
 */
router.get(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getInvoiceById,
);

/**
 * Delete a specific invoice or template.
 */
router.delete('/:id', requireRole(UserRole.MANAGER, UserRole.ADMIN), deleteInvoice);

/**
 * Get audit logs for an invoice/contract.
 */
router.get(
  '/audit-logs/:entityId',
  requireRole(UserRole.MANAGER, UserRole.FINANCE, UserRole.ADMIN),
  getAuditLogs,
);

export default router;
