import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { BillingReportService } from '../services/billingReportService';
import { NotificationService } from '../services/notificationService';
import { AppError } from '../errors/appError';

const billingService = new BillingService();
const reportService = new BillingReportService();
const notificationService = new NotificationService();

/**
 * Creates a new quotation for a customer.
 * Validates input payload and strictly prohibits security-sensitive fields in the body.
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
      effectiveFrom,
      effectiveTo,
      items,
      totalAmount,
    } = payload;

    if (!customerId || !saleType) {
      throw new AppError('Invalid request payload: customerId and saleType are required', 400);
    }

    if (saleType === 'SALE') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Invalid request payload: items array is required for SALE', 400);
      }
    } else if (saleType === 'LEASE') {
      if (!payload.leaseType || (!payload.leaseTenureMonths && payload.leaseTenureMonths !== 0)) {
        throw new AppError(
          'Invalid request payload: leaseType and leaseTenureMonths are required for LEASE',
          400,
        );
      }
    } else {
      if (!pricingItems || !rentType) {
        throw new AppError(
          'Invalid request payload: pricingItems and rentType are required for RENT',
          400,
        );
      }
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
 * Updates an existing quotation.
 * Allows modification of rental terms, pricing items, and lease details.
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
      effectiveFrom,
      effectiveTo,
      pricingItems,
      items,
      leaseType: req.body.leaseType,
      leaseTenureMonths: req.body.leaseTenureMonths,
      monthlyEmiAmount: req.body.monthlyEmiAmount,
      totalLeaseAmount: req.body.totalLeaseAmount,
      monthlyLeaseAmount: req.body.monthlyLeaseAmount,
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
 * Approves a quotation and converts it to a Proforma invoice.
 * Typically triggered after a deposit is received.
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
 * Employee submits a quotation for Finance approval.
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
 * Finance team approves a quotation.
 * Can override deposit amounts and item details during approval.
 */
export const financeApprove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const { deposit, itemUpdates } = req.body;

    const invoice = await billingService.financeApprove(
      id,
      req.user.userId,
      req.headers.authorization || '',
      deposit,
      itemUpdates,
    );

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Finance approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Finance team rejects a quotation.
 * Requires a reason for rejection.
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
 * Generates the consolidated final invoice for a contract.
 * Should be used instead of the deprecated generateFinalInvoice.
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
 * Retrieves all invoices visible to the user.
 * Admin sees all; Branch Users see only their branch's invoices.
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
 * Retrieves invoices created by the authenticated user.
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
 * Retrieves a single invoice by its unique ID.
 */
export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const invoice = await billingService.getInvoiceById(id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves invoice statistics (totals, counts) based on user role and filters.
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
 * Retrieves a sales overview for the user's branch over a specified period.
 */
export const getBranchSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const result = await reportService.getBranchSales(period, branchId);
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
 * Retrieves total sales figures for the user's branch.
 */
export const getBranchSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const result = await reportService.getBranchSalesTotals(branchId);
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
 * Retrieves counts of pending actions (e.g., pending approvals) for the branch.
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
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves collection alerts (e.g., overdue payments) for the branch.
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
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a global overview of sales performance (Admin/HQ level).
 */
export const getGlobalSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const result = await reportService.getGlobalSales(period);
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
 * Retrieves total global sales figures.
 */
export const getGlobalSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.getGlobalSalesTotals();
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
 * Retrieves a detailed financial report based on filters like branch, sale type, month, and year.
 */
export const getFinanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, saleType, month, year } = req.query;

    const report = await reportService.getFinanceReport({
      branchId: branchId as string,
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
 * Updates the usage counts (BW/Color) for a specific invoice.
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
 * Retrieves sales statistics specifically formatted for the Admin dashboard.
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
 * Retrieves the history of invoices for a branch, optionally filtered by sale type.
 */
export const getInvoiceHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const saleType = req.query.saleType as string | undefined;
    const history = await reportService.getInvoiceHistory(branchId, saleType);

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
 * Retrieves a list of completed collections for the branch.
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
 * Downloads the consolidated final invoice as a PDF.
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
 * Sends the consolidated final invoice via notification channels.
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
 * Sends a generic email notification.
 */
export const sendEmailNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { recipient, subject, body } = req.body;

    if (!recipient || !body) {
      throw new AppError('Recipient and Body are required', 400);
    }

    await notificationService.sendEmailNotification(id, recipient, subject, body);

    return res.status(200).json({
      success: true,
      message: 'Email notification request sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a generic WhatsApp notification.
 */
export const sendWhatsappNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { recipient, body } = req.body;

    if (!recipient || !body) {
      throw new AppError('Recipient (Phone) and Body are required', 400);
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
