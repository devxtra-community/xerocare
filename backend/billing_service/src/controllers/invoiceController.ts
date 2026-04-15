import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { BillingReportService } from '../services/billingReportService';
import { NotificationService } from '../services/notificationService';
import { AppError } from '../errors/appError';
import { MulterS3File } from '../types/multer-s3-file';
import { Source } from '../config/dataSource';
import { ProductAllocation } from '../entities/productAllocationEntity';
import { EmployeeRole } from '../constants/employeeRole';

const billingService = new BillingService();
const reportService = new BillingReportService();
const notificationService = new NotificationService();

/**
 * Start a new deal by creating a price estimate (Quotation).
 *
 * Before saving, we make sure the salesperson hasn't tried to set
 * sensitive fields like "which branch this belongs to" manually—our
 * system handles that automatically for security.
 */
export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, employeeId, createdBy, ...payload } = req.body;

    if (branchId || employeeId || createdBy) {
      throw new AppError(
        'Security Violation: branchId, employeeId, and createdBy must not be provided in request body',
        400,
      );
    }

    if (!req.user || !req.user.userId || !req.user.branchId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const {
      pricingItems,
      rentType,
      rentPeriod,
      saleType,
      customerId,
      monthlyRent,
      advanceAmount,
      discountPercent,
      discountAmount,
      effectiveFrom,
      effectiveTo,
      items,
      totalAmount,
    } = payload;

    if (!customerId || !saleType) {
      throw new AppError('Invalid request payload: customerId and saleType are required', 400);
    }

    if (['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(saleType)) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError(`Invalid request payload: items array is required for ${saleType}`, 400);
      }
    } else if (saleType === 'LEASE') {
      if (!payload.leaseType || (!payload.leaseTenureMonths && payload.leaseTenureMonths !== 0)) {
        throw new AppError(
          'Invalid request payload: leaseType and leaseTenureMonths are required for LEASE',
          400,
        );
      }
    } else if (saleType === 'RENT') {
      if (!pricingItems || !rentType) {
        throw new AppError(
          'Invalid request payload: pricingItems and rentType are required for RENT',
          400,
        );
      }
    } else {
      throw new AppError(`Invalid request payload: unsupported saleType ${saleType}`, 400);
    }

    const invoice = await billingService.createQuotation({
      branchId: req.user.branchId,
      createdBy: req.user.userId,
      customerId,
      saleType,
      rentType,
      rentPeriod,
      monthlyRent,
      advanceAmount,
      discountPercent,
      discountAmount,
      effectiveFrom,
      effectiveTo,
      pricingItems,
      totalAmount,
      items,
      leaseType: payload.leaseType,
      leaseTenureMonths: payload.leaseTenureMonths,
      monthlyEmiAmount: payload.monthlyEmiAmount,
      totalLeaseAmount: payload.totalLeaseAmount,
      monthlyLeaseAmount: payload.monthlyLeaseAmount,

      // Security Deposit
      securityDepositAmount: req.body.securityDepositAmount,
      securityDepositMode: req.body.securityDepositMode,
      securityDepositReference: req.body.securityDepositReference,
      securityDepositDate: req.body.securityDepositDate,
      securityDepositBank: req.body.securityDepositBank,
    });

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Quotation created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing price estimate.
 * This is used if the customer asks for a different price, a longer
 * lease, or different equipment.
 */
export const updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      pricingItems,
      rentType,
      rentPeriod,
      monthlyRent,
      advanceAmount,
      discountPercent,
      discountAmount,
      effectiveFrom,
      effectiveTo,
      items,
    } = req.body;

    const invoice = await billingService.updateQuotation(id, {
      rentType,
      rentPeriod,
      monthlyRent,
      advanceAmount,
      discountPercent,
      discountAmount,
      effectiveFrom,
      effectiveTo,
      pricingItems,
      items,
      leaseType: req.body.leaseType,
      leaseTenureMonths: req.body.leaseTenureMonths,
      monthlyEmiAmount: req.body.monthlyEmiAmount,
      totalLeaseAmount: req.body.totalLeaseAmount,
      monthlyLeaseAmount: req.body.monthlyLeaseAmount,

      // Security Deposit
      securityDepositAmount: req.body.securityDepositAmount,
      securityDepositMode: req.body.securityDepositMode,
      securityDepositReference: req.body.securityDepositReference,
      securityDepositDate: req.body.securityDepositDate,
      securityDepositBank: req.body.securityDepositBank,
    });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move a price estimate forward to the next stage (Proforma Invoice).
 * This usually happens after we've confirmed the customer paid their initial deposit.
 */
export const approveQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { deposit } = req.body;

    const invoice = await billingService.approveQuotation(id, deposit);
    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation approved and converted to Proforma',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * The branch employee signals they are finished with the deal and
 * sends it to the central Finance team for a final check.
 */
