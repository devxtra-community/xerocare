import { Router } from 'express';
import multer from 'multer';
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
} from '../controllers/invoiceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { UserRole } from '../constants/userRole';

/**
 * This file defines all the paths (routes) for handling Invoices.
 * Invoices are the bills and financial records our system creates.
 */
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
router.get('/branch-invoices', requireRole(UserRole.ADMIN, UserRole.MANAGER), getBranchInvoices);

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
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
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
 * Create a brand new invoice.
 */
router.post('/', requireRole(UserRole.EMPLOYEE), createInvoice);

/**
 * Update the details of a price estimate (Quotation).
 */
router.put('/:id', requireRole(UserRole.EMPLOYEE), updateQuotation);

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

export default router;
