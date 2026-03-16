import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
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
 * Lists all the invoices (bills) in the system.
 *
 * If you are an Admin or work in Finance, you see everything.
 * If you are a Branch Employee, you only see bills related to your specific office.
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
 * Show me only the bills that I personally created or am responsible for.
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
 * List all bills that belong to my specific branch or office location.
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
 * Get the full details of one specific bill using its unique identification number.
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
 * Start the process of billing a customer by creating a new bill or price estimate.
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
 * Change the details of a price estimate (a formal "quotation") if a customer requests changes.
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
 * Confirm that a customer has agreed to a price estimate.
 * This often involves recording the initial down payment (deposit) they made.
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
 * After a branch employee is happy with a deal, they send it to the main Finance team for a final check.
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
 * The Finance team assigns specific equipment or machines to a customer's order.
 */
export const allocateMachines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { itemUpdates } = req.body;

    const invoice = await invoiceAggregationService.allocateMachines(id, token, itemUpdates);
    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Machines allocated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Formally switch on a contract.
 * This happens after machines are assigned and payments are verified.
 */
export const activateContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const { contractConfirmationUrl, deposit, itemUpdates } = req.body;

    const invoice = await invoiceAggregationService.activateContract(
      id,
      token,
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
 * Save a digital copy of the customer's signed contract or payment confirmation.
 */
export const uploadContractConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const file = req.file;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const response = await invoiceAggregationService.uploadContractConfirmation(id, token, file);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * If something is wrong with a deal, the Finance team can send it back with a note explaining why.
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
 * Prepare the final closing bill when a contract is finishing or being settled.
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
 * Automatically set up the bill for the upcoming month based on an ongoing contract.
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
 * Get overall numbers (totals and counts) to show how much work we've done and how much money is coming in.
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
 * Count how many tasks (like pending approvals) need immediate attention.
 * This is used for those little notification circles you see in the sidebar.
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
 * Reminders for the Finance team about bills that need to be collected soon.
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
 * Show a history of how business performance has changed over time globally.
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
 * Get the total sales figures for the entire business.
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
 * Look back at all the invoices ever created.
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
 * List all the bills where we have successfully received the money.
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
 * Export a professional PDF version of an invoice for printing or sharing.
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
 * Send an invoice to a customer's email or phone as a notification.
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
 * Get detailed sales performance numbers specifically for higher-level management.
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
 * Create a comprehensive financial report for accounting purposes.
 */
export const getFinanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const filters = req.query;
    const report = await invoiceAggregationService.getFinanceReport(token, filters);
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger an email for a specific bill to a customer or staff member.
 */
export const sendEmailNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const payload = req.body;

    const result = await invoiceAggregationService.sendEmailNotification(id, payload, token);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Email notification request sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger a WhatsApp message for a specific bill.
 */
export const sendWhatsappNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const payload = req.body;

    const result = await invoiceAggregationService.sendWhatsappNotification(id, payload, token);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'WhatsApp notification request sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a detailed breakdown of revenue and expenses for a specific branch.
 */
export const getBranchFinanceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const stats = await invoiceAggregationService.getBranchFinanceStats(token, year);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Swap out a machine that was assigned to a deal, perhaps because it's broken or unavailable.
 */
export const replaceDeviceAllocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const token = req.headers.authorization?.split(' ')[1] || '';
    const result = await invoiceAggregationService.replaceDeviceAllocation(payload, token);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
