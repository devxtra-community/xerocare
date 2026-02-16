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

/**
 * Retrieves all invoices for the authenticated user based on their role.
 * Admin/Finance see all, Employees see only their branch's invoices.
 */
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

/**
 * Retrieves the authenticated user's personal invoices (My Invoices).
 */
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

/**
 * Retrieves invoices specific to the user's branch.
 */
export const getBranchInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const invoices = await invoiceAggregationService.getBranchInvoices(token);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves detailed information for a specific invoice by its ID.
 */
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

/**
 * Creates a new invoice/quotation.
 */
export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
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
/**
 * Updates an existing quotation.
 */
export const updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const invoice = await invoiceAggregationService.updateQuotation(id, req.body, token);
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
 * Approves a quotation by an employee, often adding a deposit.
 */
export const approveQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { deposit } = req.body;

    const invoice = await invoiceAggregationService.approveQuotation(id, deposit, token);
    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Quotation approved successfully',
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
    const token = req.headers.authorization?.split(' ')[1] || '';

    const invoice = await invoiceAggregationService.employeeApprove(id, token);
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
 * Finance team approves a quotation, potentially updating items.
 */
export const financeApprove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { deposit, itemUpdates } = req.body;

    const invoice = await invoiceAggregationService.financeApprove(id, token, deposit, itemUpdates);
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
 * Finance team rejects a quotation with a reason.
 */
export const financeReject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { reason } = req.body;

    const invoice = await invoiceAggregationService.financeReject(id, reason, token);
    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Finance rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates the final settlement invoice for a contract.
 */
export const generateFinalInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const invoice = await invoiceAggregationService.generateFinalInvoice(req.body, token);
    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Final Invoice generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates the invoice for the next month based on an existing contract.
 */
export const createNextMonthInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { contractId } = req.body;
    const invoice = await invoiceAggregationService.createNextMonthInvoice(contractId, token);
    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Next month invoice created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves invoice statistics (totals, counts) for the dashboard.
 */
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

/**
 * Retrieves counts of pending actions (e.g., pending approvals) for sidebar badges.
 */
export const getPendingCounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';

    const branchId = user.branchId;
    if (!branchId) throw new Error('Branch ID missing');

    const counts = await invoiceAggregationService.getPendingCounts(token, branchId);
    return res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves collection alerts for Finance/Admin.
 */
export const getCollectionAlerts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';
    const date = req.query.date as string;

    const alerts = await invoiceAggregationService.getCollectionAlerts(user, token, date);
    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Retrieves a global overview of sales performance.
 */
export const getGlobalSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const period = (req.query.period as string) || '1M';
    const result = await invoiceAggregationService.getGlobalSales(token, period);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves total sales figures globally.
 */
export const getGlobalSalesTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const result = await invoiceAggregationService.getGlobalSalesTotals(token);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the history of invoices.
 */
export const getInvoiceHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';
    const saleType = req.query.saleType as string | undefined;

    const history = await invoiceAggregationService.getInvoiceHistory(user, token, saleType);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a list of completed collections.
 */
export const getCompletedCollections = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';

    const collections = await invoiceAggregationService.getCompletedCollections(user, token);
    return res.status(200).json({
      success: true,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Downloads a specific invoice as a PDF.
 */
export const downloadInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';
    const contractId = req.params.contractId as string;

    const stream = await invoiceAggregationService.downloadInvoice(contractId, token);

    // Pipe the stream to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consolidated-invoice-${contractId}.pdf`,
    );
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Sends an invoice via email/notification.
 */
export const sendInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const token = req.headers.authorization?.split(' ')[1] || '';
    const contractId = req.params.contractId as string;

    const result = await invoiceAggregationService.sendInvoice(contractId, token);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves detailed sales statistics for Admin.
 */
export const getAdminSalesStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const stats = await invoiceAggregationService.getAdminSalesStats(token);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the comprehensive financial report.
 */
export const getFinanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const report = await invoiceAggregationService.getFinanceReport(token);
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
