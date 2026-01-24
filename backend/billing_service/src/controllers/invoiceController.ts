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
    } = payload;

    if (!pricingItems || !rentType || !customerId) {
      throw new AppError(
        'Invalid request payload: pricingItems, rentType, and customerId are required',
        400,
      );
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

export const getAllInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await billingService.getAllInvoices();
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
    const branchId = req.query.branchId as string;
    const stats = await billingService.getInvoiceStats({ createdBy, branchId });
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
