import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { BillingReportService } from '../services/billingReportService';
import { NotificationService } from '../services/notificationService';
import { AppError } from '../errors/appError';
import { MulterS3File } from '../types/multer-s3-file';
import { Source } from '../config/dataSource';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { Invoice } from '../entities/invoiceEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { EmployeeRole } from '../constants/employeeRole';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';

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
      validityDays:
        req.body.validityDays !== undefined
          ? Number(req.body.validityDays)
          : req.body.validity_days !== undefined
            ? Number(req.body.validity_days)
            : undefined,

      // Security Deposit
      securityDepositAmount: req.body.securityDepositAmount,
      securityDepositMode: req.body.securityDepositMode,
      securityDepositReference: req.body.securityDepositReference,
      securityDepositDate: req.body.securityDepositDate,
      securityDepositBank: req.body.securityDepositBank,

      // Warranty Fields
      warrantyType: req.body.warrantyType,
      warrantyDurationValue: req.body.warrantyDurationValue,
      warrantyDurationUnit: req.body.warrantyDurationUnit,
      warrantyCopyLimit: req.body.warrantyCopyLimit,

      layoutId: req.body.layoutId,
      notes: req.body.notes,
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
 * Generic status update for an invoice or quotation.
 */
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const result = await billingService.updateStatus(id, status, req.user?.userId);
    return res.status(200).json({ success: true, data: result });
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

    const invoice = await billingService.approveQuotation(id, deposit, req.user?.userId);
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
 * Finance reviews and approves the pricing/terms of a quotation.
 */
export const financeApproveQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!req.user || !req.user.userId) throw new AppError('User context missing', 401);

    const invoice = await billingService.financeApproveQuotation(id, req.user.userId, req.body);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation pricing approved by Finance',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Employee converts an approved quotation into an active Sale/Rent/Lease transaction.
 */
