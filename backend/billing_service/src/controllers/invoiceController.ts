import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { AppError } from '../errors/appError';

const billingService = new BillingService();

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

    // Extract relevant fields
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
      // For Sale, we expect 'items'
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Invalid request payload: items array is required for SALE', 400);
      }
    } else if (saleType === 'LEASE') {
      // Lease Validation
      if (!payload.leaseType || (!payload.leaseTenureMonths && payload.leaseTenureMonths !== 0)) {
        throw new AppError(
          'Invalid request payload: leaseType and leaseTenureMonths are required for LEASE',
          400,
        );
      }
    } else {
      // For Rent (defaulting to previous logic for safety if not explicitly SALE or LEASE)
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

export const approveQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { deposit } = req.body;

    // deposit structure: { amount, mode ['CASH', 'CHEQUE'], reference?, receivedDate? }

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

export const employeeApprove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    // Ensure only status update happens, no type conversion
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

export const financeApprove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }

    const { deposit, itemUpdates } = req.body;

    // Trigger final state transitions based on SaleType
    const invoice = await billingService.financeApprove(id, req.user.userId, deposit, itemUpdates);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Finance approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

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
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { branchId, employeeId, createdBy, ...payload } = req.body;
    // Payload: contractId, billingPeriodStart, billingPeriodEnd

    if (!payload.contractId || !payload.billingPeriodStart || !payload.billingPeriodEnd) {
      throw new AppError(
        'Missing required fields: contractId, billingPeriodStart, billingPeriodEnd',
        400,
      );
    }

    const invoice = await billingService.generateFinalInvoice({
      contractId: payload.contractId,
      billingPeriodStart: payload.billingPeriodStart,
      billingPeriodEnd: payload.billingPeriodEnd,
    });

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Final Invoice generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createNextMonthInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contractId } = req.body;

    if (!contractId) {
      throw new AppError('contractId is required', 400);
    }

    const invoice = await billingService.createNextMonthInvoice(contractId);

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Next month invoice created successfully',
    });
  } catch (error) {
    next(error);
  }
};

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

export const getAllInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Branch filtering: Admin sees all invoices, others see only their branch
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

export const getMyInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // console.log('Billing Service: getMyInvoices called. User:', req.user);
    if (!req.user || !req.user.userId) {
      console.error('Billing Service: User context missing or incomplete:', req.user);
      throw new AppError('User context missing', 401);
    }
    const invoices = await billingService.getInvoicesByCreator(req.user.userId);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Billing Service: Error in getMyInvoices:', error);
    next(error);
  }
};

export const getBranchInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Billing: getBranchInvoices hit. User:', req.user);
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
    console.error('Error in getBranchInvoices:', error);
    next(error);
  }
};

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
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createdBy = req.query.createdBy as string;

    // Branch filtering: Admin can query any branch via query param, others use their own branch
    const branchId =
      req.user?.role === 'ADMIN' ? (req.query.branchId as string) : req.user?.branchId;

    console.log('[Billing Service] getStats - Incoming Query:', req.query);
    console.log('[Billing Service] getStats - Filter:', { createdBy, branchId });

    const stats = await billingService.getInvoiceStats({ createdBy, branchId });
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const branchId = req.user?.branchId; // Always rely on auth user's branch for Manager
    // If admin wants to query arbitrary branch, we can check role & query param later.
    // For now, prompt implies "Manager Dashboard".

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const result = await billingService.getBranchSales(period, branchId);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Branch sales overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const result = await billingService.getBranchSalesTotals(branchId);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Branch sales totals fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Billing: getPendingCounts hit. User:', req.user);
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }
    const counts = await billingService.getPendingCounts(branchId);
    return res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
};

export const getCollectionAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }
    const alerts = await billingService.getCollectionAlerts(branchId);
    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};
export const getGlobalSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '1M';
    const result = await billingService.getGlobalSales(period);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Global sales overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getGlobalSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await billingService.getGlobalSalesTotals();
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Global sales totals fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getFinanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, saleType, month, year } = req.query;

    const report = await billingService.getFinanceReport({
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

export const getInvoiceHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new AppError('Branch ID not found in user context', 400);
    }

    const saleType = req.query.saleType as string | undefined;
    const history = await billingService.getInvoiceHistory(branchId, saleType);

    return res.status(200).json({
      success: true,
      data: history,
      message: 'Invoice history fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCompletedCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.branchId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const collections = await billingService.getCompletedCollections(req.user.branchId);
    return res.status(200).json({
      success: true,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadConsolidatedInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const contractId = req.params.contractId as string;
    if (!contractId) throw new AppError('Contract ID required', 400);

    // Stream response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consolidated-invoice-${contractId}.pdf`,
    );

    await billingService.downloadConsolidatedInvoice(contractId, res);
  } catch (error) {
    next(error);
  }
};

export const sendConsolidatedInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    if (!contractId) throw new AppError('Contract ID required', 400);

    const result = await billingService.sendConsolidatedInvoice(contractId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