export const employeeApprove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const invoice = await billingService.employeeApprove(id, req.user.userId);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation sent for Finance Approval',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 1 of the Finance Check:
 * The Finance team picks out the specific physical machines that will be
 * sent to the customer.
 */
export const allocateMachines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const { itemUpdates } = req.body;

    const invoice = await billingService.allocateMachines(
      id,
      req.user.userId,
      req.headers.authorization || '',
      itemUpdates,
    );

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Machines allocated successfully, waiting for contract confirmation',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2 of the Finance Check:
 * The Finance team officially signs off and "turns on" the contract.
 * This usually happens after they verify the signed paperwork is in order.
 */
export const activateContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const { contractConfirmationUrl, deposit, itemUpdates } = req.body;

    if (!contractConfirmationUrl) {
      throw new AppError(
        'Contract confirmation document URL is required to activate the contract',
        400,
      );
    }

    const invoice = await billingService.activateContract(
      id,
      req.user.userId,
      req.headers.authorization || '',
      contractConfirmationUrl,
      deposit,
      itemUpdates,
    );

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Contract activated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload and save a digital scan of the signed contract or payment slip.
 */
export const uploadContractConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const file = req.file as MulterS3File | undefined;
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }
    return res.status(200).json({
      success: true,
      data: { url: file.location },
      message: 'Contract confirmation document uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * If the central Finance team finds a mistake, they can "reject" the deal
 * and send it back to the branch with a note explaining what needs fixing.
 */
export const financeReject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    if (!reason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const invoice = await billingService.financeReject(id, req.user.userId, reason);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Finance rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const generateFinalInvoice = async (req: Request, res: Response, next: NextFunction) => {
  next(new AppError('Endpoint deprecated. Use generateConsolidatedFinalInvoice instead.', 410));
};

export const createNextMonthInvoice = async (req: Request, res: Response, next: NextFunction) => {
  next(
    new AppError('Endpoint deprecated. Monthly verification no longer generates invoices.', 410),
  );
};

/**
 * Create the final official bill for a customer once a deal is fully settled.
 */
export const generateConsolidatedFinalInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { contractId } = req.body;
    if (!contractId) {
      throw new AppError('contractId is required', 400);
    }

    const invoice = await billingService.generateConsolidatedFinalInvoice(contractId);

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Consolidated Final Invoice generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List every single bill.
 * - Administrators see bills from every branch.
 * - Local staff only see bills for their own specific branch.
 */
export const getAllInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const invoices = await billingService.getAllInvoices(branchId);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Show me only the bills that I personally created.
 */
export const getMyInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }
    const invoices = await billingService.getInvoicesByCreator(req.user.userId);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all invoices associated with the user's branch.
 */
export const getBranchInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const invoices = await billingService.getBranchInvoices(branchId);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the full details for one specific bill using its ID.
 */
export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const invoice = await billingService.getInvoiceById(id);

    // Branch isolation: Only Admin can see invoices from any branch
    if (req.user?.role !== 'ADMIN' && invoice.branchId !== req.user?.branchId) {
      throw new AppError('Access denied: Invoice belongs to another branch', 403);
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the bird's-eye view numbers (how many bills, total money) for the dashboard.
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createdBy = req.query.createdBy as string;
    const branchId =
      req.user?.role === 'ADMIN' ? (req.query.branchId as string) : req.user?.branchId;

    const stats = await reportService.getInvoiceStats({ createdBy, branchId });
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * See how much money a specific branch has made over a period of time.
 */
export const getBranchSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const result = await reportService.getBranchSales(period, branchId, year);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Branch sales overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the grand total of all sales for my branch.
 */
export const getBranchSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const result = await reportService.getBranchSalesTotals(branchId, year);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Branch sales totals fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Detailed financial health check: How much we made vs. how much we spent.
 */
export const getBranchFinanceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const result = await reportService.getBranchFinanceStats(branchId, year);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Branch finance stats fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Count how many tasks (like bills waiting for design) need attention.
 * These show up as red "notification" numbers on the screen.
 */
export const getPendingCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }
    const counts = await reportService.getPendingCounts(branchId);
    return res.status(200).json({
      success: true,
      data: counts,
      message: 'Pending counts fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reminders about customer bills that are overdue or need collecting soon.
 */
export const getCollectionAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }
    const alerts = await reportService.getCollectionAlerts(branchId);
    return res.status(200).json({
      success: true,
      data: alerts,
      message: 'Collection alerts fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sales performance for the entire global company (HQ view).
 */
export const getGlobalSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const result = await reportService.getGlobalSales(period, year);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Global sales overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Total sales numbers for every office everywhere.
 */
export const getGlobalSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const result = await reportService.getGlobalSalesTotals(year);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Global sales totals fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a massive report showing all finances, sortable by branch, month, or year.
 */
export const getFinanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, saleType, month, year } = req.query;
    const effectiveBranchId =
      req.user?.role === 'ADMIN' ? (branchId as string) : req.user?.branchId;

    if (!effectiveBranchId && req.user?.role !== 'ADMIN') {
      throw new AppError('Branch ID required for managers', 400);
    }

    const report = await reportService.getFinanceReport({
      branchId: effectiveBranchId,
      saleType: saleType as string,
      month: month ? parseInt(month as string, 10) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Finance report fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the "usage" on a bill—for example, how many pages a customer printed.
 */
export const updateInvoiceUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { bwA4Count, bwA3Count, colorA4Count, colorA3Count } = req.body;

    const invoice = await billingService.updateInvoiceUsage(id, {
      bwA4Count: Number(bwA4Count || 0),
      bwA3Count: Number(bwA3Count || 0),
      colorA4Count: Number(colorA4Count || 0),
      colorA3Count: Number(colorA3Count || 0),
    });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice usage updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Performance numbers specially formatted for the Head Office dashboard.
 */
export const getAdminSalesStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await reportService.getAdminSalesStats();
    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Admin sales stats fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Look back at the history of a bill to see who changed what.
 */
export const getInvoiceHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const saleType = req.query.saleType as string | undefined;

    // If not Admin/Finance, restrict to creator's invoices
    const isSpecializedRole =
      req.user?.role === EmployeeRole.ADMIN || req.user?.role === EmployeeRole.FINANCE;
    const creatorId = isSpecializedRole ? undefined : req.user?.userId;

    const history = await reportService.getInvoiceHistory(branchId, saleType, creatorId);

    return res.status(200).json({
      success: true,
      data: history,
      message: 'Invoice history fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all the bills where we have successfully collected the money.
 */
export const getCompletedCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.branchId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const collections = await reportService.getCompletedCollections(req.user.branchId);
    return res.status(200).json({
      success: true,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a professional PDF of the final bill so it can be printed or shared.
 */
export const downloadConsolidatedInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const contractId = req.params.contractId as string;
    if (!contractId) throw new AppError('Contract ID required', 400);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consolidated-invoice-${contractId}.pdf`,
    );

    await reportService.downloadConsolidatedInvoice(contractId, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Download a professional premium PDF for a quotation.
 */
export const downloadPremiumQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError('Quotation ID required', 400);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${id}.pdf`);

    await reportService.downloadPremiumQuotation(id, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Download a professional premium PDF for an invoice (Sale type).
 */
export const downloadPremiumInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError('Invoice ID required', 400);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

    await reportService.downloadPremiumInvoice(id, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Automatically send the final bill to the customer via email or other channels.
 */
export const sendConsolidatedInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    if (!contractId) throw new AppError('Contract ID required', 400);

    const result = await notificationService.sendConsolidatedInvoice(contractId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a custom email message to a customer about their bill.
 */
export const sendEmailNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { recipient, subject, body, attachments } = req.body;

    if (!body) {
      throw new AppError('Body is required', 400);
    }

    await notificationService.sendEmailNotification(id, recipient, subject, body, attachments);

    return res.status(200).json({
      success: true,
      message: 'Email notification request sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a quick WhatsApp message to a customer about their bill.
 */
export const sendWhatsappNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { recipient, body } = req.body;

    if (!body) {
      throw new AppError('Body is required', 400);
    }

    await notificationService.sendWhatsappNotification(id, recipient, body);

    return res.status(200).json({
      success: true,
      message: 'WhatsApp notification request sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find out which years we have records for, so you can pick them in a filter.
 */
export const getAvailableYears = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const years = await reportService.getAvailableYears();
    return res.status(200).json({
      success: true,
      data: years,
      message: 'Available years fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * If a customer's machine breaks, swap it for a different one in our records.
 */
export const replaceDeviceAllocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const result = await billingService.replaceDeviceAllocation(payload);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Device replaced successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a list of all equipment currently assigned to a contract.
 */
export const getContractAllocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contractId } = req.params;
    if (!contractId) throw new AppError('contractId is required', 400);
    const allocations = await Source.getRepository(ProductAllocation).find({
      where: { contractId: String(contractId) },
      order: { startTimestamp: 'ASC' },
    });
    return res.status(200).json({ success: true, data: allocations });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a return credit for an invoice item.
 */
export const processReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id as string;
    const { itemId, itemType, amount, note } = req.body;

    if (!invoiceId || !itemId || !itemType || amount === undefined) {
      throw new AppError('invoiceId, itemId, itemType, and amount are required', 400);
    }

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const result = await billingService.processReturn(invoiceId, {
      itemId,
      itemType,
      amount: Number(amount),
      note: note || '',
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Return processed successfully and earning reduced',
    });
  } catch (error) {
    next(error);
  }
};
