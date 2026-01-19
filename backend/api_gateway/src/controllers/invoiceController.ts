import { Request, Response, NextFunction } from 'express';
import { InvoiceAggregationService } from '../services/invoiceAggregationService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    branchId?: string;
  };
}

const invoiceAggregationService = new InvoiceAggregationService();

export const getAllInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const token = req.headers.authorization?.split(' ')[1] || '';
    const invoices = await invoiceAggregationService.getAllInvoices(user, token);
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
    const token = req.headers.authorization?.split(' ')[1] || '';
    const invoices = await invoiceAggregationService.getMyInvoices(token);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const aggregatedInvoice = await invoiceAggregationService.getInvoiceById(invoiceId, token);

    return res.status(200).json({
      success: true,
      data: aggregatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    console.log('API Gateway: Creating invoice with body:', JSON.stringify(req.body, null, 2));
    const invoice = await invoiceAggregationService.createInvoice(req.body, token);
    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';
    const branchId = req.query.branchId as string;

    const stats = await invoiceAggregationService.getInvoiceStats(user, token, branchId);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
