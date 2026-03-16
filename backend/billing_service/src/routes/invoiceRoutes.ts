import { Router } from 'express';
import {
  createQuotation,
  updateQuotation,
  approveQuotation,
  employeeApprove,
  allocateMachines,
  activateContract,
  financeReject,
  generateFinalInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  getBranchSales,
  getBranchSalesTotals,
  getBranchFinanceStats,
  getGlobalSales,
  getGlobalSalesTotals,
  getAdminSalesStats,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getFinanceReport,
  updateInvoiceUsage,
  createNextMonthInvoice,
  getInvoiceHistory,
  generateConsolidatedFinalInvoice,
  getCompletedCollections,
  downloadConsolidatedInvoice,
  sendConsolidatedInvoice,
  sendEmailNotification,
  sendWhatsappNotification,
  getAvailableYears,
  uploadContractConfirmation,
  replaceDeviceAllocation,
  getContractAllocations,
} from '../controllers/invoiceController';
import { uploadMeterImage } from '../middlewares/uploadMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import { requireJob, EmployeeJob } from '../middlewares/jobMiddleware';

/**
 * This file sets up all the communication paths for managing money,
 * price estimates (quotations), and official contracts.
 */
const router = Router();

// --- 1. Starting a New Deal (Quotations) ---

/**
 * Create a new price estimate (Quotation) for a potential customer.
 * Only Sales team members can do this.
 */
router.post(
  '/quotation',
  authMiddleware,
  requireRole(EmployeeRole.EMPLOYEE),
  requireJob(EmployeeJob.SALES, EmployeeJob.RENT_LEASE),
  createQuotation,
);

/**
 * Update a price estimate if the customer wants to change something.
 */
router.put('/quotation/:id', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), updateQuotation);

/**
 * Once a branch employee is happy with a deal, they send it to the
 * main Finance team for a final check before it becomes official.
 */
router.post(
  '/:id/employee-approve',
  authMiddleware,
  requireRole(EmployeeRole.EMPLOYEE),
  employeeApprove,
);

// --- 2. Making it Official (Contracts and Machines) ---

/**
 * The Finance team assigns specific equipment or machines to a customer's order.
 */
router.post('/:id/allocate-machines', authMiddleware, allocateMachines);

/**
 * Formally start a contract. This is the "Go" signal for the whole deal.
 */
router.post('/:id/activate-contract', authMiddleware, activateContract);

/**
 * Save a digital copy of the customer's signed contract or payment proof.
 */
router.post(
  '/:id/upload-confirmation',
  authMiddleware,
  uploadMeterImage.single('file'),
  uploadContractConfirmation,
);

/**
 * If something is wrong with a deal, the Finance team can reject it and send it back.
 */
router.post('/:id/finance-reject', authMiddleware, financeReject);

/**
 * Record a deposit or initial payment from the customer.
 */
router.put('/:id/approve', authMiddleware, approveQuotation);

// --- 3. Lists and Statistics for Staff ---

/**
 * Show me only the bills and deals I am personally working on.
 */
router.get('/my-invoices', authMiddleware, getMyInvoices);

/**
 * List every single bill in the system.
 */
router.get('/', authMiddleware, getAllInvoices);

/**
 * Get a high-level summary of all billing activity (Dashboard numbers).
 */
router.get('/stats', authMiddleware, getStats);

/**
 * Find out which years we have records for.
 */
router.get('/stats/available-years', authMiddleware, getAvailableYears);

// --- 4. Sales and Business Reports ---

/**
 * Detailed sales performance numbers for company Administrators.
 */
router.get(
  '/sales/admin-stats',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN),
  getAdminSalesStats,
);

/**
 * See how well a specific branch is performing in terms of sales.
 */
router.get('/sales/branch-overview', authMiddleware, getBranchSales);

/**
 * Total sales numbers for a specific branch.
 */
router.get('/sales/branch-totals', authMiddleware, getBranchSalesTotals);

/**
 * Detailed financial health report (Revenue vs Costs) for a branch.
 */
router.get('/sales/branch-finance-stats', authMiddleware, getBranchFinanceStats);

/**
 * Overview of sales performance across the entire global company.
 */
router.get('/sales/global-overview', authMiddleware, getGlobalSales);

/**
 * Total sales numbers for the entire global company.
 */
router.get('/sales/global-totals', authMiddleware, getGlobalSalesTotals);

// --- 5. Billing Operations and Collections ---

/**
 * Create the final bill for a customer when a deal is finished.
 */
router.post(
  '/settlements/generate',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  generateFinalInvoice,
);

/**
 * Set up the bill for the upcoming month for ongoing contracts.
 */
router.post(
  '/settlements/next-month',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  createNextMonthInvoice,
);

/**
 * Count how many tasks are waiting for someone to take action (Task badges).
 */
router.get('/pending-counts', authMiddleware, getPendingCounts);

/**
 * Combine several bills into one single master bill for a customer.
 */
router.post(
  '/settlements/consolidate',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  generateConsolidatedFinalInvoice,
);

/**
 * Reminders about which customers need to pay their bills soon.
 */
router.get(
  '/alerts',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  getCollectionAlerts,
);

/**
 * List all the bills that have been fully paid.
 */
router.get(
  '/completed-collections',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  getCompletedCollections,
);

/**
 * Swap out a machine assigned to a customer for a different one.
 */
router.post(
  '/allocations/replace',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  replaceDeviceAllocation,
);

/**
 * Download a PDF copy of a combined master bill.
 */
router.get(
  '/completed-collections/:contractId/download',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  downloadConsolidatedInvoice,
);

/**
 * Send a combined master bill to a customer via email.
 */
router.post(
  '/completed-collections/:contractId/send',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  sendConsolidatedInvoice,
);

// --- 6. Branch and History ---

/**
 * List all bills belonging to a specific office or branch.
 */
router.get('/branch-invoices', authMiddleware, getBranchInvoices);

/**
 * Look back at all the changes ever made to an invoice.
 */
router.get(
  '/history',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE, EmployeeRole.EMPLOYEE),
  getInvoiceHistory,
);

/**
 * Comprehensive financial report for accounting and management.
 */
router.get(
  '/finance/report',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.MANAGER, EmployeeRole.FINANCE),
  getFinanceReport,
);

/**
 * Update how much a customer has used our service (e.g., meter readings).
 */
router.put(
  '/:id/usage',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  updateInvoiceUsage,
);

// --- 7. Notifications and Lookups ---

/**
 * Manually send an email notification to a customer about a bill.
 */
router.post('/:id/notify/email', authMiddleware, sendEmailNotification);

/**
 * Manually send a WhatsApp message to a customer about a bill.
 */
router.post('/:id/notify/whatsapp', authMiddleware, sendWhatsappNotification);

/**
 * See which machines are currently assigned to a specific contract.
 */
router.get('/:contractId/allocations', authMiddleware, getContractAllocations);

/**
 * Find one specific bill using its unique ID number.
 */
router.get('/:id', authMiddleware, getInvoiceById);

export default router;