export const convertToTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!req.user || !req.user.userId) throw new AppError('User context missing', 401);

    const invoice = await billingService.convertToTransaction(id, req.user.userId);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation converted to transaction successfully',
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

    const invoiceCheck = await billingService.getInvoiceById(id);
    if (!invoiceCheck) {
      throw new AppError('Invoice not found', 404);
    }

    if (
      !contractConfirmationUrl &&
      invoiceCheck.saleType !== 'SALE' &&
      invoiceCheck.saleType !== 'PRODUCT_SALE' &&
      invoiceCheck.saleType !== 'SPAREPART_SALE'
    ) {
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
    const role = req.user?.role;

    let invoices;
    if (role === EmployeeRole.ADMIN || role === EmployeeRole.FINANCE) {
      // Finance and Admin can see all branch invoices for unified approval
      invoices = await billingService.getAllInvoices();
    } else {
      if (!branchId) {
        throw new AppError('Branch ID not found in user context', 400);
      }
      invoices = await billingService.getBranchInvoices(branchId);
    }

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

    const invoice = await billingService.updateInvoiceUsage(
      id,
      {
        bwA4Count: Number(bwA4Count || 0),
        bwA3Count: Number(bwA3Count || 0),
        colorA4Count: Number(colorA4Count || 0),
        colorA3Count: Number(colorA3Count || 0),
      },
      req.user?.userId,
    );

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

/**
 * Public endpoint: Customer accepts or rejects a quotation via email/WhatsApp link.
 * No authentication required — the quotation ID is sufficient for the action.
 */
export const customerRespond = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const action = req.query.action as string;

    if (!id) throw new AppError('Quotation ID is required', 400);
    if (action !== 'accept' && action !== 'reject') {
      throw new AppError('Invalid action. Must be "accept" or "reject"', 400);
    }

    const result = await billingService.customerRespond(id, action);

    // Serve a friendly HTML response page
    const isAccepted = action === 'accept';
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isAccepted ? 'Quotation Accepted' : 'Quotation Rejected'} – XeroCare</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isAccepted ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)'};
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.08);
      border: 1px solid ${isAccepted ? '#bbf7d0' : '#fecaca'};
    }
    .icon { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; background: ${isAccepted ? '#dcfce7' : '#fee2e2'}; }
    h1 { font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; }
    .ref { margin-top: 24px; padding: 14px 20px; background: #f8fafc; border-radius: 12px; font-size: 13px; color: #475569; font-weight: 600; }
    .badge { display: inline-block; margin-top: 20px; padding: 6px 18px; border-radius: 999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${isAccepted ? '#16a34a' : '#dc2626'}; color: white; }
    .brand { margin-top: 32px; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isAccepted ? '&#10004;' : '&#10008;'}</div>
    <h1>${isAccepted ? 'Quotation Accepted!' : 'Quotation Rejected'}</h1>
    <p>${
      isAccepted
        ? 'Thank you! Your acceptance has been recorded. Our team will contact you shortly to proceed with the next steps.'
        : 'Your response has been recorded. Please feel free to contact us if you have any questions or would like to discuss further.'
    }</p>
    <div class="ref">Reference: ${result.invoiceNumber}</div>
    <span class="badge">${isAccepted ? 'Accepted' : 'Rejected'}</span>
    <p class="brand">XeroCare Trading &amp; Services W.L.L</p>
  </div>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

export const requestValidityExtension = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await billingService.requestValidityExtension(id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const createDirectSale = async (req: Request, res: Response, next: NextFunction) => {
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

    const result = await billingService.createDirectSale({
      ...payload,
      branchId: req.user.branchId,
      createdBy: req.user.userId,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const createQuotationTemplate = async (req: Request, res: Response, next: NextFunction) => {
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

    const { pricingItems, rentType, saleType, items } = payload;

    if (!saleType) {
      throw new AppError('Invalid request payload: saleType is required', 400);
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

    const template = await billingService.createQuotationTemplate({
      ...payload,
      branchId: req.user.branchId,
      createdBy: req.user.userId,
    });

    return res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

export const getQuotationTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await billingService.getQuotationTemplates();
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

export const assignQuotationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new AppError('employeeIds must be a non-empty array', 400);
    }

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    await billingService.assignQuotationTemplate(id, employeeIds, req.user.userId);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getTemplateAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const assignments = await billingService.getTemplateAssignments(id);
    return res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

export const assignCustomerToQuotation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { customerId, discountAmount, notes } = req.body;

    if (!customerId) {
      throw new AppError('customerId is required', 400);
    }

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const result = await billingService.assignCustomerToQuotation(
      id,
      customerId,
      discountAmount !== undefined ? Number(discountAmount) : undefined,
      notes,
      req.user,
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const retakeQuotationAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const result = await billingService.retakeQuotationAssignment(id, req.user.userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const bulkRetakeQuotationAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string; // templateId
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    await billingService.bulkRetakeQuotationAssignments(id, req.user.userId);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeAssignedQuotations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const result = await billingService.getEmployeeAssignedQuotations(req.user.userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await billingService.deleteInvoice(id);
    return res
      .status(200)
      .json({ success: true, message: 'Invoice/Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const invoice = await billingService.getInvoiceById(id);

    const userRole = req.headers['x-user-role'] as string;
    const userBranchId = req.headers['x-user-branch-id'] as string;

    if (userRole !== 'ADMIN' && invoice.branchId !== userBranchId) {
      throw new AppError('Access denied: Invoice belongs to another branch', 403);
    }

    const logs = [];

    // 1. Creation log
    logs.push({
      action: 'CREATED',
      userId: invoice.createdBy,
      timestamp: invoice.createdAt,
      remarks: 'Invoice/Contract created.',
    });

    // 2. Employee approval log
    if (invoice.employeeApprovedBy || invoice.employeeApprovedAt) {
      logs.push({
        action: 'EMPLOYEE_APPROVED',
        userId: invoice.employeeApprovedBy,
        timestamp: invoice.employeeApprovedAt,
        remarks: 'Contract approved by employee.',
      });
    }

    // 3. Finance approval log
    if (invoice.financeApprovedBy || invoice.financeApprovedAt) {
      logs.push({
        action: 'FINANCE_APPROVED',
        userId: invoice.financeApprovedBy,
        timestamp: invoice.financeApprovedAt,
        remarks: invoice.financeRemarks || 'Quotation/Contract approved by finance.',
      });
    }

    // 4. Finance rejection log (fallback if rejected status is present)
    if (
      (invoice.status === InvoiceStatus.FINANCE_REJECTED ||
        (invoice.status as string) === 'REJECTED') &&
      invoice.financeRemarks
    ) {
      logs.push({
        action: 'FINANCE_REJECTED',
        userId: 'Finance Team',
        timestamp: invoice.updatedAt,
        remarks: invoice.financeRemarks,
      });
    }

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const createServiceQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      customerId,
      branchId,
      createdBy,
      serviceTicketId,
      items,
      saleType,
      status,
      visitChargeAmount,
      visitChargeMethod,
      totalDiscountAmount,
      technicianNoteToFinance,
    } = req.body;
    const invoice = await billingService.createServiceQuotation({
      customerId,
      branchId,
      createdBy,
      serviceTicketId,
      items,
      saleType,
      status,
      visitChargeAmount,
      visitChargeMethod,
      totalDiscountAmount,
      technicianNoteToFinance,
    });
    return res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getContractBySerial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serialNumber = req.params.serialNumber as string;
    const allocation = await Source.getRepository(ProductAllocation).findOne({
      where: { serialNumber, status: AllocationStatus.ALLOCATED },
    });
    if (!allocation) {
      return res.status(200).json({
        success: false,
        message: 'No active allocation found for serial number',
      });
    }

    const contract = await Source.getRepository(Invoice).findOne({
      where: { id: allocation.contractId },
    });

    return res.status(200).json({
      success: true,
      data: {
        contract,
        allocation,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerBillingHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerId = req.params.customerId as string;
    const invoices = await Source.getRepository(Invoice).find({
      where: { customerId },
      relations: ['items', 'productAllocations'],
      order: { createdAt: 'DESC' },
    });

    // Group by billType
    const grouped: Record<string, Invoice[]> = {};
    invoices.forEach((inv) => {
      const type = inv.billType || 'SALE';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(inv);
    });

    return res.status(200).json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    next(error);
  }
};

export const reviseEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { items, visitChargeAmount, visitChargeMethod, discountAmount, technicianNoteToFinance } =
      req.body;
    const userId = req.user?.userId || 'SYSTEM';

    const result = await billingService.reviseEstimate(
      id,
      { items, visitChargeAmount, visitChargeMethod, discountAmount, technicianNoteToFinance },
      userId,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Estimate revised and submitted to finance successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const financeExtendValidity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { extensionDays, extensionFee } = req.body;
    const userId = req.user?.userId || 'SYSTEM';

    const result = await billingService.financeExtendValidity(
      id,
      { extensionDays, extensionFee },
      userId,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Estimate approved with validity extension successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const reassignCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { newCustomerId, discountAmount } = req.body;
    const userId = req.user?.userId || 'SYSTEM';

    if (!newCustomerId) {
      throw new AppError('newCustomerId is required', 400);
    }

    const result = await billingService.reassignCustomer(id, userId, {
      newCustomerId,
      discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Quotation reassigned to new customer successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { mode, reference, bank, amount, transactionDate, remarks, isSecurityDeposit } = req.body;
    const userId = req.user?.userId || 'SYSTEM';

    if (!mode) {
      throw new AppError('Payment mode is required', 400);
    }
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new AppError('A valid payment amount greater than 0 is required', 400);
    }

    const result = await billingService.recordPayment(
      id,
      {
        paymentMode: mode,
        referenceNumber: reference,
        amount: Number(amount),
        transactionDate,
        remarks: remarks || (bank ? `Bank: ${bank}` : undefined),
        isSecurityDeposit: !!isSecurityDeposit,
      },
      userId,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await billingService.getInvoiceLedger(id);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Ledger and transactions fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMachineBillingContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    const serialNumber = req.query.serialNumber as string;

    const rentInvoice = await Source.query(
      `
      SELECT i.id, i.type, i."billType", i."contractStatus"
      FROM invoices i
      JOIN product_allocations pa ON i.id = pa."contractId"
      WHERE i.type = 'PROFORMA' 
        AND i."billType" = 'RENT' 
        AND i."contractStatus" = 'ACTIVE' 
        AND pa.status = 'ALLOCATED'
        AND (pa."productId" = $1 OR pa."serialNumber" = $2)
      LIMIT 1;
    `,
      [productId, serialNumber],
    );

    const saleInvoice = await Source.query(
      `
      SELECT i.id, i."createdAt", i."effectiveFrom", ii.warranty,
             i."warrantyType", i."warrantyDurationValue", i."warrantyDurationUnit", i."warrantyCopyLimit"
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii."invoiceId"
      WHERE i.type = 'FINAL'
        AND (i."billType" = 'SALE' OR (i."billType" IS NULL AND i."saleType" = 'PRODUCT_SALE'))
        AND ii."productId" = $1
      ORDER BY i."createdAt" DESC
      LIMIT 1;
    `,
      [productId],
    );

    const leaseInvoice = await Source.query(
      `
      SELECT i.id, i."effectiveFrom", i."leaseTenureMonths", i."maxCopyLimit",
             i."warrantyType", i."warrantyDurationValue", i."warrantyDurationUnit", i."warrantyCopyLimit"
      FROM invoices i
      JOIN product_allocations pa ON i.id = pa."contractId"
      WHERE i.type = 'PROFORMA'
        AND i."billType" = 'LEASE'
        AND i."contractStatus" = 'ACTIVE'
        AND pa."productId" = $1
      LIMIT 1;
    `,
      [productId],
    );

    const latestAllocation = await Source.query(
      `
      SELECT * FROM product_allocations 
      WHERE "productId" = $1 
      ORDER BY "createdAt" DESC 
      LIMIT 1;
    `,
      [productId],
    );

    return res.status(200).json({
      success: true,
      data: {
        rentInvoice: rentInvoice && rentInvoice.length > 0 ? rentInvoice[0] : null,
        saleInvoice: saleInvoice && saleInvoice.length > 0 ? saleInvoice[0] : null,
        leaseInvoice: leaseInvoice && leaseInvoice.length > 0 ? leaseInvoice[0] : null,
        latestAllocation:
          latestAllocation && latestAllocation.length > 0 ? latestAllocation[0] : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMachineHistoryData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const serialNumber = req.query.serialNumber as string;

    const allocations = await Source.query<
      Array<{
        id: string;
        contractId: string;
        serialNumber: string;
        status: string;
        startTimestamp: string;
        endTimestamp: string | null;
        replacementReason: string | null;
        invoiceNumber: string;
        billType: string;
        contractStatus: string;
        customerId: string | null;
      }>
    >(
      `SELECT pa.id, pa."contractId", pa."serialNumber", pa.status,
              pa."startTimestamp", pa."endTimestamp", pa."replacementReason",
              i."invoiceNumber", i."billType", i."contractStatus", i."customerId"
       FROM product_allocations pa
       JOIN invoices i ON pa."contractId" = i.id
       WHERE pa."productId" = $1 OR pa."serialNumber" = $2
       ORDER BY pa."startTimestamp" ASC`,
      [productId, serialNumber || ''],
    );

    const contractIds = [...new Set(allocations.map((a) => a.contractId))];

    let usageRecords: UsageRecord[] = [];
    if (contractIds.length > 0) {
      usageRecords = await Source.getRepository(UsageRecord).find({
        where: contractIds.map((cid) => ({ contractId: cid })),
        order: { createdAt: 'ASC' },
        select: [
          'id',
          'contractId',
          'billingPeriodStart',
          'billingPeriodEnd',
          'bwA4Delta',
          'bwA3Delta',
          'colorA4Delta',
          'colorA3Delta',
          'totalCharge',
          'createdAt',
        ],
      });
    }

    return res.status(200).json({ success: true, data: { allocations, usageRecords } });
  } catch (error) {
    next(error);
  }
};
